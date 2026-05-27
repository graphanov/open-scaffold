# Plan: 113-public-spec-conformance-pack

## Status

backlog

## Context

The strategy review found that Open Scaffold's strongest long-term defensibility is becoming a citable protocol for AI-coded work records. That requires stable public schemas and conformance checks, not just prose conventions and an implementation CLI.

## Goal

Publish versioned public schemas and a conformance test pack that lets other tools validate whether their work-record artifacts are Open Scaffold-compatible.

## Constraints / Out of scope

- No hosted registry, telemetry service, or certification authority.
- No new schema family unless it reflects already-shipped artifacts.
- Conformance means structural compatibility, not security approval, legal compliance, or quality judgment.
- Do not break existing v1 artifacts without a documented migration path.

## Files to touch

- `spec/` — versioned JSON Schemas for plan metadata, run packet, dispatch receipt, evidence note metadata, amendment metadata, audit envelope, and usage if available.
- `packages/conformance/` or `@open-scaffold/conformance` package path — validation harness and fixtures.
- `docs/STANDARD.md` — plain-language protocol overview and compatibility levels.
- `docs/RUNTIME_BINDING_CONTRACT.md` — link adapter-facing conformance requirements.
- `tests/` — schema fixture tests for valid and invalid artifacts.

## Implementation Architecture Coverage

- Strengthens: interoperability, audit trails, runtime boundaries, and external adoption.
- Audit envelope: schema list, fixture corpus, conformance command output, and compatibility notes.
- Evaluation envelope: tests must cover valid fixtures, invalid fixtures, missing required keys, and version mismatch handling.
- Feedback routing: non-conforming existing artifacts become migration follow-ups, not silent schema weakening.
- Boundary: no certification badge beyond local structural pass/fail.

## Acceptance criteria

- [ ] `spec/` contains versioned schemas for the currently stable public artifact types selected by the slice.
- [ ] A conformance command or package validates a fixture directory and reports pass/fail per artifact type.
- [ ] Valid fixtures are drawn from current repository artifacts where possible and sanitized if needed.
- [ ] Invalid fixtures cover missing required fields, bad schema version, path traversal, and mismatched run/plan identity.
- [ ] `docs/STANDARD.md` explains compatibility levels and explicitly says conformance is not compliance certification.
- [ ] Existing build/test/strict verification passes without weakening current artifact validation.

## Verification steps

1. Run the conformance harness against valid fixtures and verify all pass.
2. Run the conformance harness against invalid fixtures and verify expected failures.
3. Run `npm run build`.
4. Run `npm test -- --run`.
5. Run `./verify.sh --strict`.

## Open questions

- Should the conformance package be published to npm immediately or remain in-repo until at least one external adapter attempts to use it?
- Which artifact types are stable enough for `spec/v1` versus still internal implementation detail?
