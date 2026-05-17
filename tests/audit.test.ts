import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import {
  AUDIT_SCHEMA,
  renderAuditManifest,
  validateAuditManifestText,
} from '../src/audit.js';

function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'osc-audit-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/runs/demo-run'), { recursive: true });
  mkdirSync(join(root, 'docs/evidence'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild the thing.\n');
  return root;
}

function writePlan(root: string) {
  const planPath = join(root, '.osc/plans/active/037-demo.md');
  writeFileSync(planPath, `# Plan: 037-demo

## Status

active

## Context

Demo.

## Goal

Generate audit manifests.

## Constraints / Out of scope

- Do not certify compliance.

## Files to touch

- src/audit.ts

## Acceptance criteria

- [ ] Manifest records local artifact digests.
- [ ] Check detects drift.

## Verification steps

1. Run tests.

## Open questions

- None.
`);
  return planPath;
}

function writeRunPacket(root: string) {
  const planPath = writePlan(root);
  const runPath = join(root, '.osc/runs/demo-run/run.json');
  writeFileSync(runPath, JSON.stringify({
    schemaVersion: 'open-scaffold.run.v1',
    runId: 'demo-run',
    taskId: 'task-123',
    plan: { slug: '037-demo', path: '.osc/plans/active/037-demo.md', acceptanceCriteria: ['Manifest records local artifact digests.'] },
    artifacts: { evidence: ['docs/evidence/proof.md'] },
  }, null, 2));
  return { planPath, runPath };
}

function validManifest(root: string, overrides: Record<string, unknown> = {}) {
  const planPath = writePlan(root);
  writeFileSync(join(root, 'docs/evidence/proof.md'), 'proof\n');
  const manifest = JSON.parse(renderAuditManifest(planPath, [
    { role: 'evidence', path: 'docs/evidence/proof.md' },
  ], root, { now: new Date('2026-05-17T12:00:00.000Z') }));
  return { ...manifest, ...overrides };
}

function failCodes(result: ReturnType<typeof validateAuditManifestText>) {
  return result.failures.map((failure) => failure.code);
}

describe('audit manifest generation', () => {
  it('renders a deterministic local digest manifest from a plan and curated artifacts', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    writeFileSync(join(root, 'docs/evidence/proof.md'), 'proof\n');

    const manifest = JSON.parse(renderAuditManifest(planPath, [
      { role: 'evidence', path: 'docs/evidence/proof.md' },
    ], root, { now: new Date('2026-05-17T12:00:00.000Z') }));

    expect(manifest.schema).toBe(AUDIT_SCHEMA);
    expect(manifest.audit_envelope_id).toBe('20260517T120000Z-037-demo-audit');
    expect(manifest.subject).toMatchObject({ source: 'plan', plan: '.osc/plans/active/037-demo.md', plan_slug: '037-demo', task_id: null, run_id: null, run_packet: null });
    expect(manifest.artifacts.map((artifact: any) => artifact.role)).toEqual(['plan', 'evidence']);
    expect(manifest.artifacts[0]).toMatchObject({ id: 'plan:.osc/plans/active/037-demo.md', role: 'plan', path: '.osc/plans/active/037-demo.md', digest: { alg: 'sha256' } });
    expect(manifest.artifacts[0].digest.value).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.artifacts[1]).toMatchObject({ id: 'evidence:docs/evidence/proof.md', role: 'evidence', path: 'docs/evidence/proof.md', digest: { alg: 'sha256' } });
    expect(manifest.boundary).toMatchObject({ digest_integrity_only: true, compliance_certification: false, runtime_spawning: false, model_benchmarking: false, external_anchoring: false });
    expect(manifest.notes.join('\n')).toContain('does not certify correctness, compliance, approval, runtime execution, model quality, or external anchoring');
  });

  it('preserves the user-supplied repo-relative symlink path while still hashing the target bytes', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    writeFileSync(join(root, 'docs/evidence/proof.md'), 'proof\n');
    symlinkSync('proof.md', join(root, 'docs/evidence/link.md'));

    const manifest = JSON.parse(renderAuditManifest(planPath, [
      { role: 'evidence', path: 'docs/evidence/link.md' },
    ], root, { now: new Date('2026-05-17T12:00:00.000Z') }));

    expect(manifest.artifacts[1]).toMatchObject({ id: 'evidence:docs/evidence/link.md', role: 'evidence', path: 'docs/evidence/link.md' });
    expect(validateAuditManifestText(JSON.stringify(manifest, null, 2), join(root, 'audit.json'), root).ok).toBe(true);
  });

  it('rejects symlinked artifacts that resolve into private/internal workspace paths during generation', () => {
    const root = tempRepo();
    const planPath = writePlan(root);
    mkdirSync(join(root, '.osc-dev'), { recursive: true });
    writeFileSync(join(root, '.osc-dev/private.md'), 'private draft\n');
    symlinkSync('../../.osc-dev/private.md', join(root, 'docs/evidence/private-link.md'));

    expect(() => renderAuditManifest(planPath, [
      { role: 'evidence', path: 'docs/evidence/private-link.md' },
    ], root, { now: new Date('2026-05-17T12:00:00.000Z') })).toThrow(/private\/internal workspace state: \.osc-dev\/private\.md/);
  });

  it('renders a run-bound manifest without judging evaluation correctness', () => {
    const root = tempRepo();
    const { runPath } = writeRunPacket(root);
    writeFileSync(join(root, 'docs/evidence/proof.md'), 'proof\n');

    const manifest = JSON.parse(renderAuditManifest(runPath, [
      { role: 'evidence', path: 'docs/evidence/proof.md' },
    ], root, { now: new Date('2026-05-17T12:00:00.000Z') }));

    expect(manifest.subject).toMatchObject({ source: 'run', task_id: 'task-123', run_id: 'demo-run', run_packet: '.osc/runs/demo-run/run.json' });
    expect(manifest.artifacts.map((artifact: any) => artifact.role)).toEqual(['run_packet', 'evidence']);
    expect(manifest.boundary.approval_or_release_decision).toBe(false);
  });

  it('rejects run packets without a concrete plan path during generation', () => {
    const root = tempRepo();
    const runPath = join(root, '.osc/runs/demo-run/run.json');
    writeFileSync(runPath, JSON.stringify({
      schemaVersion: 'open-scaffold.run.v1',
      runId: 'demo-run',
      taskId: 'task-123',
      plan: { slug: '037-demo', acceptanceCriteria: ['Manifest records local artifact digests.'] },
    }, null, 2));

    expect(() => renderAuditManifest(runPath, [], root, { now: new Date('2026-05-17T12:00:00.000Z') })).toThrow(/plan\.path/);
  });
});

