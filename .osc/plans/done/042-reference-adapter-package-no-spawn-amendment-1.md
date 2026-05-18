# Amendment 1: 042-reference-adapter-package-no-spawn

## Parent

042-reference-adapter-package-no-spawn

## Date

2026-05-18

## Learning

The owner accepted that Open Scaffold should become executable through explicit in-repo agentic runtime packages rather than through vague external adapter work. The preferred naming convention is `packages/runtime-<id>/`, with OMX / oh-my-codex first as `packages/runtime-omx/`. The first implementation still needs a no-spawn proof so Open Scaffold can validate package boundaries, receipts, and evidence without launching a real runtime too early.

## New direction

Revise the 042 implementation target from a location-TBD reference adapter to an in-repo no-spawn agentic runtime package scaffold at `packages/runtime-omx/`. The package should consume an Open Scaffold `run.json`, validate the OMX `$ralplan` lane/workflow shape, and write deterministic receipt/evidence artifacts without launching OMX, Codex, tmux, shell automation, network calls, credentials, commits, pushes, merges, or publishes.

## Impact on acceptance criteria

- AC1 changes from “outside Open Scaffold core or approved package boundary” to “inside the explicitly approved `packages/runtime-omx/` package boundary.”
- AC2 should validate the run packet plus OMX-first fields: `runtimeSelection.runtime=omx`, `runtimeSelection.workflow=plan`, `executor.lane=omx-codex`, and `executor.harnessSkill=$ralplan` where present.
- AC3 still requires dispatch receipt and deterministic evidence under safe repo-local output paths.
- AC4 is unchanged but should explicitly include no real OMX/Codex launch, no command execution, no credentials, and no source mutation outside package-owned output artifacts.
- AC5 should cover valid `$ralplan` packets, missing required fields, unsafe output paths, unsupported workflow tokens, and no-spawn behavior.
- AC6 should label this as the first in-repo agentic runtime package scaffold, not production OMX support.
