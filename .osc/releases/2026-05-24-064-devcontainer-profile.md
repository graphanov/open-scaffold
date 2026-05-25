# Release / Evidence Note: 064-devcontainer-profile

## Summary

Added an optional Dev Container profile for Open Scaffold development. The profile provides Node.js 22, npm, git, and `osc`, documents VS Code/Codespaces/plain-Docker usage, and makes standard-tier `osc init` generate `.devcontainer/` for downstream projects while keeping min-tier scaffolds small. The post-create command now runs npm workspace setup only when the mounted package is Open Scaffold itself, avoiding downstream project script/global-install side effects.

## Traceability

- Roadmap / issue / task: repo backlog plan `064-devcontainer-profile`.
- Plan: `.osc/plans/active/064-devcontainer-profile.md` pending owner review and final Docker smoke.
- Amendment: `.osc/plans/active/064-devcontainer-profile-amendment-1.md` records the published-package base image plus workspace post-create install decision.
- Run ID / run packet: N/A — implemented directly from the selected backlog plan.
- Branch / PR: `feature/064-devcontainer-profile`; https://github.com/graphanov/open-scaffold/pull/108.

## Verification

- `npm test -- tests/devcontainer.test.ts tests/init.test.ts tests/cli-init.test.ts tests/first-run-docs.test.ts tests/package-payload.test.ts tests/github-actions-workflows.test.ts` — 6 files / 58 tests passed.
- `npm test` — 37 files / 332 tests passed.
- `npm run build`; `node dist/cli.js --version` — build passed and CLI printed `0.4.18`.
- `git diff --check`; `./verify.sh --strict`; changed-plan validation simulation; `npm pack --dry-run --json` with devcontainer asset assertion — all passed.
- `node dist/cli.js init --tier standard --target <temp>` with guarded devcontainer post-create assertion — passed.
- `docker build -t osc-test -f .devcontainer/Dockerfile .devcontainer/`; `docker run --rm osc-test ...` — blocked because the runner environment had no active Docker daemon.

## Outcome

The branch is ready for PR review with one environment-bound verification gap: a Docker-capable environment still needs to run the image build and container smoke checks before merge. The slice does not install AI runtimes, secrets, or project-specific credentials.

## Follow-up

- Owner/CI Docker gate: run the Docker build and `osc --version`, `node --version`, and `git --version` container smokes in an environment with a running Docker daemon.
- Merge remains owner-gated. npm publication and GitHub Release latest updates remain separate owner gates if this PR later changes a public package release train.