describe('audit manifest validation', () => {
  it('accepts a clean manifest when all local artifact digests still match', () => {
    const root = tempRepo();
    const manifest = validManifest(root);

    const result = validateAuditManifestText(JSON.stringify(manifest, null, 2), join(root, 'audit.json'), root);

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('fails when a cited artifact is missing', () => {
    const root = tempRepo();
    const manifest = validManifest(root);
    manifest.artifacts[1].path = 'docs/evidence/missing.md';

    const result = validateAuditManifestText(JSON.stringify(manifest, null, 2), join(root, 'audit.json'), root);

    expect(result.ok).toBe(false);
    expect(failCodes(result)).toContain('audit.artifact.path_missing');
  });

  it('fails when a cited artifact content digest changed', () => {
    const root = tempRepo();
    const manifest = validManifest(root);
    writeFileSync(join(root, 'docs/evidence/proof.md'), 'changed\n');

    const result = validateAuditManifestText(JSON.stringify(manifest, null, 2), join(root, 'audit.json'), root);

    expect(result.ok).toBe(false);
    expect(failCodes(result)).toContain('audit.artifact.digest_mismatch');
  });

  it('fails on duplicate artifact ids', () => {
    const root = tempRepo();
    const manifest = validManifest(root);
    manifest.artifacts.push({ ...manifest.artifacts[1] });

    const result = validateAuditManifestText(JSON.stringify(manifest, null, 2), join(root, 'audit.json'), root);

    expect(result.ok).toBe(false);
    expect(failCodes(result)).toContain('audit.artifact.duplicate_id');
  });

  it('fails on malformed artifact entries and unsupported roles', () => {
    const root = tempRepo();
    const manifest = validManifest(root);
    manifest.artifacts = [{ id: 'bad', role: 'compliance_certificate', path: 'docs/evidence/proof.md', digest: { alg: 'md5', value: 'not-a-sha' } }];

    const result = validateAuditManifestText(JSON.stringify(manifest, null, 2), join(root, 'audit.json'), root);

    expect(result.ok).toBe(false);
    expect(failCodes(result)).toContain('audit.artifact.invalid_role');
    expect(failCodes(result)).toContain('audit.artifact.digest_unsupported_alg');
    expect(failCodes(result)).toContain('audit.artifact.digest_invalid');
  });

  it('fails when an artifact path escapes the repo root', () => {
    const root = tempRepo();
    const outside = join(tmpdir(), `osc-audit-outside-${process.pid}.md`);
    writeFileSync(outside, 'outside\n');
    const manifest = validManifest(root);
    manifest.artifacts[1].path = relative(root, outside);

    const result = validateAuditManifestText(JSON.stringify(manifest, null, 2), join(root, 'audit.json'), root);

    expect(result.ok).toBe(false);
    expect(failCodes(result)).toContain('audit.artifact.path_outside_root');
  });

  it('fails when an artifact points at private/internal workspace paths', () => {
    const root = tempRepo();
    mkdirSync(join(root, '.osc/research'), { recursive: true });
    writeFileSync(join(root, '.osc/research/raw.md'), 'private draft\n');
    const manifest = validManifest(root);
    manifest.artifacts[1].path = '.osc/research/raw.md';

    const result = validateAuditManifestText(JSON.stringify(manifest, null, 2), join(root, 'audit.json'), root);

    expect(result.ok).toBe(false);
    expect(failCodes(result)).toContain('audit.artifact.private_path');
  });

  it('fails when traversal aliases point at private/internal workspace paths', () => {
    const root = tempRepo();
    mkdirSync(join(root, '.osc-dev'), { recursive: true });
    mkdirSync(join(root, '.osc/research'), { recursive: true });
    mkdirSync(join(root, 'node_modules/pkg'), { recursive: true });
    writeFileSync(join(root, '.osc-dev/private.md'), 'private draft\n');
    writeFileSync(join(root, '.osc/research/raw.md'), 'research draft\n');
    writeFileSync(join(root, 'node_modules/pkg/index.js'), 'module draft\n');
    const manifest = validManifest(root);
    manifest.artifacts = [
      { ...manifest.artifacts[0] },
      { ...manifest.artifacts[1], id: 'private:dev', path: 'docs/../.osc-dev/private.md', digest: { alg: 'sha256', value: '0'.repeat(64) } },
      { ...manifest.artifacts[1], id: 'private:research', path: 'docs/../.osc/research/raw.md', digest: { alg: 'sha256', value: '0'.repeat(64) } },
      { ...manifest.artifacts[1], id: 'private:node_modules', path: 'docs/../node_modules/pkg/index.js', digest: { alg: 'sha256', value: '0'.repeat(64) } },
    ];

    const result = validateAuditManifestText(JSON.stringify(manifest, null, 2), join(root, 'audit.json'), root);

    expect(result.ok).toBe(false);
    expect(failCodes(result).filter((code) => code === 'audit.artifact.private_path')).toHaveLength(3);
  });

  it('fails when required subject identity is missing', () => {
    const root = tempRepo();
    const manifest = validManifest(root, { subject: { source: 'run', plan: '.osc/plans/active/037-demo.md', plan_slug: '037-demo', task_id: 'task-1' } });

    const result = validateAuditManifestText(JSON.stringify(manifest, null, 2), join(root, 'audit.json'), root);

    expect(result.ok).toBe(false);
    expect(failCodes(result)).toContain('audit.subject.missing_run_identity');
  });

  it('fails when a run-bound subject uses an unknown placeholder plan', () => {
    const root = tempRepo();
    const manifest = validManifest(root);
    manifest.subject = {
      source: 'run',
      plan: '(unknown plan)',
      plan_slug: '037-demo',
      task_id: 'task-1',
      run_id: 'demo-run',
      run_packet: '.osc/runs/demo-run/run.json',
    };

    const result = validateAuditManifestText(JSON.stringify(manifest, null, 2), join(root, 'audit.json'), root);

    expect(result.ok).toBe(false);
    expect(failCodes(result)).toContain('audit.subject.missing_plan');
  });

  it('fails when generated timestamp or idempotency identity is missing', () => {
    const root = tempRepo();
    const manifest = validManifest(root);
    delete manifest.created_at;
    delete manifest.idempotency_key;

    const result = validateAuditManifestText(JSON.stringify(manifest, null, 2), join(root, 'audit.json'), root);

    expect(result.ok).toBe(false);
    expect(failCodes(result)).toContain('audit.created_at.missing');
    expect(failCodes(result)).toContain('audit.idempotency_key.missing');
  });

  it('fails when the manifest claims judgment or external anchoring boundaries', () => {
    const root = tempRepo();
    const manifest = validManifest(root);
    manifest.boundary.compliance_certification = true;
    manifest.boundary.external_anchoring = true;

    const result = validateAuditManifestText(JSON.stringify(manifest, null, 2), join(root, 'audit.json'), root);

    expect(result.ok).toBe(false);
    expect(failCodes(result)).toContain('audit.boundary.unsupported_claim');
  });
});
