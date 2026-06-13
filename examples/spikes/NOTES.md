# Plan 167 spikes — what was demonstrated, and the boundaries

AC7's end-to-end judge-feeds-worker run lives in
[`ac7-judge-feeds-worker/`](ac7-judge-feeds-worker/NOTES.md) with full receipts.

## Spike B: claims-vs-actual from a plain test runner (claims-from-tests.mjs)

Demonstrated 2026-06-12 on this repo's real suite: 55 test files mapped to an
open-scaffold.evaluation.v1 envelope (one criterion per file); a worker-style
"complete" claim checked against observed results. Green suite -> consistent
(exit 0). Failing path -> mismatch named per file, exit 1 ("do not accept;
route to review"). Boundary: the failing path used a synthetically flipped copy
of the real results JSON (labeled as such); mechanism identical either way. No
benchmark scorer involved anywhere.

## Spike A core: ambient record from a real session transcript (ambient-from-transcript.mjs)

> Promoted to product (plan 170): this transcript extractor became `osc capture`
> with pluggable parsers (claude-code, codex, jsonl-generic). See
> [`docs/CAPTURE.md`](../../docs/CAPTURE.md); the SessionEnd hook lives at
> `examples/hooks/ambient-hook.mjs`. The spike stays here as the original reference.

Demonstrated 2026-06-12 on a real Claude Code session transcript (a review-bench
judge session): produced an osc.ambient-work-record.v1-aligned record with
source "transcript-extraction" — 35 assistant turns, full usage breakdown
(1.13M total tokens), tool-call census, files touched, session span,
final-message digest and claim-word sniff. Zero worker cooperation; facts, not
claims; boundary block states it is not approval. Remaining for the full spike:
live hook wiring on the owner-chosen repo (interview question F1).

## Spike A live: SessionEnd hook wiring on open-scaffold itself (ambient-hook.mjs)

Demonstrated 2026-06-12 on this repo (owner answer F1). `ambient-hook.mjs` is a
Claude Code SessionEnd hook adapter: it reads the hook JSON from stdin
(`transcript_path`, `session_id`, `cwd`), runs the transcript extractor, and
writes one record per session to `.osc-dev/ambient/<session-id>.json`
(gitignored owner notes). Registered owner-locally in
`.claude/settings.local.json` (gitignored), so contributors inherit nothing.
Exercised with the exact stdin contract against the live pivot session's real
transcript: produced a valid osc.ambient-work-record.v1 record
(source "transcript-extraction", adapter "claude-code-transcript",
~600M cumulative tokens observed including cache reads). Boundaries: the hook
always exits 0 and can never block or fail a session; a session cannot observe
its own end, so the in-flight validation invoked the adapter manually with the
same payload shape Claude Code sends — every future session is captured by the
registered hook automatically.
