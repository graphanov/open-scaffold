import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  STUDY_SCHEMA,
  SIGNAL_SOURCES,
  computeStudy,
  renderStudyMarkdown,
  validateStudyReport,
  type StudyReport,
} from '../src/study.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');
const now = new Date('2026-06-15T00:00:00.000Z');

function tempScaffold(prefix = 'osc-study-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  for (const stage of ['active', 'backlog', 'blocked', 'done']) mkdirSync(join(root, `.osc/plans/${stage}`), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nTest study.\n\n## Changelog\n\n<!-- append YYYY-MM-DD entries below this line -->\n');
  writeFileSync(join(root, '.osc/releases/README.md'), '# Releases\n');
  return root;
}

function planText(slug: string, status: string) {
  return `# Plan: ${slug}\n\n## Status\n\n${status}\n\n## Context\n\nNeed ${slug}.\n\n## Goal\n\nShip ${slug}.\n\n## Constraints / Out of scope\n\n- Local-only.\n\n## Files to touch\n\n- \`README.md\` — example.\n\n## Acceptance criteria\n\n- [ ] It works.\n\n## Verification steps\n\n1. Run tests.\n\n## Open questions\n\n- None.\n`;
}

function writePlan(root: string, stage: 'active' | 'backlog' | 'blocked' | 'done', slug: string, modifiedAt: string) {
  const path = join(root, `.osc/plans/${stage}/${slug}.md`);
  writeFileSync(path, planText(slug, stage));
  const date = new Date(`${modifiedAt}T00:00:00.000Z`);
  utimesSync(path, date, date);
  return path;
}

function writeAmendment(root: string, stage: string, slug: string, n: number) {
  const path = join(root, `.osc/plans/${stage}/${slug}-amendment-${n}.md`);
  writeFileSync(path, `# Amendment ${n} to ${slug}\n\nParent: ${slug}\n\nLearning: something changed.\n`);
  return path;
}

function writeEvidence(root: string, date: string, slug: string, approval: string) {
  writeFileSync(join(root, `.osc/releases/${date}-${slug}.md`), [
    `# Release / Evidence Note: ${slug}`,
    '',
    '## Summary',
    '',
    `Evidence for ${slug}.`,
    '',
    '## Outcome',
    '',
    `approval.status: ${approval}`,
    '',
  ].join('\n'));
}

function runGit(root: string, args: string[], env: Record<string, string> = {}) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

// One done plan with an amendment + approved evidence, one done weak-approved,
// one done with no evidence (-> unknown approval), one active plan with two
// amendments, and one backlog plan. No git in a temp dir, so git-sourced signals
// resolve to "unavailable" with null values, exercising the honesty path directly.
function populatedScaffold() {
  const root = tempScaffold();
  writePlan(root, 'done', '001-alpha', '2026-04-01');
  writeAmendment(root, 'done', '001-alpha', 1);
  writePlan(root, 'done', '002-beta', '2026-04-07');
  writePlan(root, 'done', '003-gamma', '2026-05-01');
  writePlan(root, 'active', '004-delta', '2026-05-15');
  writeAmendment(root, 'active', '004-delta', 1);
  writeAmendment(root, 'active', '004-delta', 2);
  writePlan(root, 'backlog', '005-epsilon', '2026-06-05');
  writeEvidence(root, '2026-04-08', '001-alpha', 'approved');
  writeEvidence(root, '2026-04-14', '002-beta', 'weak_approved');
  return root;
}

function signalById(report: StudyReport, id: string) {
  return report.signals.find((entry) => entry.id === id);
}

