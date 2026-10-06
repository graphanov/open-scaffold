# Plan: 034-runtime-profiles-v0

## Status

done — approved by owner after Claude Code read-only architecture consultation in `.osc/runs/20260515T223354-runtime-registry-claude-consult/`.

## Context

Open Scaffold already supports agentic runtime selection at run-packet level for OMC/OMX/plain/human/custom. The next product step is to remove hard-coded runtime assumptions and make runtime selection schema-backed and user-extensible without turning Open Scaffold core into a runtime installer, network registry, or process spawner.

## Goal

Add runtime profile v0: a declarative runtime profile catalog with built-in profiles and project-local custom profiles that `osc run --runtime <id>` can resolve into executor lane, workflow defaults, harness skill, profile source, and evidence-safe boundaries.

## Constraints / Out of scope

- Do not add real runtime spawning, process supervision, auth setup, or install execution.
- Do not add network registries, marketplace behavior, or `osc runtimes add https://...`.
- Do not auto-run arbitrary scripts from runtime profile files.
- Do not claim certified support for external frameworks without conformance evidence.
- Do not let project-local profiles override reserved built-in IDs.
- Keep private owner context and local runtime state out of public docs.
- Leave the existing untracked `033-implementation-architecture-evaluation-lens.md` outside this PR unless separately approved.

## Files to touch

- `src/runtimes.ts` — runtime profile schema/types, built-in catalog, project profile loader, validation.
- `src/cli.ts` — runtime subcommands and run option resolution through profiles.
- `src/artifacts.ts` — include profile id/source in `runtimeSelection`.
- `tests/cli-init.test.ts` or new tests — built-in/custom profile behavior and rejection cases.
- `docs/RUNTIME_PROFILES.md` — public contract for runtime profile v0.
- `docs/RUNTIME_SELECTION.md`, `docs/RUNTIME_BINDING_CONTRACT.md`, `docs/OPEN_SCAFFOLD_SYSTEM.md`, `ROADMAP.md` — link/update boundary language as needed.
- `docs/examples/runtime-profiles/*.json` — example project-local custom profile.
- `.osc/releases/2026-05-15-runtime-profiles-v0.md` — evidence note.

## Acceptance criteria

- [ ] `osc runtimes list` prints visible built-in profiles with their sources.
- [ ] `osc runtimes show <id>` prints the selected profile JSON.
- [ ] `osc run <plan> --runtime omx` and `--runtime omc` preserve existing dispatchable run-packet behavior.
- [ ] A project-local `.osc/runtimes/<id>.json` profile can be selected with `osc run --runtime <id>` and records `profileId` / `profileSource` in `run.json`.
- [ ] Project-local profiles cannot override reserved built-in IDs.
- [ ] Profiles declaring `spawning: true` or executable install behavior are rejected.
- [ ] Unknown runtime ids are rejected with a clear error.
- [ ] Docs state that runtime profiles are data-only and that install/launch stays adapter/coordinator-owned.

## Verification steps

1. Run `git diff --check`; expected no whitespace errors.
2. Run `./verify.sh --strict`; expected exit 0.
3. Run `npm run osc -- verify`; expected exit 0.
4. Run `npm test`; expected exit 0.
5. Run `npm run build`; expected exit 0.
6. Manually inspect public docs for unsupported install/spawn/certification claims.

## Open questions

- Should per-user XDG runtime profile scope be added later after project-local profiles prove useful?
- Which external runtime should be first to earn built-in or certified-adapter status through conformance evidence beyond OMC/OMX lane mapping?
