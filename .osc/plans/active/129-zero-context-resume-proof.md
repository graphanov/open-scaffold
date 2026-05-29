# Plan: 129-zero-context-resume-proof

## Status

active


**Approval state:** approved for execution by owner. AC-7 interpretation approved: feature the zero-context-resume narrative prominently in the README first screen, immediately after the locked work-record promise paragraph, without displacing existing positioning tokens. Consensus-approved by `/ralplan --consensus` (Planner → Architect → Critic, 2 iterations: Architect **SOUND**, Critic **APPROVE**). No commit, push, publish, release, merge, or PR without a separate owner gate.

## Context

The deep-interview spec `.omc/specs/deep-interview-improve-open-scaffold.md` (run `deep-interview-improve-open-scaffold-20260529-100813`, final ambiguity 16%) crystallized Open Scaffold's headline promise — *a fresh AI agent (or its solo-dev operator) can resume bounded work straight from the repo after total chat-context loss, with no re-explaining* — into one provable slice. Today that promise is asserted in prose but never demonstrated by a committed, deterministic artifact, and several first-contact frictions undercut trust: the `npx open-scaffold compare` "30-second" demo fails because `examples/` is not in `package.json` `files`; the version story is split (git tag `v1.0.5` vs `package.json` `0.20.2`); ~40 flat docs have no single front door; and `.osc`/`.omc`/`.omx`/`.osc-dev` + run packet / glass cockpit / OMC / OMX / Codex / operator surface are unexplained. This plan turns the promise into proof and removes the friction, without growing the CLI surface or the core protocol.

## Goal

Ship one slice that makes zero-context resume **provable and legible**: a committed sample repo-state fixture, a deterministic golden-snapshot resume test, a fixed `npx` compare demo, and four docs/positioning deliverables — without adding a new stable `osc` command, changing the core protocol, adding a runtime dependency, or overclaiming.

## Constraints / Out of scope

- **No new stable `osc` command** (`osc resume`/`osc next` are out). Reconstruction reuses existing library internals and/or a test-only helper; nothing is registered in `cli.ts` dispatch, `osc --help`, or the `docs/STABILITY.md` stable-command list. This is CI-enforced (see AC-10 / the CLI-absence guard), not left to intent — note `dist/resume.js` ships publicly via `files: ["dist"]`, so the guard is the test.
- **No core protocol-contract change; core stays non-spawning.**
- **Zero new runtime dependencies.** The resume test is deterministic with **no LLM/model call in default CI**.
- **Do not break existing `osc` commands;** `./verify.sh --strict`, `npm test`, `npm run build` must stay green; `tests/public-positioning.test.ts` and `tests/first-run-docs.test.ts` must stay green.
- **No enterprise/compliance/regulator-ready overclaim.**
- **Out of scope:** a real LLM-agent resume in default CI (documented walkthrough or optional manual/key-gated eval only); a user-facing `osc resume`/`osc next` command (backlog); telemetry/adoption analytics; any commit/push/publish/release (separate owner-gated step).

## Files to touch