describe('computeStudy', () => {
  it('produces a schema-stamped report and aggregates source-labeled signals from artifacts', () => {
    const root = populatedScaffold();

    const report = computeStudy({ root, now });

    expect(report.schemaVersion).toBe(STUDY_SCHEMA);
    expect(report.schemaVersion).toBe('open-scaffold.study.v1');
    expect(Number.isNaN(Date.parse(report.computed_at))).toBe(false);

    expect(signalById(report, 'total_plans')?.value).toBe(5);
    expect(signalById(report, 'done_plans')?.value).toBe(3);
    expect(signalById(report, 'amendment_total')?.value).toBe(3);
    expect(signalById(report, 'plans_with_amendments')?.value).toBe(2);
    expect(signalById(report, 'amendments_per_plan')?.value).toBeCloseTo(0.6, 5);
    expect(signalById(report, 'plans_with_evidence')?.value).toBe(2);
    expect(signalById(report, 'approval_approved')?.value).toBe(1);
    expect(signalById(report, 'approval_weak_approved')?.value).toBe(1);
    expect(signalById(report, 'approval_unknown')?.value).toBe(1);
  });

  it('emits null with an unavailable source rather than imputing absent measurements', () => {
    const root = populatedScaffold();

    const report = computeStudy({ root, now });

    // FAQ time/cost claims have no committed proxy: must be unavailable + null, never guessed.
    for (const id of ['session_resume_seconds', 'context_reexplanation_tokens', 'token_cost_usd']) {
      const sig = signalById(report, id);
      expect(sig?.source).toBe('unavailable');
      expect(sig?.value).toBeNull();
    }
    // Temp fixture has no git history, so git-derived signals degrade to unavailable + null.
    expect(report.commit_range.source).toBe('unavailable');
    expect(report.commit_range.commit_count).toBeNull();
    expect(signalById(report, 'plan_referencing_commits')?.source).toBe('unavailable');
    expect(signalById(report, 'plan_referencing_commits')?.value).toBeNull();
  });

  it('every signal carries a source drawn from the allowed enum, and unavailable is never numeric', () => {
    const report = computeStudy({ root: populatedScaffold(), now });

    for (const sig of report.signals) {
      expect((SIGNAL_SOURCES as readonly string[]).includes(sig.source)).toBe(true);
      if (sig.source === 'unavailable') expect(sig.value).toBeNull();
      if (sig.value !== null) expect(typeof sig.value).toBe('number');
    }
    // Its own computed output must satisfy its own validator.
    expect(validateStudyReport(report)).toEqual({ ok: true, errors: [] });
  });

  it('restricts scope with the --since filter', () => {
    const report = computeStudy({ root: populatedScaffold(), now, since: new Date('2026-06-01T00:00:00.000Z') });

    // Only 005-epsilon (2026-06-05) was created on/after the cutoff.
    expect(signalById(report, 'total_plans')?.value).toBe(1);
    expect(signalById(report, 'done_plans')?.value).toBe(0);
    expect(report.since).toBe('2026-06-01T00:00:00.000Z');
  });

  it('marks git-derived signals unavailable when git log cannot read a commit range', () => {
    const root = tempScaffold();
    runGit(root, ['init']);

    const report = computeStudy({ root, now });

    expect(report.commit_range.source).toBe('unavailable');
    expect(report.commit_range.commit_count).toBeNull();
    expect(signalById(report, 'commits_in_range')?.source).toBe('unavailable');
    expect(signalById(report, 'commits_in_range')?.value).toBeNull();
    expect(signalById(report, 'plan_referencing_commits')?.source).toBe('unavailable');
    expect(signalById(report, 'plan_referencing_commits')?.value).toBeNull();
  });

  it('renders a valid zero-commit git range as zero rather than unavailable', () => {
    const root = tempScaffold();
    writePlan(root, 'done', '001-alpha', '2026-04-01');

    runGit(root, ['init']);
    runGit(root, ['config', 'user.name', 'Open Scaffold Test']);
    runGit(root, ['config', 'user.email', 'test@example.com']);
    runGit(root, ['add', '.']);
    runGit(root, ['commit', '-m', 'close 001-alpha'], {
      GIT_AUTHOR_DATE: '2026-04-02T00:00:00Z',
      GIT_COMMITTER_DATE: '2026-04-02T00:00:00Z',
    });

    const report = computeStudy({ root, now, since: new Date('2026-07-01T00:00:00.000Z') });
    const markdown = renderStudyMarkdown(report);

    expect(report.commit_range.source).toBe('git');
    expect(report.commit_range.commit_count).toBe(0);
    expect(markdown).toContain('Commit range: 0 commits (empty selected git range)');
    expect(markdown).not.toContain('Commit range: unavailable (no git history read)');
  });

  it('does not count historical plan slugs when --since leaves no plans in scope', () => {
    const root = tempScaffold();
    writePlan(root, 'done', '001-alpha', '2026-04-01');

    runGit(root, ['init']);
    runGit(root, ['config', 'user.name', 'Open Scaffold Test']);
    runGit(root, ['config', 'user.email', 'test@example.com']);
    runGit(root, ['add', '.']);
    runGit(root, ['commit', '-m', 'close 001-alpha'], {
      GIT_AUTHOR_DATE: '2026-04-02T00:00:00Z',
      GIT_COMMITTER_DATE: '2026-04-02T00:00:00Z',
    });

    writeFileSync(join(root, 'README.md'), 'A later note mentions 001-alpha but no plan is in scope.\n');
    runGit(root, ['add', 'README.md']);
    runGit(root, ['commit', '-m', 'mention 001-alpha after cutoff'], {
      GIT_AUTHOR_DATE: '2026-06-10T00:00:00Z',
      GIT_COMMITTER_DATE: '2026-06-10T00:00:00Z',
    });

    const report = computeStudy({ root, now, since: new Date('2026-06-01T00:00:00.000Z') });

    expect(signalById(report, 'total_plans')?.value).toBe(0);
    expect(signalById(report, 'plan_referencing_commits')?.source).toBe('git');
    expect(signalById(report, 'plan_referencing_commits')?.value).toBe(0);
  });
});

