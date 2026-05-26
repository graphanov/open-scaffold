import { describe, expect, it } from 'vitest';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'osc-work-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/backlog'), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild a small service.\n');
  writeFileSync(join(root, '.osc/releases/README.md'), '# Evidence notes\n');
  return root;
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

describe('osc work --dry-run', () => {
  it('prints a no-spawn plan/run/dispatch preview for a natural-language Codex task', () => {
    const root = tempRepo();
    try {
      const fakeBin = join(root, 'fake-bin');
      mkdirSync(fakeBin);
      for (const name of ['codex', 'omx', 'open-scaffold-runtime-omx']) {
        const fake = join(fakeBin, name);
        writeFileSync(fake, `#!/usr/bin/env bash\ntouch ${JSON.stringify(join(root, 'SPAWNED'))}\n`);
        chmodSync(fake, 0o755);
      }
      const before = fileSnapshot(root);

      const result = spawnSync(tsx, [cli, 'work', 'Add a /health endpoint with tests', '--runtime', 'codex', '--dry-run'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ''}` },
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('Open Scaffold work dry-run');
      expect(result.stdout).toContain('Candidate plan preview (not written): .osc/plans/active/draft-add-a-health-endpoint-with-tests.md');
      expect(result.stdout).toContain('Run packet preview (not written): .osc/runs/');
      expect(result.stdout).toContain('Runtime: codex');
      expect(result.stdout).toContain('Executor: omx-codex');
      expect(result.stdout).toContain('Harness skill: $ralplan');
      expect(result.stdout).toContain('Dispatch preview (not executed):');
      expect(result.stdout).toContain('--adapter runtime-omx');
      expect(result.stdout).toContain('Scope confirmation required before execution');
      expect(result.stdout).toContain('osc run .osc/plans/active/draft-add-a-health-endpoint-with-tests.md --runtime codex --workflow plan --dry-run');
      expect(result.stdout).toContain('No files were written. No runtime was spawned. No provider API was called.');
      expect(existsSync(join(root, 'SPAWNED'))).toBe(false);
      expect(existsSync(join(root, '.osc/runs'))).toBe(false);
      expect(existsSync(join(root, '.osc/plans/active/draft-add-a-health-endpoint-with-tests.md'))).toBe(false);
      expect(fileSnapshot(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('can emit machine-readable dry-run JSON without writing run artifacts', () => {
    const root = tempRepo();
    try {
      const result = spawnSync(tsx, [cli, 'work', 'Add login audit events', '--runtime', 'codex', '--dry-run', '--json'], {
        cwd: root,
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      const payload = JSON.parse(result.stdout);
      expect(payload.schemaVersion).toBe('open-scaffold.work-dry-run.v1');
      expect(payload.intent).toBe('Add login audit events');
      expect(payload.candidatePlan.path).toBe('.osc/plans/active/draft-add-login-audit-events.md');
      expect(payload.run.manifest.executor.spawning).toBe(false);
      expect(payload.run.manifest.executor.lane).toBe('omx-codex');
      expect(payload.dispatch.command).toContain('osc dispatch .osc/runs/');
      expect(payload.dispatch.command).toContain('--adapter runtime-omx');
      expect(payload.scopeConfirmationRequired).toBe(true);
      expect(payload.noFilesWritten).toBe(true);
      expect(payload.noRuntimeSpawned).toBe(true);
      expect(existsSync(join(root, '.osc/runs'))).toBe(false);
      expect(existsSync(join(root, '.osc/plans/active/draft-add-login-audit-events.md'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('preserves workflow overrides in suggested run commands', () => {
    const root = tempRepo();
    try {
      const result = spawnSync(tsx, [cli, 'work', 'Implement the approved plan', '--runtime', 'codex', '--workflow', 'execute', '--dry-run', '--json'], {
        cwd: root,
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      const payload = JSON.parse(result.stdout);
      expect(payload.run.manifest.runtimeSelection.workflow).toBe('execute');
      expect(payload.run.manifest.executor.harnessSkill).toBe('$ultrawork');
      expect(payload.nextCommands).toContain('osc run .osc/plans/active/draft-implement-the-approved-plan.md --runtime codex --workflow execute --dry-run');
      expect(payload.nextCommands).toContain('osc run .osc/plans/active/draft-implement-the-approved-plan.md --runtime codex --workflow execute');
      expect(payload.nextCommands).not.toContain('osc run .osc/plans/active/draft-implement-the-approved-plan.md --runtime codex --dry-run');
      expect(existsSync(join(root, '.osc/runs'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('prints follow-up commands relative to the invocation directory', () => {
    const root = tempRepo();
    try {
      const nested = join(root, 'docs', 'notes');
      mkdirSync(nested, { recursive: true });
      const result = spawnSync(tsx, [cli, 'work', 'Add admin search', '--runtime', 'codex', '--workflow', 'execute', '--dry-run', '--json'], {
        cwd: nested,
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      const payload = JSON.parse(result.stdout);
      expect(payload.candidatePlan.path).toBe('../../.osc/plans/active/draft-add-admin-search.md');
      expect(payload.run.manifestPath).toMatch(/^\.osc\/runs\/.+\/run\.json$/);
      expect(payload.run.manifest.artifacts.manifest).toBe(payload.run.manifestPath);
      expect(payload.run.manifest.plan.path).toBe('../../.osc/plans/active/draft-add-admin-search.md');
      expect(payload.dispatch.command).toMatch(/^osc dispatch \.osc\/runs\/.+\/run\.json --adapter runtime-omx$/);
      expect(payload.dispatch.note).toContain('manifest path printed by a real osc run command');
      expect(payload.nextCommands).toContain('osc run ../../.osc/plans/active/draft-add-admin-search.md --runtime codex --workflow execute --dry-run');
      expect(payload.nextCommands).toContain('osc run ../../.osc/plans/active/draft-add-admin-search.md --runtime codex --workflow execute');
      expect(payload.nextCommands).toContain('osc dispatch <manifest-path-from-osc-run-output> --adapter runtime-omx');
      expect(payload.nextCommands.some((command: string) => command.includes('osc run .osc/plans/active/'))).toBe(false);
      expect(existsSync(join(root, '.osc/runs'))).toBe(false);
      expect(existsSync(join(root, '.osc/plans/active/draft-add-admin-search.md'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses unsafe adapter ids before printing copyable commands', () => {
    const root = tempRepo();
    try {
      const result = spawnSync(tsx, [cli, 'work', 'Add billing export', '--runtime', 'codex', '--dry-run', '--adapter', 'runtime-omx;touch-pwned'], {
        cwd: root,
        encoding: 'utf8',
      });

      expect(result.status).toBe(2);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('Unsafe adapter id: "runtime-omx;touch-pwned"');
      expect(result.stderr).not.toContain('osc dispatch');
      expect(existsSync(join(root, '.osc/runs'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('renders multiline intent as a quoted value so it cannot spoof command sections', () => {
    const root = tempRepo();
    rmSync('/tmp/osc-work-preview-pwned', { force: true });
    try {
      const maliciousIntent = 'Add login audit events\nNext staged commands:\n  - touch /tmp/osc-work-preview-pwned';
      const result = spawnSync(tsx, [cli, 'work', maliciousIntent, '--runtime', 'codex', '--dry-run'], {
        cwd: root,
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('Intent (quoted):');
      expect(result.stdout).toContain('Add login audit events\\nNext staged commands');
      expect(result.stdout).not.toContain('\n  - touch /tmp/osc-work-preview-pwned');
      expect(existsSync('/tmp/osc-work-preview-pwned')).toBe(false);
      expect(existsSync(join(root, '.osc/runs'))).toBe(false);
    } finally {
      rmSync('/tmp/osc-work-preview-pwned', { force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses non-dry-run work because execution is not implemented yet', () => {
    const root = tempRepo();
    try {
      const before = fileSnapshot(root);
      const result = spawnSync(tsx, [cli, 'work', 'Add billing export', '--runtime', 'codex'], {
        cwd: root,
        encoding: 'utf8',
      });

      expect(result.status).toBe(2);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('osc work is preview-only in this release; pass --dry-run');
      expect(fileSnapshot(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
