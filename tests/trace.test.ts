import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildTrace, formatTraceReport } from '../src/trace.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempRepo(prefix = 'osc-trace-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  for (const stage of ['active', 'backlog', 'blocked', 'done']) mkdirSync(join(root, `.osc/plans/${stage}`), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  mkdirSync(join(root, '.osc/runs'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nDefined.\n\n## Changelog\n\n<!-- append YYYY-MM-DD entries below this line -->\n');
  writeFileSync(join(root, '.osc/releases/README.md'), '# Release / evidence notes\n');
  return root;
}

function writePlan(root: string, stage: 'active' | 'backlog' | 'blocked' | 'done', slug: string, options: { goal?: string; ac?: string; extra?: string } = {}) {
  writeFileSync(join(root, `.osc/plans/${stage}`, `${slug}.md`), `# Plan: ${slug}

## Status

${stage}

## Context

Fixture context.

## Goal

${options.goal ?? 'Replay the local work record.'}

## Constraints / Out of scope

- Local-only fixture.

## Files to touch

- Fixture files.

## Acceptance criteria

${options.ac ?? '- [x] AC1 is backed.\n- [ ] AC2 still needs evidence.'}

## Verification steps

1. Run trace.

## Open questions

- None.
${options.extra ?? ''}`);
}

function writeRun(root: string, slug: string, runId = `20260527T120000Z-${slug}-run`) {
  const runDir = join(root, '.osc/runs', runId);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'run.json'), JSON.stringify({
    schemaVersion: 'open-scaffold.run.v1',
    runId,
    plan: {
      slug,
      path: `.osc/plans/done/${slug}.md`,
      goal: 'Replay the local work record.',
      acceptanceCriteria: ['AC1 is backed.'],
    },
  }, null, 2));
  return runId;
}

function writeRelease(root: string, slug: string, body = '') {
  writeFileSync(join(root, '.osc/releases', `2026-05-27-${slug}.md`), `# Release / Evidence Note: ${slug}

## Summary

Fixture evidence note.

## Traceability

- Source plan: .osc/plans/done/${slug}.md
- Run ID: 20260527T120000Z-${slug}-run
- Source Pull Request: https://github.com/example/repo/pull/42
- Follow-up Issue: https://github.com/example/repo/issues/24
${body}

## Verification

- PASS.

## Outcome

Approved fixture.
`);
}

function runCli(root: string, args: string[]) {
  return spawnSync(tsx, [cli, ...args], { cwd: root, encoding: 'utf8' });
}

