# Release / Evidence Note: Plan authoring quality bundle

## Summary

Adds a bundled plan-authoring quality layer after the plan wizard: reusable plan templates for common work shapes and a local `osc plan validate` command for mechanical plan quality checks. The bundle prepares `open-scaffold@0.4.5` as the next package candidate because it changes the public CLI command surface; real npm publish and GitHub Release creation remain owner-gated.

## Traceability

- Roadmap / issue / task: Kanban `t_390e6428`.
- Plans: `.osc/plans/done/053-plan-template-library.md` and `.osc/plans/done/055-plan-linter.md`.
- Run ID / run packet: `N/A` — direct repo product slice; no runtime run packet needed.
- Branch: `cli/plan-authoring-quality-bundle`.
- PR: https://github.com/graphanov/open-scaffold/pull/66; final PR conversation is the latest-head review source of truth.
- Package candidate: `open-scaffold@0.4.5`.

## Verification

- RED test run: `npm test -- tests/plan-authoring-bundle.test.ts --run` initially failed because templates, `--from-template`, and `osc plan validate` were not implemented.
- Targeted GREEN run: `npm test -- tests/plan-authoring-bundle.test.ts --run` — pass; 1 file / 5 tests.
- Adjacent regression run: `npm test -- tests/cli-plan-evidence.test.ts tests/cli-plan-move.test.ts tests/init.test.ts tests/package-payload.test.ts --run` — pass; 4 files / 25 tests.
- Full build/test/strict gate: `npm run build && npm test -- --run && git diff --check && ./verify.sh --strict` — pass; build succeeded, 24 test files / 209 tests passed, diff whitespace clean, strict verifier 10 pass / 0 fail / 0 warn.
- Template payload scan: `find .osc/plans/templates -maxdepth 1 -type f -name '*.md' | sort` — pass; 6 core templates plus README.
- Template TODO scan: `grep -R "TODO:" .osc/plans/templates` — pass; no matches.
- Template placeholder scan: `grep -R "REPLACE_ME:" .osc/plans/templates | wc -l` — pass; 13 placeholder prompts.
- Built CLI help: `node dist/cli.js --help` — pass; exposes `osc plan new <slug> --stage <active|backlog|blocked> [--from-template <name>]`, `osc plan new --from-template list`, and `osc plan validate <slug-or-path> [--json] [--strict]`.
- Built CLI smoke: initialized a min-tier temp scaffold, ran `node dist/cli.js plan new demo-bug --stage backlog --from-template bug-fix`, `node dist/cli.js plan validate demo-bug --strict`, and `node dist/cli.js plan new --from-template list` — pass; created a bug-fix plan, validation returned `0 issues found`, and listed the six shipped templates.
- Package dry-run: `npm pack --dry-run --json` — pass; candidate `open-scaffold-0.4.5.tgz`, 95 files, unpacked size 594,150 bytes, includes `.osc/plans/templates/{README.md,arch-decision.md,bug-fix.md,dependency-upgrade.md,docs-update.md,new-feature.md,refactor.md}`.
- Publish dry-run: `npm publish --dry-run` — pass; dry-run reported `+ open-scaffold@0.4.5` and did not publish.

## Outcome

The repo now ships a template library under `.osc/plans/templates/` and initializes that library into new scaffolds. Users can create plans from core or project-local templates with `osc plan new <slug> --stage <stage> --from-template <name>`, list templates with `osc plan new --from-template list`, and validate plan files or slugs with `osc plan validate <slug-or-path>`. Validation is local and mechanical: it checks required sections, TODO markers, acceptance criteria presence, vague-goal heuristics, status/stage mismatch, heading order, and untagged blocking questions; it does not make semantic product judgments.

Out of scope: `056-run-dry-run-preview`, `057-automated-evidence-collection`, MCP server, dashboard, task database, runtime spawning, translations, semantic/AI plan scoring, automatic fixes, real npm publish, GitHub Release creation, and merge.

## Follow-up

- Owner gate: merge approval.
- Owner gate: after merge, publish `open-scaffold@0.4.5` only with explicit owner approval.
- Owner gate: create or mark GitHub Release `v0.4.5` as Latest only after registry verification.
- PR conversation after the last push is the source of truth for latest-head Codex readiness; do not treat this committed evidence note as a Codex-clean claim.
