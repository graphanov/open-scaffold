# Plan: v1-public-positioning-polish

## Status

done

## Context

A public-release reader must be able to answer three questions in the first minute: what Open Scaffold is, who it is for, and what it offers now. The current repo mostly has the right story, but first-touch docs still mix older identities: harness/product language, agent-orchestrated development, control-room examples, pre-1.0/v1 history, and handoff/resume command drift. This slice makes the public product contract unambiguous without publishing npm, moving GitHub Releases, or claiming mature production/compliance readiness.

## Goal

Make Open Scaffold read as one product everywhere a public v1 candidate reader is likely to enter: a repo-native work record for AI-assisted work, offering ambient capture, handoff/resume, review/gate, and evidence boundaries for developers and teams whose AI work must survive sessions, PRs, and audits.

## Constraints / Out of scope

- No npm publish, GitHub Release create/update, website deployment, merge, force-push, or launch announcement.
- No new runtime/spawning/controller promise; runtime execution remains outside core.
- No broad benchmark, production-readiness, compliance, or cheap-model dominance claim.
- No rewrite of append-only historical changelog entries except adding clarifying current-context notes where needed.

## Files to touch

- `README.md` — sharpen the first-screen offering, deduplicate key docs, fix anchors, soften overclaims.
- `MISSION.md`, `ROADMAP.md` — align canonical identity and v1/history wording with the current work-record product.
- `AGENTS.md`, `CLAUDE.md` — keep paired agent entrypoints aligned with product identity and command aliases.
- `docs/START_HERE.md`, `docs/STABILITY.md`, `docs/FAQ.md`, `docs/index.html`, `LLM_QUICKSTART.md`, `docs/examples/README.md`, `docs/EXAMPLES.md` — remove first-touch ambiguity about audience, commands, and runtime boundaries.
- `docs/TRUST_BOUNDARIES.md`, `docs/OPEN_SCAFFOLD_SYSTEM.md`, `docs/WORKFLOW.md` — clarify system boundary without old agent-OS/control-plane framing.
- `tests/public-positioning.test.ts`, `tests/reduced-cli-docs.test.ts`, `tests/cli-lifecycle-help.test.ts` — add guards so the public identity and retired-command boundaries stay fixed.

## Acceptance criteria

- [x] First-touch docs consistently define Open Scaffold as a repo-native work record / record-handoff-review layer for AI-assisted work.
- [x] Target audience is explicit: developers and teams using AI agents on work that needs context recovery, review, evidence, PR/client/audit traceability, or multi-session handoff.
- [x] Runtime/harness/control-room material is labeled as external, historical, or advanced; it is not the public product offering.
- [x] `osc handoff`, `osc review`, and `osc gate` are the public front door; `osc resume` is consistently described as the read-only alias/back-compat entry used by agent bootstraps.
- [x] v1/readiness wording separates the current package truth (`v0.32.x` pre-1.0 line and historical `v1.0.x` artifacts) from the product contract being prepared.
- [x] Tests fail if duplicate README key-doc links, stale first-touch command docs, or incomplete retired-command shims return.

## Verification steps

1. `npm test -- tests/public-positioning.test.ts tests/reduced-cli-docs.test.ts tests/cli-lifecycle-help.test.ts tests/first-run-docs.test.ts tests/package-payload.test.ts` — targeted public-surface guards pass.
2. `npm test -- --run` — full suite passes.
3. `npm run build` — package build passes.
4. `./verify.sh --strict` — repository protocol verification passes.
5. `git diff --check` — no whitespace errors.
6. `npm run -s osc -- --help`, `npm run -s osc -- help --all`, and retired-command smoke checks — help and migration boundaries match the docs.
7. `npm pack --dry-run --json` — package payload still builds without dogfood residue.

## Open questions

- Whether the eventual public v1 release should be a package version change is an owner/publish gate. This slice prepares the product identity and release-readiness wording but does not publish or move release surfaces.
