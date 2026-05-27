import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'osc-compare-'));
}

function writeAttempt(root: string, name: string, options: {
  diff?: string;
  rationale?: string;
  transcript?: string;
  acStatus?: unknown;
}) {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  if (options.diff !== undefined) writeFileSync(join(dir, 'diff.patch'), options.diff);
  if (options.rationale !== undefined) writeFileSync(join(dir, 'rationale.txt'), options.rationale);
  if (options.transcript !== undefined) writeFileSync(join(dir, 'transcript.md'), options.transcript);
  if (options.acStatus !== undefined) writeFileSync(join(dir, 'ac-status.json'), JSON.stringify(options.acStatus, null, 2));
  return dir;
}

const diffA = `diff --git a/src/widget.ts b/src/widget.ts
--- a/src/widget.ts
+++ b/src/widget.ts
@@ -1,3 +1,4 @@
 export function widget(input: string) {
+  if (!input) return 'empty';
   return input.trim();
 }
`;

const diffB = `diff --git a/src/widget.ts b/src/widget.ts
--- a/src/widget.ts
+++ b/src/widget.ts
@@ -1,3 +1,6 @@
 export function widget(input: string) {
+  if (!input) {
+    throw new Error('input required');
+  }
   return input.trim();
 }
`;

const timestampedPlainDiff = `--- src/widget.ts	2026-05-27 14:30:00
+++ src/widget.ts	2026-05-27 14:31:00
@@ -1,2 +1,3 @@
 export function widget(input: string) {
+  if (!input) return 'empty';
 }
`;

