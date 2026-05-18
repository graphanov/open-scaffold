# Amendment 1: 043-one-real-runtime-adapter-spike

## Parent

043-one-real-runtime-adapter-spike

## Date

2026-05-18

## Learning

The owner chose OMX / oh-my-codex as the first real runtime target because it is the workflow kit he has used and wants Open Scaffold to support over time. The first real proof should start with `$ralplan` before expanding to `$deep-interview`, `$ralph`, `$ultrawork`, `$ultragoal`, or team-style modes. This keeps the executable direction concrete while preserving Open Scaffold core as the source-of-truth/evidence/audit layer.

## New direction

Revise 043 to be an OMX-first, `$ralplan`-first real runtime spike built on top of the `packages/runtime-omx/` package boundary proven by 042. Dry-run remains the default. Real launch, if attempted in this slice, must require an explicit opt-in flag and a disposable workspace/branch, and must write factual dispatch/evidence artifacts with no commit, push, merge, publish, credential-management, or destructive filesystem authority.

## Impact on acceptance criteria

- AC1 is resolved: the selected runtime target is OMX / oh-my-codex, starting with `$ralplan`.
- AC2 remains dry-run-first and should render the exact OMX `$ralplan` handoff/command preview without launching by default.
- AC3 remains explicit opt-in for real launch and must also require safe workspace/branch conditions.
- AC4 should record OMX runtime identity, `$ralplan` workflow, command redaction, exit status, output/log path, evidence path, and a no-commit/no-push/no-merge statement.
- AC5 should cover dry-run, allowed `$ralplan` launch when explicitly opted in, refusal without opt-in, missing OMX tool/config, unsafe path, failure exit, and no commit/push/merge behavior.
- AC6 is unchanged: Open Scaffold core must remain free of runtime launch code.