- `examples/resume-demo/**` (new) — committed mid-flight `.osc`-shaped fixture: exactly **1** active plan (7-section handoff-schema-conformant, ≥1 unchecked acceptance criterion), exactly **1** amendment to that plan (must **not** re-scope acceptance criteria), ≥1 done/closed slice, ≥1 evidence/release note, and a mini `MISSION.md` so mission reads as defined. (AC-1)
- `examples/resume-demo/expected-resume-summary.json` (new) — the committed **golden file**: the normalized expected `ResumeSummary` (relative-to-fixture paths, stable key order, no timestamps, `root` stripped). (AC-3)
- `src/resume.ts` (new) — **test-only** library composer. Exported for vitest, **NOT** wired to `cli.ts` dispatch/help/STABILITY. Builds the `ResumeSummary` (schema below) by reusing `inspectScaffold`, `parsePlanFile`/`splitSections`, the `buildTrace` report builder, `parseChecklist`, and amendment-sibling enumeration. (AC-2, AC-4)
- `tests/resume-snapshot.test.ts` (new) — golden-diff test (reconstructed summary vs golden file; fails on drift), determinism check, next-bounded-action check, single-active assertion, and the amendment-present assertion. Deterministic; no LLM; no new dep. (AC-3, AC-4)
- `package.json` (`files` field **only**) — ship the compare-demo payload and the resume-demo fixture: add `examples/attempt-compare` and `examples/resume-demo` explicitly (not the whole `examples/`, to avoid shipping unrelated heavy fixtures). **`dependencies` unchanged.** (AC-5; AC-10)
- `tests/package-payload.test.ts` — extend: assert the compare-demo inputs (`examples/attempt-compare/attempt-a`, `attempt-b` and their files) appear in `npm pack --dry-run --json` output. (AC-5)
- `docs/START_HERE.md` (new) — single authoritative front door routing a solo-dev + their agent to the one first action; contains the literal adopter first command and links the resume demo + walkthrough. (AC-6)
- `README.md` + `docs/index.html` — add the zero-context-resume narrative **immediately after** the locked work-record promise paragraph (no positioning-token displacement, forbidden vocabulary avoided); link the resume demo + golden-snapshot walkthrough. (AC-7)
- `docs/VERSION_TRUTH.md` (new) — canonical reconciliation page: git tag `v1.0.5` (historical) vs `package.json` `0.20.2` (current/pre-1.0), stable vs experimental. (AC-8)
- `docs/GLOSSARY.md` (new) — jargon + boundary glossary: run packet, glass cockpit, OMC / OMX / Codex, operator surface, `.osc` / `.omc` / `.omx` / `.osc-dev`, plus a one-line core-vs-adapter boundary statement. (AC-9)
- `docs/RESUME_WALKTHROUGH.md` (new) — narrated real-agent resume showing the **actual** `osc status` / `osc trace` output and stating the consolidated summary is reconstructed by the project's tooling/test, not emitted by one shipped command today (future `osc resume` noted as backlog). Documented, **not** run in CI. Its displayed next-action must equal the golden file's `next_bounded_action`. (AC-7)
- `tests/resume-docs.test.ts` (new) — self-checks (AC-6–AC-9, AC-10): START_HERE exists + linked from README first 80 lines + contains the literal first command; resume-hook placement (after the promise paragraph, within the first screen, no token displacement); VERSION_TRUTH positive-token reconciliation across README/STABILITY/CHANGELOG; GLOSSARY defines all 6 term groups; the no-overclaim **disclaimer sentence is present**; and the **CLI-absence guard** (`resume`/`next` absent from `osc --help`, the dispatch switch, and the STABILITY stable-command-list block).

### `ResumeSummary` schema (`open-scaffold.resume.v1`)

```jsonc
{
  "schema": "open-scaffold.resume.v1",
  "mission": { "defined": true },
  "active_plan": {
    "slug": "...", "stage": "active", "status": "...", "goal": "...",
    "acceptance_criteria": [ { "text": "...", "checked": false } ]   // from parseChecklist on the raw "Acceptance criteria" section
  },
  "amendments": { "count": 1, "ids": ["<slug>-amendment-1"] },        // enumerated from <slug>-amendment-<n>.md siblings; REPORTED, not used in derivation
  "work_done": {
    "done_slices": ["..."],                                          // inspectScaffold plans.done
    "evidence": ["..."]                                              // buildTrace links: release_note / evidence_reference (fixture-relative)
  },
  "status": "active plan <slug>; N/M acceptance criteria complete",
  "next_bounded_action": "<text of first unchecked AC>"               // first unchecked from the SAME parseChecklist list; ∈ acceptance_criteria by construction
}
```

