import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'osc-cli-audit-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, 'docs/evidence'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild the thing.\n');
  const planPath = join(root, '.osc/plans/active/037-demo.md');
  writeFileSync(planPath, `# Plan: 037-demo

## Status

active

## Context

Demo.

## Goal

Audit a slice.

## Constraints / Out of scope

- Do not certify compliance.

## Files to touch

- src/audit.ts

## Acceptance criteria

- [ ] First artifact has a digest.
- [ ] Drift routes to follow-up.

## Verification steps

1. Run tests.

## Open questions

- None.
`);
  writeFileSync(join(root, 'docs/evidence/proof.md'), 'proof\n');
  return { root, planPath };
}

describe('osc audit CLI', () => {
  it('prints a local digest audit manifest for a plan and explicit curated artifact', () => {
    const { root, planPath } = tempRepo();

    const output = execFileSync(tsx, [cli, 'audit', 'init', planPath, '--artifact', 'evidence', 'docs/evidence/proof.md'], { cwd: root, encoding: 'utf8' });
    const manifest = JSON.parse(output);

    expect(manifest.schema).toBe('open-scaffold.audit-envelope.v1');
    expect(manifest.subject).toMatchObject({ source: 'plan', plan: '.osc/plans/active/037-demo.md' });
    expect(manifest.artifacts.map((artifact: any) => artifact.role)).toEqual(['plan', 'evidence']);
    expect(manifest.artifacts[0].digest.value).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.boundary.runtime_spawning).toBe(false);
    expect(output).toContain('does not certify correctness, compliance, approval, runtime execution, model quality, or external anchoring');
  });

  it('writes an audit manifest with --out and refuses to overwrite existing files', () => {
    const { root, planPath } = tempRepo();
    const outPath = join(root, 'docs/evidence/audit.json');

    const output = execFileSync(tsx, [cli, 'audit', 'init', planPath, '--artifact', 'evidence', 'docs/evidence/proof.md', '--out', outPath], { cwd: root, encoding: 'utf8' });

    expect(output).toContain('Created audit manifest:');
    expect(existsSync(outPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(outPath, 'utf8'));
    expect(manifest.artifacts).toHaveLength(2);
    const overwrite = spawnSync(tsx, [cli, 'audit', 'init', planPath, '--artifact', 'evidence', 'docs/evidence/proof.md', '--out', outPath], { cwd: root, encoding: 'utf8' });
    expect(overwrite.status).toBe(1);
    expect(overwrite.stderr).toContain('Refusing to overwrite');
  });

  it('checks a valid audit manifest with digest-only PASS wording', () => {
    const { root, planPath } = tempRepo();
    const auditPath = join(root, 'docs/evidence/audit.json');
    execFileSync(tsx, [cli, 'audit', 'init', planPath, '--artifact', 'evidence', 'docs/evidence/proof.md', '--out', auditPath], { cwd: root, encoding: 'utf8' });

    const output = execFileSync(tsx, [cli, 'audit', 'check', auditPath], { cwd: root, encoding: 'utf8' });

    expect(output).toContain('PASS audit manifest structure/digests valid; 2 artifact(s); 0 warning(s)');
    expect(output).toContain('does not judge correctness, compliance, approval, runtime execution, model quality, or external anchoring');
  });

  it('initializes audit manifests from subdirectories using the repo root for artifact paths', () => {
    const { root, planPath } = tempRepo();
    const subdir = join(root, 'docs/subdir');
    mkdirSync(subdir, { recursive: true });

    const output = execFileSync(tsx, [cli, 'audit', 'init', relative(subdir, planPath), '--artifact', 'evidence', 'docs/evidence/proof.md'], { cwd: subdir, encoding: 'utf8' });
    const manifest = JSON.parse(output);

    expect(manifest.subject.plan).toBe('.osc/plans/active/037-demo.md');
    expect(manifest.artifacts[1]).toMatchObject({ role: 'evidence', path: 'docs/evidence/proof.md' });
  });

  it('fails audit check when an artifact digest has drifted', () => {
    const { root, planPath } = tempRepo();
    const auditPath = join(root, 'docs/evidence/audit.json');
    execFileSync(tsx, [cli, 'audit', 'init', planPath, '--artifact', 'evidence', 'docs/evidence/proof.md', '--out', auditPath], { cwd: root, encoding: 'utf8' });
    writeFileSync(join(root, 'docs/evidence/proof.md'), 'changed\n');

    const result = spawnSync(tsx, [cli, 'audit', 'check', auditPath], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('FAIL audit.artifact.digest_mismatch');
  });

  it('reports directory inputs without dumping a Node stack trace', () => {
    const { root } = tempRepo();

    const result = spawnSync(tsx, [cli, 'audit', 'check', '.'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('FAIL audit.file_not_file');
    expect(result.stderr).not.toContain('node:fs');
    expect(result.stderr).not.toContain('at Object');
  });

  it('rejects trailing arguments for audit check instead of silently ignoring them', () => {
    const { root, planPath } = tempRepo();
    const auditPath = join(root, 'docs/evidence/audit.json');
    execFileSync(tsx, [cli, 'audit', 'init', planPath, '--artifact', 'evidence', 'docs/evidence/proof.md', '--out', auditPath], { cwd: root, encoding: 'utf8' });

    const result = spawnSync(tsx, [cli, 'audit', 'check', auditPath, '--bogus'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Unknown option for audit check: --bogus');
    expect(result.stderr).toContain('Usage: osc audit init');
  });

  it('keeps existing eval init behavior available after adding audit commands', () => {
    const { root, planPath } = tempRepo();

    const output = execFileSync(tsx, [cli, 'eval', 'init', planPath], { cwd: root, encoding: 'utf8' });
    const envelope = JSON.parse(output);

    expect(envelope.schema).toBe('open-scaffold.evaluation.v1');
    expect(envelope.subject.plan).toBe('.osc/plans/active/037-demo.md');
  });
});
