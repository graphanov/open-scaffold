# Plan: 078-github-actions-node24-runtime-refresh

## Status

done

## Context

After `open-scaffold@0.4.4` was published through GitHub Actions trusted publishing, the workflow run showed a Node.js 20 deprecation annotation for GitHub Actions dependencies. The repo still pins `actions/checkout@v4` and `actions/setup-node@v4` in CI and publish workflows, which are the likely source of the annotation.

## Goal

Refresh the GitHub Actions workflow action pins so CI and trusted publishing use Node 24-compatible first-party actions without changing package behavior or release authority.

## Constraints / Out of scope

- Do not change the package version, package payload, CLI behavior, npm trusted publisher settings, or release contents.
- Do not run npm publish from this branch.
- Do not create or update GitHub Releases in this workflow-maintenance PR.
- Keep the change limited to first-party GitHub Actions version pins and evidence.

## Files to touch

- `.github/workflows/ci.yml` — bump first-party action pins used by CI.
- `.github/workflows/publish-npm.yml` — bump first-party action pins used by trusted publishing.
- `.osc/releases/2026-05-19-078-github-actions-node24-runtime-refresh.md` — record the annotation cause, fix, and verification.
- `MISSION.md` — close stamp for this workflow-maintenance slice.

## Implementation Architecture Coverage

- Strengthens: package release reliability and audit trails for trusted publishing.
- Audit envelope: workflow pins, PR, CI result, and release/evidence note reconstruct why the maintenance slice happened.
- Evaluation envelope: local YAML parsing, workflow grep, build/tests/strict verification, and PR CI confirm the maintenance change.
- Feedback routing: any remaining GitHub annotation after merge should become a follow-up CI maintenance slice, not runtime/product scope.
- Boundary: npm publish, GitHub Release creation, package behavior, and trusted publisher settings remain outside this slice.

## Acceptance criteria

- [ ] `.github/workflows/ci.yml` uses Node 24-compatible first-party GitHub Actions pins for checkout and setup-node.
- [ ] `.github/workflows/publish-npm.yml` uses Node 24-compatible first-party GitHub Actions pins for checkout and setup-node.
- [ ] Workflow YAML parses locally.
- [ ] Build, tests, strict scaffold verification, and whitespace checks pass.
- [ ] No package version, package payload, CLI behavior, npm trusted publisher field, or release state changes are included.

## Verification steps

1. `ruby -e 'require "yaml"; Dir[".github/workflows/*.yml"].each { |f| YAML.load_file(f); puts "yaml ok #{f}" }'` — workflow YAML parses.
2. `grep -RInE 'uses: actions/(checkout|setup-node)@' .github/workflows` — checkout/setup-node pins show the refreshed versions.
3. `npm run build`, `npm test -- --run`, `./verify.sh --strict`, and `git diff --check` — repo gates pass.
4. `gh pr checks` after opening the PR — GitHub CI passes.

## Open questions

- If GitHub still shows a deprecation annotation after this change, inspect the workflow run annotations and patch the specific remaining action in a follow-up slice.
