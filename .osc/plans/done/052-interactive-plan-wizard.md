# Plan: 052-interactive-plan-wizard

## Status

done


## Context

`osc plan new <slug>` creates a skeleton plan file with all seven sections labeled `TODO:`. This is correct from a protocol perspective — plans must be filled by humans — but new users face blank-page paralysis. They don't know what a good goal looks like, what constraints are reasonable, or how to write testable acceptance criteria. The handoff template comments provide guidance, but passive documentation is not the same as an active interview. An interactive wizard that asks structured questions in plain terminal and fills the plan template would dramatically lower the barrier to writing actionable plans. This is the plan-creation equivalent of `npm init` (which interviews for `package.json` fields) or `git commit` without `-m` (which opens an editor for the message).

## Goal

Add `osc plan wizard [slug]` that interactively interviews the user with 5–8 structured questions and produces a filled plan file in `.osc/plans/active/<slug>.md` with real content in every section — no `TODO:` markers remain.

## Constraints / Out of scope

- The wizard asks questions; it does NOT invent acceptance criteria, goals, or implementation details on behalf of the user. Every answer comes from the user.
- Must work in a plain terminal with readline-style input — no TUI framework dependency (no `inquirer`, `blessed`, or similar heavyweight libraries). Use Node.js built-in `readline` module.
- Must accept `--non-interactive` mode with `--answers answers.json` for agent-to-agent or script use, producing identical output from a JSON input.
- Output is a standard plan file in `.osc/plans/active/<slug>.md` following the 7-section handoff template — no special format, no metadata injection beyond what the template supports.
- Does NOT validate the semantic quality of answers (e.g., whether AC is actually testable) — that's the plan linter's job (plan 055).
- Refuses to proceed if `MISSION.md` contains `<!-- mission:unset -->` — redirect user to define their mission first.

## Files to touch

- `src/cli.ts` — add `wizard` subcommand under `osc plan` with `--non-interactive` and `--answers` flags; update help text.
- `src/wizard.ts` — new file: question bank, readline-based interview loop, answer-to-template mapping, file output. Question flow: (1) goal, (2) what triggered this work, (3) constraints / what NOT to do, (4) files likely to change, (5) acceptance criteria (prompt for multiple, accept blank line to finish), (6) verification commands, (7) open questions or dependencies.
- `tests/wizard.test.ts` — unit tests for `mapAnswersToTemplate()`, `validateAnswers()`, empty answer handling, special characters in answers, `--non-interactive` path.
- `tests/fixtures/wizard-answers.json` — sample answers file for non-interactive test.
- `docs/WORKFLOW.md` — mention `osc plan wizard` as the recommended first step for new plan creation; add quick example.

## Acceptance criteria

- [ ] `osc plan wizard my-feature` asks 5–8 questions interactively (goal description, context/trigger, constraints, files to touch, acceptance criteria with multi-line input, verification method, open questions/dependencies).
- [ ] Produces a plan file at `.osc/plans/active/my-feature.md` with all 7 sections filled with user-provided content.
- [ ] No `TODO:` markers remain in the generated plan.
- [ ] User can skip any question by entering an empty line (section is left blank or marked "not specified").
- [ ] `--non-interactive --answers answers.json` reads from file and produces identical output to what interactive input would generate for the same answers.
- [ ] Generated plan passes `./verify.sh --strict` schema checks (correct headings, required sections present).
- [ ] Wizard refuses to continue if `MISSION.md` is unset (contains `<!-- mission:unset -->`), printing a clear message.
- [ ] `--stage` flag allows targeting `backlog/`, `blocked/`, or `active/` (default `active/`).

## Verification steps

1. Run interactive test: `echo -e "Build a CLI cache\nCache misses were slow\nDo not change API\nsrc/cache.ts, tests/cache.test.ts\nCache hit rate above 90%\nResponse under 10ms\n\nRun npm test\ndepends on PR #42\n" | osc plan wizard test-wizard`. Verify output plan at `.osc/plans/active/test-wizard.md` has all sections with provided content.
2. Run `grep -c "TODO:" .osc/plans/active/test-wizard.md` — expected: 0.
3. Run `./verify.sh --strict` — expected exit 0.
4. Run `osc plan wizard --non-interactive --answers tests/fixtures/wizard-answers.json test-json`. Verify output matches interactive equivalent.
5. Run `osc plan wizard test-skip` and press Enter (empty) for every question. Verify all sections are present but contain only `_not specified_` or blank.
6. In a repo with `<!-- mission:unset -->` in `MISSION.md`, run `osc plan wizard test-blocked`. Expected: refusal with message about undefined mission.

## Open questions

- Should the wizard support an `--editor` mode that opens `$EDITOR` with the pre-filled template instead of inline Q&A? This could serve users who prefer writing in their editor but want the template pre-populated with prompts.
- Should answers be cached so the wizard can resume an interrupted session? The `readline` approach loses state on Ctrl+C — a `.osc/.wizard-cache.json` temp file could enable resume with `osc plan wizard --resume`.
- Should the wizard auto-detect the stage folder based on answers (e.g., if user mentions "blocked on X" in open questions, suggest `--stage blocked`)? That's heuristic and fragile; explicit `--stage` is clearer.
- How many AC prompts should the wizard offer before timing out? The current design loops until empty line; a max of 10 AC items with a "continue? (y/n)" prompt after 5 could prevent accidental infinite loops.
