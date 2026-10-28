# Plan: 324-unpinned-npx-supply-chain

## Status

active

## Context

Issue graphanov/open-scaffold#324 ("Supply chain risk in version 0.35.0") reports that the CLI tells agents to run `npx open-scaffold@latest` almost everywhere — including in files it writes into users' repos and in shipped agent tool configs. That command downloads and runs whatever npm currently serves, and the command output is then read by the agent, so one bad npm release yields both code execution and instruction injection into every agent that follows the guidance. It also makes offline use impossible. The issue lists 13 findings and the maintainer approved a PR, suggesting we start with the generated instructions and MCP setup before the other findings.

This slice covers the full issue (findings 1-8 and 10-13) on one branch, organised as one commit per finding group so it stays reviewable. Finding 9 (`src/runtime-profiles.ts` runtime-profile links) is intentionally out of scope per owner decision: the `run.json` packet never carries those URLs, so `osc run --runtime <id>` is unaffected by them.

Owner decisions for this slice:

- Anything written into a downstream repo or read by a downstream agent uses bare `osc` and contains no online references (no `npx open-scaffold@*`, no registry install, no `github.com/.../tree/main` links).
- Shipped docs and MCP configs use global `osc` / `osc-mcp`; where an install is shown it is pinned to the current release version (`npm install --global open-scaffold@<version>`).
- Historical records (`.osc/plans/done/**`, `.osc/releases/**`, `docs/CHANGELOG.md`) are preserved unchanged.

## Goal

Remove unpinned remote-execution guidance and close the listed supply-chain gaps so that (a) every file the CLI writes into a downstream repo contains only bare `osc` commands and zero online references, (b) shipped docs/MCP configs use global `osc`/`osc-mcp` with a release-pinned install line, and (c) the behavioral hardening for the devcontainer, reviewer endpoint, cockpit webhook, remote-sourced evidence text, and ambient-capture hook path is in place — guarded by a regression test that fails when generated templates regain remote references.

## Constraints / Out of scope

- No version bump and no npm publish in this slice. Install lines pin to the current release version `0.35.0`; the existing release-sync process bumps them.
- Finding 9 (`src/runtime-profiles.ts` links and `install.humanHint` URLs) is out of scope.
- Do not rewrite historical records: `.osc/plans/done/**`, `.osc/releases/**`, `docs/CHANGELOG.md`, and the `tests/fixtures/**` section-parser corpus keep their existing text.
- No new runtime spawning, provider SDKs, credential handling, or change to the no-spawn core boundary.
- Do not weaken existing safety guards (path safety, symlink rejection, fail-closed gates).
- Documentation wording and meaning stay intact; only the command form and install line change.

## Files to touch

- `src/init.ts` — downstream README, AGENTS.md/CLAUDE.md, START_HERE, `.osc/RULES.md`, `.osc/plans/README.md`, and handoff-template: `npx open-scaffold` -> `osc`, plus a pinned `npx open-scaffold@<version>` fallback for users who cannot install globally.
- `src/first-run.ts` — generated plan/evidence steps, next-action commands, and conflict message: `npx open-scaffold@latest` -> `osc`.
- `src/resume.ts` — next-action bootstrap no longer rewrites `osc` to `npx open-scaffold@latest`.
- `src/cli.ts` — handoff command prefix: always `osc` (drop the version-pinned `npx` prefix).
- `src/version.ts` — new shared `packageVersion()` helper (replaces duplicates in cli/mcp-server/cockpit); generated templates pin the running version in the npx fallback.
- `README.md`, `docs/START_HERE.md`, `LLM_QUICKSTART.md`, `SKILL.md`, `docs/WORKFLOW.md`, `docs/RESUME_WALKTHROUGH.md`, `REPRODUCE.md`, `docs/examples/README.md` — bare `osc`; global install pinned to `0.35.0`; a pinned `npx open-scaffold@0.35.0` fallback is documented for users who cannot install globally.
- `docs/MCP.md` — `osc-mcp` after the pinned global install; no `npx -y -p open-scaffold@latest`.
- `.osc/RULES.md`, `.osc/plans/README.md`, `.osc/plans/WORKFLOW.md`, `.osc/plans/handoff-template.md` — bare `osc`.
- `docs/RUNTIME_BINDING_CONTRACT.md`, `docs/SPAWNING_BOUNDARY.md` — replace mutable `tree/main` links with repo-relative paths.
- `.devcontainer/Dockerfile` — pin `OPEN_SCAFFOLD_VERSION=0.35.0` and pin the base image beyond the floating `node:22` tag.
- `src/reviewer.ts` — require `https:` (or localhost) for reviewer endpoints; mark the remote rationale as untrusted when recorded.
- `src/cockpit.ts` — require `https:` (or localhost) for webhook URLs; stop emitting the absolute local repo path in the message footer.
- `src/evidence.ts` — label `gh`-sourced PR/CI output as untrusted remote text in the collected block.
- `src/capture-setup.ts` — avoid resolving the ambient hook from a replaceable npx-cache path.
- Tests: `tests/first-run-docs.test.ts`, `tests/mcp-docs.test.ts`, `tests/e2e/newcomer.test.ts`, `tests/resume.test.ts`, `tests/first-run.test.ts`, `tests/devcontainer.test.ts`, plus a new guard test for generated-template remote references.

