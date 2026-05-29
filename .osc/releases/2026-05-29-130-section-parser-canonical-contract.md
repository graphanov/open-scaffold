# Release / Evidence Note: 130-section-parser-canonical-contract

## Summary

Prepares `open-scaffold@0.20.3` as the package/public-surface sync for the canonical Markdown section-parser contract merged in PR #150.

This release publishes the parser and validation hardening now on `main`:

- canonical dependency-free H2 section parsing for plans and release/evidence notes;
- fenced-code-block safety so `## ...` lines inside column-0 backtick/tilde fences do not become section boundaries;
- optional trailing ATX closing hash normalization such as `## Status ##`;
- CRLF-tolerant section parsing;
- strict verifier parity for exact, fence-aware plan and release-note section checks;
- Python reference parser parity; and
- canonical status-update behavior for plan templates and plan movement.

It adds no runtime dependency, no agent spawning, no MCP surface expansion, and no new dynamic-runtime claim.

## Traceability

- Source plan: `.osc/plans/active/130-section-parser-canonical-contract.md`.
- Source Pull Request: https://github.com/graphanov/open-scaffold/pull/150.
- Source merge commit: `d4866bba7e83ae8e9f4d710f4696fdf759a7cc2c`.
- Package-sync branch: `release/section-parser-0203`.
- Package-sync Pull Request: https://github.com/graphanov/open-scaffold/pull/151.
- Trusted publishing workflow: pending after merge.
- npm package: pending `open-scaffold@0.20.3` with dist-tag `latest`.
- GitHub Release: pending `v0.20.3`.
- Run ID / run packet: N/A for release-sync.

## Verification

Candidate gates before PR-ready:

- [x] `node -p "require('./package.json').version + ' / ' + require('./package-lock.json').version + ' / ' + require('./package-lock.json').packages[''].version"` — PASS: `0.20.3 / 0.20.3 / 0.20.3`.
- [x] `npm view open-scaffold version dist-tags versions --json --prefer-online` — PASS: live npm remains `0.20.2`, `latest: 0.20.2`, and `0.20.3` is not yet published.
- [x] `npm run build` — PASS.
- [x] `node dist/cli.js --help` — PASS.
- [x] `node dist/cli.js plan validate .osc/plans/active/130-section-parser-canonical-contract.md` — PASS: source plan validates before final closeout.
- [x] `npm test -- --run` — PASS: 53 files / 530 tests.
- [x] `python3 -m unittest discover python/tests` — PASS.
- [x] `./verify.sh --strict` — PASS: 10 pass / 0 fail / 0 warn.
- [x] `npm pack --dry-run --json` — PASS for `open-scaffold@0.20.3` (203 files); includes the parser/verifier/Python parser/docs/release assets.
- [x] `npm publish --dry-run --tag latest` — PASS for `open-scaffold@0.20.3`.
- [x] `git diff --check` — PASS.
- [ ] PR CI and latest-head review are clean before merge.

Post-merge/publication gates after owner-preapproved follow-through:

- [ ] Sync clean `main` after merge.
- [ ] Trusted publishing workflow publishes `open-scaffold@0.20.3` with workflow input `npm-tag=latest`.
- [ ] `npm view open-scaffold version dist-tags --json --prefer-online` reports `0.20.3` and `latest: 0.20.3`.
- [ ] Fresh isolated-cache `npx --yes open-scaffold@latest --help` resolves to the published package.
- [ ] Fresh isolated-cache smoke proves package-visible parser behavior through CLI validation on a temporary scaffold fixture with `## Status ##` and fenced `## Example` text.
- [ ] GitHub Release `v0.20.3` exists and is marked Latest.
- [ ] Source plan 130 is closed to `done/` with final public proof.

## Outcome

Pending: candidate package sync prepared for PR review/merge before trusted publishing and GitHub Release follow-through.

## Follow-up

- Next slice after 130 closeout: `.osc/plans/backlog/131-mcp-integration-surface-readiness.md`.
