# Release evidence: audit envelope digest manifest

## Summary

This slice turns the audit-envelope direction from PR #39 and the evaluation-envelope mechanics from PR #40 into the first small, testable audit-integrity mechanic.

It adds `osc audit init` and `osc audit check` for JSON-backed `open-scaffold.audit-envelope.v1` manifests. The command records explicitly curated local artifacts, repo-relative paths, roles, and sha256 digests, then validates manifest structure, subject identity, artifact roles/IDs, local file presence, private-path boundaries, and digest consistency.

The command is intentionally structure-only and local. It does not judge domain correctness, certify compliance, approve release/merge, benchmark models, spawn runtimes, or anchor evidence externally.

## Scope

- Plan: `.osc/plans/done/037-audit-envelope-digest-manifest.md`.
- Branch: `feat/audit-envelope-digest-manifest`.
- Parent architecture: PR #39 / `.osc/plans/done/033-implementation-architecture-evaluation-lens-amendment-1.md`.
- Prior implementation: PR #40 / `.osc/plans/done/036-evaluation-envelope-schema-and-osc-eval.md`.
- Operator card: Hermes Kanban `t_fb2b0323`.

## Traceability

- Plan: `.osc/plans/done/037-audit-envelope-digest-manifest.md`.
- Roadmap direction: `ROADMAP.md` / Implementation architecture direction — audit and evaluation envelopes.
- Parent architecture release note: `.osc/releases/2026-05-17-implementation-architecture-lens.md`.
- Prior evaluation release note: `.osc/releases/2026-05-17-evaluation-envelope-schema.md`.
- Run packet: not generated; this was a direct Hermes implementation/postflight slice on the feature branch, with verification promoted into this release note and the PR.
- New implementation module: `src/audit.ts`.
- CLI integration: `src/cli.ts`.
- Tests: `tests/audit.test.ts`, `tests/cli-audit.test.ts`.
- PR: pending owner review.

## Changes

- Added JSON audit-manifest generation from:
  - plan files;
  - `open-scaffold.run.v1` run packets.
- Added explicit curated artifact inputs via `--artifact <role> <path>`.
- Added deterministic artifact records with:
  - artifact IDs;
  - roles;
  - repo-relative paths;
  - sha256 digests;
  - byte sizes.
- Added validation for:
  - schema and audit envelope ID;
  - subject identity;
  - run-bound identity requirements;
  - artifact IDs and duplicate IDs;
  - allowed artifact roles;
  - repo-relative local paths;
  - missing files;
  - digest mismatch;
  - digest algorithm/value shape;
  - private/internal workspace paths such as `.osc/research/` and `.osc-dev/`;
  - unsupported boundary claims.
- Updated public protocol/docs to state that v1 audit manifests are local digest-integrity checks, not compliance/audit certification or external anchoring.

## Verification

Completed verification for the PR branch:

- `npm test` — passed, 12 files / 117 tests.
- `npm run build` — passed.
- `npm run --silent osc -- audit init .osc/plans/done/037-audit-envelope-digest-manifest.md --artifact changed_file src/audit.ts --artifact changed_file src/cli.ts --artifact evidence tests/audit.test.ts --artifact evidence tests/cli-audit.test.ts --artifact evidence docs/SLICE_CLOSE_PROTOCOL.md --artifact release_note .osc/releases/2026-05-17-audit-envelope-digest-manifest.md --out /tmp/osc-037-audit-final.json --force` — passed after plan close; generated the structure-only local audit manifest.
- `npm run --silent osc -- audit check /tmp/osc-037-audit-final.json` — passed, 7 artifacts / 0 warnings.
- `npm run --silent osc -- eval init .osc/plans/done/037-audit-envelope-digest-manifest.md` — passed after plan close; existing evaluation-envelope flow still worked.
- `npm run osc -- verify` — passed, 0 warnings.
- `./verify.sh --standard` — passed, 6 pass / 0 fail / 0 warn.
- `git diff --check` — passed.
- Manual wording scan — passed for structure-only wording and no domain correctness, compliance certification, model benchmarking, runtime spawning, or external-ledger/anchor claims.

Final PR/Codex verification is recorded in the pull request after push.

## Outcome

Open Scaffold now has a concrete audit-envelope digest mechanic: users can generate a local manifest that ties a plan or run packet to explicitly curated evidence/artifact files, then check whether those files still exist and match their recorded sha256 digests.

The result strengthens the audit-trail side of the closed feedback loop without expanding Open Scaffold core into a domain evaluator, compliance product, runtime, model lab, or ledger provider.

## Follow-up

External anchor adapters remain a separate future slice.

Potential future refinements, after adopter evidence:

- envelope self-digests;
- parent links;
- optional Merkle batch roots;
- optional external-anchor receipt shapes;
- JSON schema export;
- tracked default evidence/audit-manifest location guidance;
- explicit integration from `osc verify` if repo-wide audit checks stop being surprising.
