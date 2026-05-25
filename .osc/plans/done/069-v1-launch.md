# Plan: 069-v1-launch

## Status

done

## Context

Open Scaffold has been under active self-dogfood development since May 2026. The repo has 50+ closed plans, a stable CLI at v0.4.1, comprehensive protocol documentation, self-dogfood proof through PRs and Codex reviews, a project wiki, and now a v2 backlog of 20+ detailed plans. But the project has no public release on npm, no launch announcement, no "why now" story, and no clear signal of what's stable vs experimental. A v1.0.0 launch turns the project from "promising protocol in development" to "stable product you can adopt." It is a marketing and trust milestone, not a feature milestone.

## Goal

Ship Open Scaffold v1.0.0: npm published, README crisp, documentation compressed, at least 3 downstream use cases cited, website or landing page live, and a clear public statement of what is stable (the protocol and CLI) versus what is experimental (runtime adapters, MCP, glass cockpit).

## Constraints / Out of scope

- v1.0.0 is a trust and adoption milestone, not a feature completion milestone. The backlog contains 20+ v2 plans; v1.0.0 does NOT mean all those are done.
- npm publish is mandatory for v1.0.0. The `npx open-scaffold init` path must work.
- Downstream use cases may be anonymized or described in general terms if users haven't given explicit permission to be named.
- The launch does NOT include a marketing site with a custom domain unless the owner explicitly commissions it. A `docs/` page or GitHub Pages site is sufficient.
- v1.0.0 does NOT mean the protocol is frozen — the amendment protocol means scope can always evolve cleanly.
- Semantic versioning: v1.0.0 signals that the public API (CLI commands, plan schema, verify.sh checks) is stable and will not break without a major version bump.

## Files to touch

- `package.json` — bump version to `1.0.0`
- `README.md` — add "v1.0.0 Stable" section, clarify what's stable vs experimental, add adoption examples
- `MISSION.md` — add v1.0.0 changelog entry, review goals/non-goals for accuracy
- `ROADMAP.md` — add v1.0.0 milestone entry summarizing what shipped, mark v0.x milestones as completed
- `docs/STABILITY.md` — new file: stability guarantees, what's covered by semver, what's experimental
- `docs/CHANGELOG.md` — new file: curated changelog from MISSION.md changelog entries, organized by version
- `docs/` or GitHub Pages — landing page content or a `docs/index.html` for presentation
- `.osc/releases/2026-05-XX-v1.0.0.md` — v1.0.0 release evidence note
- `AGENTS.md` and `CLAUDE.md` — ensure both reflect v1.0.0 state

## Acceptance criteria

- [ ] `npm view open-scaffold version` returns `1.0.0`
- [ ] `npx open-scaffold@1.0.0 init --tier min --target /tmp/test-v1` succeeds and creates a valid scaffold
- [ ] `npx open-scaffold@1.0.0 init --tier standard --target /tmp/test-v1-std` succeeds with all standard files
- [ ] `README.md` contains a "Stability" section that lists: stable (CLI commands plan/new/amend/close/evidence/verify/status, plan schema, folder state machine, verify.sh), experimental (runtime profiles, MCP, glass cockpit webhooks, task database, TUI dashboard), and future (native spawning, compliance certification, model benchmarking)
- [ ] `docs/STABILITY.md` exists with detailed semver guarantees and migration guidance for future breaking changes
- [ ] `docs/CHANGELOG.md` exists with curated, human-readable changelog grouped by version (v0.1 through v1.0.0)
- [ ] At least one public landing page or presentation exists: either `docs/index.html`, a GitHub Pages site, or a dedicated website page explaining what Open Scaffold is, who it's for, and how to start
- [ ] The landing page answers in 30 seconds: what problem does this solve, who is it for, what's the first command to run
- [ ] `ROADMAP.md` shows v1.0.0 as a completed milestone with links to release evidence and key PRs
- [ ] `MISSION.md` changelog has a v1.0.0 entry summarizing the launch
- [ ] `AGENTS.md` and `CLAUDE.md` paired views are in sync for v1.0.0
- [ ] `./verify.sh --strict` passes
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] GitHub Release exists at https://github.com/graphanov/open-scaffold/releases/tag/v1.0.0 with release notes citing key milestones and the identity chain

## Verification steps

1. **npm publish test:** Run `npm publish --dry-run`. Verify package contents, version 1.0.0, no private files.
2. **Fresh install test:** In a clean directory: `npx open-scaffold@1.0.0 init --tier standard --target /tmp/v1-smoke && cd /tmp/v1-smoke && ./verify.sh --standard`. Verify all checks pass.
3. **Stability doc:** Read `docs/STABILITY.md`. Verify it clearly separates stable from experimental.
4. **Landing page:** Open the landing page or `docs/index.html` in a browser. Verify it answers the three questions in under 30 seconds of reading.
5. **GitHub Release:** Visit the release URL. Verify release notes are comprehensive, link to key PRs and evidence.
6. **Verify:** Run `./verify.sh --strict` and `npm test` in the repo. Both must pass.

## Open questions

- Should v1.0.0 coincide with a formal launch post (blog, social media, Hacker News, Reddit)? This is a marketing decision for the owner. The plan should prepare the technical artifacts; the owner decides when and where to announce.
- Should there be a v1.0.0 video demo or only text/image? A video demo would dramatically improve first-impression conversion. If the owner is willing, a 2-minute screen recording of `npx open-scaffold init` → create plan → verify → evidence → close would be the single most effective adoption artifact.
- Should the landing page use `graphanov.com/open-scaffold` or a separate domain? The owner's current strategy routes Open Scaffold as proof through graphanov.com. Use `graphanov.com/open-scaffold` as the canonical URL, with a GitHub Pages fallback at `graphanov.github.io/open-scaffold`.
- What v0.x features should be declared experimental vs stable for v1.0.0? The guiding principle: if it has automated tests and has been used in the self-dogfood loop, it's stable. CLI commands with test coverage (plan, amend, close, evidence, verify, status, init) = stable. CLI commands without full E2E test coverage (run, review, ultrareview, eval, audit, runtimes, doctor, delegate) = experimental. Shell scripts = stable (they're the zero-dep floor).
