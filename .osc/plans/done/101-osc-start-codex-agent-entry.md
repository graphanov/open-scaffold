# Plan: 101-osc-start-codex-agent-entry

## Status

done


## Context

The post-v1 product audit found that the largest workflow gap is not native runtime spawning; it is the missing first-party bridge from an Open Scaffold plan to a usable agent prompt. The owner wants the next runtime-adoption path to be Codex-first, not Claude Code-first.

## Goal

Add a no-spawn `osc start` agent-entry command that turns a plan into a paste-ready Codex/OMX handoff prompt with acceptance criteria, verification, evidence expectations, and authority boundaries.

## Constraints / Out of scope

- Do not spawn Codex, OMX, Claude Code, OpenHands, or any other process.
- Do not create commits, pushes, PRs, or runtime sessions.
- Do not require `omx` or `codex` to be installed.
- Do not replace `osc run`; this is a lighter agent-entry affordance for users sitting in an agent terminal/chat.
- Do not add a Claude Code-specific adapter in this slice.

## Files to touch

- `src/cli.ts` or future CLI command module — command parsing and help text for `osc start`.
- `src/` prompt/artifact helper if needed — shared prompt generation.
- `tests/` — command output fixtures for Codex/OMX and generic modes.
- `README.md` / `docs/RUNTIME_ADOPTION_WORKFLOW.md` — usage docs if the command ships.
- `.osc/releases/` — evidence note if the command ships in a PR.

## Implementation Architecture Coverage

- Strengthens: workflow design, adoption trust, and runtime boundary clarity.
- Audit envelope: command output fixture plus plan path/acceptance criteria/verification command trace.
- Evaluation envelope: tests assert no files/processes are spawned and output includes required boundary language.
- Feedback routing: missing adapter execution remains a follow-up for `osc dispatch` / runtime package work.
- Boundary: this command prints a handoff; it does not execute work.

## Acceptance criteria

- [ ] `osc start PLAN_OR_SLUG --runtime codex` prints a paste-ready prompt for a Codex/OMX worker.
- [ ] Output includes plan path, goal, acceptance criteria, verification commands, evidence expectations, and commit/push/PR/publish approval boundaries.
- [ ] The command works without `omx`, `codex`, network access, or credentials.
- [ ] Tests prove the command does not spawn a process or mutate source files.
- [ ] README/docs explain this as no-spawn agent entry, not runtime execution.
- [ ] `./verify.sh --strict`, `npm test`, `npm run build`, and `git diff --check` pass.

## Verification steps

1. Run the focused `osc start` tests.
2. Run a CLI smoke against a real backlog or fixture plan.
3. Run `./verify.sh --strict`.
4. Run `npm test`.
5. Run `npm run build`.
6. Run `git diff --check`.

## Open questions

- Should `osc start` accept a slug, a path, or both in v1? Prefer both only if existing plan lookup utilities make it low-risk.
