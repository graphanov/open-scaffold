# Plan: 201-mcp-output-schemas

## Status

done

## Context

A finite actual MCP stdio probe on source35d9654 finds successful get_plan, get_status and get_evidence responses containing metadata forbidden by their advertised additionalProperties:false output schemas. A fresh twelve-call inventory covers all eleven registered read tools: eight schemas contradict actual successful responses, while list_plans, list_evidence and get_handoff are controls. get_mission present/absent states require optional path/reason declarations. Thirty-two already-returned top-level fields are undeclared. Scoped source/built schema and return-expression correspondence is observed; global reproducible-build provenance and actual third-party client rejection remain unverified. Synthetic fixtures do not grant authority or prove adoption.

## Goal

Advertised MCP read-tool output schemas describe their existing successful structured responses without removing metadata, opening closed objects, tightening existing required fields or changing tool behavior.

## Constraints / Out of scope

- Change only the outputSchema declarations of get_plan, get_mission, get_evidence, get_status, search_plans, list_amendments, analyze_loop and gate_loop to declare the thirty-two existing optional returned fields with their current top-level string/object/array types. Keep all existing declared properties/types, existing required arrays and additionalProperties:false exactly. The three conforming read schemas remain unchanged.
- Preserve every handler return value, text/structured serialization, input schema, helper name, URI, error shape, read-only/write gate and resource semantics. No objectSchema refactor, nested contract tightening, protocol-version negotiation, runtime execution, privacy/redaction redesign, dependencies or blanket MCP/client compliance claim.
- Tests inspect actual JSON-serialized JSON-RPC handler responses against their advertised contracts for every read tool, with meaningful baseline failures, three conforming controls and mission state/optional-field coverage. Negative unknown-property, missing-required and wrong-type controls must reject; old required-only objects must remain valid. No copied field-list oracle, fake compiler or waived assertion.
- Four implementation paths only. Exact measured readable maintained-source growth up to90 physical lines from16,925 is allowed (17,015 maximum/41files); update both metric cap literals and rationale to actual measured growth. Keep roots, physical counting algorithm, 20,890 baseline, 41-file ceiling and POSIX shell equality. No sourcefile addition or linegolf.
- Parent184/README/assets/workflows/frozen persona/evaluator/controller/legacy deployment and canonical ownerdrafts excluded. Ownerdraft bytebaseline equality remains unknown. Prior200 local metadata closeout travels with next publication and needs full diff review.
- Owner six-day routine maintenance delegation permits a scoped independently verified PR/merge, after unchanged committed-head floor, fresh complete publication review/current CI/head/base/threads and actual effect readback. No synthetic approval or protection bypass, npm/release publication, credentials/access/protection changes, destructive history or private memory. Parent184 remains active.

## Files to touch

- `src/mcp-tools.ts` — only the eight affected advertised read outputSchema declarations.
- `tests/mcp-server.test.ts` — actual-response contract regression, complete read-tool controls and rejection/legacy compatibility cases.
- `tests/framework-cleanup-metric.test.ts` — exact deliberate readability cap and plan201 rationale; original metric contract preserved.
- `.osc/releases/2026-10-09-201-mcp-output-schemas.md` — curated discovery, baseline/candidate, verification/review/delivery facts and limits.

## Acceptance criteria

- [x] Actual successful responses of all eleven registered read tools conform to their advertised top-level output contracts, including the eight affected tools and optional mission path/reason states, with all thirty-two existing metadata fields retained. | Evidence: .osc/releases/2026-10-09-201-mcp-output-schemas.md
- [x] Existing required-only compatibility objects remain valid; unknown extra properties, missing required properties and wrong existing/new field types reject, while existing required arrays, closed guards and the three conforming schemas remain exact. | Evidence: .osc/releases/2026-10-09-201-mcp-output-schemas.md
- [x] Genuine JSON-RPC baseline failures pass after the exact schema repair; text/structured content equality, read-only fixture/source preservation and existing MCP handler/refusal/resource behavior remain unchanged, without general client/runtime/privacy certification. | Evidence: .osc/releases/2026-10-09-201-mcp-output-schemas.md
- [x] Only four admitted implementation paths change; measured readable growth stays within intent, metric roots/algorithm/baseline/filecap/shell comparison remain unchanged, and excluded source/docs/dependencies/workflows/frozen definitions/ownerdraft unknowns are respected. | Evidence: .osc/releases/2026-10-09-201-mcp-output-schemas.md
- [x] Independent unchanged committed-head strict/build/full verification and fresh full-publication review/current CI precede authorized PR/merge/readback/release/factual closeout; prior200 metadata is included in publication review and parent184 stays active. | Evidence: .osc/releases/2026-10-09-201-mcp-output-schemas.md

## Verification steps

1. Bind original stdio discovery and fresh eleven-tool/twelve-call inventory to source; obtain exact private design and fresh independent acceptance before implementation admission.
2. Run real baseline schema violations before candidate response-contract controls, negative cases, old-required-only compatibility and optional state variants; preserve original failures and distinguish source inference from observed execution.
3. Validate curated evidence-note schema and metric intent, inspect complete diff, then independently run ./verify.sh --strict, npm run build and npm test on the unchanged committed head with fresh publication review.
4. Reserve one scoped draft PR, read back actual head/base/files, require current producer-bound checks/review/exhaustive threads and protection-preserving admission, then pin the merge and verify whole tree/single parent/main before release.
5. Close factual records via supported helpers and parser-only verification, leaving parent184 active until the six-day expiry.

## Open questions

- Exact private test checker and optional source variants need fresh design acceptance; this plan does not claim complete JSON Schema standard or third-party SDK execution.
