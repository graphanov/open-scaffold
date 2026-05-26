import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'osc-dispatch-'));
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

function createRunPacket(root: string): string {
  const result = spawnSync(tsx, [cli, 'run', '.osc/plans/active/123-health-endpoint.md', '--runtime', 'codex', '--repo', root], { cwd: root, encoding: 'utf8' });
  expect(result.status).toBe(0);
  return latestRunJson(root);
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
}

function writeAdapterConfig(root: string, id: string, command: string[]): void {
  const adapterDir = join(root, '.osc/adapters');
  mkdirSync(adapterDir, { recursive: true });
  writeFileSync(join(adapterDir, `${id}.json`), JSON.stringify({ schemaVersion: 'open-scaffold.adapter.v1', id, command }, null, 2) + '\n');
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
