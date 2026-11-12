# Release / Evidence Note: 324-unpinned-npx-supply-chain

## Summary

Removes unpinned remote-execution guidance from issue graphanov/open-scaffold#324 and closes the listed supply-chain gaps: files the CLI writes into a downstream repo use bare `osc` with a pinned `npx open-scaffold@<version>` fallback for users who cannot install globally (never unpinned, never `@latest`); shipped docs and MCP configs use the installed `osc`/`osc-mcp` with a release-pinned install line; and reviewer/cockpit endpoints require https (loopback http excepted), remote-sourced text is marked untrusted, and npx-cache hook paths are refused. A regression test fails if generated scaffolds regain unpinned npx, `@latest`, or `github.com` references.

## Traceability

- Roadmap / issue / task: graphanov/open-scaffold#324 — https://github.com/graphanov/open-scaffold/issues/324
- Plan: .osc/plans/done/324-unpinned-npx-supply-chain.md
- Run ID / run packet: N/A — direct contributor work; no runtime run packet.
- Branch / PR: `fix/unpinned-npx-supply-chain` (fork `ntherrien/open-scaffold`); PR #327 — https://github.com/graphanov/open-scaffold/pull/327 (open; merge and publication remain owner gates).

## Verification

- `npm run build` — pass (core + runtime-omx TypeScript builds).
- `npm test` — 1328 passed / 1 failed; the single failure is `tests/close-shell.test.ts` amendment-filename ordering, reproduced unchanged at base commit `11d8efc` in a clean worktree, so it is pre-existing and locale-dependent, not introduced here.
- `./verify.sh --quick --quiet` — exit 0.
- `./verify.sh --strict` — 9 pass / 0 fail / 18 warn; the warnings are pre-existing historical-plan intent notices for unmodified plans.
- `npm run osc -- plan validate 324-unpinned-npx-supply-chain --strict` — 0 issues.
- Generated-scaffold scan: `osc init` for `min`, `standard`, and `max`, then grep every generated file for `npx open-scaffold`, `open-scaffold@latest`, `github.com`, and `https?://` — the only remaining URLs are RFC 2606/6761 reserved `.invalid` placeholders in `.osc/cockpit.example.json` (non-resolvable).
- `tests/generated-scaffold-offline.test.ts` — new guard: fails if any generated scaffold file contains an unpinned `npx open-scaffold`, `open-scaffold@latest`, an unpinned global install, `github.com`, or a live URL (pinned `npx open-scaffold@<version>` is allowed).
- Fallback coverage: generated `AGENTS.md`/`README.md`/`docs/START_HERE.md` carry `npx open-scaffold@0.35.0 <command>` (the running version) with an explicit "never unpinned, never `@latest`" guardrail; `src/version.ts` is the single `packageVersion()` source (replaced three duplicates).
- Reviewer/cockpit endpoint enforcement and untrusted-rationale marking covered by `tests/reviewer.test.ts` and `tests/evolution.test.ts`; npx-cache hook refusal covered by `tests/capture-setup.test.ts`; `--ci` untrusted marking covered by `tests/evidence.test.ts`.

## Outcome

Shipped on the branch (uncommitted authoring surface until owner review): findings 1–8 rendered offline-clean with a pinned-`npx` fallback, findings 10–13 hardened, a shared `packageVersion()` helper, plus one guard test and this plan/evidence pair. Finding 9 (`src/runtime-profiles.ts` runtime-profile links) is intentionally out of scope per owner decision, since the `run.json` packet never carries those URLs and `osc run --runtime <id>` is unaffected. No version bump, npm publish, merge, or release is included; the pinned install line references the current release `0.35.0`.

approval.status: approved
approval.rationale: Owner closed the 324 slice on 2026-10-30 after full local verification (build, tests, strict verify); upstream PR #327 review, merge, and publication remain separate owner gates.

## Follow-up

- Address any upstream PR #327 review; merge and publication remain owner gates.
- Reconsider finding 9 (`osc runtimes show` links) separately if the owner wants it addressed.
- `.devcontainer/Dockerfile` pins `node:22.23.4` by tag and multi-arch digest; refresh the digest when the base image moves.
