import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { formatDoctorReport, runDoctor } from '../src/doctor.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

const samplePlan = `# Plan: sample

## Status

active

## Context

Need a thing.

## Goal

Ship a thing.

## Constraints / Out of scope

- No spawning agents.

## Files to touch

- \`README.md\` — docs

## Acceptance criteria

- [ ] It works.

## Verification steps

1. Run tests.

## Open questions

- None.
`;

function tempRepo(prefix = 'osc-doctor-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  for (const stage of ['active', 'backlog', 'blocked', 'done']) mkdirSync(join(root, `.osc/plans/${stage}`), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild the thing.\n\n## Changelog\n\n<!-- append YYYY-MM-DD entries below this line -->\n');
  writeFileSync(join(root, '.osc/releases/README.md'), '# Releases\n');
  writeFileSync(join(root, 'AGENTS.md'), '<!-- PAIRED VIEW -->\n\n# Agents\n\n## Shared\n\nSame.\n');
  writeFileSync(join(root, 'CLAUDE.md'), '<!-- PAIRED VIEW -->\n\n# Claude\n\n## Shared\n\nSame.\n');
  return root;
}

function read(path: string) {
  return readFileSync(path, 'utf8');
}

describe('osc doctor auto-fix', () => {
  it('dry-runs and fixes plan status alignment without touching plan body sections', () => {
    const root = tempRepo();
    const planPath = join(root, '.osc/plans/active/001-sample.md');
    writeFileSync(planPath, samplePlan.replace('## Status\n\nactive', '## Status\n\nbacklog'));

    const dryRun = runDoctor(root, { fix: true, dryRun: true });
    const dryRunReport = formatDoctorReport(dryRun, { fix: true, dryRun: true });

    expect(dryRunReport).toContain('DRY-RUN status-alignment');
    expect(read(planPath)).toContain('## Status\n\nbacklog');
    expect(read(planPath)).toContain('Ship a thing.');

    const fixed = runDoctor(root, { fix: true });

    expect(formatDoctorReport(fixed, { fix: true })).toContain('FIXED status-alignment');
    expect(read(planPath)).toContain('## Status\n\nactive');
    expect(read(planPath)).toContain('## Goal\n\nShip a thing.');
    expect(runDoctor(root).diagnoses.map((item) => item.check)).not.toContain('status-alignment');
  });

  it('backfills missing MISSION changelog entries for existing amendment files only in the changelog', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/active/001-sample.md'), samplePlan);
    writeFileSync(join(root, '.osc/plans/active/001-sample-amendment-1.md'), '# Amendment 1\n');

    const result = runDoctor(root, { fix: true, now: new Date('2026-05-20T12:00:00') });
    const mission = read(join(root, 'MISSION.md'));

    expect(result.applied.map((item) => item.check)).toContain('changelog-gap');
    expect(mission).toContain('2026-05-20: backfilled missing changelog for 001-sample-amendment-1');
    expect(mission).toContain('see .osc/plans/active/001-sample-amendment-1.md');
    expect(mission.indexOf('## Changelog')).toBeLessThan(mission.indexOf('001-sample-amendment-1'));
  });

  it('copies a narrowly missing paired-view section without attempting broad paired-view rewrites', () => {
    const root = tempRepo();
    writeFileSync(join(root, 'CLAUDE.md'), '<!-- PAIRED VIEW -->\n\n# Claude\n\n## Shared\n\nSame.\n\n## Missing in agents\n\nCopy this section.\n');

    const dryRun = runDoctor(root, { fix: true, dryRun: true, check: 'paired-view' });
    expect(formatDoctorReport(dryRun, { fix: true, dryRun: true })).toContain('append ## Missing in agents to AGENTS.md');
    expect(read(join(root, 'AGENTS.md'))).not.toContain('Missing in agents');

    runDoctor(root, { fix: true, check: 'paired-view' });

    expect(read(join(root, 'AGENTS.md'))).toContain('## Missing in agents\n\nCopy this section.');
  });

  it('reports paired-view content conflicts as unfixable when matching sections differ', () => {
    const root = tempRepo();
    writeFileSync(join(root, 'CLAUDE.md'), '<!-- PAIRED VIEW -->\n\n# Claude\n\n## Shared\n\nDifferent.\n');

    const result = runDoctor(root, { check: 'paired-view' });

    expect(result.diagnoses).toEqual([
      expect.objectContaining({ check: 'paired-view', fixable: false, message: expect.stringContaining('manual review required') }),
    ]);
  });

  it('moves stale active plans to blocked with an annotation', () => {
    const root = tempRepo();
    const planPath = join(root, '.osc/plans/active/001-sample.md');
    writeFileSync(planPath, samplePlan);
    const old = (Date.now() - 45 * 86_400_000) / 1000;
    utimesSync(planPath, old, old);

    const result = runDoctor(root, { fix: true, check: 'stale-plan', now: new Date('2026-05-20T12:00:00'), staleDays: 30 });
    const blockedPath = join(root, '.osc/plans/blocked/001-sample.md');

    expect(result.applied.map((item) => item.check)).toContain('stale-plan');
    expect(existsSync(planPath)).toBe(false);
    expect(read(blockedPath)).toContain('blocked: moved by osc doctor --fix on 2026-05-20');
    expect(read(blockedPath)).toContain('## Status\n\nblocked');
  });

  it('creates a missing releases README', () => {
    const root = tempRepo('osc-doctor-no-readme-');
    writeFileSync(join(root, '.osc/plans/active/001-sample.md'), samplePlan);
    const readmePath = join(root, '.osc/releases/README.md');
    unlinkSync(readmePath);

    const result = runDoctor(root, { fix: true, check: 'release-readme' });

    expect(result.applied.map((item) => item.check)).toContain('release-readme');
    expect(read(readmePath)).toContain('Release / evidence notes');
  });

  it('filters by --check and --severity in the CLI', () => {
    const root = tempRepo();
    const planPath = join(root, '.osc/plans/active/001-sample.md');
    writeFileSync(planPath, samplePlan.replace('## Status\n\nactive', '## Status\n\nbacklog'));
    const old = (Date.now() - 45 * 86_400_000) / 1000;
    utimesSync(planPath, old, old);

    const staleOnly = spawnSync(tsx, [cli, 'doctor', '--check', 'stale-plan'], { cwd: root, encoding: 'utf8' });
    expect(staleOnly.status).toBe(0);
    expect(staleOnly.stdout).toContain('stale-plan');
    expect(staleOnly.stdout).not.toContain('status-alignment');

    const errorsOnly = spawnSync(tsx, [cli, 'doctor', '--severity', 'error'], { cwd: root, encoding: 'utf8' });
    expect(errorsOnly.status).toBe(0);
    expect(errorsOnly.stdout).toContain('Doctor: no issues found.');
  });

  it('documents doctor fix flags in CLI help', () => {
    const result = spawnSync(tsx, [cli, 'doctor', '--help'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: osc doctor');
    expect(result.stdout).toContain('--fix');
    expect(result.stdout).toContain('--dry-run');
    expect(result.stdout).toContain('--severity');
    expect(result.stdout).toContain('--check');
  });
});
