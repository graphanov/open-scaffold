import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { evidenceChainExitCode, formatEvidenceChainReport, verifyEvidenceChain } from '../src/evidence-chain.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempRepo(prefix = 'osc-evidence-chain-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  for (const stage of ['active', 'backlog', 'blocked', 'done']) mkdirSync(join(root, `.osc/plans/${stage}`), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  mkdirSync(join(root, '.osc/runs'), { recursive: true });
  mkdirSync(join(root, 'docs/evidence'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nDefined.\n\n## Changelog\n\n<!-- append YYYY-MM-DD entries below this line -->\n');
  writeFileSync(join(root, '.osc/releases/README.md'), '# Release / evidence notes\n');
  return root;
}

function writePlan(root: string, slug: string, acceptanceCriteria: string, extra = '') {
  writeFileSync(join(root, '.osc/plans/done', `${slug}.md`), `# Plan: ${slug}

## Status

done

## Context

Fixture context.

## Goal

Fixture goal.

## Constraints / Out of scope

- Local-only fixture.

## Files to touch

- Fixture files.

## Acceptance criteria

${acceptanceCriteria}

## Verification steps

1. Run verifier.

## Open questions

- None.
${extra}`);
}

function writeEvidence(root: string, slug: string, body = '') {
  writeFileSync(join(root, '.osc/releases', `2026-05-27-${slug}.md`), `# Release / Evidence Note: ${slug}

## Summary

Fixture evidence note.

## Traceability

- Source plan: .osc/plans/done/${slug}.md
- Run ID: 20260527T120000Z-${slug}
- Pull Request: #42
${body}

## Verification

- Evidence: docs/evidence/proof.md

## Outcome

approval:
  status: approved
  rationale: fixture accepted for structural test.
`);
}

function writeRun(root: string, slug: string) {
  const runDir = join(root, '.osc/runs', `20260527T120000Z-${slug}`);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'run.json'), JSON.stringify({ plan: slug }, null, 2));
}

