# Plan: 050-npm-publish-and-npx-init

## Status

backlog — high-priority adoption blocker. The package is not on the public npm registry; `npx open-scaffold init` returns `npm ERR! 404` for every prospective user. This is the single largest obstacle to public adoption. Self-dogfooded planning, verification, and scaffolding infrastructure exists in-repo but has zero external reach until publish.

## Context

The README instructs users to run `npx open-scaffold init --tier min --target <dir>` as the first onboarding command. As of 2026-05-18, `npm view open-scaffold version` returns nothing — the package has never been published. The repo contains a complete `package.json`, a `src/` tree with a working CLI, bootstrap scripts, and verification tooling, but none of it is reachable from npm. This plan follows the completion of the v1 scaffolding core (plans 001–049 covering init, plan lifecycle, amendments, verify.sh, and run packets) and is the necessary final step to make those features externally consumable. It is blocked only on owner approval of npm publish.

## Goal

Publish open-scaffold to the public npm registry so that `npx open-scaffold init --tier min --target <dir>` succeeds for any user with Node.js ≥18, producing a valid scaffold that passes `./verify.sh --standard`.

## Constraints / Out of scope

- Do not ship `.osc/plans/done/`, `.osc-dev/`, or private owner data in the npm package. The payload must be tight and public-safe.
- Do not modify the scaffold protocol — whatever ships in the npm package must be identical to what lives in-repo, minus gitignored private directories.
- Do not automate publish on every push; npm publish requires explicit owner approval (2FA token or OTP).
- Do not claim published status until `npm view open-scaffold version` returns the actual version string.
- Keep the package footprint small — `npm pack --dry-run` gzipped size should stay under 100KB.

## Files to touch

- `package.json` — version bump to 0.1.0 or 1.0.0, audit `"files"` field to include `src/`, `docs/`, `AGENTS.md`, `CLAUDE.md`, `MISSION.md`, `.osc/` (core scaffold dirs only, not dogfood plans), `bootstrap.sh`, `verify.sh`, `amend.sh`, `close.sh`, and template files; verify `"bin"` entry maps to compiled or source entry point.
- `.npmignore` — create if absent; explicitly exclude `.osc/plans/done/`, `.osc/plans/backlog/0*` (dogfood plans), `.osc-dev/`, `.osc/runs/`, `node_modules/`, `.git/`, test fixtures with private data, and CI artifacts.
- `docs/` — ensure all docs referenced from README are included in the files list; check for broken cross-document links.
- `src/` — verify build output (`dist/`) is correct and entry point resolves; run `npm run build` and confirm no TypeScript errors.
- `.github/workflows/` — add a `publish.yml` CI workflow that runs `npm test`, `npm run build`, and `npm publish --dry-run` on version-tagged commits, with a manual `workflow_dispatch` trigger for actual publish.
- `README.md` — add a "published version" badge and confirm the `npx` invocation example matches the actual binary name.

## Acceptance criteria

- [ ] `npm pack --dry-run --json` output lists only public-safe files; no `.osc-dev/`, no `.osc/plans/done/`, no gitignored directories.
- [ ] `npm view open-scaffold version` returns the published version (e.g., `0.1.0`).
- [ ] `npx open-scaffold init --tier min --target /tmp/test-smoke` succeeds, creates `.osc/`, `MISSION.md`, `AGENTS.md`, `CLAUDE.md`, `verify.sh`, and the shell scripts.
- [ ] `cd /tmp/test-smoke && ./verify.sh --standard` exits 0.
- [ ] The published package does not contain `.osc/plans/done/` or `.osc-dev/` (verify with `npm pack --dry-run | grep`).
- [ ] `.github/workflows/publish.yml` exists with a `workflow_dispatch` publish trigger and a dry-run verification on tag push.
- [ ] `npm run build` exits 0 and `npm test` passes with no failures before publish.
- [ ] npm registry page shows correct description, license (MIT), repository link, and keywords.

## Verification steps

1. Run `npm pack --dry-run --json 2>&1 | jq '.[].name' | sort` and inspect the file list. Confirm no `.osc-dev/`, `.osc/plans/done/`, `.osc/plans/backlog/0*` (dogfood plans), `.osc/runs/`, or `node_modules/` entries.
2. Run `npm publish --dry-run` and confirm it would publish without errors.
3. After actual publish (owner-gated), run `npm view open-scaffold version` and confirm it returns the published semver.
4. Run `npx open-scaffold@latest init --tier min --target /tmp/test-smoke && cd /tmp/test-smoke && ./verify.sh --standard`. Expected exit 0.
5. Check the npm registry page at `https://www.npmjs.com/package/open-scaffold` for correct metadata (description, license, repository, README rendering).
6. Run `npm pack` locally, extract the tarball, and `grep -r "TODO" .` inside the extracted dir — confirm no TODO markers ship in the published package.

## Open questions

- Should the initial publish be version `0.1.0` (pre-stable semver signaling) or `1.0.0` (signaling v1 readiness)? The scaffold core is stable enough for v1, but the ecosystem of adapter evidence and runtime bindings is nascent.
- Who holds the npm 2FA token for publish? Does the owner use `npm token create` with CI secrets, or publish manually from their local machine?
- Should `npx open-scaffold init` default to `--tier standard` and require `--tier min` for minimal, or default to `--tier min` and require `--tier standard` for full? Current CLI behavior needs confirmation.
- Should the npm package include `.osc/plans/` template files (handoff template, workflow docs) or only the scaffold generator that produces them? Including them lets `osc plan new` work from template, but risks confusion if users edit the shipped templates.
