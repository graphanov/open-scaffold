# Plan: 064-devcontainer-profile

## Status

done


## Context

Container-based development is now standard for team onboarding — VS Code Dev Containers, GitHub Codespaces, Gitpod, and JetBrains all support `.devcontainer/` configurations. A new team member should be able to clone an Open Scaffold project, reopen it in a container, and have `osc` working immediately without installing Node.js, npm, or any global tools. Currently, every new contributor must manually install Node.js and run `npm install && npm run build` before they can use `osc`. A pre-built devcontainer profile eliminates this friction and signals that Open Scaffold takes team workflows seriously.

## Goal

Ship a `.devcontainer/devcontainer.json` and `Dockerfile` that pre-installs the `osc` CLI, Node.js, and git, so any developer can clone and start working in a fully-configured environment within seconds.

## Constraints / Out of scope

- Uses the official Node.js LTS Docker image matching `package.json` engines (`node:22`).
- Must pre-install `osc` globally so the command works immediately after container start.
- Must NOT include project-specific secrets, credentials, tokens, or `.env` files.
- Must NOT require VS Code — the Dockerfile should be independently buildable with `docker build`.
- The devcontainer is an optional profile, not a requirement — `osc init` should mention it but not force it.
- Does NOT configure VS Code extensions beyond the essentials (TypeScript support) in v1.
- Does NOT pre-install Claude Code, Codex, or any AI agent runtime — those are user-choice add-ons.

## Files to touch

- `.devcontainer/devcontainer.json` — new: VS Code devcontainer config referencing the Dockerfile, setting up post-create commands, and mounting the workspace
- `.devcontainer/Dockerfile` — new: extends `node:22`, installs git (if not present), builds and installs `open-scaffold` globally
- `.devcontainer/README.md` — new file: brief setup guide, how to use with VS Code and Codespaces, how to customize
- `README.md` — add a "Dev Container" section or badge mentioning container support
- `docs/DEV_CONTAINER.md` — new file: detailed dev container guide with troubleshooting and customization options
- `.osc/plans/backlog/064-devcontainer-profile.md` — this plan

## Acceptance criteria

- [ ] `.devcontainer/devcontainer.json` is valid JSONC and references the Dockerfile correctly
- [ ] `Dockerfile` builds successfully with `docker build -t osc-devcontainer -f .devcontainer/Dockerfile .devcontainer/`
- [ ] Container starts with `osc` available in PATH — `docker run --rm osc-devcontainer osc --version` prints version
- [ ] Container has Node.js and npm available — `docker run --rm osc-devcontainer node --version` prints v22.x
- [ ] Container has git available — `docker run --rm osc-devcontainer git --version` prints version
- [ ] `devcontainer.json` includes `postCreateCommand` that runs `npm install` (so dependencies are ready after container creation)
- [ ] VS Code devcontainer flow works end-to-end: clone repo, "Reopen in Container", wait for build, open terminal, run `osc status` — works
- [ ] GitHub Codespaces: if the repo is opened in Codespaces, it detects `.devcontainer/` and builds the environment automatically
- [ ] `.devcontainer/README.md` explains the setup in 3 sentences, with links to VS Code and Codespaces docs
- [ ] `docs/DEV_CONTAINER.md` covers: prerequisites (Docker, VS Code), first launch walkthrough, customization (adding extensions, changing Node version), troubleshooting (port conflicts, rebuild), and how to use without VS Code (plain Docker)
- [ ] `README.md` mentions dev container support alongside the npm init path
- [ ] `osc init --tier standard --target <dir>` generates a `.devcontainer/` in the target project (so downstream projects inherit container support)
- [ ] `npm test` and `./verify.sh --standard` pass (devcontainer files are additive, no plan/schema impact)

## Verification steps

1. **Dockerfile build:** Run `docker build -t osc-test -f .devcontainer/Dockerfile .devcontainer/`. Verify build succeeds with no errors.
2. **CLI presence:** Run `docker run --rm osc-test osc --version`. Verify version string matches package.json version.
3. **Node and git:** Run `docker run --rm osc-test node --version` and `docker run --rm osc-test git --version`. Verify both print versions.
4. **VS Code test:** Open the repo in VS Code. When prompted "Reopen in Container", accept. Wait for build. Open integrated terminal. Run `osc status`. Verify output shows scaffold state. Run `osc --help`. Verify help text.
5. **Codespaces test (if available):** Push the branch to GitHub. Open in Codespaces. Verify auto-build triggers and terminal has `osc`.
6. **Init generation test:** Run `osc init --tier standard --target /tmp/test-devcontainer`. Verify `/tmp/test-devcontainer/.devcontainer/` exists with devcontainer.json, Dockerfile, and README.md.

## Open questions

- Should the Dockerfile install `osc` globally via `npm install -g open-scaffold` (requires npm publish, plan 050) or build from local source? Decision: build from local source in the Dockerfile for self-containment (doesn't depend on npm registry). After plan 050 ships npm publish, add the `npm install -g` path as an alternative documented in `docs/DEV_CONTAINER.md`.
- Should `.devcontainer/` be generated by `osc init --tier standard` or only `--tier max`? `standard` is the recommended starter — it should include devcontainer support. `min` should not (keep it as small as possible).
- Post-create command: `npm install` is the obvious choice, but should it also run `npm run build`? Yes — the user should be able to run `osc` commands immediately without manual build step.
