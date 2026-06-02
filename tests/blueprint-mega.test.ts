import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function runOsc(root: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(tsx, [cli, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
}

function tempRepo(prefix = 'osc-blueprint-'): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/backlog'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/blocked'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/done'), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\n<!-- mission:unset -->\n\nTODO: define mission.\n\n## Changelog\n\n<!-- append YYYY-MM-DD entries below this line -->\n');
  writeFileSync(join(root, '.osc/releases/README.md'), '# Evidence notes\n');
  return root;
}

function writePlan(root: string, slug = '123-health-endpoint'): string {
  const path = join(root, `.osc/plans/active/${slug}.md`);
  writeFileSync(path, `# Plan: ${slug}

## Status

active

## Context

A small health endpoint needs reviewable work-record coverage.

## Goal

Add a health endpoint with tests.

## Constraints / Out of scope

- Do not deploy anything.

## Files to touch

- \`src/server.ts\` — route implementation.

## Acceptance criteria

- [ ] Health endpoint returns 200.

## Verification steps

1. Run \`npm test\`.

## Open questions

- None.
`);
  return path;
}

function createRunPacket(root: string): string {
  writePlan(root);
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild a small service.\n\n## Changelog\n\n<!-- append YYYY-MM-DD entries below this line -->\n');
  const result = runOsc(root, ['run', '.osc/plans/active/123-health-endpoint.md', '--runtime', 'codex', '--repo', root, '--worktree', join(root, '..', 'worktree-copy'), '--branch', 'feature/health']);
  expect(result.status, result.stderr).toBe(0);
  const runs = join(root, '.osc/runs');
  const runId = require('node:fs').readdirSync(runs).sort().at(-1);
  return join(runs, runId, 'run.json');
}

function writeFakeAdapter(root: string, id = 'fake'): void {
  const adapterDir = join(root, '.osc/adapters');
  mkdirSync(adapterDir, { recursive: true });
  writeFileSync(join(adapterDir, `${id}.mjs`), `import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
const runPath = process.argv[2];
const packet = JSON.parse(readFileSync(runPath, 'utf8'));
const runDir = dirname(runPath);
const receiptPath = join(runDir, 'dispatch-receipt.json');
const evidencePath = join(runDir, '${id}-evidence.md');
writeFileSync(receiptPath, JSON.stringify({ schema_version: 'open-scaffold.dispatch-receipt.v1', adapter_id: '${id}', run_id: packet.runId, status: 'dry_run', spawned: false }, null, 2));
writeFileSync(evidencePath, '# Evidence\\n');
console.log('receipt written: ' + receiptPath);
console.log('evidence written: ' + evidencePath);
`);
  writeFileSync(join(adapterDir, `${id}.json`), JSON.stringify({
    schemaVersion: 'open-scaffold.adapter.v1',
    id,
    command: ['node', `.osc/adapters/${id}.mjs`],
    requiresWorktreeIsolation: true
  }, null, 2) + '\n');
}

