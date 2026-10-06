# Plan: 035-runtime-docs-simplification

## Status

done — docs simplification and runtime hypothesis reconciliation after runtime profiles v0 shipped.

## Context

Open Scaffold now has the runtime substrate that earlier strategy slices were circling: runtime selection, schema-backed runtime profiles, built-in OMC/OMX/plain/human/custom profiles, project-local `.osc/runtimes/*.json`, and run packets that record the chosen profile without spawning runtimes from core.

The public docs still risk making a fresh reader assemble the product story from many protocol documents. The clearest story is now:

```text
User selects runtime
  -> Open Scaffold reads runtime profile
  -> Open Scaffold creates the run packet
  -> Adapter/coordinator launches the actual runtime
  -> Runtime does the work
  -> Evidence comes back into Open Scaffold
```

## Goal

Simplify the public narrative around runtime selection/profiles and reconcile older runtime/orchestration hypotheses with the shipped state, without adding runtime spawning, install behavior, marketplace semantics, or model-lab claims.

## Constraints / Out of scope

- Do not add real runtime install/spawn/check commands.
- Do not add hosted registries, marketplaces, network imports, or package-manager behavior.
- Do not claim OMC/OMX/GSD certified integrations beyond what the repo proves.
- Do not promote model benchmarking, model routing, or multi-agent spawning into core.
- Do not leak private owner context or local execution details.
- Do not edit completed plan history in place.

## Files to touch

- `README.md` — lead with the simple product/runtime flow and a shorter first path.
- `docs/OPEN_SCAFFOLD_SYSTEM.md` — clarify progressive-disclosure map.
- `docs/RUNTIME_SELECTION.md` — keep runtime choice as the user-facing selection layer.
- `docs/RUNTIME_PROFILES.md` — keep profile catalog as the configuration layer.
- `docs/RUNTIME_BINDING_CONTRACT.md` — keep binding as adapter/coordinator execution layer.
- `docs/examples/README.md` — route fresh readers quickly to downstream walkthrough and runtime-profile example.
- `ROADMAP.md` — mark runtime selection/profile state as shipped and keep remaining orchestration/model-lab items as future hypotheses, not current promises.
- `.osc/releases/` — add evidence note for this slice.

## Acceptance criteria

- [ ] README explains Open Scaffold in plain language before protocol detail.
- [ ] Runtime docs follow progressive disclosure: select runtime -> resolve profile -> create run packet -> adapter/coordinator executes -> evidence returns.
- [ ] Duplicate runtime explanations are reduced across runtime selection/profile/binding docs.
- [ ] ROADMAP no longer makes backlog `030` / `031` look like the next implementation priority after PR #37; remaining runtime/orchestration/model-lab work is framed as future hypothesis or explicit follow-up.
- [ ] Fresh-user example navigation points to the downstream walkthrough and runtime profile example quickly.
- [ ] Public docs avoid private context, unsupported certified-integration claims, real spawning claims, and model-performance claims.
- [ ] Verification passes: `git diff --check`, `./verify.sh --strict`, `npm run osc -- verify`, `npm test`, and `npm run build`.

## Verification steps

1. Run `git diff --check`.
2. Run `./verify.sh --strict`.
3. Run `npm run osc -- verify`.
4. Run `npm test`.
5. Run `npm run build`.
6. Search touched public docs for private/local leakage and unsupported runtime/certification claims.

## Open questions

- Should backlog plans `030` and `031` be closed/superseded in this PR, or left as visible hypotheses after the roadmap clarifies their status?
- Should future work add `osc runtimes check <id>` as a dry-run adapter-readiness command, or should docs simplification land first?
