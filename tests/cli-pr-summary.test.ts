import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  PR_SUMMARY_MARKER,
  PR_SUMMARY_SCHEMA,
  computePrSummary,
  renderPrSummaryMarkdown,
  selectSummaryComment,
  type PrSummaryReport,
} from '../src/pr-summary.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');
const now = new Date('2026-06-15T00:00:00.000Z');

function tempScaffold(prefix = 'osc-pr-summary-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  for (const stage of ['active', 'backlog', 'blocked', 'done']) mkdirSync(join(root, `.osc/plans/${stage}`), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nTest pr-summary.\n\n## Changelog\n\n<!-- append YYYY-MM-DD entries below this line -->\n');
  writeFileSync(join(root, '.osc/releases/README.md'), '# Releases\n');
  return root;
}

interface PlanParts {
  goal?: string;
  context?: string;
  ac?: string[];
  openQuestions?: string[];
}

function planText(slug: string, status: string, parts: PlanParts = {}): string {
  const goal = parts.goal ?? `Provide a reviewer-ready summary for ${slug} in pull requests.`;
  const context = parts.context ?? `We need ${slug} so reviewers see the plan state in the PR.`;
  const ac = parts.ac ?? ['- [x] First criterion is testable and complete.', '- [ ] Second criterion is still open for review.'];
  const openQuestions = parts.openQuestions ?? ['- None.'];
  return [
    `# Plan: ${slug}`, '',
    '## Status', '', status, '',
    '## Context', '', context, '',
    '## Goal', '', goal, '',
    '## Constraints / Out of scope', '', '- Stay read-only.', '',
    '## Files to touch', '', '- `README.md` — example.', '',
    '## Acceptance criteria', '', ...ac, '',
    '## Verification steps', '', '1. Run the tests.', '',
    '## Open questions', '', ...openQuestions, '',
  ].join('\n');
}

function writePlan(root: string, stage: 'active' | 'backlog' | 'blocked' | 'done', slug: string, parts: PlanParts = {}) {
  const path = join(root, `.osc/plans/${stage}/${slug}.md`);
  writeFileSync(path, planText(slug, stage, parts));
  return path;
}

function writeEvidence(root: string, date: string, slug: string, approval: string, body = `Evidence for ${slug}.`) {
  writeFileSync(join(root, `.osc/releases/${date}-${slug}.md`), [
    `# Release / Evidence Note: ${slug}`,
    '',
    '## Summary',
    '',
    body,
    '',
    '## Outcome',
    '',
    `approval.status: ${approval}`,
    '',
  ].join('\n'));
}

