import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempDir(prefix = 'osc-tasks-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function initializedScaffold() {
  const target = tempDir();
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });
  writeFileSync(join(target, 'MISSION.md'), '# Mission\n\nTest project mission.\n');
  return target;
}

function runOsc(cwd: string, args: string[]): string {
  return execFileSync(tsx, [cli, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

describe('osc task local database', () => {
  it('lists gracefully before a task database exists', () => {
    const target = initializedScaffold();

    const human = runOsc(target, ['task', 'list']);
    const json = runOsc(target, ['task', 'list', '--json']);

    expect(human).toContain('No tasks yet. Create one with `osc task new <title>`');
    expect(JSON.parse(json)).toEqual([]);
    expect(existsSync(join(target, '.osc/tasks.db'))).toBe(false);
  }, 20_000);

  it('creates, filters, shows, comments, links, and persists tasks across CLI invocations', () => {
    const target = initializedScaffold();

    const created = runOsc(target, ['task', 'new', 'Fix login redirect bug', '--priority', 'high', '--plan', '050-npm-publish']);
    expect(created).toContain('Created task T-001');
    expect(existsSync(join(target, '.osc/tasks.db'))).toBe(true);

    const all = JSON.parse(runOsc(target, ['task', 'list', '--json'])) as Array<Record<string, unknown>>;
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      id: 'T-001',
      title: 'Fix login redirect bug',
      status: 'todo',
      priority: 'high',
      plan: '050-npm-publish',
    });
    expect(typeof all[0].createdAt).toBe('string');

    expect(JSON.parse(runOsc(target, ['task', 'list', '--status', 'todo', '--json']))).toHaveLength(1);
    expect(JSON.parse(runOsc(target, ['task', 'list', '--priority', 'high', '--json']))).toHaveLength(1);
    expect(JSON.parse(runOsc(target, ['task', 'list', '--plan', '050-npm-publish', '--json']))).toHaveLength(1);
    expect(JSON.parse(runOsc(target, ['task', 'list', '--status', 'done', '--json']))).toEqual([]);

    const table = runOsc(target, ['task', 'list']);
    expect(table).toContain('T-001');
    expect(table).toContain('todo');
    expect(table).toContain('high');
    expect(table).toContain('Fix login redirect bug');
    expect(table).toContain('050-npm-publish');

    runOsc(target, ['task', 'comment', 'T-001', 'Investigated: the redirect uses window.location not router.push']);
    runOsc(target, ['task', 'link', 'T-001', '--plan', '060-mcp-server']);
    const shown = runOsc(target, ['task', 'show', 'T-001']);
    expect(shown).toContain('Task T-001');
    expect(shown).toContain('Plan: 060-mcp-server');
    expect(shown).toContain('Investigated: the redirect uses window.location not router.push');

    const persisted = JSON.parse(runOsc(target, ['task', 'list', '--plan', '060-mcp-server', '--json'])) as Array<Record<string, unknown>>;
    expect(persisted).toHaveLength(1);
    expect(persisted[0].id).toBe('T-001');
  }, 20_000);

  it('supports status transitions and status summary integration', () => {
    const target = initializedScaffold();
    runOsc(target, ['task', 'new', 'First task']);
    runOsc(target, ['task', 'new', 'Second task', '--priority', 'low']);

    expect(runOsc(target, ['task', 'claim', 'T-001'])).toContain('T-001 is now in-progress');
    expect(runOsc(target, ['task', 'complete', 'T-001'])).toContain('T-001 is now done');
    expect(runOsc(target, ['task', 'start', 'T-002'])).toContain('T-002 is now in-progress');
    expect(runOsc(target, ['task', 'block', 'T-002', '--reason', 'Waiting for npm access token'])).toContain('T-002 is now blocked');

    const blockedShow = runOsc(target, ['task', 'show', 'T-002']);
    expect(blockedShow).toContain('Status: blocked');
    expect(blockedShow).toContain('Blocked reason: Waiting for npm access token');

    runOsc(target, ['task', 'new', 'Third task']);
    expect(runOsc(target, ['task', 'cancel', 'T-003'])).toContain('T-003 is now cancelled');

    const summary = runOsc(target, ['status']);
    expect(summary).toContain('Tasks: 1 done, 1 blocked, 1 cancelled');

    rmSync(join(target, '.osc/tasks.db'), { force: true });
    expect(runOsc(target, ['status'])).not.toContain('Tasks:');
  }, 20_000);

  it('rejects invalid task options with clear errors', () => {
    const target = initializedScaffold();

    const badPriority = spawnSync(tsx, [cli, 'task', 'new', 'Bad priority', '--priority', 'urgent'], { cwd: target, encoding: 'utf8' });
    expect(badPriority.status).toBe(2);
    expect(badPriority.stderr).toContain('Invalid priority');

    runOsc(target, ['task', 'new', 'Needs block']);
    const missingReason = spawnSync(tsx, [cli, 'task', 'block', 'T-001'], { cwd: target, encoding: 'utf8' });
    expect(missingReason.status).toBe(2);
    expect(missingReason.stderr).toContain('Missing required option: --reason <text>');

    const missingTask = spawnSync(tsx, [cli, 'task', 'show', 'T-999'], { cwd: target, encoding: 'utf8' });
    expect(missingTask.status).toBe(1);
    expect(missingTask.stderr).toContain('Task not found: T-999');
  }, 20_000);

  it('ships the task database ignore rule with initialized scaffolds', () => {
    const target = initializedScaffold();

    const ignore = readFileSync(join(target, '.osc/.gitignore'), 'utf8');

    expect(ignore).toContain('tasks.db*');
  }, 20_000);
});
