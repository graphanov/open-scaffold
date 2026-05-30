import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { computePlanStats, formatPlanStats } from '../src/plan-stats.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempDir(prefix = 'osc-cli-plan-stats-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function defineMission(target: string) {
  writeFileSync(join(target, 'MISSION.md'), [
    '# Mission',
    '',
    'Test project mission.',
    '',
    '## Goals',
    '',
    '- Test plan stats.',
    '',
    '## Non-Goals',
    '',
    '- Do not execute runtime work.',
    '',
    '## Changelog',
    '',
    '<!-- append YYYY-MM-DD entries below this line -->',
    '',
  ].join('\n'));
}

function initializedScaffold() {
  const target = tempDir();
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });
  defineMission(target);
  return target;
}

function newPlan(target: string, slug: string, stage: string) {
  execFileSync(tsx, [cli, 'plan', 'new', slug, '--stage', stage], { cwd: target, encoding: 'utf8' });
}

function setMtime(target: string, stage: string, slug: string, when: Date) {
  const path = join(target, '.osc/plans', stage, `${slug}.md`);
  utimesSync(path, when, when);
}

describe('osc plan stats logic', () => {
  it('identifies the oldest active plan by modification time, not by slug order', () => {
    const target = initializedScaffold();
    newPlan(target, '010-recent', 'active');
    newPlan(target, '020-stale', 'active');
    // 020-stale sorts AFTER 010-recent alphabetically but is older by mtime, so a
    // correct "least recently modified" result must pick 020-stale.
    setMtime(target, 'active', '010-recent', new Date('2024-06-01T00:00:00Z'));
    setMtime(target, 'active', '020-stale', new Date('2021-06-01T00:00:00Z'));

    const stats = computePlanStats(target);

    expect(stats.counts.active).toBe(2);
    expect(stats.total).toBe(2);
    expect(stats.oldestActive?.slug).toBe('020-stale');
    expect(stats.oldestActive?.path).toBe('.osc/plans/active/020-stale.md');
    expect(formatPlanStats(stats)).toContain('Oldest active plan: 020-stale');
  }, 20_000);

  it('reports no oldest active plan when there are no active plans', () => {
    const target = initializedScaffold();
    newPlan(target, '030-backlog', 'backlog');

    const stats = computePlanStats(target);

    expect(stats.counts.active).toBe(0);
    expect(stats.counts.backlog).toBe(1);
    expect(stats.oldestActive).toBeNull();
    expect(formatPlanStats(stats)).toContain('Oldest active plan: none (no active plans)');
  }, 20_000);

  it('throws (rather than reporting an all-zero portfolio) when run outside an Open Scaffold root', () => {
    // A bare temp dir with no .osc/plans is NOT a scaffold. Reporting total: 0
    // here would be indistinguishable from a real empty scaffold and would give
    // misleading data in a wrong-directory CI/scripting context, so the command
    // must fail the same way other plan-scoped commands (plan graph/validate) do.
    const notAScaffold = tempDir('osc-plan-stats-noroot-');

    expect(() => computePlanStats(notAScaffold)).toThrow(/No Open Scaffold root found/);
  }, 20_000);
});

describe('osc plan stats CLI', () => {
  it('prints per-stage counts, the total, and the oldest active plan', () => {
    const target = initializedScaffold();
    newPlan(target, '010-active-one', 'active');
    newPlan(target, '020-active-two', 'active');
    newPlan(target, '030-backlog', 'backlog');
    newPlan(target, '040-blocked', 'blocked');
    newPlan(target, '050-doomed', 'active');
    execFileSync(tsx, [cli, 'close', '050-doomed'], { cwd: target, encoding: 'utf8' });
    setMtime(target, 'active', '010-active-one', new Date('2024-06-01T00:00:00Z'));
    setMtime(target, 'active', '020-active-two', new Date('2021-06-01T00:00:00Z'));

    const output = execFileSync(tsx, [cli, 'plan', 'stats'], { cwd: target, encoding: 'utf8' });

    expect(output).toMatch(/^active:\s+2$/m);
    expect(output).toMatch(/^backlog:\s+1$/m);
    expect(output).toMatch(/^blocked:\s+1$/m);
    expect(output).toMatch(/^done:\s+1$/m);
    expect(output).toMatch(/^total:\s+5$/m);
    expect(output).toContain('Oldest active plan: 020-active-two');
  }, 20_000);

  it('emits the same information as parseable JSON with --json', () => {
    const target = initializedScaffold();
    newPlan(target, '010-active-one', 'active');
    newPlan(target, '020-active-two', 'active');
    newPlan(target, '030-backlog', 'backlog');
    setMtime(target, 'active', '010-active-one', new Date('2024-06-01T00:00:00Z'));
    setMtime(target, 'active', '020-active-two', new Date('2021-06-01T00:00:00Z'));

    const output = execFileSync(tsx, [cli, 'plan', 'stats', '--json'], { cwd: target, encoding: 'utf8' });
    const parsed = JSON.parse(output);

    expect(parsed.counts).toEqual({ active: 2, backlog: 1, blocked: 0, done: 0 });
    expect(parsed.total).toBe(3);
    expect(parsed.oldestActive.slug).toBe('020-active-two');
    expect(parsed.oldestActive.path).toBe('.osc/plans/active/020-active-two.md');
    expect(typeof parsed.oldestActive.modifiedIso).toBe('string');
  }, 20_000);

  it('says there are no active plans clearly instead of erroring (text and JSON)', () => {
    const target = initializedScaffold();
    newPlan(target, '030-backlog', 'backlog');

    const text = execFileSync(tsx, [cli, 'plan', 'stats'], { cwd: target, encoding: 'utf8' });
    expect(text).toMatch(/^active:\s+0$/m);
    expect(text).toContain('Oldest active plan: none (no active plans)');

    const json = execFileSync(tsx, [cli, 'plan', 'stats', '--json'], { cwd: target, encoding: 'utf8' });
    const parsed = JSON.parse(json);
    expect(parsed.oldestActive).toBeNull();
    expect(parsed.total).toBe(1);
  }, 20_000);

  it('rejects unknown options with exit code 2', () => {
    const target = initializedScaffold();

    const result = spawnSync(tsx, [cli, 'plan', 'stats', '--bogus'], { cwd: target, encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Unknown option for plan stats');
  }, 20_000);

  it('fails with a non-zero exit and the scaffold-root error when run outside a scaffold', () => {
    const notAScaffold = tempDir('osc-plan-stats-cli-noroot-');

    const result = spawnSync(tsx, [cli, 'plan', 'stats'], { cwd: notAScaffold, encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('No Open Scaffold root found');
    expect(result.stdout).not.toContain('total:');
  }, 20_000);
});
