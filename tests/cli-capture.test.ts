import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process'; // spawnSync used by run()
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const cli = resolve(repoRoot, 'src/cli.ts');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const fixtures = resolve(repoRoot, 'tests/fixtures/capture');
const ambientHook = resolve(repoRoot, 'examples/hooks/ambient-hook.mjs');

// Run via the tsx binary (resolves regardless of cwd) with cwd set to the temp repo so
// capture resolves the .osc root and default output path from there, exactly like a hook.
function run(args: string[], cwd: string) {
  return spawnSync(tsx, [cli, ...args], { cwd, encoding: 'utf8' });
}

function tempRepo() {
  const target = mkdtempSync(join(tmpdir(), 'osc-capture-cli-'));
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });
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

  it('defaults the output under .osc-dev/ambient inside an .osc repo', () => {
    const repo = tempRepo();
    const result = run(['capture', '--from', 'codex', '--transcript', join(fixtures, 'codex.jsonl'), '--session-id', 'sess-default'], repo);
    expect(result.status).toBe(0);
    expect(existsSync(join(repo, '.osc-dev/ambient/sess-default.json'))).toBe(true);
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
    expect(existsSync(join(repo, '.osc-dev/ambient/sess-hook-nested.json'))).toBe(true);
    expect(existsSync(join(nested, 'sess-hook-nested.ambient-record.json'))).toBe(false);
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
    expect(result.stderr).toBe('');
  });
});