describe('computePrSummary', () => {
  it('reads goal, acceptance-criteria checkbox state, evidence, and open questions from the plan', () => {
    const root = tempScaffold();
    writePlan(root, 'active', '010-sample', {
      goal: 'Ship a reviewer summary that mirrors plan state into the PR.',
      ac: ['- [x] Done item one.', '- [ ] Open item two.', '- [x] Done item three.'],
      openQuestions: ['- Should the mirror also post to Discord?'],
    });
    writeEvidence(root, '2026-06-10', '010-sample', 'weak_approved');

    const report = computePrSummary('010-sample', { root, now });

    expect(report.schemaVersion).toBe(PR_SUMMARY_SCHEMA);
    expect(report.plan_found).toBe(true);
    expect(report.stage).toBe('active');
    expect(report.goal).toBe('Ship a reviewer summary that mirrors plan state into the PR.');
    expect(report.acceptance_criteria).toEqual([
      { text: 'Done item one.', checked: true },
      { text: 'Open item two.', checked: false },
      { text: 'Done item three.', checked: true },
    ]);
    expect(report.evidence.present).toBe(true);
    expect(report.evidence.path).toBe('.osc/releases/2026-06-10-010-sample.md');
    expect(report.evidence.approval_status).toBe('weak_approved');
    expect(report.evidence.is_skeleton).toBe(false);
    expect(report.open_questions).toEqual(['Should the mirror also post to Discord?']);
    expect(report.validation.ok).toBe(true);
  });

  it('reports a missing evidence note without inventing one', () => {
    const root = tempScaffold();
    writePlan(root, 'active', '011-noevidence');

    const report = computePrSummary('011-noevidence', { root, now });

    expect(report.plan_found).toBe(true);
    expect(report.evidence.present).toBe(false);
    expect(report.evidence.path).toBeNull();
    expect(report.evidence.approval_status).toBe('unknown');
  });

  it('flags an evidence skeleton that still carries TODO placeholders', () => {
    const root = tempScaffold();
    writePlan(root, 'active', '012-skeleton');
    writeEvidence(root, '2026-06-10', '012-skeleton', 'approved', 'TODO: summarize what changed.');

    const report = computePrSummary('012-skeleton', { root, now });

    expect(report.evidence.present).toBe(true);
    expect(report.evidence.is_skeleton).toBe(true);
  });

  it('surfaces plan-validation issues by reusing the plan validator rather than re-parsing', () => {
    const root = tempScaffold();
    // A TODO marker trips the plan validator's no-todos rule (error severity).
    writePlan(root, 'active', '013-invalid', { context: 'TODO: explain why this plan exists.' });

    const report = computePrSummary('013-invalid', { root, now });

    expect(report.plan_found).toBe(true);
    expect(report.validation.ok).toBe(false);
    expect(report.validation.error_count).toBeGreaterThan(0);
    expect(report.validation.issues.some((issue) => issue.rule === 'no-todos')).toBe(true);
  });

  it('returns a graceful not-found report for a missing plan and never throws', () => {
    const root = tempScaffold();

    const report = computePrSummary('999-missing', { root, now });

    expect(report.plan_found).toBe(false);
    expect(report.plan_path).toBeNull();
    expect(report.acceptance_criteria).toEqual([]);
    expect(report.notes.join(' ')).toContain('Plan not found');
  });

  it('returns a graceful not-found report for an unsafe slug instead of resolving a path', () => {
    const root = tempScaffold();

    const report = computePrSummary('../outside', { root, now });

    expect(report.plan_found).toBe(false);
    expect(report.plan_path).toBeNull();
  });
});

describe('renderPrSummaryMarkdown', () => {
  it('places the upsert marker on the first line and renders checkbox state with a count', () => {
    const root = tempScaffold();
    writePlan(root, 'active', '020-render', {
      ac: ['- [x] Done one.', '- [ ] Open two.'],
    });
    const markdown = renderPrSummaryMarkdown(computePrSummary('020-render', { root, now }));

    expect(markdown.split('\n')[0]).toBe(PR_SUMMARY_MARKER);
    expect(markdown).toContain('### Acceptance criteria (1/2 checked)');
    expect(markdown).toContain('- [x] Done one.');
    expect(markdown).toContain('- [ ] Open two.');
    expect(markdown).toContain('Read-only mirror of `.osc/` artifacts');
  });

  it('is deterministic across compute times so the mirrored comment is stable', () => {
    const root = tempScaffold();
    writePlan(root, 'active', '021-stable');

    const early = renderPrSummaryMarkdown(computePrSummary('021-stable', { root, now: new Date('2026-01-01T00:00:00.000Z') }));
    const late = renderPrSummaryMarkdown(computePrSummary('021-stable', { root, now: new Date('2026-12-31T23:59:59.000Z') }));

    expect(early).toBe(late);
  });

  it('renders an explicit no-plan body that still carries the marker', () => {
    const root = tempScaffold();
    const markdown = renderPrSummaryMarkdown(computePrSummary('999-missing', { root, now }));

    expect(markdown.split('\n')[0]).toBe(PR_SUMMARY_MARKER);
    expect(markdown).toContain('No plan found for `999-missing`');
  });
});

