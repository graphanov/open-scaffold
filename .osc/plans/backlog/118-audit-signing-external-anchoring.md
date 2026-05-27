# Plan: 118-audit-signing-external-anchoring

## Status

backlog

## Context

Open Scaffold's records are git-native and reviewable, but git history alone is not the same as external anchoring or cryptographic attestation. The strategy review warned against tamper-proof or compliance-grade claims until a signing story exists.

## Goal

Investigate and, if still justified, ship a minimal `osc audit sign` path that signs selected work-record artifacts or digests without turning Open Scaffold into a compliance platform.

## Constraints / Out of scope

- Start with an explicit design decision before implementation.
- Do not claim legal-grade evidence, SOC 2, ISO, GDPR, HIPAA, or regulator-ready status.
- Do not require a hosted Open Scaffold service.
- Do not sign raw private transcripts, secrets, or uncurated logs.
- Prefer existing signing mechanisms such as git signing or sigstore before inventing new cryptography.

## Files to touch

- `docs/decisions/` — ADR for signing mechanism and threat model.
- `docs/AUDITABILITY.md` — update boundaries once signing exists or is rejected.
- `src/audit-sign.ts` — implementation only if the ADR selects an implementation path.
- `src/cli.ts` — add `osc audit sign` only after the design decision is approved.
- `tests/audit-sign.test.ts` — digest/signature fixture tests if implemented.

## Implementation Architecture Coverage

- Strengthens: audit trails and tamper-evidence boundary clarity.
- Audit envelope: selected artifacts, digest manifest, signing identity metadata, verification command output.
- Evaluation envelope: tests for deterministic digests, path containment, missing files, and invalid signatures.
- Feedback routing: if signing proves too heavy or misleading, close with an ADR that defers implementation and updates wording.
- Boundary: no compliance certification, no hosted notarization, no private-log signing by default.

## Acceptance criteria

- [ ] An ADR compares at least git commit signing, sigstore, and local digest-only manifests for Open Scaffold's artifact model.
- [ ] The ADR defines what threat is addressed and what remains unaddressed.
- [ ] If implemented, `osc audit sign` signs or records digests for selected plan/run/evidence/release artifacts with deterministic output.
- [ ] If implemented, `osc audit verify-signature` or equivalent verifies the signature/digest locally.
- [ ] Docs state the signing boundary in plain language and remove or avoid stronger claims than the mechanism supports.
- [ ] Tests cover path traversal, missing artifacts, changed artifact digest mismatch, and unsupported signing configuration.

## Verification steps

1. Review the ADR and confirm it names the selected mechanism and rejected alternatives.
2. If code is implemented, run `npm test -- --run tests/audit-sign.test.ts`.
3. Run `npm run build`.
4. Run a local sign/verify fixture in a temp scaffold.
5. Run `./verify.sh --strict`.

## Open questions

- Is external signing necessary before Open Scaffold has broader adoption, or is clear wording plus git history enough for the next launch window?
- Should signing be core CLI behavior, an optional adapter package, or documentation around existing git/sigstore workflows?
