import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');
const CLI_TEST_TIMEOUT_MS = 20_000;

function tempDir(prefix = 'osc-cli-helpers-', base = tmpdir()) {
  return mkdtempSync(join(base, prefix));
}

function initializedScaffold() {
  const target = tempDir();
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });
  return target;
}

function todayLocalDate() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('osc plan/evidence helper CLI', () => {
  it('creates a schema-compatible active plan skeleton with explicit TODO prompts', () => {
    const target = initializedScaffold();

    const output = execFileSync(tsx, [cli, 'plan', 'new', '001-first-task', '--stage', 'active'], { cwd: target, encoding: 'utf8' });

    const planPath = join(target, '.osc/plans/active/001-first-task.md');
    const text = readFileSync(planPath, 'utf8');
    expect(output).toContain('Created plan: .osc/plans/active/001-first-task.md');
    expect(text).toContain('# Plan: 001-first-task');
    expect(text).toContain('## Status\n\nactive');
    for (const heading of ['Context', 'Goal', 'Constraints / Out of scope', 'Files to touch', 'Acceptance criteria', 'Verification steps', 'Open questions']) {
      expect(text).toContain(`## ${heading}`);
    }
    expect(text).toContain('TODO: explain why this plan exists now.');
    expect(text).toContain('- [ ] TODO: replace with a testable acceptance criterion');
    expect(text).not.toContain('It works.');
    expect(text).not.toContain('<testable bullet');
  });

  it('creates backlog and blocked plan skeletons in the requested stage folders', () => {
    const target = initializedScaffold();

    execFileSync(tsx, [cli, 'plan', 'new', '002-later-task', '--stage', 'backlog'], { cwd: target, encoding: 'utf8' });
    execFileSync(tsx, [cli, 'plan', 'new', '003-waiting-task', '--stage', 'blocked'], { cwd: target, encoding: 'utf8' });

    expect(readFileSync(join(target, '.osc/plans/backlog/002-later-task.md'), 'utf8')).toContain('## Status\n\nbacklog');
    expect(readFileSync(join(target, '.osc/plans/blocked/003-waiting-task.md'), 'utf8')).toContain('## Status\n\nblocked');
  });

  it('refuses duplicate, invalid-stage, unsafe-path, and missing-root plan requests', () => {
    const target = initializedScaffold();
    execFileSync(tsx, [cli, 'plan', 'new', '001-first-task', '--stage', 'active'], { cwd: target, encoding: 'utf8' });

    const duplicate = spawnSync(tsx, [cli, 'plan', 'new', '001-first-task', '--stage', 'active'], { cwd: target, encoding: 'utf8' });
    expect(duplicate.status).toBe(1);
    expect(duplicate.stderr).toContain('Refusing to overwrite existing plan');

    const invalidStage = spawnSync(tsx, [cli, 'plan', 'new', '002-task', '--stage', 'done'], { cwd: target, encoding: 'utf8' });
    expect(invalidStage.status).toBe(2);
    expect(invalidStage.stderr).toContain('Invalid value for --stage: done');

    const unsafe = spawnSync(tsx, [cli, 'plan', 'new', '../outside', '--stage', 'active'], { cwd: target, encoding: 'utf8' });
    expect(unsafe.status).toBe(2);
    expect(unsafe.stderr).toContain('Unsafe slug');
    expect(existsSync(join(dirname(target), 'outside.md'))).toBe(false);

    const noRoot = tempDir('osc-cli-no-root-', '/tmp');
    const missingRoot = spawnSync(tsx, [cli, 'plan', 'new', '001-first-task', '--stage', 'active'], { cwd: noRoot, encoding: 'utf8' });
    expect(missingRoot.status).toBe(1);
    expect(missingRoot.stderr).toContain('No Open Scaffold root found');
  }, CLI_TEST_TIMEOUT_MS);

  it('creates an evidence note skeleton under .osc/releases for an existing plan without false proof claims', () => {
    const target = initializedScaffold();
    execFileSync(tsx, [cli, 'plan', 'new', '001-first-task', '--stage', 'active'], { cwd: target, encoding: 'utf8' });

    const output = execFileSync(tsx, [cli, 'evidence', 'new', '001-first-task'], { cwd: target, encoding: 'utf8' });

    const relativePath = `.osc/releases/${todayLocalDate()}-001-first-task.md`;
    const evidencePath = join(target, relativePath);
    const text = readFileSync(evidencePath, 'utf8');
    expect(output).toContain(`Created evidence note: ${relativePath}`);
    expect(text).toContain('# Release / Evidence Note: 001-first-task');
    for (const heading of ['Summary', 'Traceability', 'Verification', 'Outcome', 'Follow-up']) {
      expect(text).toContain(`## ${heading}`);
    }
    expect(text).toContain('TODO: summarize what changed');
    expect(text).toContain('- Plan: TODO: .osc/plans/done/<slug>.md');
    expect(text).toContain('- TODO: command — result');
    expect(text).not.toContain('Passed.');
    expect(text).not.toContain('Shipped.');
  });

  it('refuses duplicate, missing-plan, unsafe-path, and missing-root evidence requests', () => {
    const target = initializedScaffold();
    execFileSync(tsx, [cli, 'plan', 'new', '001-first-task', '--stage', 'active'], { cwd: target, encoding: 'utf8' });
    execFileSync(tsx, [cli, 'evidence', 'new', '001-first-task'], { cwd: target, encoding: 'utf8' });

    const duplicate = spawnSync(tsx, [cli, 'evidence', 'new', '001-first-task'], { cwd: target, encoding: 'utf8' });
    expect(duplicate.status).toBe(1);
    expect(duplicate.stderr).toContain('Refusing to overwrite existing evidence note');

    const missingPlan = spawnSync(tsx, [cli, 'evidence', 'new', '999-missing-plan'], { cwd: target, encoding: 'utf8' });
    expect(missingPlan.status).toBe(1);
    expect(missingPlan.stderr).toContain('Plan not found: 999-missing-plan.md in .osc/plans/{active,backlog,blocked,done}');
    expect(existsSync(join(target, `.osc/releases/${todayLocalDate()}-999-missing-plan.md`))).toBe(false);

    const unsafe = spawnSync(tsx, [cli, 'evidence', 'new', '../outside'], { cwd: target, encoding: 'utf8' });
    expect(unsafe.status).toBe(2);
    expect(unsafe.stderr).toContain('Unsafe slug');

    const noRoot = tempDir('osc-cli-no-root-', '/tmp');
    const missingRoot = spawnSync(tsx, [cli, 'evidence', 'new', '001-first-task'], { cwd: noRoot, encoding: 'utf8' });
    expect(missingRoot.status).toBe(1);
    expect(missingRoot.stderr).toContain('No Open Scaffold root found');
  });
});
