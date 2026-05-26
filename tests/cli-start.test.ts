import { describe, expect, it } from 'vitest';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'osc-start-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/backlog'), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild a small service.\n');
  writeFileSync(join(root, '.osc/releases/README.md'), '# Evidence notes\n');
  return root;
}

function writePlan(root: string, stage = 'active', slug = '123-health-endpoint'): string {
  const planPath = join(root, `.osc/plans/${stage}/${slug}.md`);
  writeFileSync(planPath, `# Plan: ${slug}

## Status

${stage}

## Context

A user needs a simple health check.

## Goal

Add a health endpoint with tests.

## Constraints / Out of scope

- Do not change deployment infrastructure.

## Files to touch

- \`src/server.ts\` — route implementation.
- \`tests/server.test.ts\` — health endpoint coverage.

## Acceptance criteria

- [ ] Health endpoint returns 200.
- [ ] Test suite covers the route.

## Verification steps

1. Run \`npm test\`.
2. Run \`npm run build\`.

## Open questions

- None.
`);
  return planPath;
}

function fileSnapshot(root: string): string[] {
  const result: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else result.push(`${relative(root, full)}:${stat.size}:${stat.mtimeMs}`);
    }
  };
  walk(root);
  return result.sort();
}

describe('osc start', () => {
  it('prints a Codex/OMX paste-ready no-spawn handoff from a plan slug', () => {
    const root = tempRepo();
    try {
      writePlan(root);
      const fakeBin = join(root, 'fake-bin');
      mkdirSync(fakeBin);
      for (const name of ['omx', 'codex']) {
        const fake = join(fakeBin, name);
        writeFileSync(fake, `#!/usr/bin/env bash\ntouch ${JSON.stringify(join(root, 'SPAWNED'))}\n`);
        chmodSync(fake, 0o755);
      }
      const before = fileSnapshot(root);

      const result = spawnSync(tsx, [cli, 'start', '123-health-endpoint', '--runtime', 'codex'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ''}` },
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('Open Scaffold no-spawn agent handoff');
      expect(result.stdout).toContain('Runtime: codex (Codex / OMX handoff)');
      expect(result.stdout).toContain('Plan path: .osc/plans/active/123-health-endpoint.md');
      expect(result.stdout).toContain('Goal: Add a health endpoint with tests.');
      expect(result.stdout).toContain('Acceptance criteria');
      expect(result.stdout).toContain('Health endpoint returns 200.');
      expect(result.stdout).toContain('Verification commands');
      expect(result.stdout).toContain('npm test');
      expect(result.stdout).toContain('Evidence expectations');
      expect(result.stdout).toContain('Authority boundaries');
      expect(result.stdout).toContain('Do not commit, push, open a PR, merge, publish, create a release, or deploy without explicit operator approval.');
      expect(result.stdout).toContain('No process was started by Open Scaffold.');
      expect(existsSync(join(root, 'SPAWNED'))).toBe(false);
      expect(existsSync(join(root, '.osc/runs'))).toBe(false);
      expect(fileSnapshot(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('accepts a direct plan path and can print a runtime-neutral handoff', () => {
    const root = tempRepo();
    try {
      const planPath = writePlan(root, 'backlog', '124-backlog-task');

      const result = spawnSync(tsx, [cli, 'start', planPath, '--runtime', 'plain'], {
        cwd: root,
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('Runtime: plain (Runtime-neutral manual handoff)');
      expect(result.stdout).toContain('Plan path: .osc/plans/backlog/124-backlog-task.md');
      expect(result.stdout).toContain('Paste the prompt below into your selected agent/runtime.');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