describe('blueprint adapter trust workflow', () => {
  it('refuses untrusted adapters, trusts by digest, lists trust records, and invalidates edited configs', () => {
    const root = tempRepo('osc-adapter-trust-');
    try {
      const runJson = createRunPacket(root);
      writeFakeAdapter(root);

      const untrusted = runOsc(root, ['dispatch', runJson, '--adapter', 'fake']);
      expect(untrusted.status).toBe(2);
      expect(untrusted.stderr).toContain('Adapter fake is not trusted');

      const checkBefore = runOsc(root, ['adapter', 'check', 'fake']);
      expect(checkBefore.status).toBe(0);
      expect(checkBefore.stdout).toContain('Trusted: no');
      expect(checkBefore.stdout).toContain('Digest: sha256:');

      const trust = runOsc(root, ['adapter', 'trust', 'fake']);
      expect(trust.status).toBe(0);
      expect(trust.stdout).toContain('Trusted adapter: fake');
      expect(existsSync(join(root, '.osc/state/trusted-adapters.json'))).toBe(true);

      const list = runOsc(root, ['adapter', 'list', '--trusted']);
      expect(list.status).toBe(0);
      expect(list.stdout).toContain('fake');
      expect(list.stdout).toContain('sha256:');

      const dispatch = runOsc(root, ['dispatch', runJson, '--adapter', 'fake']);
      expect(dispatch.status).toBe(0);
      expect(dispatch.stdout).toContain('Adapter trusted: yes');
      expect(dispatch.stdout).toContain('Worktree isolation: enforced');

      const configPath = join(root, '.osc/adapters/fake.json');
      const edited = JSON.parse(readFileSync(configPath, 'utf8'));
      edited.env = { ADDED_AFTER_TRUST: '1' };
      writeFileSync(configPath, JSON.stringify(edited, null, 2) + '\n');
      const invalidated = runOsc(root, ['dispatch', runJson, '--adapter', 'fake']);
      expect(invalidated.status).toBe(2);
      expect(invalidated.stderr).toContain('trusted digest no longer matches');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('blueprint first-run and PR check surfaces', () => {
  it('creates one valid first work-record path in non-interactive mode', () => {
    const root = tempRepo('osc-first-run-');
    try {
      const result = runOsc(root, ['first-run', '--non-interactive', '--slug', 'first-work-record', '--mission', 'Build a tiny service safely.', '--goal', 'Add the first reviewed change.']);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('Open Scaffold first-run complete');
      expect(result.stdout).toContain('osc trace first-work-record');
      expect(result.stdout).toContain('osc verify --evidence-chain --plan first-work-record --strict');
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).not.toContain('mission:unset');
      expect(existsSync(join(root, '.osc/plans/active/first-work-record.md'))).toBe(true);
      const evidenceFiles = require('node:fs').readdirSync(join(root, '.osc/releases'));
      expect(evidenceFiles.some((file: string) => file.endsWith('-first-work-record.md'))).toBe(true);
      const validation = runOsc(root, ['plan', 'validate', 'first-work-record', '--strict']);
      expect(validation.status, validation.stdout + validation.stderr).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('creates one valid first work-record path in an existing non-scaffold repo', () => {
    const root = mkdtempSync(join(tmpdir(), 'osc-first-run-existing-'));
    try {
      writeFileSync(join(root, 'package.json'), '{"scripts":{"test":"node --version"}}\n');
      const result = runOsc(root, ['first-run', '--non-interactive', '--slug', 'first-work-record', '--mission', 'Build a tiny service safely.', '--goal', 'Add the first reviewed change.']);
      expect(result.status, result.stderr).toBe(0);
      expect(existsSync(join(root, '.osc/RULES.md'))).toBe(true);
      expect(existsSync(join(root, '.osc/plans/active/first-work-record.md'))).toBe(true);
      const validation = runOsc(root, ['plan', 'validate', 'first-work-record', '--strict']);
      expect(validation.status, validation.stdout + validation.stderr).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('supports an interactive/stdin first-run flow', () => {
    const root = mkdtempSync(join(tmpdir(), 'osc-first-run-stdin-'));
    try {
      const result = spawnSync(tsx, [cli, 'first-run'], {
        cwd: root,
        encoding: 'utf8',
        input: 'interactive-work\nDefine the repo mission.\nCreate one reviewed local work-record path with mission, plan, evidence, and validation output.\n',
        env: { ...process.env },
      });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('Open Scaffold first-run complete');
      expect(existsSync(join(root, '.osc/plans/active/interactive-work.md'))).toBe(true);
      const validation = runOsc(root, ['plan', 'validate', 'interactive-work', '--strict']);
      expect(validation.status, validation.stdout + validation.stderr).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('prints structural-only PR check results as markdown and JSON', () => {
    const root = tempRepo('osc-pr-check-');
    try {
      writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild a tiny service safely.\n');
      writePlan(root, 'pr-ready');
      const json = runOsc(root, ['pr', 'check', 'pr-ready', '--format', 'json']);
      expect(json.status, json.stderr).toBe(0);
      const parsed = JSON.parse(json.stdout);
      expect(parsed.schemaVersion).toBe('open-scaffold.pr_check.v1');
      expect(parsed.structural_only_warning).toContain('does not prove semantic correctness');
      expect(parsed.findings.some((finding: { code: string }) => finding.code === 'missing_evidence')).toBe(true);

      const markdown = runOsc(root, ['pr', 'check', 'pr-ready']);
      expect(markdown.status, markdown.stderr).toBe(0);
      expect(markdown.stdout).toContain('Structural-only warning');
      expect(markdown.stdout).toContain('missing_evidence');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('ships a fork-safe GitHub Action template for structural PR checks', () => {
    const workflow = readFileSync(join(repoRoot, '.github/workflows/open-scaffold-pr-check.yml'), 'utf8');
    expect(workflow).toContain('pull_request:');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).toContain('permissions:');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('osc-pr-check');
    expect(workflow).toContain("github.event.pull_request.head.repo.full_name == github.repository");
    expect(workflow).toContain('node dist/cli.js pr check');
  });
});

describe('blueprint redaction and doctor secret scan', () => {
  it('flags committed webhook/token-looking strings without printing secret values in dispatch logs', () => {
    const root = tempRepo('osc-secret-scan-');
    try {
      mkdirSync(join(root, 'docs'), { recursive: true });
      const fakeWebhook = 'https://discord.com/api/webhooks/' + '1234567890' + '/' + 'abcdefghijklmnopqrstuvwxyz';
      const fakeGithubToken = 'ghp_' + 'abcdefghijklmnopqrstuvwxyz';
      writeFileSync(join(root, 'docs/leak.md'), `Discord: ${fakeWebhook}\nToken: ${fakeGithubToken}\n`);
      const doctor = runOsc(root, ['doctor', '--check', 'secret-scan']);
      expect(doctor.status).toBe(1);
      expect(doctor.stdout).toContain('secret-scan');
      expect(doctor.stdout).toContain('Discord webhook URL');
      expect(doctor.stdout).toContain('GitHub token');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('blueprint registry and schema surfaces', () => {
  it('exposes command maturity and schema registries through CLI output', () => {
    const help = spawnSync(tsx, [cli, '--help'], { cwd: repoRoot, encoding: 'utf8' });
    expect(help.status).toBe(0);
    expect(help.stdout).toContain('Command maturity: stable day-one/day-two commands first; lab and advanced commands are labeled.');
    expect(help.stdout).toContain('osc first-run --non-interactive --slug <slug> --mission <text> --goal <text>');
    expect(help.stdout).toContain('osc adapter check <adapter-id>');
    expect(help.stdout).toContain('osc pr check <plan-slug> [--format <markdown|json>] [--online-github]');
    expect(help.stdout).toContain('osc schemas list [--json]');

    const schemas = spawnSync(tsx, [cli, 'schemas', 'list', '--json'], { cwd: repoRoot, encoding: 'utf8' });
    expect(schemas.status, schemas.stderr).toBe(0);
    const parsed = JSON.parse(schemas.stdout);
    expect(parsed.some((schema: { id: string }) => schema.id === 'open-scaffold.run.v1')).toBe(true);
    expect(parsed.some((schema: { id: string }) => schema.id === 'open-scaffold.pr_check.v1')).toBe(true);
  });
});
