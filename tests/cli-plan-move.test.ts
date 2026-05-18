import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempDir(prefix = 'osc-cli-plan-move-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function initializedScaffold() {
  const target = tempDir();
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });
  defineMission(target);
  return target;
}

function defineMission(target: string) {
  writeFileSync(join(target, 'MISSION.md'), [
    '# Mission',
    '',
    'Test project mission.',
    '',
    '## Goals',
    '',
    '- Test plan movement.',
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

describe('osc plan move CLI', () => {
  it('moves a backlog plan and its amendments to active while updating the parent status', () => {
    const target = initializedScaffold();
    execFileSync(tsx, [cli, 'plan', 'new', '001-first-task', '--stage', 'backlog'], { cwd: target, encoding: 'utf8' });
    execFileSync(tsx, [cli, 'amend', '001-first-task', '--message', 'Scope changed'], { cwd: target, encoding: 'utf8' });

    const output = execFileSync(tsx, [cli, 'plan', 'move', '001-first-task', '--to', 'active'], { cwd: target, encoding: 'utf8' });

    expect(output).toContain('Moved plan: 001-first-task');
    expect(output).toContain('From: backlog');
    expect(output).toContain('To: active');
    const activePlan = join(target, '.osc/plans/active/001-first-task.md');
    expect(existsSync(activePlan)).toBe(true);
    expect(existsSync(join(target, '.osc/plans/active/001-first-task-amendment-1.md'))).toBe(true);
    expect(existsSync(join(target, '.osc/plans/backlog/001-first-task.md'))).toBe(false);
    expect(existsSync(join(target, '.osc/plans/backlog/001-first-task-amendment-1.md'))).toBe(false);
    expect(readFileSync(activePlan, 'utf8')).toContain('## Status\n\nactive');
  }, 20_000);

  it('moves active plans to blocked or backlog and creates missing destination folders', () => {
    const target = initializedScaffold();
    execFileSync(tsx, [cli, 'plan', 'new', '002-second-task', '--stage', 'active'], { cwd: target, encoding: 'utf8' });
    rmSync(join(target, '.osc/plans/blocked'), { recursive: true, force: true });

    execFileSync(tsx, [cli, 'plan', 'move', '002-second-task', '--to', 'blocked'], { cwd: target, encoding: 'utf8' });
    const blockedPlan = join(target, '.osc/plans/blocked/002-second-task.md');
    expect(existsSync(blockedPlan)).toBe(true);
    expect(readFileSync(blockedPlan, 'utf8')).toContain('## Status\n\nblocked');

    execFileSync(tsx, [cli, 'plan', 'move', '002-second-task', '--to', 'backlog'], { cwd: target, encoding: 'utf8' });
    const backlogPlan = join(target, '.osc/plans/backlog/002-second-task.md');
    expect(existsSync(backlogPlan)).toBe(true);
    expect(readFileSync(backlogPlan, 'utf8')).toContain('## Status\n\nbacklog');
    expect(existsSync(blockedPlan)).toBe(false);
  }, 20_000);

  it('refuses unsafe slugs, missing plans, done destinations, and unsupported options', () => {
    const target = initializedScaffold();
    execFileSync(tsx, [cli, 'plan', 'new', '003-third-task', '--stage', 'active'], { cwd: target, encoding: 'utf8' });

    const doneTarget = spawnSync(tsx, [cli, 'plan', 'move', '003-third-task', '--to', 'done'], { cwd: target, encoding: 'utf8' });
    expect(doneTarget.status).toBe(2);
    expect(doneTarget.stderr).toContain('Use osc close');

    const invalidTarget = spawnSync(tsx, [cli, 'plan', 'move', '003-third-task', '--to', 'later'], { cwd: target, encoding: 'utf8' });
    expect(invalidTarget.status).toBe(2);
    expect(invalidTarget.stderr).toContain('Invalid value for --to');

    const unsafe = spawnSync(tsx, [cli, 'plan', 'move', '../outside', '--to', 'active'], { cwd: target, encoding: 'utf8' });
    expect(unsafe.status).toBe(2);
    expect(unsafe.stderr).toContain('Unsafe slug');

    const missing = spawnSync(tsx, [cli, 'plan', 'move', '999-missing', '--to', 'active'], { cwd: target, encoding: 'utf8' });
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('Plan not found');

    const extra = spawnSync(tsx, [cli, 'plan', 'move', '003-third-task', '--to', 'active', '--force'], { cwd: target, encoding: 'utf8' });
    expect(extra.status).toBe(2);
    expect(extra.stderr).toContain('Unknown option for plan move');
  }, 20_000);
});
