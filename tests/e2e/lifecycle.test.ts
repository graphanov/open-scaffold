import { describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = resolve(process.cwd());
const fixtureRoot = join(repoRoot, 'examples/lifecycle-e2e-smoke');

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function filesUnder(root: string): string[] {
  const out: string[] = [];
  function visit(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else out.push(path);
    }
  }
  visit(root);
  return out;
}

describe('lifecycle E2E smoke fixture', () => {
  it('proves a fresh downstream project can plan, verify, record evidence, close, and pass final verification', () => {
    const startedAt = Date.now();
    const workdir = join(tmpdir(), `osc-lifecycle-smoke-${startedAt}`);
    mkdirSync(dirname(workdir), { recursive: true });
    cpSync(fixtureRoot, workdir, { recursive: true });

    cpSync(join(repoRoot, 'verify.sh'), join(workdir, 'verify.sh'));
    cpSync(join(repoRoot, 'close.sh'), join(workdir, 'close.sh'));

    expect(existsSync(join(workdir, '.osc-dev'))).toBe(false);
    expect(readFileSync(join(workdir, 'MISSION.md'), 'utf8')).not.toContain('Open Scaffold is a runtime-neutral');
    expect(existsSync(join(workdir, '.osc/plans/active/001-add-note-command.md'))).toBe(true);

    const projectTestOutput = run('bash', ['test.sh'], workdir);
    expect(projectTestOutput).toContain('tiny-notes test passed');

    const verifyBeforeClose = run('bash', ['verify.sh', '--standard'], workdir);
    expect(verifyBeforeClose).toContain('0 fail');

    const evidencePath = join(workdir, '.osc/releases/001-add-note-command.md');
    writeFileSync(evidencePath, `# Release / Evidence Note: add note command

## Summary

The tiny-notes CLI can append a note to notes.txt.

## Traceability

- Plan: .osc/plans/active/001-add-note-command.md
- Project verification: bash test.sh
- Scaffold verification: bash verify.sh --standard

## Verification

- bash test.sh -> tiny-notes test passed
- bash verify.sh --standard -> 0 fail

## Outcome

Lifecycle smoke evidence recorded before closing the plan.
`);

    const closeOutput = run('bash', ['close.sh', '001-add-note-command', '--message', 'tiny-notes lifecycle smoke completed'], workdir);
    expect(closeOutput).toContain('Closed: 001-add-note-command');

    expect(existsSync(join(workdir, '.osc/plans/active/001-add-note-command.md'))).toBe(false);
    expect(existsSync(join(workdir, '.osc/plans/done/001-add-note-command.md'))).toBe(true);
    expect(readdirSync(join(workdir, '.osc/plans/active')).filter((name) => name !== '.gitkeep')).toEqual([]);

    const mission = readFileSync(join(workdir, 'MISSION.md'), 'utf8');
    expect(mission).toContain('closed 001-add-note-command');

    const evidence = readFileSync(evidencePath, 'utf8');
    expect(evidence).toContain('bash test.sh');
    expect(evidence).toContain('bash verify.sh --standard');

    const verifyAfterClose = run('bash', ['verify.sh', '--standard'], workdir);
    expect(verifyAfterClose).toContain('0 fail');

    for (const path of filesUnder(workdir)) {
      const text = readFileSync(path, 'utf8');
      expect(text).not.toContain('/Users/danimal');
      expect(text).not.toContain('Daniel Command Center');
    }
  });
});