describe('evidence chain verifier', () => {
  it('reports an intact local chain while treating PR references as unverifiable', () => {
    const root = tempRepo();
    writeFileSync(join(root, 'docs/evidence/proof.md'), '# Proof\n');
    writePlan(root, '001-demo', '- [x] AC1 is backed. Evidence: docs/evidence/proof.md\n- [x] AC2 is intentionally skipped. N/A: no runtime was needed.');
    writeEvidence(root, '001-demo');
    writeRun(root, '001-demo');

    const report = verifyEvidenceChain(root, { plan: '001-demo' });
    const statuses = report.plans.flatMap((plan) => plan.links.map((link) => link.status));

    expect(report.summary.plansChecked).toBe(1);
    expect(statuses).toContain('intact');
    expect(statuses).toContain('unverifiable');
    expect(statuses).not.toContain('broken');
    expect(statuses).not.toContain('missing');
    expect(evidenceChainExitCode(report, { strict: false })).toBe(0);
    expect(formatEvidenceChainReport(report, { strict: false })).toContain('links found=');
    expect(formatEvidenceChainReport(report, { strict: false })).toContain('Evidence chain: plans checked=1');
  });

  it('treats missing acceptance-criterion evidence as strict-only failure', () => {
    const root = tempRepo();
    writePlan(root, '002-missing', '- [ ] AC1 still needs evidence.');
    writeEvidence(root, '002-missing');
    writeRun(root, '002-missing');

    const report = verifyEvidenceChain(root, { plan: '002-missing' });
    const missing = report.plans[0].links.filter((link) => link.status === 'missing');

    expect(missing.some((link) => link.type === 'acceptance_criterion')).toBe(true);
    expect(evidenceChainExitCode(report, { strict: false })).toBe(0);
    expect(evidenceChainExitCode(report, { strict: true })).toBe(1);
  });

  it('fails default mode on broken local evidence paths', () => {
    const root = tempRepo();
    writePlan(root, '003-broken', '- [x] AC1 references missing local proof. Evidence: docs/evidence/missing.md');
    writeEvidence(root, '003-broken');
    writeRun(root, '003-broken');

    const report = verifyEvidenceChain(root, { plan: '003-broken' });
    const broken = report.plans[0].links.filter((link) => link.status === 'broken');

    expect(broken.some((link) => link.reference === 'docs/evidence/missing.md')).toBe(true);
    expect(evidenceChainExitCode(report, { strict: false })).toBe(1);
    expect(evidenceChainExitCode(report, { strict: true })).toBe(1);
  });

  it('does not attach substring-matched evidence notes to the wrong plan slug', () => {
    const root = tempRepo();
    writePlan(root, '001-foo', '- [x] AC1 is backed. Evidence: docs/evidence/proof.md');
    writePlan(root, '001-foo-bar', '- [x] AC1 is backed. Evidence: docs/evidence/proof.md');
    writeFileSync(join(root, 'docs/evidence/proof.md'), '# Proof\n');
    writeEvidence(root, '001-foo-bar');
    writeRun(root, '001-foo-bar');

    const report = verifyEvidenceChain(root, { plan: '001-foo' });

    expect(report.plans).toHaveLength(1);
    expect(report.plans[0].plan_slug).toBe('001-foo');
    expect(report.plans[0].links.some((link) => link.type === 'evidence_note' && link.status === 'missing')).toBe(true);
  });

  it('marks private or escaping evidence references as broken', () => {
    const root = tempRepo();
    const outside = mkdtempSync(join(tmpdir(), 'osc-evidence-outside-'));
    writeFileSync(join(outside, 'secret.md'), '# Secret\n');
    symlinkSync(join(outside, 'secret.md'), join(root, 'docs/evidence/secret-link.md'));
    writePlan(root, '004-private', '- [x] AC1 leaks private state. Evidence: .osc/research/private.md\n- [x] AC2 escapes root. Evidence: ../outside.md\n- [x] AC3 follows symlink. Evidence: docs/evidence/secret-link.md');
    writeEvidence(root, '004-private');
    writeRun(root, '004-private');

    const report = verifyEvidenceChain(root, { plan: '004-private' });
    const brokenRefs = report.plans[0].links.filter((link) => link.status === 'broken').map((link) => link.reference);

    expect(brokenRefs).toContain('.osc/research/private.md');
    expect(brokenRefs).toContain('../outside.md');
    expect(brokenRefs).toContain('docs/evidence/secret-link.md');
  });

  it('rejects single-plan verification for non-done plans', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/active/007-active.md'), `# Plan: 007-active

## Status

active

## Context

Fixture.

## Goal

Fixture.

## Constraints / Out of scope

- Fixture.

## Files to touch

- Fixture.

## Acceptance criteria

- [x] AC1 is backed. Evidence: docs/evidence/proof.md

## Verification steps

1. Fixture.

## Open questions

- None.
`);
    writeFileSync(join(root, 'docs/evidence/proof.md'), '# Proof\n');
    writeEvidence(root, '007-active');

    expect(() => verifyEvidenceChain(root, { plan: '007-active' })).toThrow(/done/);
  });

  it('accepts source and test files as local evidence references', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'src'), { recursive: true });
    mkdirSync(join(root, 'tests'), { recursive: true });
    writeFileSync(join(root, 'src/feature.ts'), 'export const ok = true;\n');
    writeFileSync(join(root, 'tests/feature.test.ts'), 'import { ok } from "../src/feature";\n');
    writePlan(root, '006-code-refs', '- [x] AC1 is backed by implementation and regression tests. Evidence: `src/feature.ts`, `tests/feature.test.ts`.');
    writeEvidence(root, '006-code-refs');
    writeRun(root, '006-code-refs');

    const report = verifyEvidenceChain(root, { plan: '006-code-refs' });
    const refs = report.plans[0].links.filter((link) => link.type === 'evidence_reference');

    expect(refs.some((link) => link.reference === 'src/feature.ts' && link.status === 'intact')).toBe(true);
    expect(refs.some((link) => link.reference === 'tests/feature.test.ts' && link.status === 'intact')).toBe(true);
    expect(report.summary.missing).toBe(0);
    expect(evidenceChainExitCode(report, { strict: true })).toBe(0);
  });

  it('requires close decisions to include both allowed status and rationale', () => {
    const root = tempRepo();
    writeFileSync(join(root, 'docs/evidence/proof.md'), '# Proof\n');
    writePlan(root, '008-no-rationale', '- [x] AC1 is backed. Evidence: docs/evidence/proof.md');
    writeFileSync(join(root, '.osc/releases/2026-05-27-008-no-rationale.md'), `# Release / Evidence Note: 008-no-rationale

## Summary

Fixture evidence note.

## Traceability

- Source plan: .osc/plans/done/008-no-rationale.md
- Branch: fixture

## Verification

- Evidence: docs/evidence/proof.md

## Outcome

Close decision: approved
`);

    const report = verifyEvidenceChain(root, { plan: '008-no-rationale' });
    const close = report.plans[0].links.find((link) => link.type === 'close_decision');

    expect(close?.status).toBe('missing');
    expect(evidenceChainExitCode(report, { strict: true })).toBe(1);
  });

  it('prints JSON findings and honors strict CLI exit behavior', () => {
    const root = tempRepo();
    writePlan(root, '005-cli', '- [ ] AC1 still needs evidence.');
    writeEvidence(root, '005-cli');
    writeRun(root, '005-cli');

    const json = spawnSync(tsx, [cli, 'verify', '--evidence-chain', '--plan', '005-cli', '--json'], { cwd: root, encoding: 'utf8' });
    expect(json.status).toBe(0);
    const parsed = JSON.parse(json.stdout) as Array<{ plan_slug: string; links: Array<{ status: string }> }>;
    expect(parsed[0].plan_slug).toBe('005-cli');
    expect(parsed[0].links.some((link) => link.status === 'missing')).toBe(true);

    const strict = spawnSync(tsx, [cli, 'verify', '--evidence-chain', '--plan', '005-cli', '--strict'], { cwd: root, encoding: 'utf8' });
    expect(strict.status).toBe(1);
    expect(strict.stdout).toContain('strict result=fail');
  });
});