describe('trace work-record replay', () => {
  it('finds a plan in any stage and summarizes status, goal, path, and acceptance criteria', () => {
    const root = tempRepo();
    writePlan(root, 'backlog', '117-fixture', {
      goal: 'Replay a fixture chain.',
      ac: '- [x] AC1 has local evidence.\n- [ ] AC2 is missing follow-up evidence.',
    });

    const report = buildTrace(root, '117-fixture');

    expect(report.schema).toBe('open-scaffold.trace.v1');
    expect(report.plan).toMatchObject({
      slug: '117-fixture',
      stage: 'backlog',
      status: 'backlog',
      path: '.osc/plans/backlog/117-fixture.md',
      goal: 'Replay a fixture chain.',
    });
    expect(report.plan.acceptance_criteria).toEqual([
      { id: 'AC1', text: 'AC1 has local evidence.', checked: true },
      { id: 'AC2', text: 'AC2 is missing follow-up evidence.', checked: false },
    ]);
    expect(formatTraceReport(report)).toContain('Open Scaffold trace: 117-fixture');
    expect(formatTraceReport(report)).toContain('Status: backlog');
    expect(formatTraceReport(report)).toContain('AC2 [ ] AC2 is missing follow-up evidence.');
  });

  it('replays local run packets, release notes, and recognized external PR/issue references', () => {
    const root = tempRepo();
    writePlan(root, 'done', '001-full');
    const runId = writeRun(root, '001-full');
    writeRelease(root, '001-full');

    const report = buildTrace(root, '001-full');

    expect(report.summary).toMatchObject({ runs: 1, release_notes: 1, external_refs: 2 });
    expect(report.links).toContainEqual(expect.objectContaining({ type: 'plan_file', status: 'local', reference: '.osc/plans/done/001-full.md' }));
    expect(report.links).toContainEqual(expect.objectContaining({ type: 'run_packet', status: 'local', reference: `.osc/runs/${runId}/run.json`, run_id: runId }));
    expect(report.links).toContainEqual(expect.objectContaining({ type: 'release_note', status: 'local', reference: '.osc/releases/2026-05-27-001-full.md' }));
    expect(report.links).toContainEqual(expect.objectContaining({ type: 'pr_reference', status: 'external', reference: 'https://github.com/example/repo/pull/42' }));
    expect(report.links).toContainEqual(expect.objectContaining({ type: 'issue_reference', status: 'external', reference: 'https://github.com/example/repo/issues/24' }));
    expect(formatTraceReport(report)).toContain(`[local] run_packet: .osc/runs/${runId}/run.json`);
    expect(formatTraceReport(report)).toContain('[external] pr_reference: https://github.com/example/repo/pull/42');
  });

  it('labels missing local chain links without failing trace construction', () => {
    const root = tempRepo();
    writePlan(root, 'active', '002-partial');

    const report = buildTrace(root, '002-partial');

    expect(report.plan.stage).toBe('active');
    expect(report.links).toContainEqual(expect.objectContaining({ type: 'run_packet', status: 'missing' }));
    expect(report.links).toContainEqual(expect.objectContaining({ type: 'release_note', status: 'missing' }));
    expect(report.summary.missing).toBeGreaterThanOrEqual(2);
  });

  it('keeps slug matching exact and includes weak local mentions only when requested', () => {
    const root = tempRepo();
    writePlan(root, 'done', '001-foo');
    writePlan(root, 'done', '001-foo-bar');
    writeRun(root, '001-foo-bar');
    writeRelease(root, '001-foo-bar');
    writeFileSync(join(root, '.osc/releases/2026-05-27-related.md'), '# Related\n\nThis note mentions 001-foo in prose only.\n');

    const defaultReport = buildTrace(root, '001-foo');
    expect(defaultReport.links.some((link) => link.reference.includes('001-foo-bar'))).toBe(false);
    expect(defaultReport.links.some((link) => link.status === 'unverified')).toBe(false);

    const withUnverified = buildTrace(root, '001-foo', { includeUnverified: true });
    expect(withUnverified.links).toContainEqual(expect.objectContaining({
      type: 'generic_reference',
      status: 'unverified',
      reference: '.osc/releases/2026-05-27-related.md',
    }));
  });

  it('emits parseable JSON from the CLI without human preamble', () => {
    const root = tempRepo();
    writePlan(root, 'done', '003-json');
    writeRun(root, '003-json');
    writeRelease(root, '003-json');

    const result = runCli(root, ['trace', '003-json', '--json']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const parsed = JSON.parse(result.stdout);
    expect(parsed.schema).toBe('open-scaffold.trace.v1');
    expect(parsed.query).toEqual({ plan_slug: '003-json', include_unverified: false });
    expect(parsed.plan.slug).toBe('003-json');
    expect(parsed.links.map((link: { status: string }) => link.status)).toContain('local');
    expect(parsed.links.map((link: { status: string }) => link.status)).toContain('external');
  });

  it('rejects unsafe slugs and unknown options with usage errors', () => {
    const root = tempRepo();

    const unsafe = runCli(root, ['trace', '../secret']);
    expect(unsafe.status).toBe(2);
    expect(unsafe.stderr).toContain('Unsafe plan slug: ../secret');

    const unknown = runCli(root, ['trace', '001-demo', '--network']);
    expect(unknown.status).toBe(2);
    expect(unknown.stderr).toContain('Unknown option for trace: --network');
  });

  it('stays read-only while tracing from a subdirectory', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'src'), { recursive: true });
    writePlan(root, 'done', '004-subdir');
    writeRun(root, '004-subdir');
    writeRelease(root, '004-subdir');
    const before = readdirSync(join(root, '.osc/releases')).join('\n');

    const result = spawnSync(tsx, [cli, 'trace', '004-subdir'], { cwd: join(root, 'src'), encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Path: .osc/plans/done/004-subdir.md');
    expect(existsSync(join(root, 'src/.osc'))).toBe(false);
    expect(readdirSync(join(root, '.osc/releases')).join('\n')).toBe(before);
  });

  it('sanitizes control characters in human-readable output', () => {
    const root = tempRepo();
    const esc = '\u001b';
    const dcs = '\u0090';
    const planPath = join(root, '.osc/plans/done/005-control.md');
    writeFileSync(planPath, `# Plan: 005-control

## Status

done${esc}[31m${dcs}

## Context

Fixture context.

## Goal

Replay the local work record.

## Constraints / Out of scope

- Local-only fixture.

## Files to touch

- Fixture files.

## Acceptance criteria

- [x] AC1 is backed.

## Verification steps

1. Run trace.

## Open questions

- None.
`);
    writeRun(root, '005-control', `20260527T120000Z-005-control-${esc}[31m${dcs}run`);

    const rendered = formatTraceReport(buildTrace(root, '005-control'));

    expect(rendered).toContain('Status: done');
    expect(rendered).not.toMatch(/[\u001B\u0090-\u009F]/);
  });

  it('skips symlinked or broken trace directories instead of traversing outside the scaffold root', () => {
    const root = tempRepo();
    writePlan(root, 'done', '006-symlinked');
    const outside = mkdtempSync(join(tmpdir(), 'osc-trace-outside-'));
    mkdirSync(join(outside, 'run-outside'), { recursive: true });
    writeFileSync(join(outside, 'run-outside/run.json'), JSON.stringify({ schemaVersion: 'open-scaffold.run.v1', runId: 'outside', plan: { slug: '006-symlinked' } }, null, 2));
    rmSync(join(root, '.osc/runs'), { recursive: true, force: true });
    symlinkSync(outside, join(root, '.osc/runs'), 'dir');
    mkdirSync(join(outside, 'releases-outside'), { recursive: true });
    writeFileSync(join(outside, 'releases-outside/2026-05-27-006-symlinked.md'), '- Source plan: .osc/plans/done/006-symlinked.md\n');
    rmSync(join(root, '.osc/releases'), { recursive: true, force: true });
    symlinkSync(join(outside, 'releases-outside'), join(root, '.osc/releases'), 'dir');

    const report = buildTrace(root, '006-symlinked');

    expect(report.links).toContainEqual(expect.objectContaining({ type: 'run_packet', status: 'missing' }));
    expect(report.links).toContainEqual(expect.objectContaining({ type: 'release_note', status: 'missing' }));
    expect(report.links.some((link) => link.reference.includes('run-outside'))).toBe(false);
    expect(report.warnings.map((warning) => warning.code)).toContain('unsafe_runs_dir');
    expect(report.warnings.map((warning) => warning.code)).toContain('unsafe_releases_dir');
  });
});