## Acceptance criteria

- [x] Finding 1: files generated into a downstream repo (`AGENTS.md`, `CLAUDE.md`, README, START_HERE, `.osc/RULES.md`, `.osc/plans/README.md`, handoff-template) use bare `osc`, add a pinned `npx open-scaffold@<version>` fallback, and contain no unpinned npx, no `open-scaffold@latest`, no registry install, and no `github.com` URL.
- [x] Finding 2: generated first-run plan/evidence steps, the conflict message, and the handoff packet's next-action use bare `osc` only.
- [x] Finding 3: `docs/MCP.md` configures the MCP server with `osc-mcp` (global install) and contains no `npx -y -p open-scaffold@latest`.
- [x] Finding 4: shipped `.osc/**` templates and `docs/WORKFLOW.md` use bare `osc`, and mutable `github.com/.../tree/main` links in shipped docs are replaced with repo-relative references.
- [x] Finding 5: `.devcontainer/Dockerfile` pins the package version to `0.35.0` and pins the base image beyond the floating `node:22` tag.
- [x] Finding 6: `LLM_QUICKSTART.md` and `REPRODUCE.md` no longer instruct an unpinned `git clone` + run at a floating commit.
- [x] Finding 7: `README.md`, `docs/START_HERE.md`, `docs/RESUME_WALKTHROUGH.md`, `docs/examples/README.md`, and `SKILL.md` use bare `osc`; the global install is pinned to `0.35.0`, with a documented pinned-`npx` fallback for users who cannot install globally.
- [x] Finding 8: agent-facing `npx --yes open-scaffold@latest` guidance is removed from the generated surfaces; the parked `blocked/116` plan is left unchanged (immutable committed intent) and flagged for the owner.
- [x] Finding 10: `src/reviewer.ts` rejects a plain-`http` remote reviewer endpoint (accepts `https` or localhost), and recorded remote rationale is marked untrusted.
- [x] Finding 11: `src/cockpit.ts` rejects a non-`https`/non-localhost webhook URL, and outbound messages no longer include the absolute local repository path.
- [x] Finding 12: `src/evidence.ts` marks `gh`-sourced PR/CI text as untrusted remote output in the `--ci` collected block.
- [x] Finding 13: `src/capture-setup.ts` no longer resolves the ambient hook from a replaceable npx-cache path.
- [x] A regression test fails if a generated scaffold template contains an unpinned `npx open-scaffold`, `open-scaffold@latest`, an `open-scaffold` registry install, or a `github.com` URL (pinned `npx open-scaffold@<version>` is allowed).
- [x] `./verify.sh --strict`, `npm test`, and `npm run build` pass on the final head.

## Verification steps

1. `npm run build` — core and runtime-omx TypeScript builds pass.
2. `npm test` — full suite passes, including updated doc assertions and the new guard test.
3. `npm run osc -- init --tier standard --target <tmp>` then grep the generated tree for `npx open-scaffold`, `npm install .*open-scaffold`, and `github.com` — expect zero matches.
4. `./verify.sh --strict` — scaffold verification passes with no failures or warnings.
5. `git diff --check` — no whitespace errors.
6. `npm run osc -- doctor --check secret-scan` — no obvious secret strings.

## Open questions

- Residual risk after the fix: the pinned install line `npm install --global open-scaffold@0.35.0` still fetches from the registry, but at an immutable version instead of a mutable dist-tag. The maintainer drives the release-sync bump.
- The maintainer's comment preferred landing generated-instructions + MCP first and the other findings "in separate changes"; the owner chose one PR covering the full issue. This PR keeps one commit per finding group so the maintainer can still review incrementally.
- `.devcontainer/Dockerfile` base-image pinning: a tag pin (`node:22.x`) is applied; a full `@sha256:` digest pin requires registry access to resolve and may be added by the owner.
