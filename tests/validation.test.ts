import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateScaffold } from '../src/validation.js';

function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'osc-validation-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/backlog'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/blocked'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/done'), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild the thing.\n');
  writeFileSync(join(root, '.osc/releases/README.md'), '# Releases\n');
  return root;
}

const plan = `# Plan: sample

## Status

active

## Context

Need a thing.

## Goal

Ship a thing.

## Constraints / Out of scope

- No spawning agents.

## Files to touch

- \`README.md\` — docs

## Acceptance criteria

- [ ] It works.

## Verification steps

1. Run tests.

## Open questions

- None.
`;

describe('scaffold validation', () => {
  it('passes a repo with mission, plans, and releases directory', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/active/001-sample.md'), plan);

    const result = validateScaffold(root);

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('warns when a release note cites a run id without a PR reference', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/done/001-sample.md'), plan.replace('active', 'done'));
    writeFileSync(join(root, '.osc/releases/2026-05-12-demo.md'), `# Release / Evidence Note: demo

## Summary

Demo.

## Traceability

run_id 20260512T120000Z-demo-run

## Verification

Passed.

## Outcome

Done.
`);

    const result = validateScaffold(root);

    expect(result.ok).toBe(true);
    expect(result.warnings.map((w) => w.code)).toContain('release_note.run_without_pr');
  });

  it('fails when official releases directory is missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'osc-validation-missing-'));
    mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
    writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nBuild the thing.\n');
    writeFileSync(join(root, '.osc/plans/active/001-sample.md'), plan);

    const result = validateScaffold(root);

    expect(result.ok).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain('releases.dir_missing');
  });

  it('warns when release note Traceability section omits a plan path', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/done/001-sample.md'), plan.replace('active', 'done'));
    writeFileSync(join(root, '.osc/releases/2026-05-12-no-plan.md'), `# Release / Evidence Note

## Summary

Did a thing.

## Traceability

- PR: https://github.com/example/repo/pull/42

## Verification

- npm test -> pass

## Outcome

Shipped.
`);

    const result = validateScaffold(root);

    expect(result.warnings.map((w) => w.code)).toContain('release_note.traceability_missing_plan');
  });


  it('warns when release note Traceability omits work item or publication anchors', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/done/001-sample.md'), plan.replace('active', 'done'));
    writeFileSync(join(root, '.osc/releases/2026-05-12-weak-traceability.md'), `# Release / Evidence Note

## Summary

Did a thing.

## Traceability

- Related note: local review.

## Verification

- npm test -> pass

## Outcome

Shipped.
`);

    const result = validateScaffold(root);
    const codes = result.warnings.map((w) => w.code);

    expect(codes).toContain('release_note.traceability_missing_work_item');
    expect(codes).toContain('release_note.traceability_missing_publication');
  });

  it('accepts release note Traceability with plan and explicit pending publication rationale', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/done/001-sample.md'), plan.replace('active', 'done'));
    writeFileSync(join(root, '.osc/releases/2026-05-12-pending-publication.md'), `# Release / Evidence Note

## Summary

Did a thing.

## Traceability

- Plan: .osc/plans/done/001-sample.md
- Publication: pending owner review.

## Verification

- npm test -> pass

## Outcome

Shipped.
`);

    const result = validateScaffold(root);
    const codes = result.warnings.map((w) => w.code);

    expect(codes).not.toContain('release_note.traceability_missing_work_item');
    expect(codes).not.toContain('release_note.traceability_missing_publication');
  });


  it('accepts canonical GitHub pull request URLs as publication evidence', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/done/001-sample.md'), plan.replace('active', 'done'));
    writeFileSync(join(root, '.osc/releases/2026-05-12-pr-url.md'), `# Release / Evidence Note

## Summary

Did a thing.

## Traceability

- Plan: .osc/plans/done/001-sample.md
- Pull request: https://github.com/example/repo/pull/42

## Verification

- npm test -> pass

## Outcome

Shipped.
`);

    const result = validateScaffold(root);

    expect(result.warnings.map((w) => w.code)).not.toContain('release_note.traceability_missing_publication');
  });


  it('accepts PR colon-number shorthand as publication evidence', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/done/001-sample.md'), plan.replace('active', 'done'));
    writeFileSync(join(root, '.osc/releases/2026-05-12-pr-colon.md'), `# Release / Evidence Note

## Summary

Did a thing.

## Traceability

- Plan: .osc/plans/done/001-sample.md
- PR: #42

## Verification

- npm test -> pass

## Outcome

Shipped.
`);

    const result = validateScaffold(root);

    expect(result.warnings.map((w) => w.code)).not.toContain('release_note.traceability_missing_publication');
  });

  it('preserves Traceability chain as a compatibility heading without adding missing-section warnings', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/done/001-sample.md'), plan.replace('active', 'done'));
    writeFileSync(join(root, '.osc/releases/2026-05-12-traceability-chain.md'), `# Release / Evidence Note

## Summary

Did a thing.

## Traceability chain

- Plan: .osc/plans/done/001-sample.md
- PR: #42

## Verification

- npm test -> pass

## Outcome

Shipped.
`);

    const result = validateScaffold(root);
    const chainWarnings = result.warnings.filter((warning) => warning.path === '.osc/releases/2026-05-12-traceability-chain.md');

    expect(chainWarnings.map((w) => w.code)).not.toContain('release_note.missing_section');
    expect(chainWarnings.map((w) => w.code)).not.toContain('release_note.traceability_missing_plan');
  });

  it('warns when release note Outcome body is empty or placeholder', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/done/001-sample.md'), plan.replace('active', 'done'));
    writeFileSync(join(root, '.osc/releases/2026-05-12-empty-outcome.md'), `# Release / Evidence Note

## Summary

Did a thing.

## Traceability

- Plan: .osc/plans/done/001-sample.md
- PR: #42

## Verification

- npm test -> pass

## Outcome

TODO
`);

    const result = validateScaffold(root);

    expect(result.warnings.map((w) => w.code)).toContain('release_note.empty_outcome');
  });

  it('warns when release note Verification body is empty', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/done/001-sample.md'), plan.replace('active', 'done'));
    writeFileSync(join(root, '.osc/releases/2026-05-12-empty-verification.md'), `# Release / Evidence Note

## Summary

Did a thing.

## Traceability

- Plan: .osc/plans/done/001-sample.md
- PR: #42

## Verification

## Outcome

Shipped.
`);

    const result = validateScaffold(root);

    expect(result.warnings.map((w) => w.code)).toContain('release_note.empty_verification');
  });

  it('warns when a plan slug exists in both active/ and done/', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/active/001-sample.md'), plan);
    writeFileSync(join(root, '.osc/plans/done/001-sample.md'), plan.replace('active', 'done'));

    const result = validateScaffold(root);

    expect(result.warnings.map((w) => w.code)).toContain('active_plan.duplicated_in_done');
  });

  it('warns when an active plan slug already has a matching release note', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/active/001-sample.md'), plan);
    writeFileSync(join(root, '.osc/releases/2026-05-12-001-sample.md'), `# Release / Evidence Note

## Summary

Did the sample.

## Traceability

- Plan: .osc/plans/active/001-sample.md
- PR: #42

## Verification

- npm test -> pass

## Outcome

Shipped.
`);

    const result = validateScaffold(root);

    expect(result.warnings.map((w) => w.code)).toContain('active_plan.has_release_note');
  });


  it('warns when an active plan is cited by a differently named release note', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/active/001-sample.md'), plan);
    writeFileSync(join(root, '.osc/releases/2026-05-12-bundled-release.md'), `# Release / Evidence Note

## Summary

Did the sample.

## Traceability

- Plan: .osc/plans/active/001-sample.md
- PR: #42

## Verification

- npm test -> pass

## Outcome

Shipped.
`);

    const result = validateScaffold(root);

    expect(result.warnings.map((w) => w.code)).toContain('active_plan.cited_by_release_note');
  });

  it('warns when an evidence receipt is missing required schema or approval fields', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/done/001-sample.md'), plan.replace('active', 'done'));
    mkdirSync(join(root, 'docs/evidence'), { recursive: true });
    writeFileSync(join(root, 'docs/evidence/2026-05-12-sample.md'), `# Evidence

\`\`\`yaml
slice: sample
plan: .osc/plans/done/001-sample.md
acceptance_gate:
  status: pass
\`\`\`
`);

    const result = validateScaffold(root);

    const codes = result.warnings.map((w) => w.code);
    expect(codes).toContain('evidence_receipt.missing_schema');
    expect(codes).toContain('evidence_receipt.missing_approval');
  });

  it('accepts an evidence receipt with schema and approval status', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.osc/plans/done/001-sample.md'), plan.replace('active', 'done'));
    mkdirSync(join(root, 'docs/evidence'), { recursive: true });
    writeFileSync(join(root, 'docs/evidence/2026-05-12-sample.md'), `# Evidence

\`\`\`yaml
schema: open-scaffold.evidence.v1
slice: sample
plan: .osc/plans/done/001-sample.md
acceptance_gate:
  status: pass
approval:
  status: approved
  approver: maintainer
\`\`\`
`);

    const result = validateScaffold(root);

    const codes = result.warnings.map((w) => w.code);
    expect(codes).not.toContain('evidence_receipt.missing_schema');
    expect(codes).not.toContain('evidence_receipt.missing_approval');
  });

  it('warns about stale active plans using configurable threshold', () => {
    const root = tempRepo();
    const activePath = join(root, '.osc/plans/active/001-sample.md');
    writeFileSync(activePath, plan);
    const oldTime = (Date.now() - 1000 * 60 * 60 * 24 * 90) / 1000;
    utimesSync(activePath, oldTime, oldTime);

    const result = validateScaffold(root, { staleDays: 30 });

    expect(result.warnings.map((w) => w.code)).toContain('active_plan.stale');
  });
});
