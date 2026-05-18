# Plan: 053-plan-template-library

## Status

backlog — depends on 050 (npm publish) so that shipped templates are reachable. Complements 052 (interactive wizard) as an alternative plan-creation acceleration path: rather than answering questions, users copy a domain-specific template and fill in placeholders. Both wizard and templates ship together so users can choose their preferred workflow.

## Context

The generic handoff template in `.osc/plans/handoff-template.md` is flexible but blank — every section is a `TODO:` or empty prompt. Domain-specific plans have naturally different shapes: a bug fix plan emphasizes reproduction steps and verification commands, a new feature plan emphasizes design decisions and acceptance criteria, a refactor plan emphasizes before/after behavior and risk mitigation, and a dependency upgrade plan emphasizes compatibility checks and rollback procedures. Pre-filled templates with realistic example content and clearly labeled replaceable sections would accelerate plan creation by giving users a concrete starting point. This is the template equivalent of GitHub Issue templates or `dependabot` PR descriptions — structured starting points that encode domain knowledge.

## Goal

Ship 6 domain-specific plan templates under `.osc/plans/templates/` that users can copy manually or reference with `osc plan new <slug> --from-template <name>`, each with all 7 sections filled with realistic example content and clearly marked replaceable parts.

## Constraints / Out of scope

- Templates are starting points, not mandatory shapes. The generic handoff template remains the default — `osc plan new <slug>` without `--from-template` still produces the blank skeleton.
- Templates MUST NOT contain `TODO:` markers. Instead, they use `REPLACE_ME:` prefix or `<placeholder description>` angle-bracket markers that are clearly distinguishable from real content.
- The template library is extensible: users can add their own `.osc/plans/templates/custom-<name>.md` files, and `osc plan new --from-template custom-<name>` will find them.
- Does NOT include AI-generated template suggestions based on project context — that crosses into semantic analysis territory.
- Templates are shipped with the npm package; they are part of the scaffold, not generated at init time.

## Files to touch

- `.osc/plans/templates/` — new directory for template files.
- `.osc/plans/templates/bug-fix.md` — reproduction steps, expected vs actual behavior, affected versions, verification commands, regression test requirement.
- `.osc/plans/templates/new-feature.md` — feature description, user story, design decisions, API surface changes, acceptance criteria, rollout plan.
- `.osc/plans/templates/refactor.md` — motivation, before/after behavior, risk assessment, affected callers, performance impact, migration path.
- `.osc/plans/templates/docs-update.md` — which docs, what changed, review checklist, broken link check, translation impact.
- `.osc/plans/templates/dependency-upgrade.md` — package name, from/to version, changelog link, breaking changes, compatibility test plan, rollback procedure.
- `.osc/plans/templates/arch-decision.md` — decision title, context, alternatives considered, tradeoffs, consequences, validation criteria.
- `.osc/plans/templates/README.md` — explains how to use templates, how `--from-template` works, how to create custom templates, and naming conventions.
- `src/scaffold.ts` — modify `createPlanSkeleton()` to accept an optional template name; if provided, copy the template content and replace `REPLACE_ME:` markers with blank prompts.
- `src/cli.ts` — wire `--from-template <name>` flag on `osc plan new` subcommand. List available templates on `--from-template list`.
- `tests/plan.test.ts` — add test cases for template-based plan creation, missing template error, custom template discovery, and template content validation.
- `docs/WORKFLOW.md` — mention `--from-template` flag and template library.

## Acceptance criteria

- [ ] At least 6 templates exist under `.osc/plans/templates/` (bug-fix, new-feature, refactor, docs-update, dependency-upgrade, arch-decision).
- [ ] Each template has all 7 required sections (Status, Context, Goal, Constraints/Out of scope, Files to touch, Acceptance criteria, Verification steps) plus Open questions.
- [ ] Each template has realistic example content — a bug-fix template might mention "NullPointerException in UserService.createUser()" and " reproduce with empty email field" rather than generic placeholder text.
- [ ] `osc plan new my-bug --from-template bug-fix --stage backlog` copies the bug-fix template to `.osc/plans/backlog/my-bug.md`, replacing `REPLACE_ME:` markers with blank prompts.
- [ ] `osc plan new my-thing --from-template list` prints available template names.
- [ ] `.osc/plans/templates/README.md` explains usage, extension, and naming conventions.
- [ ] All templates pass `./verify.sh --strict` schema checks (headings match, sections present).
- [ ] No `TODO:` markers in any template; all placeholder content uses `REPLACE_ME:` prefix.

## Verification steps

1. Run `ls .osc/plans/templates/` and confirm at least 6 `.md` files plus `README.md`.
2. Run `grep -r "TODO:" .osc/plans/templates/` — expected: no matches.
3. Run `grep -r "REPLACE_ME:" .osc/plans/templates/` — expected: at least one per template in sections where user input is required.
4. Run `osc plan new test-bug --from-template bug-fix --stage backlog`. Verify output file at `.osc/plans/backlog/test-bug.md` has all sections with content, `REPLACE_ME:` markers replaced by blank prompts.
5. Run `./verify.sh --strict` — expected exit 0.
6. Run `osc plan new test-custom --from-template custom-acme --stage backlog`. Expected: error "template 'custom-acme' not found in .osc/plans/templates/".
7. Create `.osc/plans/templates/custom-acme.md` with valid plan content. Run `osc plan new test-custom --from-template custom-acme --stage backlog`. Expected: succeeds, uses custom template.
8. Run `osc plan new --from-template list` — expected: prints available template names.

## Open questions

- Should templates be versioned (e.g., `bug-fix-v1.md`) to allow template evolution without breaking existing plans that reference old template names? Simple approach: version the directory (`templates/v1/`) and symlink or alias the latest.
- Should the template system support includes or inheritance (e.g., a "performance" template that extends "refactor")? That adds complexity; flat templates with clear naming are sufficient for v1.
- Should the npm package ship only the 6 core templates, or also include the `custom-` namespace for user templates? Only core templates ship; user templates live in the scaffold directory and are gitignored from npm pack.
- Should `osc plan new --from-template` validate that the template is a valid plan before copying? Yes — validate template structure at copy time and reject malformed templates with a clear error.
