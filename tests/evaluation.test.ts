import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import {
  EVALUATION_SCHEMA,
  loadEvaluationSource,
  renderEvaluationEnvelope,
  validateEvaluationEnvelopeText,
} from '../src/evaluation.js';

function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'osc-evaluation-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/runs/demo-run'), { recursive: true });
  mkdirSync(join(root, 'docs/evidence'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild the thing.\n');
  return root;
}

function writePlan(root: string, criteria = ['First thing works.', 'Second thing routes feedback.']) {
  const planPath = join(root, '.osc/plans/active/036-demo.md');
  writeFileSync(planPath, `# Plan: 036-demo

## Status

active

## Context

Demo.

## Goal

Generate evaluation envelopes.

## Constraints / Out of scope

- Do not judge domain correctness.

## Files to touch

- src/evaluation.ts

## Acceptance criteria

${criteria.map((criterion) => `- [ ] ${criterion}`).join('\n')}

## Verification steps

1. Run tests.

## Open questions

- None.
`);
  return planPath;
}

function validCriterion(id: string, status = 'pass') {
  return {
    id,
    id_source: 'fallback',
    source_index: Number(id.replace(/\D/g, '')) || 1,
    text: `${id} text`,
    status,
    evaluator: { kind: 'human', name: 'maintainer', ref: null },
    evidence: status === 'pass' ? [{ kind: 'path', ref: 'docs/evidence/proof.md', summary: 'Proof.' }] : [],
    rationale: status === 'pass' ? 'Evidence reviewed.' : 'Not fully satisfied yet.',
    confidence: 'medium',
    gaps: status === 'pass' ? [] : ['Follow-up needed.'],
    feedback_refs: [],
    correction: status === 'pass' ? { route: null, target: null, rationale: '' } : { route: 'create_next_slice', target: '.osc/plans/backlog/next.md', rationale: 'Needs follow-up.' },
  };
}

function validEnvelope(root: string, overrides: Record<string, unknown> = {}) {
  writeFileSync(join(root, 'docs/evidence/proof.md'), 'proof');
  return {
    schema: EVALUATION_SCHEMA,
    evaluation_id: 'eval-001',
    idempotency_key: 'eval:demo',
    created_at: '2026-05-17T12:00:00.000Z',
    evaluated_at: '2026-05-17T12:05:00.000Z',
    subject: {
      source: 'plan',
      plan: '.osc/plans/active/036-demo.md',
      plan_slug: '036-demo',
      task_id: 'task-1',
      run_id: null,
      run_packet: null,
    },
    correlation: {
      task_id: 'task-1',
      run_id: null,
      evidence_receipt_ids: [],
      feedback_ids: [],
    },
    inputs: { evidence: [], feedback: [] },
    acceptance_criteria: [validCriterion('AC1')],
    verification: [],
    decision: { status: 'approved', approver: 'human', rationale: 'All criteria passed.' },
    improvement: { route: 'close', target: null, carried_forward: [], do_not_assume: ['This does not certify compliance or domain correctness.'] },
    notes: ['This envelope records acceptance-criteria-to-evidence coverage and routing. It does not certify correctness, compliance, production readiness, or model quality.'],
    ...overrides,
  };
}

describe('evaluation envelope generation', () => {
  it('renders a JSON evaluation envelope template from a plan with deterministic fallback AC ids', () => {
    const root = tempRepo();
    const planPath = writePlan(root);

    const envelope = JSON.parse(renderEvaluationEnvelope(loadEvaluationSource(planPath, root), { now: new Date('2026-05-17T12:00:00.000Z') }));

    expect(envelope.schema).toBe(EVALUATION_SCHEMA);
    expect(envelope.subject).toMatchObject({ source: 'plan', plan: '.osc/plans/active/036-demo.md', plan_slug: '036-demo' });
    expect(envelope.acceptance_criteria.map((criterion: any) => criterion.id)).toEqual(['AC1', 'AC2']);
    expect(envelope.acceptance_criteria[0]).toMatchObject({ id_source: 'fallback', source_index: 1, text: 'First thing works.', status: 'not_evaluated' });
    expect(envelope.idempotency_key).toMatch(/^eval:plan:036-demo:/);
    expect(envelope.notes.join('\n')).toContain('does not certify correctness, compliance, production readiness, or model quality');
  });

  it('renders a run-bound evaluation envelope from an open-scaffold run packet', () => {
    const root = tempRepo();
    const planPath = writePlan(root, ['Run criterion.']);
    const runPath = join(root, '.osc/runs/demo-run/run.json');
    writeFileSync(runPath, JSON.stringify({
      schemaVersion: 'open-scaffold.run.v1',
      runId: 'demo-run',
      taskId: 'task-123',
      plan: { slug: '036-demo', path: '.osc/plans/active/036-demo.md', acceptanceCriteria: ['Run criterion.'] },
      artifacts: { evidence: ['docs/evidence/run-proof.md'] },
    }, null, 2));

    const envelope = JSON.parse(renderEvaluationEnvelope(loadEvaluationSource(runPath, root), { now: new Date('2026-05-17T12:00:00.000Z') }));

    expect(existsSync(planPath)).toBe(true);
    expect(envelope.subject).toMatchObject({ source: 'run', task_id: 'task-123', run_id: 'demo-run', run_packet: '.osc/runs/demo-run/run.json' });
    expect(envelope.inputs.evidence).toEqual([{ kind: 'path', ref: 'docs/evidence/run-proof.md', summary: 'Evidence from run packet.' }]);
    expect(envelope.acceptance_criteria[0].id).toBe('AC1');
  });
});

describe('evaluation envelope validation', () => {
  it('accepts pass, partial, fail, blocked, and not_evaluated criteria when evidence/rationale, evaluator, and correction routes are present', () => {
    const root = tempRepo();
    const envelope = validEnvelope(root, {
      acceptance_criteria: [
        validCriterion('AC1', 'pass'),
        validCriterion('AC2', 'partial'),
        validCriterion('AC3', 'fail'),
        validCriterion('AC4', 'blocked'),
        validCriterion('AC5', 'not_evaluated'),
      ],
      decision: { status: 'blocked', approver: 'human', rationale: 'Some criteria require follow-up.' },
      improvement: { route: 'create_next_slice', target: '.osc/plans/backlog/next.md', carried_forward: ['Follow up non-pass criteria.'], do_not_assume: ['Non-pass criteria remain unresolved.'] },
    });

    const result = validateEvaluationEnvelopeText(JSON.stringify(envelope, null, 2), join(root, 'evaluation.json'), root);

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('allows weak approval only when the caution is carried forward', () => {
    const root = tempRepo();
    const envelope = validEnvelope(root, {
      decision: { status: 'weak_approved', approver: 'human', rationale: 'Accepted with explicit caution.' },
      improvement: { route: 'close', target: null, carried_forward: ['Carry product caution into the next slice.'], do_not_assume: ['Weak approval is not proof of product quality.'] },
    });

    const result = validateEvaluationEnvelopeText(JSON.stringify(envelope, null, 2), join(root, 'evaluation.json'), root);

    expect(result.ok).toBe(true);
    expect(result.warnings.map((warning) => warning.code)).toContain('evaluation.decision.weak_approval');
  });

  it('fails when a passing criterion has no durable evidence', () => {
    const root = tempRepo();
    const criterion = { ...validCriterion('AC1', 'pass'), evidence: [] };
    const envelope = validEnvelope(root, { acceptance_criteria: [criterion] });

    const result = validateEvaluationEnvelopeText(JSON.stringify(envelope, null, 2), join(root, 'evaluation.json'), root);

    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain('evaluation.criteria.pass_missing_evidence');
  });

  it('fails when a non-pass criterion has no correction route', () => {
    const root = tempRepo();
    const criterion = { ...validCriterion('AC1', 'fail'), correction: { route: null, target: null, rationale: '' } };
    const envelope = validEnvelope(root, {
      acceptance_criteria: [criterion],
      decision: { status: 'rejected', approver: 'human', rationale: 'Rejected.' },
      improvement: { route: 'retry_run', target: null, carried_forward: [], do_not_assume: [] },
    });

    const result = validateEvaluationEnvelopeText(JSON.stringify(envelope, null, 2), join(root, 'evaluation.json'), root);

    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain('evaluation.criteria.missing_correction_route');
  });

  it('fails when non-pass criteria have no top-level improvement route', () => {
    const root = tempRepo();
    const envelope = validEnvelope(root, {
      acceptance_criteria: [validCriterion('AC1', 'fail')],
      decision: { status: 'rejected', approver: 'human', rationale: 'Rejected.' },
      improvement: { route: null, target: null, carried_forward: [], do_not_assume: [] },
    });

    const result = validateEvaluationEnvelopeText(JSON.stringify(envelope, null, 2), join(root, 'evaluation.json'), root);

    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain('evaluation.improvement.missing_route');
  });

  it('fails when evidence kind is unsupported', () => {
    const root = tempRepo();
    const criterion = { ...validCriterion('AC1', 'pass'), evidence: [{ kind: 'not-a-kind', ref: 'docs/evidence/proof.md', summary: 'Invalid kind.' }] };
    const envelope = validEnvelope(root, { acceptance_criteria: [criterion] });

    const result = validateEvaluationEnvelopeText(JSON.stringify(envelope, null, 2), join(root, 'evaluation.json'), root);

    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain('evaluation.evidence.invalid_kind');
  });

  it('fails when local evidence path escapes the repo root', () => {
    const root = tempRepo();
    const outside = join(tmpdir(), `osc-outside-proof-${process.pid}.md`);
    writeFileSync(outside, 'outside proof');
    const criterion = { ...validCriterion('AC1', 'pass'), evidence: [{ kind: 'path', ref: relative(root, outside), summary: 'Outside proof.' }] };
    const envelope = validEnvelope(root, { acceptance_criteria: [criterion] });

    const result = validateEvaluationEnvelopeText(JSON.stringify(envelope, null, 2), join(root, 'evaluation.json'), root);

    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain('evaluation.evidence.path_outside_root');
  });

  it('fails when evaluator source is missing or unspecified', () => {
    const root = tempRepo();
    const criterion = { ...validCriterion('AC1', 'pass'), evaluator: { kind: 'unspecified', name: null, ref: null } };
    const envelope = validEnvelope(root, { acceptance_criteria: [criterion] });

    const result = validateEvaluationEnvelopeText(JSON.stringify(envelope, null, 2), join(root, 'evaluation.json'), root);

    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain('evaluation.criteria.missing_evaluator');
  });

  it('fails when feedback targets an unknown acceptance criterion', () => {
    const root = tempRepo();
    const envelope = validEnvelope(root, {
      inputs: { evidence: [], feedback: [{ id: 'FB1', source: 'human', kind: 'defect', target: 'AC404', severity: 'major', summary: 'Wrong target.' }] },
    });

    const result = validateEvaluationEnvelopeText(JSON.stringify(envelope, null, 2), join(root, 'evaluation.json'), root);

    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain('evaluation.feedback.unknown_target');
  });

  it('fails when approval is claimed while non-pass criteria remain', () => {
    const root = tempRepo();
    const envelope = validEnvelope(root, {
      acceptance_criteria: [validCriterion('AC1', 'blocked')],
      decision: { status: 'approved', approver: 'human', rationale: 'Approved anyway.' },
      improvement: { route: 'create_next_slice', target: '.osc/plans/backlog/next.md', carried_forward: ['Blocked.'], do_not_assume: [] },
    });

    const result = validateEvaluationEnvelopeText(JSON.stringify(envelope, null, 2), join(root, 'evaluation.json'), root);

    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain('evaluation.decision.approved_with_non_pass');
  });
});
