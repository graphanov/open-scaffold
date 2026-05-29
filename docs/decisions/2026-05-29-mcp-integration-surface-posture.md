# MCP integration surface posture

Date: 2026-05-29
Status: proposed owner decision; implementation blocked until explicit owner sign-off
Plan: `.osc/plans/active/131-mcp-integration-surface-readiness.md`

## Decision

Hold MCP at its current optional, local, read-oriented integration posture for now.

Open Scaffold should not yet elevate MCP into a fully standardized, contract-stable, write-capable, conformance-certified integration surface. The current `osc mcp serve` surface remains valuable as an agent-readable view over repo truth, but it is not the next execution/control-loop authority.

The accepted posture for this decision slice is:

1. Keep MCP as an optional stdio interface over local Open Scaffold state.
2. Treat the existing read tools and resources as useful but still experimental until they have versioned schemas, golden JSON-RPC fixtures, and compatibility/conformance tests.
3. Do not expand live MCP tools, resources, transports, dependencies, write capability, or runtime authority in this slice.
4. Any future write-capable MCP surface must be downstream of the `119-osc-work-execute-controller` gate model, not an independent path around it.
5. Preserve the no-new-required-runtime-dependency posture for MCP for now; do not adopt `@modelcontextprotocol/sdk` until a future ADR proves the compatibility benefit is worth making Open Scaffold's root package depend on a protocol SDK.

Short version: yes to MCP as an integration facet; no to MCP as the execution controller; no new write/spawn authority now.

## Decision drivers

- `060-mcp-server` already shipped a hand-rolled stdio server without adding an MCP-specific runtime dependency, so the question is not whether MCP exists; it is whether Open Scaffold should make it stable and strategic.
- `MISSION.md` non-goal #1 says core must not gain autonomous spawning or long-running execution loops by drift.
- The 2026-05-28 control-loop ADR chose `osc work` as the future run-lifecycle controller and rejected a native core runtime for now.
- `119-osc-work-execute-controller` already owns the future write/execution gate model: run packets, adapter authority, receipts, evidence, verification, and human gates.
- `070-runtime-adapter-registry`, `041-adapter-conformance-contract-v1`, and `032-adapter-conformance-fixture` already cover adapter discovery/conformance direction. MCP should not duplicate that authority.
- Slice `130-section-parser-canonical-contract` intentionally protected the parser/core dependency posture. Pulling in `@modelcontextprotocol/sdk` would be a new required protocol SDK dependency and needs explicit justification.
- MCP-capable clients are useful query surfaces, but they vary in protocol support, schema interpretation, and permission UX. A stable MCP promise needs conformance artifacts, not only hand-written docs.

## Current MCP surface from `060`

Current command surface:

- `osc mcp serve [--repo <path>] [--allow-write] [--validate]`
- `osc-mcp [--repo <path>] [--allow-write] [--validate]`
- stdio JSON-RPC only;
- no HTTP, SSE, daemon, network service, or hosted coordinator;
- no MCP-specific runtime dependency in `package.json`; the existing optional native dependency is unrelated to MCP.

Read tools:

- `list_plans`
- `get_plan`
- `get_mission`
- `list_evidence`
- `get_evidence`
- `get_status`
- `search_plans`
- `list_amendments`

Write tools are registered but gated by `--allow-write`:

- `create_plan`
- `amend_plan`
- `close_plan`
- `create_evidence`

Resources:

- `osc://plans/active`
- `osc://plans/backlog`
- `osc://plans/done`
- `osc://plans/blocked`
- `osc://releases/latest`
- `osc://mission/goals`
- `osc://mission/changelog`
- `osc://rules`
- `osc://roadmap`

Important boundary: `--allow-write` only enables scaffold file helpers. It does not authorize runtime spawn, adapter launch, commit, push, PR creation, merge, publish, GitHub Release mutation, deployment, credential access, or external-production side effects.

## Readiness / gap assessment

| Area | Current state | Gap to standardized / contract-stable / conformance-tested |
|---|---|---|
| Tool inventory | Tools are listed in code and docs. | Need a versioned public inventory with stable tool IDs, schema versions, and deprecation policy. |
| Input schemas | Tool input schemas are emitted as JSON Schema-like objects. | Need golden schema fixtures and compatibility tests against the JSON-RPC output clients actually consume. |
| Output schemas | Some output schemas exist, but outputs are not treated as stable public contracts. | Need versioned output contracts for plan/status/evidence shapes and fixture-based snapshot tests. |
| Resources | `osc://...` resources expose plan lists, mission, rules, roadmap, and latest evidence. | Need resource contract docs that say which responses are JSON vs markdown and what stability users can rely on. |
| Protocol loop | Hand-rolled JSON-RPC stdio loop with no MCP-specific runtime dependency. | Need protocol conformance fixtures; SDK adoption remains an ADR question, not a default. |
| Write tools | Visible but blocked unless `--allow-write`; limited to scaffold file helpers. | Need a stronger authority model before any write surface is marketed as stable. Future writes should inherit `119` controller gates. |
| Runtime / execution | None; MCP does not spawn, dispatch, or run adapters. | Keep it that way unless a future owner-approved ADR routes MCP calls through the controller/adapter authority model. |
| Security model | Local-first, stdio-only, path checks, read-only by default, `--allow-write` gate. | Need explicit client-trust guidance, write-audit records, gate IDs, and possibly isolated worktree requirements for any future write expansion. |
| Client docs | Claude Desktop, Cursor, Continue, Hermes examples exist. | Need a compatibility matrix only after conformance fixtures prove behavior across clients. |