describe('selectSummaryComment (idempotent upsert)', () => {
  it('finds the single comment carrying the marker among unrelated comments', () => {
    const comments = [
      { id: 1, body: 'CI passed.' },
      { id: 2, body: `${PR_SUMMARY_MARKER}\n## Open Scaffold summary` },
      { id: 3, body: 'LGTM' },
    ];

    expect(selectSummaryComment(comments)?.id).toBe(2);
  });

  it('returns null when no comment carries the marker so the mirror creates one', () => {
    expect(selectSummaryComment([{ id: 1, body: 'unrelated' }])).toBeNull();
    expect(selectSummaryComment([])).toBeNull();
  });

  it('updates in place on re-run rather than duplicating the comment', () => {
    const root = tempScaffold();
    writePlan(root, 'active', '030-idem');
    const body = renderPrSummaryMarkdown(computePrSummary('030-idem', { root, now }));

    // Model the workflow's upsert: select existing -> update, else create.
    let comments: Array<{ id: number; body: string }> = [];
    let nextId = 1;
    const upsert = (newBody: string) => {
      const existing = selectSummaryComment(comments);
      if (existing) existing.body = newBody;
      else comments.push({ id: nextId++, body: newBody });
    };

    upsert(body); // first run: creates
    upsert(body); // second run: updates the same comment

    expect(comments).toHaveLength(1);
    expect(comments.filter((c) => c.body.includes(PR_SUMMARY_MARKER))).toHaveLength(1);
    expect(comments[0].id).toBe(1);
  });
});

describe('osc pr-summary CLI', () => {
  it('renders a markdown summary for a real plan at exit 0', () => {
    const root = tempScaffold();
    writePlan(root, 'active', '040-cli', { ac: ['- [x] Done.', '- [ ] Open.'] });
    writeEvidence(root, '2026-06-10', '040-cli', 'approved');

    const result = spawnSync(tsx, [cli, 'pr-summary', '040-cli'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.split('\n')[0]).toBe(PR_SUMMARY_MARKER);
    expect(result.stdout).toContain('### Acceptance criteria (1/2 checked)');
    expect(result.stdout).toContain('Provide a reviewer-ready summary for 040-cli');
    expect(result.stdout).toContain('.osc/releases/2026-06-10-040-cli.md');
  });

  it('emits a valid JSON report under --format json', () => {
    const root = tempScaffold();
    writePlan(root, 'active', '041-json');

    const result = spawnSync(tsx, [cli, 'pr-summary', '041-json', '--format', 'json'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const parsed = JSON.parse(result.stdout) as PrSummaryReport;
    expect(parsed.schemaVersion).toBe(PR_SUMMARY_SCHEMA);
    expect(parsed.plan_found).toBe(true);
    expect(parsed.acceptance_criteria.length).toBeGreaterThan(0);
  });

  it('exits 0 with an explicit no-plan summary for a missing plan rather than failing the check', () => {
    const root = tempScaffold();

    const result = spawnSync(tsx, [cli, 'pr-summary', '999-missing'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('No plan found for `999-missing`');
  });

  it('exits 0 with a graceful no-plan summary for an unsafe slug', () => {
    const root = tempScaffold();

    const result = spawnSync(tsx, [cli, 'pr-summary', '../outside'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('No plan found');
  });

  it('rejects an unknown --format value as a usage error', () => {
    const root = tempScaffold();
    writePlan(root, 'active', '042-bad');

    const result = spawnSync(tsx, [cli, 'pr-summary', '042-bad', '--format', 'yaml'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Invalid value for --format');
  });

  it('requires a plan slug', () => {
    const root = tempScaffold();

    const result = spawnSync(tsx, [cli, 'pr-summary'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Missing required argument: plan-slug');
  });

  it('documents pr-summary flags in command help', () => {
    const result = spawnSync(tsx, [cli, 'pr-summary', '--help'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: osc pr-summary');
    expect(result.stdout).toContain('--format');
  });
});

describe('pr-summary mirror workflow', () => {
  const workflow = readFileSync(join(repoRoot, '.github/workflows/pr-summary.yml'), 'utf8');

  it('embeds the exact PR_SUMMARY_MARKER so the upsert never drifts from the renderer', () => {
    // The workflow re-implements the find-by-marker upsert inline in github-script.
    // If this literal ever drifts from PR_SUMMARY_MARKER the mirror would post a
    // second comment instead of updating in place, so pin them together here.
    expect(workflow).toContain(PR_SUMMARY_MARKER);
  });

  it('is gated opt-in and runs read-only against contents', () => {
    expect(workflow).toContain("vars.OSC_PR_SUMMARY == 'true'");
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('issues: write');
  });

  it('checks out without the forbidden actions/checkout helper', () => {
    expect(workflow).not.toContain('actions/checkout');
  });
});
