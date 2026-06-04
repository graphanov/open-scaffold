import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempDir(prefix = 'osc-run-dry-run-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function initializedScaffold() {
  const target = tempDir();
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });
  writeFileSync(join(target, 'MISSION.md'), '# Mission\n\nTest repo mission for dry-run previews.\n', 'utf8');
  return target;
}

function scaffoldWithUnsetMission() {
  const target = tempDir();
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });
  return target;
}

function writePlan(root: string, slug: string, body: string) {
  const path = join(root, '.osc/plans/active', `${slug}.md`);
  writeFileSync(path, body, 'utf8');
  return path;
}

const validPlan = `# Plan: 001-dry-run-demo

## Status

active

## Context

A valid plan for previewing a run packet.

## Goal

Preview run artifacts without writing a run directory.

## Constraints / Out of scope

- Do not spawn a runtime.

## Files to touch

- src/demo.ts
- tests/demo.test.ts

## Acceptance criteria

- [ ] Dry-run emits a preview.
- [ ] Dry-run leaves .osc/runs unchanged.

## Verification steps

1. Run npm test.
2. Run ./verify.sh --strict.

## Open questions

None.
`;

const invalidPlan = `# Plan: 002-bad-dry-run

## Status

active

## Context

This plan intentionally lacks dispatch-ready context.

## Goal


## Constraints / Out of scope

- None.

## Files to touch

- src/demo.ts

## Acceptance criteria


## Verification steps


## Open questions

- BLOCKING: Which acceptance criteria should this satisfy?
`;

