---
name: oscd
description: Keep a durable, checkable work record in your repo so AI-assisted work survives context loss, PR review, and handoff. Amend, don't edit. Verify before claiming done. One focus at a time. Any agent can follow this with plain markdown files; the open-scaffold CLI makes it mechanical and provable.
---

# Open Scaffold Discipline

A work-record discipline for AI-assisted work. Your agent's work belongs in your repo, not its chat history. When a session ends, the work's memory should not die with it.

This skill is the **methodology**. It works with plain files — no tool required. The [open-scaffold](https://github.com/graphanov/open-scaffold) CLI is the optional **proof engine** that makes the claims mechanical and reproducible (redaction, receipt aggregation, benchmark scoring). Use the discipline first; reach for the CLI when you need evidence, recovery, or cheap-model review.

## When to use

- Work outlives its first session.
- Multiple sessions, agents, PRs, or reviewers need to reconstruct what happened and why.
- You hand work to a fresh session, a smaller model, another vendor's agent, or a teammate.
- The work is audit-sensitive: someone may later ask "what was attempted, what passed, what was claimed versus verified."

Skip it when the work fits in one clean session and nobody else needs to reconstruct it: one-off scripts, disposable prototypes, an hour of automation you will never read again.

## The five non-negotiables

1. **Mission first.** Every repo has a `MISSION.md` — one paragraph on why this repo exists, plus a changelog of every scope pivot. If the mission is unset, stop and define it before any work. An agent without a mission optimizes the wrong thing.

2. **Plans are immutable; you amend, never edit.** A plan is a committed record of what you decided *at the time*. When the world changes, you write an amendment that says what changed and why — you do not rewrite history. The plan file records intent; the amendment records learning. This is the single most important rule. If you break it, the record lies about what was known when.

3. **Verify before claiming done.** A plan is not done because the agent says so. It is done when its acceptance criteria pass — mechanically, against real command output. "Complete" while the test suite fails is the most common AI-work lie. Run the verification. Read the output. The claim must match the evidence.

4. **One focus at a time.** Keep at most 2–3 plans active. Finish or park before pulling new work from the backlog. An agent with ten open plans produces ten half-finished threads and zero shipped slices.

5. **Chat is working context, not truth.** If a decision matters, it goes in a repo file — a plan, an amendment, an evidence note, a changelog entry. Chat scrolls away. Files survive. When in doubt, ask: "if this session ended right now, would the next reader know this?" If not, write it down.

## The record (what lives in the repo)

```
MISSION.md                     why this repo exists + scope-pivot changelog
.osc/plans/active/             work in flight (2–3 max)
.osc/plans/backlog/            identified, not yet started
.osc/plans/done/               completed and verified
.osc/plans/blocked/            parked, waiting on external input
.osc/plans/<slug>.md           one plan: context, goal, constraints, files, acceptance criteria, verification, open questions
.osc/plans/<slug>-amendment-N.md   what changed and why (stays with parent)
.osc/releases/<date>-<slug>.md     evidence note: what shipped, verification output, traceability
```

Folder IS the status. Move files between folders; never rename them. The plan number is a permanent ID.

## The loop

```
read MISSION.md
  → check active/ (continue in-flight work, do not start new)
  → write a plan with testable acceptance criteria
  → do the bounded work
  → run verification against acceptance criteria
  → if scope changed: amend (never edit the plan)
  → evidence note with real command output
  → close: move plan to done/ only after verify passes
  → lessons from this slice inherit into the next plan
```

## How to write a plan a stranger can act on

A plan has seven parts. If you cannot fill them, you are not ready to code.

- **Context** — 1–3 sentences: why this plan exists now. What happened that made us write it.
- **Goal** — one crisp sentence: the single observable change in the world when this is complete. Not a feature list.
- **Constraints / out of scope** — what this plan will NOT do. Boundaries on stack, time, surface.
- **Files to touch** — the paths and a one-line reason for each.
- **Acceptance criteria** — testable bullets. Something a verifier checks mechanically or with a clear yes/no.
- **Verification steps** — the exact commands and the pass criterion for each.
- **Open questions** — unresolved decisions and assumptions that need validation.

## With the CLI (the proof engine)

The discipline above works with any editor. The CLI makes it mechanical and adds three things plain files cannot do:

- **Ambient capture** — `osc capture --from claude-code|codex` reads a finished session transcript into a work record (turns, tokens, tool census) with no worker cooperation. The record is extracted from observed facts, not hand-written.
- **Handoff** — `osc handoff` compiles the record into a budgeted, secret-redacted packet so the next reader resumes from truth instead of re-deriving or inventing it. Works after total context loss.
- **Review and gate** — `osc review` reports plateaus, failing criteria, and requirements worth questioning; `osc gate` turns that into a retry authorization with stop authority that lives outside the worker. Any file-reading model can be the judge, including locally-hosted cheap models. Fails closed: no parseable verdict means no authorization.

```bash
npx open-scaffold@latest first-run          # guided: mission + first plan + evidence skeleton
osc handoff                                  # compile resume packet for next session/model
osc review <loop-dir>                        # cheap-model review of recorded attempts
osc gate <loop-dir>                          # authorize or block the next attempt
```

## The honest boundary

This discipline does not make your model smarter. It does not improve a strong model's in-session task output — that was measured and the naked model matched or beat every scaffolded arm. What it fixes is amnesia, confabulation, and unaccountability: the work has a durable, checkable memory, and a cheap model can audit it instead of you re-spending frontier tokens on review and re-derivation.

With near-zero recoverable state, the record is pure overhead. It pays for itself when an interruption leaves recoverable state behind — which is most real work, not all of it. The discipline is opt-in, and opt-in process discipline is the thing humans most reliably abandon. Treat verification as a habit, not a ceremony. If the check fails, fix it before moving on — do not accumulate stale plans.
