import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process'; // spawnSync used by run()
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const cli = resolve(repoRoot, 'src/cli.ts');
const tsxLoader = join(repoRoot, 'node_modules/tsx/dist/loader.mjs');
const fixtures = resolve(repoRoot, 'tests/fixtures/capture');
const recordFixtures = resolve(fixtures, 'records');
const ambientHook = resolve(repoRoot, 'examples/hooks/ambient-hook.mjs');
const codexNotifyHook = resolve(repoRoot, 'examples/hooks/codex-notify.mjs');

// Run through the tsx loader with cwd set to the temp repo so
// capture resolves the .osc root and default output path from there, exactly like a hook.
function run(args: string[], cwd: string) {
  return spawnSync(process.execPath, ['--import', tsxLoader, cli, ...args], { cwd, encoding: 'utf8' });
}

function tempRepo() {
  const target = mkdtempSync(join(tmpdir(), 'osc-capture-cli-'));
  execFileSync(process.execPath, ['--import', tsxLoader, cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });
  return target;
}

describe('osc capture CLI surface', () => {
  it('captures a codex transcript and writes a valid record (exit 0)', () => {
    const repo = tempRepo();
    const out = join(repo, 'codex-record.json');
    const result = run(['capture', '--from', 'codex', '--transcript', join(fixtures, 'codex.jsonl'), '--out', out], repo);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('osc.ambient-work-record.v1');
    const record = JSON.parse(readFileSync(out, 'utf8'));
    expect(record.schema).toBe('osc.ambient-work-record.v1');
    expect(record.source).toBe('transcript-extraction');
    expect(record.observed.assistant_turns).toBe(1);
    expect(record.runtime.tokenTotal).toBeGreaterThan(0);
  });

  it('detects the format with --detect on both fixture families', () => {
    const repo = tempRepo();
    for (const [fixture, expected] of [['claude-code.jsonl', 'claude-code'], ['codex.jsonl', 'codex']] as const) {
      const out = join(repo, `${expected}.json`);
      const result = run(['capture', '--detect', '--transcript', join(fixtures, fixture), '--out', out, '--json'], repo);
      expect(result.status).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload.format).toBe(expected);
      expect(payload.detected).toBe(true);
    }
  });

  it('defaults the output under .osc/state/ambient inside an .osc repo', () => {
    const repo = tempRepo();
    const result = run(['capture', '--from', 'codex', '--transcript', join(fixtures, 'codex.jsonl'), '--session-id', 'sess-default'], repo);
    expect(result.status).toBe(0);
    expect(existsSync(join(repo, '.osc/state/ambient/sess-default.json'))).toBe(true);
  });

  it('hook wrapper climbs from nested cwd to the scaffold root for default output', () => {
    const repo = tempRepo();
    const nested = join(repo, 'work', 'nested');
    mkdirSync(nested, { recursive: true });
    const result = spawnSync(process.execPath, [ambientHook], {
      cwd: nested,
      input: JSON.stringify({
        transcript_path: join(fixtures, 'claude-code.jsonl'),
        session_id: 'sess-hook-nested',
        cwd: nested,
      }),
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(existsSync(join(repo, '.osc/state/ambient/sess-hook-nested.json'))).toBe(true);
    expect(existsSync(join(nested, 'sess-hook-nested.ambient-record.json'))).toBe(false);
  });

  it('checked-in Codex notify hook captures the event thread rollout, not a newer sibling', () => {
    const repo = tempRepo();
    const home = mkdtempSync(join(tmpdir(), 'osc-codex-home-'));
    const codexHome = join(home, 'custom-codex-home');
    const sessionDir = join(codexHome, 'sessions', '2026', '06', '13');
    mkdirSync(sessionDir, { recursive: true });
    const fixture = readFileSync(join(fixtures, 'codex.jsonl'), 'utf8');
    writeFileSync(join(sessionDir, 'rollout-2026-06-13T00-00-00-thread-keep.jsonl'), fixture, 'utf8');
    writeFileSync(join(sessionDir, 'rollout-2026-06-13T00-01-00-thread-other.jsonl'), fixture, 'utf8');

    const result = spawnSync(process.execPath, [codexNotifyHook, JSON.stringify({
      type: 'agent-turn-complete',
      'thread-id': 'thread-keep',
      cwd: repo,
    })], {
      cwd: join(repo, '.osc'),
      env: { ...process.env, HOME: home, CODEX_HOME: codexHome },
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(existsSync(join(repo, '.osc/state/ambient/rollout-2026-06-13T00-00-00-thread-keep.json'))).toBe(true);
    expect(existsSync(join(repo, '.osc/state/ambient/rollout-2026-06-13T00-01-00-thread-other.json'))).toBe(false);
  });

  it('exits 2 on direct CLI misuse (unknown --from value)', () => {
    const repo = tempRepo();
    const result = run(['capture', '--from', 'aider', '--transcript', join(fixtures, 'codex.jsonl')], repo);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Invalid --from value: aider');
    expect(result.stdout).toBe('');
  });

  it('exits 2 when neither --from nor --detect is given', () => {
    const repo = tempRepo();
    const result = run(['capture', '--transcript', join(fixtures, 'codex.jsonl')], repo);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('--from');
  });

  it('exits 2 on a missing transcript for direct CLI use', () => {
    const repo = tempRepo();
    const result = run(['capture', '--from', 'codex', '--transcript', join(repo, 'nope.jsonl')], repo);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Transcript not found');
  });

  it('refuses to overwrite the transcript when --out resolves to the input file', () => {
    const repo = tempRepo();
    const transcript = join(repo, 'copy.jsonl');
    const original = readFileSync(join(fixtures, 'codex.jsonl'), 'utf8');
    writeFileSync(transcript, original, 'utf8');
    const result = run(['capture', '--from', 'codex', '--transcript', transcript, '--out', transcript], repo);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('--out must not overwrite --transcript');
    expect(readFileSync(transcript, 'utf8')).toBe(original);
  });

  it('is hook-safe: --hook-safe never breaks the session on malformed option values', () => {
    const repo = tempRepo();
    const result = run(['capture', '--from', 'codex', '--transcript', '--hook-safe'], repo);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('is hook-safe: --hook-safe never breaks the session on missing input (exit 0, no record)', () => {
    const repo = tempRepo();
    const result = run(['capture', '--from', 'codex', '--transcript', join(repo, 'missing.jsonl'), '--hook-safe'], repo);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('is hook-safe on malformed format under --hook-safe (exit 0)', () => {
    const repo = tempRepo();
    const result = run(['capture', '--from', 'aider', '--transcript', join(fixtures, 'codex.jsonl'), '--hook-safe'], repo);
    expect(result.status).toBe(0);
  });

  it('tolerates a malformed transcript body and still writes a record (exit 0)', () => {
    const repo = tempRepo();
    const out = join(repo, 'malformed-record.json');
    const result = run(['capture', '--from', 'claude-code', '--transcript', join(fixtures, 'malformed.jsonl'), '--out', out], repo);
    expect(result.status).toBe(0);
    const record = JSON.parse(readFileSync(out, 'utf8'));
    expect(record.observed.assistant_turns).toBe(1);
    expect(record.observed.notes.some((note: string) => /malformed/.test(note))).toBe(true);
  });

  it('never modifies the transcript it reads', () => {
    const repo = tempRepo();
    const transcript = join(repo, 'copy.jsonl');
    const original = readFileSync(join(fixtures, 'codex.jsonl'), 'utf8');
    writeFileSync(transcript, original, 'utf8');
    run(['capture', '--from', 'codex', '--transcript', transcript, '--out', join(repo, 'r.json')], repo);
    expect(readFileSync(transcript, 'utf8')).toBe(original);
  });

  it('prints capture help without error', () => {
    const repo = tempRepo();
    const result = run(['capture', '--help'], repo);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: osc capture --from');
    expect(result.stdout).toContain('osc capture verify <record> [--json]');
    expect(result.stderr).toBe('');
  });

  it('verifies a valid ambient record in human-readable mode', () => {
    const repo = tempRepo();
    const result = run(['capture', 'verify', join(recordFixtures, 'valid-claude-code.json')], repo);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Ambient record trust report');
    expect(result.stdout).toContain('Session id: claude-session-1');
    expect(result.stdout).toContain('Tool-call census: Edit=1, Read=1');
    expect(result.stdout).toContain('not approval, correctness certification, retry authorization, execution authority, or spawn authority');
    expect(result.stdout).not.toContain('APPROVED BY RECORD TEXT');
  });

  it('verifies a valid ambient record in JSON mode without dumping the raw record', () => {
    const repo = tempRepo();
    const result = run(['capture', 'verify', join(recordFixtures, 'valid-codex.json'), '--json'], repo);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.session_id).toBe('codex-session-1');
    expect(payload.transcript_observed.usage.total_tokens).toBe(5750);
    expect(payload.boundary.authority).toContain('not approval');
    expect(payload.observed).toBeUndefined();
    expect(payload.boundary.note).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain('codex cache-creation split unavailable');
  });

  it('verifies postflight records without observed facts as unavailable transcript fidelity', () => {
    const repo = tempRepo();
    const result = run(['capture', 'verify', join(recordFixtures, 'valid-postflight-no-observed.json')], repo);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Transcript-observed facts: unavailable');
    expect(result.stdout).toContain('postflight runtime receipt only');
  });

  it('exits 2 for malformed ambient records', () => {
    const repo = tempRepo();
    const result = run(['capture', 'verify', join(recordFixtures, 'malformed-schema.json')], repo);

    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Invalid ambient record');
    expect(result.stderr).toContain('record.schema');
  });

  it('sanitizes record path labels on verify failures', () => {
    const repo = tempRepo();
    const result = run(['capture', 'verify', '/Users/alice/sk-proj-AAAAAAAAAAAABBBBBBBBBBBBBBBB.json'], repo);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Ambient record not found');
    expect(result.stderr).not.toContain('/Users/');
    expect(result.stderr).not.toContain('sk-proj-AAAAAAAA');
    expect(result.stderr).toContain('/[local-path-redacted]');
  });

  it('prints capture verify help without error', () => {
    const repo = tempRepo();
    const result = run(['capture', 'verify', '--help'], repo);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: osc capture verify <record> [--json]');
    expect(result.stdout).toContain('Malformed JSON');
    expect(result.stderr).toBe('');
  });

  it('dry-runs Claude Code capture setup from the CLI without writing', () => {
    const repo = tempRepo();
    const settings = join(repo, '.claude/settings.local.json');
    const result = run(['capture', 'setup', 'claude-code', '--claude-settings', settings], repo);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('claude-code: would-install');
    expect(result.stdout).toContain('ambient-hook.mjs');
    expect(existsSync(settings)).toBe(false);
  });

  it('dry-runs Codex capture setup from the CLI without writing', () => {
    const repo = tempRepo();
    const config = join(repo, 'codex-config.toml');
    const result = run(['capture', 'setup', 'codex', '--codex-config', config], repo);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('codex: would-install');
    expect(result.stdout).toContain('codex-notify.mjs');
    expect(existsSync(config)).toBe(false);
  });

  it('dry-runs all capture setup targets from the CLI', () => {
    const repo = tempRepo();
    const result = run([
      'capture',
      'setup',
      'all',
      '--claude-settings',
      join(repo, '.claude/settings.local.json'),
      '--codex-config',
      join(repo, 'codex-config.toml'),
    ], repo);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('claude-code: would-install');
    expect(result.stdout).toContain('codex: would-install');
  });

  it('prints safe JSON for capture setup', () => {
    const repo = tempRepo();
    const config = join(repo, 'codex-config.toml');
    writeFileSync(config, 'model = "SENTINEL_SECRET"\n');
    const result = run(['capture', 'setup', 'codex', '--codex-config', config, '--json'], repo);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.mode).toBe('dry-run');
    expect(payload.results[0].runtime).toBe('codex');
    expect(result.stdout).not.toContain('SENTINEL_SECRET');
  });

  it('writes capture setup config from the CLI', () => {
    const repo = tempRepo();
    const settings = join(repo, '.claude/settings.local.json');
    const config = join(repo, 'codex-config.toml');
    const result = run([
      'capture',
      'setup',
      'all',
      '--write',
      '--claude-settings',
      settings,
      '--codex-config',
      config,
    ], repo);

    expect(result.status).toBe(0);
    expect(readFileSync(settings, 'utf8')).toContain('ambient-hook.mjs');
    expect(readFileSync(config, 'utf8')).toContain('codex-notify.mjs');
  });

  it('writes default Claude Code setup with a gitignore guard from the CLI', () => {
    const repo = tempRepo();
    const result = run(['capture', 'setup', 'claude-code', '--write'], repo);

    expect(result.status).toBe(0);
    expect(readFileSync(join(repo, '.claude/settings.local.json'), 'utf8')).toContain('ambient-hook.mjs');
    expect(readFileSync(join(repo, '.gitignore'), 'utf8')).toContain('.claude/settings.local.json');
  });

  it('rejects conflicting capture setup modes', () => {
    const repo = tempRepo();
    const result = run(['capture', 'setup', 'codex', '--write', '--dry-run', '--codex-config', join(repo, 'codex-config.toml')], repo);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Use either --write or --dry-run');
  });
});


describe.skipIf(process.platform === 'win32')('osc capture output link refusals', () => {
  function localTranscript(repo: string) {
    const transcript = join(repo, 'interrupted.jsonl');
    const original = `${readFileSync(join(fixtures, 'claude-code.jsonl'), 'utf8')}\n{"unfinished":`;
    writeFileSync(transcript, original);
    return { transcript, original };
  }

  it.each([false, true])('refuses a default final link with hook-safe=%s and keeps evidence and transcript bytes', (hookSafe) => {
    const repo = tempRepo();
    const { transcript, original } = localTranscript(repo);
    const target = join(repo, '.osc/releases/kept.md');
    writeFileSync(target, 'keep evidence\n');
    const output = join(repo, '.osc/state/ambient/interrupted.json');
    mkdirSync(dirname(output), { recursive: true });
    symlinkSync(target, output);
    const result = run(['capture', '--from', 'claude-code', '--transcript', transcript, ...(hookSafe ? ['--hook-safe', '--json'] : [])], repo);
    expect(result.status).toBe(hookSafe ? 0 : 2);
    expect(result.stdout).toBe('');
    if (hookSafe) expect(result.stderr).toBe('');
    else expect(result.stderr).toContain('symlink');
    expect(readlinkSync(output)).toBe(target);
    expect(readFileSync(target, 'utf8')).toBe('keep evidence\n');
    expect(readFileSync(transcript, 'utf8')).toBe(original);
  });

  it.each([false, true])('refuses a default parent link with hook-safe=%s before creating output', (hookSafe) => {
    const repo = tempRepo();
    const { transcript, original } = localTranscript(repo);
    const target = join(repo, '.osc/releases');
    const before = readdirSync(target).sort();
    const parent = join(repo, '.osc/state/ambient');
    mkdirSync(dirname(parent), { recursive: true });
    symlinkSync(target, parent, 'dir');
    const result = run(['capture', '--from', 'claude-code', '--transcript', transcript, ...(hookSafe ? ['--hook-safe'] : [])], repo);
    expect(result.status).toBe(hookSafe ? 0 : 2);
    expect(result.stdout).toBe('');
    if (hookSafe) expect(result.stderr).toBe('');
    else expect(result.stderr).toContain('symlink');
    expect(readlinkSync(parent)).toBe(target);
    expect(readdirSync(target).sort()).toEqual(before);
    expect(existsSync(join(target, 'interrupted.json'))).toBe(false);
    expect(readFileSync(transcript, 'utf8')).toBe(original);
  });

  it('refuses an explicit external final link without changing its target', () => {
    const repo = tempRepo();
    const { transcript, original } = localTranscript(repo);
    const outside = mkdtempSync(join(tmpdir(), 'osc-capture-cli-outside-'));
    const target = join(outside, 'kept.md');
    const output = join(outside, 'record.json');
    writeFileSync(target, 'keep external evidence\n');
    symlinkSync(target, output);
    const result = run(['capture', '--from', 'claude-code', '--transcript', transcript, '--out', output], repo);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('symlink');
    expect(readlinkSync(output)).toBe(target);
    expect(readFileSync(target, 'utf8')).toBe('keep external evidence\n');
    expect(readFileSync(transcript, 'utf8')).toBe(original);
  });

  it('keeps ordinary partial-tail capture and explicit external missing/regular output compatible', () => {
    const repo = tempRepo();
    const { transcript, original } = localTranscript(repo);
    const outside = mkdtempSync(join(tmpdir(), 'osc-capture-cli-regular-'));
    for (const output of [join(outside, 'new', 'record.json'), join(outside, 'existing.json')]) {
      if (output.endsWith('existing.json')) writeFileSync(output, 'old record');
      const result = run(['capture', '--from', 'claude-code', '--transcript', transcript, '--out', output, '--json'], repo);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      const payload = JSON.parse(result.stdout);
      expect(payload.record.schema).toBe('osc.ambient-work-record.v1');
      expect(payload.record.observed.notes).toContain('tolerated 1 malformed/non-object json line(s).');
      expect(JSON.parse(readFileSync(output, 'utf8')).observed.assistant_turns).toBe(3);
    }
    expect(readFileSync(transcript, 'utf8')).toBe(original);
  });

  it('supports aliased repository and output prefixes while protecting an aliased transcript', () => {
    const repo = tempRepo();
    const { transcript, original } = localTranscript(repo);
    const holder = mkdtempSync(join(tmpdir(), 'osc-capture-cli-root-alias-'));
    const alias = join(holder, 'repo');
    symlinkSync(repo, alias, 'dir');
    const inputAlias = join(alias, 'input-alias.jsonl');
    symlinkSync(transcript, inputAlias);
    for (const [root, output] of [[alias, join(repo, 'physical.json')], [repo, join(alias, 'alias.json')]] as const) {
      const result = run(['capture', '--from', 'claude-code', '--transcript', join(alias, 'interrupted.jsonl'), '--repo', root, '--out', output], repo);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(JSON.parse(readFileSync(output, 'utf8')).schema).toBe('osc.ambient-work-record.v1');
    }
    const result = run(['capture', '--from', 'claude-code', '--transcript', inputAlias, '--repo', alias, '--out', transcript], repo);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('must not overwrite --transcript');
    expect(readFileSync(transcript, 'utf8')).toBe(original);
    expect(readlinkSync(inputAlias)).toBe(transcript);
  });
});
