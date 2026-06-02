import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempRepo(prefix = join(tmpdir(), 'osc-dispatch-')): string {
  const root = mkdtempSync(prefix);
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/backlog'), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild a small service.\n');
  writeFileSync(join(root, '.osc/releases/README.md'), '# Evidence notes\n');
  writePlan(root);
  return root;
}

function writePlan(root: string, slug = '123-health-endpoint'): string {
  const planPath = join(root, `.osc/plans/active/${slug}.md`);
  writeFileSync(planPath, `# Plan: ${slug}

## Status

active

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

function latestRunJson(root: string): string {
  const runsDir = join(root, '.osc/runs');
  const runId = readdirSync(runsDir).sort().at(-1);
  expect(runId).toBeTruthy();
  return join(runsDir, runId!, 'run.json');
}

function createRunPacketWithRuntime(root: string, worktreePath: string, branch = 'feature/health'): string {
  const result = spawnSync(tsx, [cli, 'run', '.osc/plans/active/123-health-endpoint.md', '--runtime', 'codex', '--repo', root, '--worktree', worktreePath, '--branch', branch], { cwd: root, encoding: 'utf8' });
  expect(result.status).toBe(0);
  return latestRunJson(root);
}

function createRunPacket(root: string): string {
  const result = spawnSync(tsx, [cli, 'run', '.osc/plans/active/123-health-endpoint.md', '--runtime', 'codex', '--repo', root], { cwd: root, encoding: 'utf8' });
  expect(result.status).toBe(0);
  return latestRunJson(root);
}

function updateRunRuntime(runJson: string, runtime: Record<string, unknown>): void {
  const packet = JSON.parse(readFileSync(runJson, 'utf8')) as { runtime?: Record<string, unknown> };
  packet.runtime = { ...(packet.runtime ?? {}), ...runtime };
  writeFileSync(runJson, JSON.stringify(packet, null, 2) + '\n');
}

function trustAdapterConfig(root: string, id: string): void {
  const result = spawnSync(tsx, [cli, 'adapter', 'trust', id], { cwd: root, encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
}

function writeFakeAdapter(root: string): void {
  const adapterDir = join(root, '.osc/adapters');
  mkdirSync(adapterDir, { recursive: true });
  const adapterScript = join(adapterDir, 'fake-adapter.mjs');
  writeFileSync(adapterScript, `import { dirname, join, relative } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
const runPath = process.argv[2];
const packet = JSON.parse(readFileSync(runPath, 'utf8'));
const runDir = dirname(runPath);
const receiptPath = join(runDir, 'dispatch-receipt.json');
const evidencePath = join(runDir, 'fake-adapter-evidence.md');
writeFileSync(receiptPath, JSON.stringify({
  schema_version: 'open-scaffold.dispatch-receipt.v1',
  adapter_id: 'fake',
  run_id: packet.runId,
  status: 'dry_run',
  spawned: false,
  artifacts: [relative(packet.runtime.repoPath, evidencePath)]
}, null, 2) + '\\n');
writeFileSync(evidencePath, '# Fake adapter evidence\\n');
console.log('fake adapter receipt written: ' + receiptPath);
console.log('fake adapter evidence written: ' + evidencePath);
`);
  writeFileSync(join(adapterDir, 'fake.json'), JSON.stringify({
    schemaVersion: 'open-scaffold.adapter.v1',
    id: 'fake',
    command: ['node', '.osc/adapters/fake-adapter.mjs']
  }, null, 2) + '\n');
  trustAdapterConfig(root, 'fake');
}

function writeAdapterConfig(root: string, id: string, command: string[], extra: Record<string, unknown> = {}): void {
  const adapterDir = join(root, '.osc/adapters');
  mkdirSync(adapterDir, { recursive: true });
  writeFileSync(join(adapterDir, `${id}.json`), JSON.stringify({ schemaVersion: 'open-scaffold.adapter.v1', id, command, ...extra }, null, 2) + '\n');
  trustAdapterConfig(root, id);
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

describe('osc dispatch', () => {
  it('invokes a trusted local adapter fixture and captures receipt, evidence, and logs under the run directory', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      writeFakeAdapter(root);

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'fake'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('Open Scaffold dispatch complete');
      expect(result.stdout).toContain('Adapter: fake');
      expect(result.stdout).toContain('Dispatch receipt: .osc/runs/');
      expect(result.stdout).toContain('Evidence: .osc/runs/');
      expect(result.stdout).toContain('Next: inspect the adapter evidence, run verification, then ask before commit/push/PR/merge/publish.');

      const runDir = dirname(runJson);
      const receiptPath = join(runDir, 'dispatch-receipt.json');
      const evidencePath = join(runDir, 'fake-adapter-evidence.md');
      const stdoutLog = join(runDir, 'dispatch', 'fake-stdout.log');
      expect(JSON.parse(readFileSync(receiptPath, 'utf8'))).toMatchObject({ adapter_id: 'fake', status: 'dry_run', spawned: false });
      expect(readFileSync(evidencePath, 'utf8')).toContain('Fake adapter evidence');
      expect(readFileSync(stdoutLog, 'utf8')).toContain('fake adapter receipt written:');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('invalidates trust when a referenced local adapter command file changes', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      writeFakeAdapter(root);
      const before = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'fake'], { cwd: root, encoding: 'utf8' });
      expect(before.status, before.stderr).toBe(0);

      writeFileSync(join(root, '.osc/adapters/fake-adapter.mjs'), "console.log('changed adapter behavior');\n");
      const after = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'fake'], { cwd: root, encoding: 'utf8' });
      expect(after.status).toBe(2);
      expect(after.stderr).toContain('trusted digest no longer matches');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('invalidates trust when adapter-local helper files change', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'helper.mjs'), "export const marker = 'trusted-helper';\n");
      writeFileSync(join(adapterDir, 'runner.mjs'), "import { marker } from './helper.mjs';\nconsole.log(marker);\n");
      writeAdapterConfig(root, 'helper-runner', ['node', '.osc/adapters/runner.mjs']);
      const before = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'helper-runner'], { cwd: root, encoding: 'utf8' });
      expect(before.status, before.stderr).toBe(0);

      writeFileSync(join(adapterDir, 'helper.mjs'), "export const marker = 'changed-helper';\n");
      const after = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'helper-runner'], { cwd: root, encoding: 'utf8' });
      expect(after.status).toBe(2);
      expect(after.stderr).toContain('trusted digest no longer matches');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses adapter helper imports that resolve outside the scaffold root', () => {
    const root = tempRepo();
    const externalHelper = join(dirname(root), `${basename(root)}-external-helper.mjs`);
    try {
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(externalHelper, "export const marker = 'external-helper';\n");
      writeFileSync(join(adapterDir, 'escape-helper-runner.mjs'), `import { marker } from '../../../${basename(externalHelper)}';\nconsole.log(marker);\n`);
      writeFileSync(join(adapterDir, 'escape-helper.json'), JSON.stringify({ schemaVersion: 'open-scaffold.adapter.v1', id: 'escape-helper', command: ['node', '.osc/adapters/escape-helper-runner.mjs'] }, null, 2) + '\n');

      const result = spawnSync(tsx, [cli, 'adapter', 'trust', 'escape-helper'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain('outside the scaffold root');
    } finally {
      rmSync(externalHelper, { force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses path operands embedded in adapter command flags when they resolve outside the scaffold root', () => {
    const root = tempRepo();
    const externalHook = join(dirname(root), `${basename(root)}-external-hook.mjs`);
    try {
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(externalHook, "globalThis.externalHookLoaded = true;\n");
      writeFileSync(join(adapterDir, 'flag-runner.mjs'), "console.log('flag runner');\n");
      writeFileSync(join(adapterDir, 'flag-path.json'), JSON.stringify({ schemaVersion: 'open-scaffold.adapter.v1', id: 'flag-path', command: ['node', `--import=${externalHook}`, '.osc/adapters/flag-runner.mjs'] }, null, 2) + '\n');

      const result = spawnSync(tsx, [cli, 'adapter', 'trust', 'flag-path'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain('outside the scaffold root');
    } finally {
      rmSync(externalHook, { force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not invalidate one adapter when an unrelated adapter file is added', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'foo.mjs'), "console.log('foo adapter');\n");
      writeAdapterConfig(root, 'foo', ['node', '.osc/adapters/foo.mjs']);

      writeFileSync(join(adapterDir, 'bar.mjs'), "console.log('bar adapter');\n");
      writeFileSync(join(adapterDir, 'bar.json'), JSON.stringify({ schemaVersion: 'open-scaffold.adapter.v1', id: 'bar', command: ['node', '.osc/adapters/bar.mjs'] }, null, 2) + '\n');
      const after = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'foo'], { cwd: root, encoding: 'utf8' });
      expect(after.status, after.stderr).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses adapter command payload files outside the scaffold root', () => {
    const root = tempRepo();
    const externalScript = join(dirname(root), `${basename(root)}-external-adapter.mjs`);
    try {
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(externalScript, "console.log('external adapter payload');\n");
      writeFileSync(join(adapterDir, 'external-payload.json'), JSON.stringify({ schemaVersion: 'open-scaffold.adapter.v1', id: 'external-payload', command: ['node', externalScript] }, null, 2) + '\n');

      const result = spawnSync(tsx, [cli, 'adapter', 'trust', 'external-payload'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain('outside the scaffold root');
    } finally {
      rmSync(externalScript, { force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses symlinked adapter command payloads that resolve outside the scaffold root', () => {
    const root = tempRepo();
    const externalScript = join(dirname(root), `${basename(root)}-symlink-target.mjs`);
    try {
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(externalScript, "console.log('external symlink adapter payload');\n");
      symlinkSync(externalScript, join(adapterDir, 'symlink-runner.mjs'));
      writeFileSync(join(adapterDir, 'symlink-payload.json'), JSON.stringify({ schemaVersion: 'open-scaffold.adapter.v1', id: 'symlink-payload', command: ['node', '.osc/adapters/symlink-runner.mjs'] }, null, 2) + '\n');

      const result = spawnSync(tsx, [cli, 'adapter', 'trust', 'symlink-payload'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain('outside the scaffold root');
    } finally {
      rmSync(externalScript, { force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses adapter command payloads reached through symlinked directories outside the scaffold root', () => {
    const root = tempRepo();
    const externalDir = join(dirname(root), `${basename(root)}-external-payloads`);
    try {
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      mkdirSync(externalDir, { recursive: true });
      writeFileSync(join(externalDir, 'runner.mjs'), "console.log('external symlink directory adapter payload');\n");
      symlinkSync(externalDir, join(adapterDir, 'payloads'));
      writeFileSync(join(adapterDir, 'symlink-dir-payload.json'), JSON.stringify({ schemaVersion: 'open-scaffold.adapter.v1', id: 'symlink-dir-payload', command: ['node', '.osc/adapters/payloads/runner.mjs'] }, null, 2) + '\n');

      const result = spawnSync(tsx, [cli, 'adapter', 'trust', 'symlink-dir-payload'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain('outside the scaffold root');
    } finally {
      rmSync(externalDir, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('trusts legitimate in-repo adapter payloads when the workspace is reached through a symlinked root', () => {
    const root = tempRepo();
    const linkRoot = join(dirname(root), `${basename(root)}-link`);
    try {
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'linked-root-runner.mjs'), "console.log('linked root adapter payload');\n");
      writeFileSync(join(adapterDir, 'linked-root.json'), JSON.stringify({ schemaVersion: 'open-scaffold.adapter.v1', id: 'linked-root', command: ['node', '.osc/adapters/linked-root-runner.mjs'] }, null, 2) + '\n');
      symlinkSync(root, linkRoot, 'dir');

      const result = spawnSync(tsx, [cli, 'adapter', 'trust', 'linked-root'], { cwd: linkRoot, encoding: 'utf8' });

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('Trusted adapter: linked-root');
    } finally {
      rmSync(linkRoot, { force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('discovers adapter artifacts before redacting persisted private paths', () => {
    const root = tempRepo(join(repoRoot, '.tmp-dispatch-redaction-'));
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'private-path.mjs'), `import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
const runPath = process.argv[2];
const packet = JSON.parse(readFileSync(runPath, 'utf8'));
const runDir = dirname(runPath);
const receiptPath = join(runDir, 'dispatch-receipt.json');
const evidencePath = join(runDir, 'private-path-evidence.md');
writeFileSync(receiptPath, JSON.stringify({ schema_version: 'open-scaffold.dispatch-receipt.v1', adapter_id: 'private-path', run_id: packet.runId, status: 'dry_run', spawned: false }, null, 2));
writeFileSync(evidencePath, '# Private path evidence\\n');
console.log('receipt written: ' + receiptPath);
console.log('evidence written: ' + evidencePath);
`);
      writeAdapterConfig(root, 'private-path', ['node', '.osc/adapters/private-path.mjs']);

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'private-path'], { cwd: root, encoding: 'utf8' });

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('Dispatch receipt: .osc/runs/');
      expect(result.stdout).toContain('Evidence: .osc/runs/');
      const stdoutLog = readFileSync(join(dirname(runJson), 'dispatch', 'private-path-stdout.log'), 'utf8');
      expect(stdoutLog).toContain('/[local-path-redacted]');
      expect(stdoutLog).not.toContain(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses worktree isolation inside or equal to the repository path', () => {
    const root = tempRepo();
    try {
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'isolated.mjs'), "console.log('isolated adapter should not run');\n");
      writeAdapterConfig(root, 'isolated', ['node', '.osc/adapters/isolated.mjs'], { requiresWorktreeIsolation: true });

      const nestedRunJson = createRunPacketWithRuntime(root, join(root, 'tmp-worktree'), 'feature/nested');
      const nested = spawnSync(tsx, [cli, 'dispatch', nestedRunJson, '--adapter', 'isolated'], { cwd: root, encoding: 'utf8' });
      expect(nested.status).toBe(2);
      expect(nested.stderr).toContain('requires an isolated worktree path outside runtime.repoPath');

      const sameRunJson = createRunPacketWithRuntime(root, join(root, '.'), 'feature/same');
      const same = spawnSync(tsx, [cli, 'dispatch', sameRunJson, '--adapter', 'isolated'], { cwd: root, encoding: 'utf8' });
      expect(same.status).toBe(2);
      expect(same.stderr).toContain('requires an isolated worktree path outside runtime.repoPath');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('resolves relative runtime isolation paths from the run root rather than caller cwd', () => {
    const root = tempRepo();
    try {
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'isolated.mjs'), "console.log('isolated adapter ran');\n");
      writeAdapterConfig(root, 'isolated', ['node', '.osc/adapters/isolated.mjs'], { requiresWorktreeIsolation: true });
      const runJson = createRunPacket(root);
      updateRunRuntime(runJson, { repoPath: '.', worktreePath: '../isolated-worktree', branch: 'feature/relative-isolation' });

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'isolated'], { cwd: join(root, '.osc'), encoding: 'utf8' });

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('Worktree isolation: enforced');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses protected branch refs in runtime isolation packets', () => {
    const root = tempRepo();
    try {
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'isolated.mjs'), "console.log('isolated adapter should not run');\n");
      writeAdapterConfig(root, 'isolated', ['node', '.osc/adapters/isolated.mjs'], { requiresWorktreeIsolation: true });

      const localRefRunJson = createRunPacket(root);
      updateRunRuntime(localRefRunJson, { repoPath: '.', worktreePath: '../protected-ref-worktree', branch: 'refs/heads/main' });
      const localRef = spawnSync(tsx, [cli, 'dispatch', localRefRunJson, '--adapter', 'isolated'], { cwd: root, encoding: 'utf8' });
      expect(localRef.status).toBe(2);
      expect(localRef.stderr).toContain('refuses protected branch execution: refs/heads/main');

      const remoteRefRunJson = createRunPacket(root);
      updateRunRuntime(remoteRefRunJson, { repoPath: '.', worktreePath: '../protected-remote-worktree', branch: 'origin/master' });
      const remoteRef = spawnSync(tsx, [cli, 'dispatch', remoteRefRunJson, '--adapter', 'isolated'], { cwd: root, encoding: 'utf8' });
      expect(remoteRef.status).toBe(2);
      expect(remoteRef.stderr).toContain('refuses protected branch execution: origin/master');

      const featureContainingMainRunJson = createRunPacket(root);
      updateRunRuntime(featureContainingMainRunJson, { repoPath: '.', worktreePath: '../feature-main-worktree', branch: 'feature/main-fix' });
      const featureContainingMain = spawnSync(tsx, [cli, 'dispatch', featureContainingMainRunJson, '--adapter', 'isolated'], { cwd: root, encoding: 'utf8' });
      expect(featureContainingMain.status, featureContainingMain.stderr).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses an unknown adapter without creating dispatch logs', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const before = fileSnapshot(root);
      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'missing'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain('Unknown adapter: missing');
      expect(fileSnapshot(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses missing and unsafe adapter selections before execution', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const before = fileSnapshot(root);
      const missing = spawnSync(tsx, [cli, 'dispatch', runJson], { cwd: root, encoding: 'utf8' });
      const unsafe = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', '../evil'], { cwd: root, encoding: 'utf8' });

      expect(missing.status).toBe(2);
      expect(missing.stderr).toContain('Missing required option: --adapter <adapter-id>');
      expect(unsafe.status).toBe(2);
      expect(unsafe.stderr).toContain('Unsafe adapter id: ../evil');
      expect(fileSnapshot(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses auto-installing adapter commands and shell wrappers before execution', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      writeAdapterConfig(root, 'installer', ['npx', 'some-adapter']);
      writeAdapterConfig(root, 'shell-installer', ['sh', '-c', 'npx some-adapter']);
      writeAdapterConfig(root, 'case-installer', ['NPX', 'some-adapter']);
      writeAdapterConfig(root, 'shim-installer', ['npx.cmd', 'some-adapter']);
      const before = fileSnapshot(root);
      const installer = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'installer'], { cwd: root, encoding: 'utf8' });
      const shellInstaller = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'shell-installer'], { cwd: root, encoding: 'utf8' });
      const caseInstaller = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'case-installer'], { cwd: root, encoding: 'utf8' });
      const shimInstaller = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'shim-installer'], { cwd: root, encoding: 'utf8' });

      expect(installer.status).toBe(2);
      expect(installer.stderr).toContain('Adapter installer uses forbidden adapter executable: npx');
      expect(shellInstaller.status).toBe(2);
      expect(shellInstaller.stderr).toContain('Adapter shell-installer uses forbidden adapter executable: sh');
      expect(caseInstaller.status).toBe(2);
      expect(caseInstaller.stderr).toContain('Adapter case-installer uses forbidden adapter executable: npx');
      expect(shimInstaller.status).toBe(2);
      expect(shimInstaller.stderr).toContain('Adapter shim-installer uses forbidden adapter executable: npx');
      expect(fileSnapshot(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses adapter-reported receipt paths outside the run directory', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'escape.mjs'), "console.log('escape adapter receipt written: /tmp/outside-dispatch-receipt.json');\n");
      writeAdapterConfig(root, 'escape', ['node', '.osc/adapters/escape.mjs']);

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'escape'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain('Adapter-reported output path must stay under the run directory.');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses symlinks inside the run directory before adapter execution', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      writeFakeAdapter(root);
      const runDir = dirname(runJson);
      const outsideTarget = join(root, 'outside-receipt.json');
      symlinkSync(outsideTarget, join(runDir, 'dispatch-receipt.json'));

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'fake'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain('Run directory must not contain symlinks before adapter dispatch.');
      expect(existsSync(outsideTarget)).toBe(false);
      expect(existsSync(join(runDir, 'dispatch', 'fake-stdout.log'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('preserves multiple adapter-reported evidence paths', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'multi-evidence.mjs'), `import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';
const runDir = dirname(process.argv[2]);
const first = join(runDir, 'first-evidence.md');
const second = join(runDir, 'second-evidence.md');
writeFileSync(first, '# First evidence\\n');
writeFileSync(second, '# Second evidence\\n');
console.log('multi adapter evidence written: ' + first);
console.log('multi adapter evidence written: ' + second);
`);
      writeAdapterConfig(root, 'multi-evidence', ['node', '.osc/adapters/multi-evidence.mjs']);

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'multi-evidence'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Evidence: .osc/runs/');
      expect(result.stdout).toContain('first-evidence.md');
      expect(result.stdout).toContain('second-evidence.md');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('passes a restricted adapter environment by default and reports env key names only', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'env-check.mjs'), `import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';
const runDir = dirname(process.argv[2]);
const evidencePath = join(runDir, 'env-evidence.json');
writeFileSync(evidencePath, JSON.stringify({
  secret: process.env.SECRET_TOKEN ?? null,
  allowed: process.env.ALLOWED_FROM_PARENT ?? null,
  explicit: process.env.OPEN_SCAFFOLD_ADAPTER ?? null,
  pathPresent: Boolean(process.env.PATH)
}, null, 2) + '\\n');
console.log('env adapter evidence written: ' + evidencePath);
`);
      writeAdapterConfig(root, 'env-check', ['node', '.osc/adapters/env-check.mjs'], {
        envAllowlist: ['ALLOWED_FROM_PARENT'],
        env: { OPEN_SCAFFOLD_ADAPTER: 'env-check' }
      });

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'env-check'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, SECRET_TOKEN: 'test-secret-token', ALLOWED_FROM_PARENT: 'allowed-value' }
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('Environment: restricted');
      expect(result.stdout).toContain('Environment keys: ALLOWED_FROM_PARENT, OPEN_SCAFFOLD_ADAPTER, PATH');
      expect(result.stdout).not.toContain('test-secret-token');
      expect(result.stdout).not.toContain('allowed-value');
      const evidence = JSON.parse(readFileSync(join(dirname(runJson), 'env-evidence.json'), 'utf8'));
      expect(evidence).toMatchObject({ secret: null, allowed: 'allowed-value', explicit: 'env-check', pathPresent: true });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('allows explicit unsafe full environment only with a warning', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'full-env.mjs'), `import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';
const evidencePath = join(dirname(process.argv[2]), 'full-env-evidence.json');
writeFileSync(evidencePath, JSON.stringify({ secret: process.env.SECRET_TOKEN ?? null }) + '\\n');
console.log('full env adapter evidence written: ' + evidencePath);
`);
      writeAdapterConfig(root, 'full-env', ['node', '.osc/adapters/full-env.mjs']);

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'full-env', '--allow-full-env'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, SECRET_TOKEN: 'test-secret-token', CI: '' }
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Environment: full (unsafe override)');
      expect(result.stdout).toContain('Warning: --allow-full-env passed the full parent environment to the adapter.');
      expect(result.stdout).not.toContain('test-secret-token');
      const evidence = JSON.parse(readFileSync(join(dirname(runJson), 'full-env-evidence.json'), 'utf8'));
      expect(evidence).toMatchObject({ secret: 'test-secret-token' });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('times out a sleeping adapter and writes bounded failure logs', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'sleepy.mjs'), "setTimeout(() => {}, 300);\n");
      writeAdapterConfig(root, 'sleepy', ['node', '.osc/adapters/sleepy.mjs'], { timeoutMs: 50 });

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'sleepy'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(1);
      expect(result.stdout).toContain('Timeout: 50 ms');
      expect(result.stdout).toContain('Timed out: yes');
      expect(result.stdout).toContain('Exit status: (none)');
      const stderrLog = readFileSync(join(dirname(runJson), 'dispatch', 'sleepy-stderr.log'), 'utf8');
      expect(stderrLog).toContain('ETIMEDOUT');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('kills SIGTERM-ignoring adapters when the timeout expires', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'ignore-term.mjs'), "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);\n");
      writeAdapterConfig(root, 'ignore-term', ['node', '.osc/adapters/ignore-term.mjs'], { timeoutMs: 50 });

      const started = Date.now();
      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'ignore-term'], {
        cwd: root,
        encoding: 'utf8',
        timeout: 2000
      });

      expect(Date.now() - started).toBeLessThan(1500);
      expect(result.status).toBe(1);
      expect(result.error).toBeUndefined();
      expect(result.stdout).toContain('Timed out: yes');
      expect(result.stdout).toContain('Signal: SIGKILL');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses unsafe full-env override in CI unless separately acknowledged', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'ci-env.mjs'), "console.log('should not run');\n");
      writeAdapterConfig(root, 'ci-env', ['node', '.osc/adapters/ci-env.mjs']);
      const before = fileSnapshot(root);

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'ci-env', '--allow-full-env'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, CI: '1' }
      });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain('Refusing --allow-full-env in CI unless OPEN_SCAFFOLD_ALLOW_FULL_ENV_IN_CI=1 is set.');
      expect(fileSnapshot(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects unsafe adapter env config without leaking configured values', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'env-invalid.mjs'), "console.log('should not run');\n");
      writeAdapterConfig(root, 'bad-env-name', ['node', '.osc/adapters/env-invalid.mjs'], { env: { 'BAD-KEY': 'do-not-leak-name' } });
      writeAdapterConfig(root, 'bad-env-value', ['node', '.osc/adapters/env-invalid.mjs'], { env: { BAD_VALUE: 'do-not-leak-value\u0000secret' } });
      writeAdapterConfig(root, 'bad-env-allowlist', ['node', '.osc/adapters/env-invalid.mjs'], { envAllowlist: ['BAD-KEY'] });
      const before = fileSnapshot(root);

      const badName = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'bad-env-name'], { cwd: root, encoding: 'utf8' });
      const badValue = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'bad-env-value'], { cwd: root, encoding: 'utf8' });
      const badAllowlist = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'bad-env-allowlist'], { cwd: root, encoding: 'utf8' });

      expect(badName.status).toBe(2);
      expect(badName.stderr).toContain('Adapter bad-env-name env contains an invalid environment variable name.');
      expect(badName.stderr).not.toContain('do-not-leak-name');
      expect(badValue.status).toBe(2);
      expect(badValue.stderr).toContain('Adapter bad-env-value env contains a value with unsupported control characters.');
      expect(badValue.stderr).not.toContain('do-not-leak-value');
      expect(badAllowlist.status).toBe(2);
      expect(badAllowlist.stderr).toContain('Adapter bad-env-allowlist envAllowlist contains an invalid environment variable name.');
      expect(fileSnapshot(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses adapter timeout and log limits above policy maxima', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'limits.mjs'), "console.log('should not run');\n");
      writeAdapterConfig(root, 'huge-timeout', ['node', '.osc/adapters/limits.mjs'], { timeoutMs: 1_800_001 });
      writeAdapterConfig(root, 'huge-stdout', ['node', '.osc/adapters/limits.mjs'], { maxStdoutBytes: 10_000_001 });
      writeAdapterConfig(root, 'huge-stderr', ['node', '.osc/adapters/limits.mjs'], { maxStderrBytes: 10_000_001 });
      const before = fileSnapshot(root);

      const hugeTimeout = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'huge-timeout'], { cwd: root, encoding: 'utf8' });
      const hugeStdout = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'huge-stdout'], { cwd: root, encoding: 'utf8' });
      const hugeStderr = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'huge-stderr'], { cwd: root, encoding: 'utf8' });

      expect(hugeTimeout.status).toBe(2);
      expect(hugeTimeout.stderr).toContain('Adapter huge-timeout timeoutMs must be at most 1800000.');
      expect(hugeStdout.status).toBe(2);
      expect(hugeStdout.stderr).toContain('Adapter huge-stdout maxStdoutBytes must be at most 10000000.');
      expect(hugeStderr.status).toBe(2);
      expect(hugeStderr.stderr).toContain('Adapter huge-stderr maxStderrBytes must be at most 10000000.');
      expect(fileSnapshot(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('bounds noisy adapter stdout and stderr with truncation markers', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'noisy.mjs'), `console.log('x'.repeat(400));
console.error('y'.repeat(400));
`);
      writeAdapterConfig(root, 'noisy', ['node', '.osc/adapters/noisy.mjs'], { maxStdoutBytes: 64, maxStderrBytes: 64 });

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'noisy'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Stdout truncated: yes');
      expect(result.stdout).toContain('Stderr truncated: yes');
      const stdoutLog = readFileSync(join(dirname(runJson), 'dispatch', 'noisy-stdout.log'), 'utf8');
      const stderrLog = readFileSync(join(dirname(runJson), 'dispatch', 'noisy-stderr.log'), 'utf8');
      expect(stdoutLog.length).toBeLessThan(220);
      expect(stderrLog.length).toBeLessThan(220);
      expect(stdoutLog).toContain('[open-scaffold: log truncated');
      expect(stderrLog).toContain('[open-scaffold: log truncated');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not fail successful adapters that exceed retained-log limits below the process hard cap', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'large-retained.mjs'), `import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';
const runDir = dirname(process.argv[2]);
const receiptPath = join(runDir, 'large-retained-receipt.json');
writeFileSync(receiptPath, JSON.stringify({ status: 'ok' }) + '\\n');
console.log('large retained adapter receipt written: ' + receiptPath);
console.log('z'.repeat(70_000));
`);
      writeAdapterConfig(root, 'large-retained', ['node', '.osc/adapters/large-retained.mjs'], { maxStdoutBytes: 256, maxStderrBytes: 256 });

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'large-retained'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Dispatch receipt: .osc/runs/');
      expect(result.stdout).toContain('Stdout truncated: yes');
      const stdoutLog = readFileSync(join(dirname(runJson), 'dispatch', 'large-retained-stdout.log'), 'utf8');
      expect(stdoutLog).toContain('[open-scaffold: log truncated');
      expect(stdoutLog.length).toBeLessThan(520);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('discovers artifacts from full stdout even when retained stdout is truncated first', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'noisy-discovery.mjs'), `import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';
const runDir = dirname(process.argv[2]);
const receiptPath = join(runDir, 'noisy-discovery-receipt.json');
const evidencePath = join(runDir, 'noisy-discovery-evidence.md');
writeFileSync(receiptPath, JSON.stringify({ status: 'ok' }) + '\\n');
writeFileSync(evidencePath, '# Noisy discovery evidence\\n');
console.log('n'.repeat(1_000));
console.log('noisy discovery adapter receipt written: ' + receiptPath);
console.log('noisy discovery adapter evidence written: ' + evidencePath);
`);
      writeAdapterConfig(root, 'noisy-discovery', ['node', '.osc/adapters/noisy-discovery.mjs'], { maxStdoutBytes: 64, maxStderrBytes: 256 });

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'noisy-discovery'], { cwd: root, encoding: 'utf8' });

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('Dispatch receipt: .osc/runs/');
      expect(result.stdout).toContain('noisy-discovery-receipt.json');
      expect(result.stdout).toContain('Evidence: .osc/runs/');
      expect(result.stdout).toContain('noisy-discovery-evidence.md');
      expect(result.stdout).toContain('Stdout truncated: yes');
      const stdoutLog = readFileSync(join(dirname(runJson), 'dispatch', 'noisy-discovery-stdout.log'), 'utf8');
      expect(stdoutLog).toContain('[open-scaffold: log truncated');
      expect(stdoutLog).not.toContain('receipt written:');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('allows successful adapters to use both stdout and stderr up to the bounded process cap', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'dual-stream-retained.mjs'), `import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';
const runDir = dirname(process.argv[2]);
const receiptPath = join(runDir, 'dual-stream-retained-receipt.json');
writeFileSync(receiptPath, JSON.stringify({ status: 'ok' }) + '\\n');
console.log('dual stream adapter receipt written: ' + receiptPath);
process.stdout.write('o'.repeat(5_400_000));
process.stderr.write('e'.repeat(5_400_000));
`);
      writeAdapterConfig(root, 'dual-stream-retained', ['node', '.osc/adapters/dual-stream-retained.mjs'], { maxStdoutBytes: 6_000_000, maxStderrBytes: 6_000_000 });

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'dual-stream-retained'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Dispatch receipt: .osc/runs/');
      expect(result.stdout).toContain('Stdout truncated: no');
      expect(result.stdout).toContain('Stderr truncated: no');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('ignores receipt paths clipped by stdout truncation instead of failing dispatch', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      const adapterDir = join(root, '.osc/adapters');
      mkdirSync(adapterDir, { recursive: true });
      writeFileSync(join(adapterDir, 'clipped-receipt.mjs'), `import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';
const runDir = dirname(process.argv[2]);
const receiptPath = join(runDir, 'clipped-receipt.json');
writeFileSync(receiptPath, JSON.stringify({ status: 'ok' }) + '\\n');
process.stdout.write('clipped adapter receipt written: ' + receiptPath + '-this-line-is-intentionally-too-long');
`);
      writeAdapterConfig(root, 'clipped-receipt', ['node', '.osc/adapters/clipped-receipt.mjs'], { maxStdoutBytes: 40, maxStderrBytes: 256 });

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'clipped-receipt'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Dispatch receipt: (none reported)');
      expect(result.stdout).toContain('Stdout truncated: yes');
      const stdoutLog = readFileSync(join(dirname(runJson), 'dispatch', 'clipped-receipt-stdout.log'), 'utf8');
      expect(stdoutLog).not.toContain('receipt written:');
      expect(stdoutLog).toContain('[open-scaffold: log truncated');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses wildcard env allowlists without the unsafe full-env override', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      writeAdapterConfig(root, 'wildcard-env', ['node', '-e', 'console.log("should not run")'], { envAllowlist: ['*'] });
      const before = fileSnapshot(root);

      const result = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'wildcard-env'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain('Adapter wildcard-env uses wildcard envAllowlist; use --allow-full-env for unsafe local override.');
      expect(fileSnapshot(root)).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not report stale receipt or evidence files when an adapter is silent', () => {
    const root = tempRepo();
    try {
      const runJson = createRunPacket(root);
      writeFakeAdapter(root);
      const first = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'fake'], { cwd: root, encoding: 'utf8' });
      expect(first.status).toBe(0);
      expect(first.stdout).toContain('Dispatch receipt: .osc/runs/');

      const adapterDir = join(root, '.osc/adapters');
      writeFileSync(join(adapterDir, 'silent.mjs'), "// intentionally silent adapter\n");
      writeAdapterConfig(root, 'silent', ['node', '.osc/adapters/silent.mjs']);
      const second = spawnSync(tsx, [cli, 'dispatch', runJson, '--adapter', 'silent'], { cwd: root, encoding: 'utf8' });

      expect(second.status).toBe(0);
      expect(second.stdout).toContain('Dispatch receipt: (none reported)');
      expect(second.stdout).toContain('Evidence: (none reported)');
      expect(second.stdout).not.toContain('fake-adapter-evidence.md');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps dispatch core free of provider SDK imports and fixed Codex/OMX launch commands', () => {
    const dispatchSource = readFileSync(join(repoRoot, 'src/dispatch.ts'), 'utf8');
    expect(dispatchSource).not.toMatch(/from ['\"](?:openai|@anthropic-ai|anthropic|codex|omx)['\"]/i);
    expect(dispatchSource).not.toContain('open-scaffold-runtime-omx');
    expect(dispatchSource).not.toContain('codex exec');
    expect(dispatchSource).not.toContain('omx exec');
  });
});