Determinism rules: one shared normalization helper strips `TraceReport.root` and rebases `path`/`target_path`/`source_path` to the **fixture** root; arrays sorted deterministically (by slug/filename); no `Date`/env-derived fields. The same helper is used by both the golden test and the walkthrough↔golden comparison so path-shapes cannot mismatch. Derivation pins **`scaffold.ts:parseChecklist`** as the single AC parser for both `acceptance_criteria` and `next_bounded_action`. The composer **asserts exactly one active plan** (throws if `active.length !== 1`). Amendments are **reported** in the payload but **excluded** from next-action derivation (acknowledged v1 limitation; fixture amendment must not re-scope ACs).

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|-------------|----------------|
| T1 | Build `examples/resume-demo/` fixture (1 active plan w/ ≥1 unchecked AC, 1 amendment, ≥1 done slice, evidence note, mini MISSION.md) — AC-1 | None | A |
| T2 | `docs/GLOSSARY.md` (6 term groups + core-vs-adapter line) — AC-9 | None | A |
| T3 | `docs/VERSION_TRUTH.md` + reconcile version tokens — AC-8 | None | A |
| T4 | `package.json` `files` add + extend `tests/package-payload.test.ts` — AC-5 | None | A |
| T7 | `docs/START_HERE.md` front door — AC-6 | None | A |
| T5 | `src/resume.ts` test-only composer (schema above) — AC-2, AC-4 | T1 | B |
| T6 | `tests/resume-snapshot.test.ts` + `examples/resume-demo/expected-resume-summary.json` golden — AC-3, AC-4 | T5 | B |
| T8 | README + `docs/index.html` resume narrative + `docs/RESUME_WALKTHROUGH.md` (real output; walkthrough↔golden) — AC-7 | T1, T6 | C |
| T9 | `tests/resume-docs.test.ts` self-checks + CLI-absence guard — AC-6–AC-9, AC-10 | T2, T3, T7, T8 | D |
| T10 | Full gate: `npm run build`, `npm test`, `./verify.sh --strict` — AC-10 | all | D |

### Parallel groups

- **Group A** (independent authoring; distinct files, no shared edits): T1, T2, T3, T4, T7.
- **Group B** (resume engine; depends on the fixture): T5 → T6.
- **Group C** (positioning; depends on fixture + golden so the walkthrough shows real, golden-consistent output): T8.
- **Group D** (verification): T9 → T10.

### Dependencies