describe('validateStudyReport (honesty guards)', () => {
  function validReport(): StudyReport {
    return computeStudy({ root: populatedScaffold(), now });
  }

  it('rejects a numeric figure that carries no source label', () => {
    const report = validReport();
    const target = report.signals.find((s) => s.id === 'total_plans')!;
    // Strip the source label off a real number.
    (target as { source: unknown }).source = undefined;

    const result = validateStudyReport(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('total_plans') && e.includes('source'))).toBe(true);
  });

  it('rejects an imputed value on an unavailable signal', () => {
    const report = validReport();
    const target = report.signals.find((s) => s.id === 'session_resume_seconds')!;
    expect(target.source).toBe('unavailable');
    (target as { value: unknown }).value = 42; // someone "estimated" a resume time

    const result = validateStudyReport(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('session_resume_seconds') && e.includes('unavailable'))).toBe(true);
  });

  it('rejects an estimated string in place of a number', () => {
    const report = validReport();
    const target = report.signals.find((s) => s.id === 'done_plans')!;
    (target as { value: unknown }).value = '~3 (estimated)';

    const result = validateStudyReport(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('done_plans') && e.includes('number or null'))).toBe(true);
  });

  it('rejects an unavailable commit range that smuggles in a range', () => {
    const report = validReport();
    report.commit_range = { from: 'abc', to: 'def', commit_count: 9, source: 'unavailable' };

    const result = validateStudyReport(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('commit_range') && e.includes('unavailable'))).toBe(true);
  });

  it('rejects a wrong schema version', () => {
    const report = validReport();
    (report as { schemaVersion: unknown }).schemaVersion = 'open-scaffold.study.v0';

    const result = validateStudyReport(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('schemaVersion'))).toBe(true);
  });
});

describe('renderStudyMarkdown', () => {
  it('renders an "unavailable" row for signals with no proxy and a "what this cannot prove" section', () => {
    const markdown = renderStudyMarkdown(computeStudy({ root: populatedScaffold(), now }));

    expect(markdown).toContain('Wall-clock session resume time | unavailable | unavailable');
    expect(markdown).toContain('## What this cannot prove');
    expect(markdown).toContain('No causation');
    expect(markdown).toContain(STUDY_SCHEMA);
  });

  it('surfaces an explicit null/negative headline observation derived from the data', () => {
    const markdown = renderStudyMarkdown(computeStudy({ root: populatedScaffold(), now }));

    expect(markdown).toContain('## Headline observations');
    expect(markdown).toContain('Coverage (null observation)');
    // Fixture: 1 of 3 done plans has no approval decision -> negative finding must appear.
    expect(markdown).toContain('Negative finding: 1 of 3 done plans carry no machine-readable approval decision');
  });
});

describe('osc study CLI', () => {
  it('emits valid JSON for a fixture repo with a source on every figure', () => {
    const root = populatedScaffold();

    const result = spawnSync(tsx, [cli, 'study', '--json'], { cwd: root, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');

    const parsed = JSON.parse(result.stdout) as StudyReport;
    expect(parsed.schemaVersion).toBe(STUDY_SCHEMA);
    expect(parsed.signals.length).toBeGreaterThan(0);
    for (const sig of parsed.signals) {
      expect((SIGNAL_SOURCES as readonly string[]).includes(sig.source)).toBe(true);
    }
    expect(validateStudyReport(parsed)).toEqual({ ok: true, errors: [] });
  });

  it('renders markdown by default with unavailable rows', () => {
    const root = populatedScaffold();

    const result = spawnSync(tsx, [cli, 'study'], { cwd: root, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('# Open Scaffold methodology evidence — self-study');
    expect(result.stdout).toContain('## What this cannot prove');
    expect(result.stdout).toContain('unavailable');
  });

  it('documents study flags in command help', () => {
    const result = spawnSync(tsx, [cli, 'study', '--help'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: osc study');
    expect(result.stdout).toContain('--json');
    expect(result.stdout).toContain('--since');
    expect(result.stdout).toContain('--out');
  });
});
