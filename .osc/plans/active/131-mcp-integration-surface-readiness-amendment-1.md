# Amendment 1: 131-mcp-integration-surface-readiness

## Parent

131-mcp-integration-surface-readiness

## Date

2026-05-29

## Learning

The plan was promoted from backlog to active after the owner said “Proceed with 131-mcp-integration-surface-readiness.” The decision slice produced the intended ADR and readiness assessment without touching the live MCP server implementation.

A review pass also confirmed that the parent plan should remain immutable apart from the mechanical status move. Completion evidence and resolved open questions therefore belong in this amendment, the ADR, and the PR record rather than by rewriting the parent plan's acceptance criteria.

## New direction

Use the ADR as the decision artifact for this slice:

- `docs/decisions/2026-05-29-mcp-integration-surface-posture.md`

The posture recorded there is: hold MCP at its current optional, local, read-oriented integration posture; do not promote it into a stable write/execution surface yet; add schema/conformance work before stable MCP claims; route any future write/execution MCP capability through the `119-osc-work-execute-controller` gate model; and do not adopt `@modelcontextprotocol/sdk` without a future dependency ADR.

Implementation remains unauthorized by this amendment. This slice adds no MCP tools, resources, transports, dependencies, write expansion, spawning, or runtime claim.

## Impact on acceptance criteria

- AC1 satisfied by the ADR's `## Decision`, `## Decision drivers`, `## Alternatives considered`, `## Consequences`, and `## Security analysis against MISSION non-goal #1` sections.
- AC2 satisfied by the ADR's `## Current MCP surface from 060` and `## Readiness / gap assessment` sections, plus the appended `docs/MCP.md` readiness posture.
- AC3 satisfied by the ADR's explicit implementation-authority refusal and the unchanged live MCP source surface.
- AC4 satisfied by the ADR's `## Relationship to nearby plans` section and `docs/OPEN_SCAFFOLD_SYSTEM.md` clarification.
- AC5 satisfied by the ADR's owner sign-off field: decision-slice start is approved, posture sign-off is pending PR review, and implementation authorization is not granted.
- AC6 satisfied by the latest verification gates recorded in the PR: plan validation, `git diff --check`, `./verify.sh --strict`, `npm test -- --run`, and `npm run build` all passed after the live-corpus hash update.

Resolved open questions:

- No standardized MCP write-surface now; future write MCP must inherit `119` gates.
- No `@modelcontextprotocol/sdk` adoption now; keep the zero-dependency JSON-RPC loop until evidence justifies a dependency ADR.
- Read-only MCP schema/conformance readiness can proceed independently; write/execution readiness is downstream of `119`.
- Reuse the adapter-conformance pattern from `041`/`032`, but MCP needs its own JSON-RPC/tool-schema/resource fixture suite.
- Minimal contract-stable read MCP guarantee: versioned tool/resource schemas, golden JSON-RPC fixtures, compatibility checks, and a deprecation policy.
