# Plan: 033-implementation-architecture-evaluation-lens

## Status

backlog — captured from the 2026-05-15 implementation-architecture analysis run; queued as the next PR candidate after the currently in-flight branch/PR work completes; not yet activated for execution.

## Context

An external article, video transcript, and audit prompt framed enterprise AI value as an implementation architecture problem: workflow design, data access, authority, evaluation, audit trails, and recovery/ownership. A three-lane read-only analysis run (`.osc/runs/20260515T221436-nate-implementation-architecture/`) found that Open Scaffold already has strong build-time coverage for workflow design, audit trails, and recovery, partial authority/evaluation coverage, and deliberate non-ownership of runtime enterprise data controls.

This plan captures the useful roadmap feature without promoting Open Scaffold into enterprise compliance, model benchmarking, or native runtime ownership.

## Goal

Add a public-safe implementation-architecture lens that shows how Open Scaffold's build-time primitives map to the six implementation components, and annotate future plans with which component a slice strengthens.

## Constraints / Out of scope

- Do not claim Open Scaffold owns runtime enterprise data access, row/field permissions, systems-of-record controls, or business-action rollback.
- Do not add runtime spawning, process supervision, credentials, or provider-specific enforcement to core.
- Do not claim regulated compliance certification, audit-grade legal sufficiency, PE distribution readiness, or model/task-fit benchmarking.
- Do not promote backlog plans `030` or `031` into shipped roadmap promises.
- Keep the artifact public-safe, owner-neutral, and clear that this is a build-time/repo-protocol lens.
- Do not add `osc eval` in this slice; structured AC scoring is a follow-up candidate after the lens is accepted.

## Files to touch

- `docs/wiki/concepts/implementation-architecture-lens.md` — new concept page mapping the six components to Open Scaffold primitives and boundaries.
- `docs/wiki/index.md` — add the new concept page to the wiki index.
- `docs/wiki/log.md` — append a wiki action entry for the new page.
- `.osc/plans/handoff-template.md` — add an optional "Implementation Architecture Coverage" annotation section for future plans.
- `docs/SLICE_CLOSE_PROTOCOL.md` — only if a short cross-link is needed to clarify that AC evidence remains human/verification-gated, not model-benchmarking.

## Acceptance criteria

- [ ] `docs/wiki/concepts/implementation-architecture-lens.md` exists with schema-compatible frontmatter and links to at least `docs/RUNTIME_BINDING_CONTRACT.md`, `docs/SPAWNING_BOUNDARY.md`, `docs/SLICE_CLOSE_PROTOCOL.md`, and `docs/REFERENCE_TRUTH.md` where relevant.
- [ ] The new page clearly distinguishes build-time implementation architecture from runtime enterprise workflow implementation architecture.
- [ ] The page maps all six components — workflow design, data access, authority, evaluation, audit trails, recovery/ownership — using labels such as owned, partial, adapter-owned, system-of-record-owned, or out of scope.
- [ ] The page explicitly states that Open Scaffold does not own runtime data permissions, domain/business-rule evaluators, live spawning, compliance certification, or business-action reversal.
- [ ] `.osc/plans/handoff-template.md` includes an optional coverage annotation that asks which six-component area the slice strengthens and which runtime-layer responsibilities remain outside the slice.
- [ ] Wiki index and log are updated without adding live task/PR state to the wiki.
- [ ] The slice records structured AC evaluation / `osc eval` as a follow-up candidate, not bundled implementation.

## Verification steps

1. Run `./verify.sh --standard`; expected exit 0.
2. Run `npm test`; expected exit 0.
3. Run `npm run build`; expected exit 0.
4. Run `git diff --check`; expected no whitespace errors.
5. Manually inspect the new wiki page and handoff-template annotation for unsupported enterprise/compliance/runtime claims.

## Open questions

- Should the implementation-architecture annotation become a required section for all new plans, or remain optional until adoption feedback proves it useful?
- Should the next follow-up be structured AC evaluation evidence (`osc eval`) or authority-policy conformance checks for run packets?
- Should this lens eventually appear in first-read docs, or stay in the project wiki until an adopter asks for it?