## Alternatives considered

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Promote MCP now as a stable read/write integration surface | Strong ecosystem story; MCP clients could drive plans/evidence directly | Duplicates `119`; risks write authority bypass; no conformance fixtures; dependency question unresolved | Reject now |
| Keep current optional read-only posture with a readiness path | Preserves useful agent-readable access while avoiding runtime/write creep | Less exciting; still leaves MCP marked experimental | Choose |
| Remove or de-emphasize MCP | Lowest surface area | Throws away a useful integration that already exists and helps agents read repo truth | Reject |
| Adopt `@modelcontextprotocol/sdk` immediately | Better protocol alignment; future updates easier | New required protocol SDK dependency; package footprint/security review; migration churn without proven need | Defer to future ADR |
| Make MCP a front door for `osc work --execute` | Single integration channel for agents | Wrong layer: execution gates belong to `119`; MCP should not become an execution controller by accident | Reject unless future ADR routes through `119` |

## Consequences

Positive consequences:

- MCP remains useful immediately as a local read interface for MCP-capable tools.
- Open Scaffold avoids turning a client integration protocol into a second execution authority.
- The future stable-MCP path becomes testable: schemas, golden JSON-RPC fixtures, compatibility checks, and deprecation policy.
- The no-new-required-dependency posture for MCP remains intact until there is source-grounded evidence that the official SDK is worth adopting.

Tradeoffs and costs:

- Open Scaffold will not market MCP as a stable/conformance-certified surface yet.
- Write-capable MCP workflows remain limited and intentionally under-promised.
- Users who want MCP-driven plan/evidence mutation must accept the current explicit `--allow-write` caveat or wait for a future controller-gated design.
- A later MCP hardening slice must do fixture/conformance work before any broader public claim.

Operational consequence:

- If the owner wants MCP to become more than a read/query interface, the next implementation plan should be a narrow read-contract hardening slice first, not a write/execute expansion.

## Relationship to nearby plans

- `060-mcp-server` remains the shipped optional MCP server. This decision does not rewrite or expand it.
- `119-osc-work-execute-controller` owns future write/execution lifecycle: plan/package/run state, adapter invocation, receipts, evidence, verification, and human gates.
- `070-runtime-adapter-registry` owns adapter discoverability if/when there are enough credible adapters to list.
- `041-adapter-conformance-contract-v1` and `032-adapter-conformance-fixture` own adapter receipt/evidence conformance patterns. MCP can reuse the fixture/golden-output mindset, but it needs its own JSON-RPC/tool-schema conformance suite.
- `130-section-parser-canonical-contract` protected zero-dependency parser correctness; that raises the bar for adopting `@modelcontextprotocol/sdk` in the root package.

## Security analysis against MISSION non-goal #1

MISSION non-goal #1 blocks autonomous spawning or long-running execution loops in core without explicit roadmap investigation, ADR, security analysis, and separate approval.

This posture passes that boundary because it does not add:

- new MCP tools or resources;
- network, HTTP, SSE, daemon, or hosted transport;
- autonomous runtime spawning;
- adapter dispatch;
- provider SDKs;
- credential access;
- automatic verification command execution;
- commit, push, PR, merge, publish, release, or deploy authority.

The main risk is not the current read surface. The risk is that MCP clients make write tools feel conversationally cheap. Therefore the write rule must stay strict:

```text
MCP write access may create or mutate scaffold files only when explicitly started with --allow-write.
MCP must not become a route around the controller/human gates for execution, adapter launch, external side effects, or publication.
```

Any future MCP write expansion should record gate IDs or approval references and should likely require the same isolated-worktree/path-scope rules being designed for `119`.

## Future implementation gates

A later implementation plan may promote MCP from optional/experimental to contract-stable read integration only after it adds:

1. versioned MCP tool and resource schema fixtures;
2. golden JSON-RPC smoke fixtures for initialize, tools/list, resources/list, tools/call, resources/read, and error responses;
3. a compatibility matrix for at least the clients documented in `docs/MCP.md`;
4. a stability/deprecation policy for tool names, resource URIs, input schemas, and output fields;
5. explicit evidence that zero-dependency JSON-RPC is still sufficient or an accepted ADR to adopt `@modelcontextprotocol/sdk`;
6. tests proving no write, spawn, network, credential, or external-production side effect is added by the conformance work.

A later write-capable MCP plan must additionally wait for `119` or an equivalent owner-approved controller/security gate, then document how MCP calls inherit the controller's human approval, worktree isolation, adapter authority, and external-side-effect refusals.

## Owner sign-off

Decision-slice start: approved by the owner in Discord on 2026-05-29: “Proceed with 131-mcp-integration-surface-readiness.”

Posture sign-off: pending owner review of this PR/ADR.

Implementation authorization: **not granted** by this ADR. No live MCP surface change, write/spawn expansion, dependency addition, or runtime claim is authorized until a future owner approval records the exact implementation plan.