describe('osc run --dry-run', () => {
  it('prints run-specific help instead of treating --help as a plan path', () => {
    const result = spawnSync(tsx, [cli, 'run', '--help'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: osc run <plan-path> [--dry-run] [--json] [run binding options]');
    expect(result.stdout).toContain('Dry-run options:');
  });

  it('prints a run preview and summary without creating .osc/runs files', () => {
    const target = initializedScaffold();
    const planPath = writePlan(target, '001-dry-run-demo', validPlan);
    const before = existsSync(join(target, '.osc/runs')) ? readdirSync(join(target, '.osc/runs')) : [];

    const result = spawnSync(tsx, [cli, 'run', planPath, '--dry-run', '--runtime', 'omx', '--workflow', 'plan'], { cwd: target, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Dry-run run.json:');
    expect(result.stdout).toContain('"schemaVersion": "open-scaffold.run.v1"');
    expect(result.stdout).toContain('Dry-run package.md:');
    expect(result.stdout).toContain('Would create run');
    expect(result.stdout).toContain('executor omx-codex');
    expect(result.stdout).toContain('workflow plan');
    expect(result.stdout).toContain('harness skill $ralplan');
    expect(result.stdout).toContain('src/demo.ts');
    const after = existsSync(join(target, '.osc/runs')) ? readdirSync(join(target, '.osc/runs')) : [];
    expect(after).toEqual(before);
  });

  it('supports JSON-only dry-run output for machine consumers', () => {
    const target = initializedScaffold();
    const planPath = writePlan(target, '001-dry-run-demo', validPlan);

    const result = spawnSync(tsx, [cli, 'run', planPath, '--dry-run', '--json', '--executor', 'plain-agent', '--workflow', 'execute'], { cwd: target, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const parsed = JSON.parse(result.stdout);
    expect(parsed.run.schemaVersion).toBe('open-scaffold.run.v1');
    expect(parsed.run.executor).toMatchObject({ lane: 'plain-agent', spawning: false });
    expect(parsed.run.runtimeSelection).toMatchObject({ workflow: 'execute' });
    expect(parsed.packageMarkdown).toContain('# Open Scaffold Prompt: Single Session');
    expect(parsed.filesToTouch).toEqual(['src/demo.ts', 'tests/demo.test.ts']);
  });

  it('resolves scaffold root from the plan path when run from a subdirectory', () => {
    const target = initializedScaffold();
    const planPath = writePlan(target, '001-dry-run-demo', validPlan);
    const subdir = join(target, 'src');
    mkdirSync(subdir, { recursive: true });

    const result = spawnSync(tsx, [cli, 'run', planPath, '--dry-run', '--json', '--runtime', 'omx', '--workflow', 'plan'], { cwd: subdir, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const parsed = JSON.parse(result.stdout);
    expect(parsed.run.packageQuality.executable).toBe(true);
    expect(parsed.run.packageQuality.blockers).toEqual([]);
    expect(existsSync(join(subdir, '.osc/runs'))).toBe(false);

    const writeResult = spawnSync(tsx, [cli, 'run', planPath, '--runtime', 'omx', '--workflow', 'plan'], { cwd: subdir, encoding: 'utf8' });
    expect(writeResult.status).toBe(0);
    const runsDir = join(subdir, '.osc/runs');
    const runId = readdirSync(runsDir).sort().at(-1) as string;
    const manifest = JSON.parse(readFileSync(join(runsDir, runId, 'run.json'), 'utf8'));
    expect(parsed.run.artifacts.runDir.replace(parsed.run.runId, '<run>')).toBe(manifest.artifacts.runDir.replace(manifest.runId, '<run>'));
    expect(parsed.run.artifacts.manifest.replace(parsed.run.runId, '<run>')).toBe(manifest.artifacts.manifest.replace(manifest.runId, '<run>'));
    expect(manifest.packageQuality.executable).toBe(true);
  });

  it('keeps dry-run artifact paths aligned with write-mode run paths from the caller cwd', () => {
    const target = initializedScaffold();
    const planPath = writePlan(target, '001-dry-run-demo', validPlan);
    const subdir = join(target, 'src');
    mkdirSync(subdir, { recursive: true });

    const dryRun = spawnSync(tsx, [cli, 'run', planPath, '--dry-run', '--json'], { cwd: subdir, encoding: 'utf8' });
    expect(dryRun.status).toBe(0);
    const preview = JSON.parse(dryRun.stdout);
    expect(preview.run.artifacts.runDir).toMatch(/^\.osc\/runs\//);
    expect(existsSync(join(subdir, '.osc/runs'))).toBe(false);

    const writeRun = spawnSync(tsx, [cli, 'run', planPath], { cwd: subdir, encoding: 'utf8' });
    expect(writeRun.status).toBe(0);
    expect(writeRun.stderr).toBe('');
    expect(writeRun.stdout).toContain(join(subdir, '.osc/runs'));
    expect(existsSync(join(subdir, '.osc/runs'))).toBe(true);
  });

  it('reports non-executable dry-runs without writing artifacts', () => {
    const target = initializedScaffold();
    const planPath = writePlan(target, '002-bad-dry-run', invalidPlan);

    const result = spawnSync(tsx, [cli, 'run', planPath, '--dry-run', '--json'], { cwd: target, encoding: 'utf8' });

    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.run.packageQuality.executable).toBe(false);
    expect(parsed.run.packageQuality.blockers).toContain('missing goal');
    expect(parsed.run.packageQuality.blockers).toContain('missing acceptance criteria');
    expect(parsed.run.packageQuality.blockers).toContain('missing verification steps');
    expect(parsed.run.packageQuality.blockers).toContain('blocking open questions present');
    expect(existsSync(join(target, '.osc/runs'))).toBe(false);
  });

  it('refuses to write non-executable run artifacts in normal mode', () => {
    const target = initializedScaffold();
    const planPath = writePlan(target, '002-bad-dry-run', invalidPlan);

    const result = spawnSync(tsx, [cli, 'run', planPath], { cwd: target, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Run package is not executable');
    expect(result.stderr).toContain('missing verification steps');
    expect(existsSync(join(target, '.osc/runs'))).toBe(false);
  });

  it('treats external-runner verification as a write-mode blocker', () => {
    const target = initializedScaffold();
    const deferringPlan = validPlan.replace('1. Run npm test.\n2. Run ./verify.sh --strict.', '1. External runner executes the scorer after this turn.');
    const planPath = writePlan(target, '003-defers-proof', deferringPlan);

    const result = spawnSync(tsx, [cli, 'run', planPath], { cwd: target, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('verification steps defer execution outside the run packet');
    expect(existsSync(join(target, '.osc/runs'))).toBe(false);
  });

  it('treats an undefined mission as a dry-run blocker', () => {
    const target = scaffoldWithUnsetMission();
    const planPath = writePlan(target, '001-dry-run-demo', validPlan);

    const result = spawnSync(tsx, [cli, 'run', planPath, '--dry-run', '--json'], { cwd: target, encoding: 'utf8' });

    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.run.packageQuality.executable).toBe(false);
    expect(parsed.run.packageQuality.blockers).toContain('undefined mission');
    expect(existsSync(join(target, '.osc/runs'))).toBe(false);
  });

  it('keeps missing-plan dry-runs read-only and reports the missing path', () => {
    const target = initializedScaffold();
    const result = spawnSync(tsx, [cli, 'run', '.osc/plans/active/nope.md', '--dry-run'], { cwd: target, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Plan not found:');
    expect(existsSync(join(target, '.osc/runs'))).toBe(false);
  });
});
