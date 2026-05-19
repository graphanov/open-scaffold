# Release / Evidence Note: 078-github-actions-node24-runtime-refresh

## Summary

Refreshed first-party GitHub Actions pins in CI and trusted publishing workflows after the `open-scaffold@0.4.4` publish run surfaced a Node.js 20 actions deprecation annotation.

## Traceability

- Roadmap / issue / task: workflow maintenance follow-up after trusted publishing setup and `open-scaffold@0.4.4` publish.
- Plan: `.osc/plans/done/078-github-actions-node24-runtime-refresh.md`.
- Branch / PR: `ci/update-actions-node24`; PR #65 — https://github.com/graphanov/open-scaffold/pull/65.
- Package/release target: none; no npm publish or GitHub Release mutation in this slice.

## Verification

- `ruby -e 'require "yaml"; Dir[".github/workflows/*.yml"].each { |f| YAML.load_file(f); puts "yaml ok #{f}" }'` — pass.
- `grep -RInE 'uses: actions/(checkout|setup-node)@' .github/workflows` — pass; CI and publish workflows now use `actions/checkout@v6` and `actions/setup-node@v6`.
- GitHub tag checks for `actions/checkout@v6` and `actions/setup-node@v6` — pass.
- `npm run build` — pass.
- `npm test -- --run` — pass; 23 test files / 204 tests.
- `./verify.sh --strict` — pass; 10 pass, 0 fail, 0 warn.
- `git diff --check` — pass.
- PR CI — pending.

## Outcome

Pending PR creation and CI verification. This slice updates workflow action pins only; it does not publish npm, change package version, change CLI behavior, or create/update GitHub Releases.

## Follow-up

- After merge, inspect the next CI/publish run annotations. If GitHub still reports Node.js runtime deprecation, patch the specific remaining action in a new maintenance slice.
- Separately, GitHub Release `v0.4.4` still needs to be created/marked Latest after `open-scaffold@0.4.4` was published.
