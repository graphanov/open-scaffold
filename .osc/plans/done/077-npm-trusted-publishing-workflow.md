# Plan: 077-npm-trusted-publishing-workflow

## Status

done

## Context

`open-scaffold@0.4.4` is prepared on `main`, but manual `npm publish` is blocked by npm write-time two-factor authentication. npm trusted publishing is the correct release path because it publishes from a specific GitHub Actions workflow through OIDC instead of relying on long-lived write tokens or browser/OTP prompts.

## Goal

Add the repo-side trusted publishing workflow and evidence needed for the owner to bind npm package `open-scaffold` to GitHub Actions and publish `0.4.4` through a manually dispatched workflow.

## Constraints / Out of scope

- Do not commit npm auth tokens, OTPs, browser auth URLs, or secrets.
- Do not publish from this feature branch; trusted publishing must run from the configured workflow after the workflow exists on the default branch.
- Do not change package version, package payload, CLI behavior, runtime boundaries, docs positioning, templates, linter, dashboard, MCP, or task database work.
- Keep the npm-side trusted publisher configuration as an owner/manual setup step because it lives in npm package settings.

## Files to touch

- `.github/workflows/publish-npm.yml` — manual GitHub Actions workflow with OIDC permission, pre-publish verification, version guard, and `npm publish --provenance`.
- `.osc/releases/2026-05-19-077-npm-trusted-publishing-workflow.md` — evidence note with exact npm UI trusted-publisher fields and post-merge publish sequence.
- `MISSION.md` — close stamp after local verification if the setup slice is accepted.
- `.osc/plans/active/077-npm-trusted-publishing-workflow.md` — this plan, moved to `done/` when the workflow setup slice is locally verified.

## Implementation Architecture Coverage

- Strengthens: authority, audit trails, and package release recovery.
- Audit envelope: PR, workflow filename, npm trusted publisher fields, local verification commands, and eventual GitHub Actions run URL reconstruct the release path.
- Evaluation envelope: workflow syntax parses, local build/tests/strict verification pass, and release evidence states exact npm and GitHub owner gates.
- Feedback routing: if the workflow fails after npm trusted publisher setup, fix through a follow-up PR or amendment rather than editing this closed plan in place.
- Boundary: npm package settings, actual npm publish execution, and GitHub Release creation remain gated by owner action after the workflow is merged.

## Acceptance criteria

- [ ] `.github/workflows/publish-npm.yml` exists and uses `workflow_dispatch` with explicit `expected-version` and `npm-tag` inputs.
- [ ] The workflow grants `id-token: write` and `contents: read`, uses a GitHub-hosted Ubuntu runner, installs a current npm CLI, runs build/tests/strict scaffold verification, checks that the requested version matches `package.json`, refuses already-published versions, and runs `npm publish --provenance` without an npm token.
- [ ] The release/evidence note records exact npm trusted publisher UI fields: GitHub Actions, owner `graphanov`, repository `open-scaffold`, workflow filename `publish-npm.yml`, and no environment name unless a protected environment is later added.
- [ ] No npm token, OTP, browser auth URL, or secret appears in tracked files.
- [ ] Local workflow YAML parsing, build, tests, strict scaffold verification, and whitespace checks pass.

## Verification steps

1. `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/publish-npm.yml"); puts "yaml ok"'` — workflow YAML parses.
2. `grep -n "id-token: write\|npm publish --tag\|--provenance" .github/workflows/publish-npm.yml` — OIDC and publish command are present.
3. `git grep -nE 'npm_[A-Za-z0-9]{20,}|https://www[.]npmjs[.]com/auth/cli/' -- . ':!package-lock.json'` — expected: no tracked npm token or browser-auth URL leakage from this slice.
4. `npm run build`, `npm test -- --run`, `./verify.sh --strict`, and `git diff --check` — repo gates pass.

## Open questions

- The npm package settings step cannot be done from the repo. After merge, configure npm package `open-scaffold` trusted publisher with workflow filename `publish-npm.yml`, then manually run the workflow from `main` with `expected-version=0.4.4` and `npm-tag=latest`.