describe('osc compare', () => {
  it('keeps the checked-in attempt-compare fixture reproducible', () => {
    const output = execFileSync(tsx, [cli, 'compare', 'examples/attempt-compare/attempt-a', 'examples/attempt-compare/attempt-b'], { cwd: repoRoot, encoding: 'utf8' });
    const expected = readFileSync(join(repoRoot, 'examples/attempt-compare/expected.md'), 'utf8');

    expect(output).toBe(expected);
  });

  it('renders a PR-pasteable markdown attempt comparison from two bare folders', () => {
    const root = tempDir();
    const attemptA = writeAttempt(root, 'attempt-a', {
      diff: diffA,
      rationale: 'Fast patch, but it silently accepts empty input.',
      transcript: 'PRIVATE FULL TRANSCRIPT A SHOULD NOT MATTER.',
      acStatus: {
        score: 0.62,
        score_label: 'human reviewer score',
        criteria: [
          { id: 'AC1', text: 'Trims valid input.', status: 'pass' },
          { id: 'AC2', text: 'Rejects empty input.', status: 'fail|needs review' },
        ],
      },
    });
    const attemptB = writeAttempt(root, 'attempt-b', {
      diff: diffB,
      rationale: 'Stronger behavior because empty input is explicit.',
      transcript: 'PRIVATE FULL TRANSCRIPT B SHOULD NOT MATTER.',
      acStatus: {
        score: 0.91,
        score_label: 'human reviewer | score\nline',
        criteria: [
          { id: 'AC1', text: 'Trims valid input.', status: 'pass' },
          { id: 'AC2', text: 'Rejects empty input.', status: 'pass' },
        ],
      },
    });

    const output = execFileSync(tsx, [cli, 'compare', attemptA, attemptB], { cwd: repoRoot, encoding: 'utf8' });

    expect(output).toContain('# Attempt comparison: attempt-a → attempt-b');
    expect(output).toContain('| Field | Attempt A | Attempt B | Δ |');
    expect(output).toContain('User-provided score');
    expect(output).toContain('src/widget.ts');
    expect(output).toContain('Fast patch, but it silently accepts empty input.');
    expect(output).toContain('User-provided score (human reviewer score, human reviewer \\| score<br>line; not automatic benchmark)');
    expect(output).toContain('AC2 — Rejects empty input.');
    expect(output).toContain('fail\\|needs review');
    expect(output).toContain('✓ pass ▲');
  });

  it('emits stable JSON without embedding full transcripts by default', () => {
    const root = tempDir();
    const attemptA = writeAttempt(root, 'attempt-a', {
      diff: diffA,
      rationale: 'A rationale.',
      transcript: 'PRIVATE FULL TRANSCRIPT A SHOULD NOT APPEAR IN JSON.',
      acStatus: { criteria: [{ id: 'AC1', text: 'Works', status: 'partial' }] },
    });
    const attemptB = writeAttempt(root, 'attempt-b', {
      diff: diffB,
      rationale: 'B rationale.',
      transcript: 'PRIVATE FULL TRANSCRIPT B SHOULD NOT APPEAR IN JSON.',
      acStatus: { criteria: [{ id: 'AC1', text: 'Works', status: 'pass' }] },
    });

    const output = execFileSync(tsx, [cli, 'compare', attemptA, attemptB, '--json'], { cwd: repoRoot, encoding: 'utf8' });
    const parsed = JSON.parse(output) as Record<string, any>;

    expect(parsed.schema).toBe('open-scaffold.attempt-comparison.v1');
    expect(parsed.attempts.a.name).toBe('attempt-a');
    expect(parsed.attempts.a.transcript.present).toBe(true);
    expect(parsed.attempts.a.transcript.bytes).toBeGreaterThan(0);
    expect(parsed.attempts.a.transcript.content).toBeUndefined();
    expect(parsed.diff.changedFiles).toContain('src/widget.ts');
    expect(parsed.acceptanceCriteria.rows[0]).toMatchObject({ id: 'AC1', aStatus: 'partial', bStatus: 'pass' });
    expect(JSON.stringify(parsed)).not.toContain('PRIVATE FULL TRANSCRIPT');
  });

  it('strips timestamps from plain unified diff headers before comparing file names', () => {
    const root = tempDir();
    const attemptA = writeAttempt(root, 'attempt-a', {
      diff: timestampedPlainDiff,
      rationale: 'Plain diff generated with timestamped headers.',
    });
    const attemptB = writeAttempt(root, 'attempt-b', {
      diff: timestampedPlainDiff.replace('14:31:00', '14:45:00'),
      rationale: 'Same file changed later should not look like a different path.',
    });

    const output = execFileSync(tsx, [cli, 'compare', attemptA, attemptB, '--json'], { cwd: repoRoot, encoding: 'utf8' });
    const parsed = JSON.parse(output) as Record<string, any>;

    expect(parsed.diff.changedFiles).toEqual(['src/widget.ts']);
    expect(parsed.diff.onlyInA).toEqual([]);
    expect(parsed.diff.onlyInB).toEqual([]);
  });

  it('writes markdown to --output and reports missing optional files as warnings', () => {
    const root = tempDir();
    const attemptA = writeAttempt(root, 'attempt-a', {
      diff: diffA,
      rationale: 'A rationale.',
      transcript: 'Transcript A.',
      acStatus: { criteria: [{ id: 'AC1', text: 'Works', status: 'pass' }] },
    });
    const attemptB = writeAttempt(root, 'attempt-b', {
      rationale: 'B rationale without optional files.',
    });
    const outPath = join(root, 'comparison.md');

    const stdout = execFileSync(tsx, [cli, 'compare', attemptA, attemptB, '--output', outPath], { cwd: repoRoot, encoding: 'utf8' });
    const written = readFileSync(outPath, 'utf8');

    expect(stdout).toContain('Wrote attempt comparison:');
    expect(existsSync(outPath)).toBe(true);
    expect(written).toContain('## Warnings');
    expect(written).toContain('attempt-b: missing optional `diff.patch`');
    expect(written).toContain('attempt-b: missing optional `transcript.md`');
    expect(written).toContain('attempt-b: missing optional `ac-status.json`');
  });

  it('fails clearly when neither attempt has meaningful diff nor rationale', () => {
    const root = tempDir();
    const attemptA = writeAttempt(root, 'attempt-a', { transcript: 'Only transcript A.' });
    const attemptB = writeAttempt(root, 'attempt-b', { transcript: 'Only transcript B.' });

    const result = spawnSync(tsx, [cli, 'compare', attemptA, attemptB], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Each attempt must include meaningful `diff.patch` or `rationale.txt`');
  });
});
