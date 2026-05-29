# Plan: 131-mcp-integration-surface-readiness

## Status

done

## Context

The independent-review deep interview (`.omc/runs/independent-review-slice-2026-05-29/DEEP_INTERVIEW_SPEC.md`) surfaced theme 5 — "standardize Open Scaffold itself as an MCP-accessible agent integration surface" — as strategically valid but larger than the first parser-defect slice, and explicitly staged it as later / owner-gated work rather than rejected. This plan preserves that theme as a real future task load. It is not a greenfield server: `.osc/plans/done/060-mcp-server.md` already shipped an optional, read-only, stdio MCP server (`osc mcp serve`, write ops gated behind `--allow-write`, zero-dependency JSON-RPC loop). ROADMAP line ~461 already lists an "MCP bridge for structured harness dispatch/status/artifact retrieval" as forward work. The open question is whether — and how — Open Scaffold elevates MCP from that optional convenience to a first-class, contract-stable, conformance-tested integration surface, which brushes against MISSION non-goal #1 (no move toward native runtime/spawning without explicit roadmap investigation, ADR, security analysis, and separate approval). This plan is therefore a decision/ADR-precursor backlog item, modeled on `.osc/plans/backlog/119-osc-work-execute-controller.md`, not an implementation queue. It is planning-only and owner-gated; it authorizes no implementation.

## Goal

Produce the owner decision and supporting ADR that determine whether Open Scaffold elevates MCP from the optional read-only server shipped in 060 to a standardized, contract-stable, conformance-tested integration surface — including a readiness/gap assessment and the security and mission-boundary implications — without, in this slice, expanding the live MCP surface, adding write or spawn capability, or making any new runtime claim.

## Constraints / Out of scope

- This slice authorizes no implementation: it produces a decision, an ADR, and a readiness assessment. Promotion to `active/` and any code change require explicit owner approval recorded in the ADR.
- No expansion of the live MCP surface in this slice: no new tools/resources, no write capability beyond what 060 already gates behind `--allow-write`, no transport change.
- No agent spawning, no runtime execution, no network access, no daemon — consistent with MISSION non-goal #1. Any move toward spawning or a native runtime requires its own ADR, security analysis, and separate approval.
- No forced runtime-dependency decision: whether to adopt `@modelcontextprotocol/sdk` (which would be the project's first hard runtime dependency, in direct tension with the zero-dependency property that slice 130 protects) is something the ADR evaluates, not something this plan presumes.
- Does not duplicate 060 (the read-only server exists); this plan builds the strategic/contract layer above it.
- Must frame MCP as an integration facet, not a competing native runtime: relationships to `119-osc-work-execute-controller` (gated-write run controller) and `070-runtime-adapter-registry` must be explicit so the surfaces do not drift into overlapping authority.
- Public-safe: no `.osc-dev/` exposure, no secrets.

## Files to touch

- `docs/decisions/<date>-mcp-integration-surface-posture.md` — new ADR: the posture decision (elevate / hold at optional read-only / defer) with decision drivers, alternatives, consequences, security analysis against MISSION non-goal #1, and an explicit owner sign-off field.
- `docs/decisions/README.md` — index the ADR for future agents.
- `docs/MCP.md` — append a readiness/gap assessment (current 060 surface vs. "standardized/contract-stable/conformance-tested"); no surface change.
- `ROADMAP.md` — position MCP-readiness against the existing "MCP bridge" line and the post-v1 adoption workflow; do not promote to active without owner approval.
- `docs/OPEN_SCAFFOLD_SYSTEM.md` — clarify the MCP server's place in the integration-layer ontology only if the ADR changes it.
- Future implementation files (only after the ADR is accepted and the owner promotes this plan): `src/mcp-*.ts`, `tests/mcp-*.test.ts`, and any conformance fixtures — listed here as the future queue, not touched in this slice.

## Acceptance criteria

- [ ] An ADR records the MCP posture decision — elevate to a standardized integration surface, hold at 060's optional read-only status quo, or defer — with decision drivers, alternatives considered, consequences, and a security analysis explicitly tested against MISSION non-goal #1.
- [ ] A readiness/gap assessment documents the current MCP surface (tools, resources, transport, write-gating from 060) and the concrete gap to "standardized, contract-stable, conformance-tested," including the dependency question (`@modelcontextprotocol/sdk` vs. the zero-dependency property protected by slice 130).
- [ ] The plan and ADR state explicitly that this slice authorizes no live MCP surface change, no write/spawn expansion, and no new runtime claim.
- [ ] The relationship between MCP-readiness and `119-osc-work-execute-controller`, `070-runtime-adapter-registry`, and `060-mcp-server` is documented so MCP is framed as an integration facet rather than a competing native runtime.
- [ ] Promotion to implementation is explicitly gated on owner approval recorded in the ADR's sign-off field; no `src/` change is proposed as in-scope for this slice.
- [ ] `./verify.sh --strict` passes (docs/decisions are additive; no plan/schema violations).

## Verification steps

1. `./verify.sh --strict` — methodology + plan-schema checks pass. Pass: exit 0.
2. Review the ADR for the required structure (Decision, Drivers, Alternatives, Consequences, security analysis vs. non-goal #1, owner sign-off field). Pass: all present; sign-off field is unfilled/pending until the owner decides.
3. `git diff` inspection. Pass: only `docs/**`, `ROADMAP.md`, and this plan change; no `src/**`, no live MCP surface change, no new dependency.
4. Boundary review of the ADR and docs for forbidden implications. Pass: no hidden spawning, no native-runtime claim, no write-surface expansion, no assertion that MCP makes Open Scaffold a dynamic engine.

## Open questions

- BLOCKING: should Open Scaffold expose a standardized MCP write-surface at all, given MISSION non-goal #1 and the gated-write model already being designed in `119-osc-work-execute-controller`? This is an owner decision and gates promotion.
- BLOCKING: does elevating MCP require adopting `@modelcontextprotocol/sdk` as the first runtime dependency, and is that acceptable against the zero-dependency property that slice `130-section-parser-canonical-contract` exists to protect? Owner decision.
- Is MCP-readiness downstream of the 119 `osc work` controller (so the controller's human-gate model governs any MCP write), or an independent integration facet that needs its own gate model?
- Should MCP-surface conformance reuse the adapter-conformance contract (`041`) and fixture (`032`), or define its own conformance suite?
- What is the minimal "contract-stable" guarantee for the existing read-only tools/resources (e.g., versioned tool schemas) that could ship without triggering the spawning/native-runtime boundary?