- T5/T6 depend on T1 (composer + golden need the fixture).
- T8 depends on T1 (links the demo path) and T6 (walkthrough's displayed next-action must equal the golden `next_bounded_action`).
- T9 depends on the docs it checks (T2, T3, T7, T8); T10 depends on everything.

### Delegation notes / conflict flags

- **Single-owner files** (no two parallel tasks edit the same file): `README.md` (T8), `package.json` (T4), `docs/index.html` (T8).
- **AC-7 inner gate:** T8 must run `npm test -- public-positioning` before finishing — the README's first 80 lines are contract-locked (exact promise string + tokens `goal`/`plan`/`handoff`/`evidence`/`approval`/`lessons`; forbidden vocabulary `agent OS`/`control plane`/`compliance-grade`/`operating system`/`tamper-proof`). The resume narrative lands after the promise paragraph and must not displace those tokens.
- **Fixture/scanner interaction (verified safe):** `./verify.sh` is strictly root-anchored (literal `"$ROOT/.osc/..."` paths, no recursive descent), and `tests/package-payload.test.ts`'s forbidden-path regex is anchored at the package root (`startsWith('.osc/plans/active/')`), so the fixture's `examples/resume-demo/.osc/plans/active/*.md` is invisible to both. Documented exemption: the fixture's active-plan files **ship to npm** via `examples/resume-demo` in `files` (harmless; do **not** later tighten the payload regex to scan all `.osc/` subtrees without re-checking this).

## Implementation Architecture Coverage

- **Strengthens:** evaluation (acceptance criteria become a deterministic, committed proof) and recovery/ownership (resume-from-repo demonstrated end-to-end).
- **Audit envelope:** spec run `deep-interview-improve-open-scaffold-20260529-100813`; plan `129-zero-context-resume-proof`; the fixture + golden file + vitest tests are the durable evidence; an `.osc/releases/` note at close.
- **Evaluation envelope:** AC-1…AC-10 are checked by `npm test` (`resume-snapshot`, extended `package-payload`, `resume-docs`) + `./verify.sh --strict`; every AC maps to a named verification step below.
- **Feedback routing:** drift in the resume summary fails CI; doc/version drift fails the self-check tests; new learnings become an amendment to this plan.
- **Boundary (out of this slice):** no runtime execution, no credentials, no new command surface, no compliance certification; real-LLM resume stays a walkthrough/optional eval; a user-facing `osc resume` is a separate, explicitly-approved future plan.

## Acceptance criteria

- [ ] **AC-1** A committed `examples/resume-demo/` fixture exists representing a mid-flight project: exactly 1 active plan (≥1 unchecked AC), exactly 1 amendment, ≥1 done/closed slice, and evidence signals.
- [ ] **AC-2** A deterministic reconstruction (test-only helper reusing existing library internals — **no new stable command**) builds a `ResumeSummary` containing at minimum: active plan, work-done/evidence signals, **amendments applied/acknowledged** (explicit `amendments` field), current status, and next bounded action.
- [ ] **AC-3** A vitest test compares the reconstructed summary against the committed golden file and fails on drift. No LLM/model call in default CI; no new runtime dependency.
- [ ] **AC-4** The summary's `next_bounded_action` deterministically matches the fixture's single unambiguous next slice (first unchecked AC of the single active plan via `parseChecklist`; `next_bounded_action ∈ acceptance_criteria`; composer throws if `active.length !== 1`).
- [ ] **AC-5** `npx open-scaffold compare …` works from a fresh install (its payload ships); a payload test asserts the demo inputs are present in the published package.
- [ ] **AC-6** A single authoritative `docs/START_HERE.md` routes a solo-dev + agent to the first action in one hop (exists + linked from README's first 80 lines + contains the literal first command).
- [ ] **AC-7** README + `docs/index.html` feature the zero-context-resume narrative in the first screen (immediately after the locked promise paragraph) and link the resume demo + golden-snapshot walkthrough; the walkthrough shows real `osc status`/`osc trace` output with the no-overclaim disclaimer.
- [ ] **AC-8** One version/release-truth page reconciles git tag `v1.0.5` (historical) vs `package.json` `0.20.2` (current) and states stable vs experimental, with no contradictions across README / `docs/STABILITY.md` / `docs/CHANGELOG.md` (positive-token assertions).
- [ ] **AC-9** A jargon + boundary glossary defines run packet, glass cockpit, OMC / OMX / Codex, operator surface, `.osc` / `.omc` / `.omx` / `.osc-dev`, plus a one-line core-vs-adapter boundary statement.
- [ ] **AC-10** No new stable `osc` command (CLI-absence guard green), no core protocol change, no new runtime dependency, no overclaim; existing `osc` commands unchanged; `./verify.sh --strict`, `npm test`, `npm run build` pass.

## Verification steps

1. `npm run build` → exits 0.
2. `npm test` → all vitest pass, including new `tests/resume-snapshot.test.ts`, extended `tests/package-payload.test.ts`, and new `tests/resume-docs.test.ts`. (AC-3, AC-5, AC-6–AC-9)
3. **Determinism (AC-3):** run `resume-snapshot.test.ts` twice and on a clean checkout → identical; intentionally mutate the fixture → the test fails (drift caught).
4. **Next-action (AC-4):** in a scratch copy, flip the active plan's first unchecked AC → `next_bounded_action` changes accordingly; assert the composer throws when `active.length !== 1`; assert `next_bounded_action ∈ acceptance_criteria`.
5. **Amendments (AC-2):** assert the golden summary has `amendments.count === 1` and contains the fixture's amendment id.
6. **Demo (AC-5):** `npm pack --dry-run --json` lists `examples/attempt-compare/**`; extract the tarball and run `node dist/cli.js compare examples/attempt-compare/attempt-a examples/attempt-compare/attempt-b` → exits 0.
7. **No new command (AC-10):** `osc --help` and the `cli.ts` dispatch contain no `resume`/`next` subcommand; the `docs/STABILITY.md` stable-command-list block contains no `resume`; `git diff package.json` shows no change under `dependencies`.
8. **Glossary (AC-9):** `resume-docs.test.ts` asserts all 6 term groups (run packet; glass cockpit; OMC/OMX/Codex; operator surface; `.osc`/`.omc`/`.omx`/`.osc-dev`; core-vs-adapter boundary line) are present.
9. **Version truth (AC-8):** `resume-docs.test.ts` asserts positive reconciliation tokens (`v0.20.x` current/pre-1.0, `v1.0.5` historical) in README + STABILITY + CHANGELOG.
10. **Walkthrough consistency (AC-7):** the displayed next-action in `docs/RESUME_WALKTHROUGH.md` equals the golden file's `next_bounded_action`; the disclaimer sentence is present.
11. **No regression:** `tests/public-positioning.test.ts` and `tests/first-run-docs.test.ts` still pass.
12. `./verify.sh --strict` → exits 0 (the nested fixture `.osc/` does not trip amendment/changelog checks).

## Open questions

- **AC-7 "lead with" interpretation (decision needed at approval):** the README's first 80 lines are contract-locked by `tests/public-positioning.test.ts` (exact promise string at the top), so literal "resume narrative as the first content" is **impossible** without breaking that test. This plan commits to *"prominently featured in the first screen, immediately after the locked promise paragraph, no positioning-token displacement."* **Confirm this interpretation is acceptable, or relax the public-positioning lock.** (Surfaced by the Critic; both reviewers agree this is a human decision.)
- **`next_bounded_action` null-handling (backlog):** if a future fixture leaves all ACs checked, the derivation yields no next action. The committed fixture is mid-flight (≥1 unchecked) so the golden snapshot is unaffected; the schema should later state whether `next_bounded_action` is nullable and what the summary says when work is complete.
- **`dist/resume.js` public-import surface (backlog):** the test-only composer ships in `dist` (via `files: ["dist"]`) and is guarded only by the CLI-absence test. A follow-up may exclude it from `dist` via tsconfig so an external importer of `open-scaffold/dist/resume.js` does not silently depend on a test-only internal.

## ADR

- **Decision:** Implement the AC-2 reconstruction as a **test-only library composer** (`src/resume.ts`) that reuses existing library internals (`inspectScaffold`, `parsePlanFile`/`splitSections`, `buildTrace`, `parseChecklist`, amendment-sibling enumeration), exported for the vitest golden test and **not** registered as an `osc` subcommand.
- **Drivers:** determinism + zero-dep; reuse existing surfaces; honor "no new stable command"; avoid acceptance-criteria parser drift (the codebase already has three divergent AC extractors — `parseChecklist`, `parseAcceptanceCriteria`, `parsePlanFile`→`bulletItems`).
- **Alternatives considered:** **(B)** a pure `tests/` helper reading fixture files directly — strongest no-core-change guarantee, but would re-implement parsing and **institutionalize the existing parser drift into a fourth path**. **(C)** compose `osc status --json` + `osc trace --json` stdout in the test — most literal "reuse existing surfaces," but neither command emits a consolidated `next_bounded_action`, and merging two CLI outputs is brittle.
- **Why chosen:** Option A is deterministic, reuses the canonical parsers (no new drift), pins a single AC parser so the summary's AC list and next-action cannot diverge, and adds **zero new stable-command surface** — satisfying the moat constraint while still producing the full structured summary (including amendments and next-action). The "test-only" boundary is converted from intent into a CI-guarded invariant (CLI-absence guard).
- **Consequences:** `src/resume.ts` exists as library code reachable only from tests; `dist/resume.js` is published but undocumented/unwired and guarded by the absence test. A real user-facing `osc resume`/`osc next` would be a separate, explicitly-approved command plan.
- **Follow-ups:** optional `osc resume`/`osc next` stable command (backlog); optional key-gated real-LLM resume eval (backlog); `dist` exclusion for `resume.ts` (backlog); `next_bounded_action` null-handling schema (backlog).

<!--
Consensus provenance (ralplan --consensus --direct):
- Planner: drafted plan + RALPLAN-DR (principles/drivers/options) + ADR.
- Architect iter 1: SOUND-WITH-CHANGES (5 changes) — disproved the nested-.osc top risk (verify.sh root-anchored), confirmed AC-5 root cause empirically.
- Critic iter 1: ITERATE (6 bounded spec-precision items, no CRITICAL).
- Architect iter 2: SOUND ("ship to executor"); endorsed the C4 cross-check deviation.
- Critic iter 2: APPROVE — all 6 items resolved; C4 deviation accepted on merits.
RALPLAN-DR principles: (1) prove-don't-claim, (2) reuse surfaces / no new stable command, (3) determinism over fidelity in CI, (4) single front door, (5) truth without overclaim.
-->
