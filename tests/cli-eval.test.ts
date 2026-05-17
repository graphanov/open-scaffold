import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'osc-cli-eval-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, 'docs/evidence'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild the thing.\n');
  const planPath = join(root, '.osc/plans/active/036-demo.md');
  writeFileSync(planPath, `# Plan: 036-demo

## Status

active

## Context

Demo.

## Goal

Evaluate a slice.

## Constraints / Out of scope

- Do not judge domain correctness.

## Files to touch

- src/evaluation.ts

## Acceptance criteria

- [ ] First criterion passes with evidence.
- [ ] Second criterion routes feedback.

## Verification steps

1. Run tests.

## Open questions

- None.
`);
  writeFileSync(join(root, 'docs/evidence/proof.md'), 'proof');
  return { root, planPath };
}

function validEnvelope(root: string) {
  return {
    schema: 'open-scaffold.evaluation.v1',
    evaluation_id: 'eval-cli-001',
    idempotency_key: 'eval:cli-demo',
    created_at: '2026-05-17T12:00:00.000Z',
    evaluated_at: '2026-05-17T12:05:00.000Z',
    subject: { source: 'plan', plan: '.osc/plans/active/036-demo.md', plan_slug: '036-demo', task_id: null, run_id: null, run_packet: null },
    correlation: { task_id: null, run_id: null, evidence_receipt_ids: [], feedback_ids: [] },
    inputs: { evidence: [], feedback: [] },
    acceptance_criteria: [
      {
        id: 'AC1',
        id_source: 'fallback',
        source_index: 1,
        text: 'First criterion passes with evidence.',
        status: 'pass',
        evaluator: { kind: 'human', name: 'maintainer', ref: null },
        evidence: [{ kind: 'path', ref: 'docs/evidence/proof.md', summary: 'Proof.' }],
        rationale: 'Evidence reviewed.',
        confidence: 'high',
        gaps: [],
        feedback_refs: [],
        correction: { route: null, target: null, rationale: '' },
      },
    ],
    verification: [],
    decision: { status: 'approved', approver: 'human', rationale: 'All criteria passed.' },
    improvement: { route: 'close', target: null, carried_forward: [], do_not_assume: ['This does not certify compliance or domain correctness.'] },
    notes: ['This envelope records acceptance-criteria-to-evidence coverage and routing. It does not certify correctness, compliance, production readiness, or model quality.'],
  };
}

describe('osc eval CLI', () => {
  it('prints an evaluation template for a plan without spawning runtimes', () => {
    const { root, planPath } = tempRepo();

    const output = execFileSync(tsx, [cli, 'eval', 'init', planPath], { cwd: root, encoding: 'utf8' });
    const envelope = JSON.parse(output);

    expect(envelope.schema).toBe('open-scaffold.evaluation.v1');
    expect(envelope.subject).toMatchObject({ source: 'plan', plan: '.osc/plans/active/036-demo.md' });
    expect(envelope.acceptance_criteria.map((criterion: any) => criterion.id)).toEqual(['AC1', 'AC2']);
    expect(output).not.toContain('spawn');
  });

  it('writes an evaluation template with --out and refuses to overwrite existing files', () => {
    const { root, planPath } = tempRepo();
    const outPath = join(root, 'docs/evidence/evaluation.json');

    const output = execFileSync(tsx, [cli, 'eval', 'init', planPath, '--out', outPath], { cwd: root, encoding: 'utf8' });

    expect(output).toContain('Created evaluation envelope:');
    expect(existsSync(outPath)).toBe(true);
    const overwrite = spawnSync(tsx, [cli, 'eval', 'init', planPath, '--out', outPath], { cwd: root, encoding: 'utf8' });
    expect(overwrite.status).toBe(1);
    expect(overwrite.stderr).toContain('Refusing to overwrite');
  });

  it('checks a valid evaluation envelope with structure-only PASS wording', () => {
    const { root } = tempRepo();
    const evalPath = join(root, 'docs/evidence/evaluation.json');
    writeFileSync(evalPath, JSON.stringify(validEnvelope(root), null, 2));

    const output = execFileSync(tsx, [cli, 'eval', 'check', evalPath], { cwd: root, encoding: 'utf8' });

    expect(output).toContain('PASS evaluation envelope structure valid');
    expect(output).toContain('does not judge correctness, compliance, production readiness, or model quality');
  });

  it('reports structural evaluation failures with FAIL prefixes and exit 1', () => {
    const { root } = tempRepo();
    const evalPath = join(root, 'docs/evidence/evaluation.json');
    const envelope = validEnvelope(root) as any;
    envelope.acceptance_criteria[0].evidence = [];
    writeFileSync(evalPath, JSON.stringify(envelope, null, 2));

    const result = spawnSync(tsx, [cli, 'eval', 'check', evalPath], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('FAIL evaluation.criteria.pass_missing_evidence');
  });

  it('reports directory inputs without dumping a Node stack trace', () => {
    const { root } = tempRepo();

    const result = spawnSync(tsx, [cli, 'eval', 'check', '.'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('FAIL evaluation.file_not_file');
    expect(result.stderr).not.toContain('node:fs');
    expect(result.stderr).not.toContain('at Object');
  });

  it('rejects unknown eval subcommands as argument errors', () => {
    const { root } = tempRepo();

    const result = spawnSync(tsx, [cli, 'eval', 'judge'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Usage: osc eval init <run-or-plan> [--out <path>] | osc eval check <evaluation-path>');
  });
});
