# Release / Evidence Note: 077-npm-trusted-publishing-workflow

## Summary

Added a manually dispatched GitHub Actions workflow for npm trusted publishing. The workflow is the repo-side setup needed to publish `open-scaffold@0.4.4` through npm OIDC instead of local browser/OTP publishing.

## Traceability

- Roadmap / issue / task: package release reliability follow-up after `.osc/plans/done/076-plan-wizard-package-release-sync.md` and PR #63.
- Plan: `.osc/plans/done/077-npm-trusted-publishing-workflow.md`.
- Branch / PR: `ci/npm-trusted-publishing`; PR #64 — https://github.com/graphanov/open-scaffold/pull/64.
- Workflow: `.github/workflows/publish-npm.yml`.
- Package target: `open-scaffold@0.4.4`.

## Trusted publisher setup fields

Configure this in npm after the workflow file is merged to the default branch:

- npm package: `open-scaffold`
- npm page: `https://www.npmjs.com/package/open-scaffold/access`
- Trusted Publisher provider: GitHub Actions
- Organization or user: `graphanov`
- Repository: `open-scaffold`
- Workflow filename: `publish-npm.yml`
- Environment name: leave blank for this workflow unless a protected GitHub environment is added in a later slice.

## Publish sequence after merge

1. Merge the trusted publishing workflow PR to `main`.
2. In npm package settings, add the trusted publisher using the fields above.
3. In GitHub Actions, open `Publish npm package`.
4. Run workflow on `main` with:
   - `expected-version`: `0.4.4`
   - `npm-tag`: `latest`
5. After the workflow succeeds, verify:
   - `npm view open-scaffold version dist-tags --json` shows `0.4.4` as `latest`.
   - `npx --yes open-scaffold@latest --help` includes `osc plan wizard`.
6. Then create/mark GitHub Release `v0.4.4` as Latest, targeting the merged `main` commit.

## Verification

- `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/publish-npm.yml"); puts "yaml ok"'` — pass.
- `grep -n "id-token: write\|npm publish --tag\|--provenance" .github/workflows/publish-npm.yml` — pass; OIDC permission and provenance publish command are present.
- `git grep -nE 'npm_[A-Za-z0-9]{20,}|https://www[.]npmjs[.]com/auth/cli/' -- . ':!package-lock.json'` — pass; no tracked npm token or browser-auth URL leakage found.
- `npm run build` — pass.
- `npm test -- --run` — pass; 23 test files / 204 tests.
- `./verify.sh --strict` — pass; 10 pass, 0 fail, 0 warn.
- `git diff --check` — pass.

## Outcome

Repo-side trusted publishing setup is locally verified and ready for PR review. No npm publish or GitHub Release creation is performed by this setup slice.

## Follow-up

- Owner gate: npm trusted publisher settings must be configured on npmjs.com after the workflow lands on `main`.
- Owner gate: the GitHub Actions publish run should be manually dispatched after npm trusted publisher setup.
- Owner gate: GitHub Release `v0.4.4` should be created or marked Latest only after npm confirms `open-scaffold@0.4.4` is published.
