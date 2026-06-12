# Plan: 170-ambient-capture

## Status

active

## Context

The ambient work record (`osc.ambient-work-record.v1`, `src/ambient.ts`) is already
extracted from observed facts, but the only transcript path that exists today is a
Claude Code spike (`examples/spikes/ambient-from-transcript.mjs`). The obvious next
question — "won't we need this for every CLI?" — is answered by where universality
lives: in the OUTPUT schema, not the parser. Every runtime logs differently, so each
gets a thin normalizer into the one record shape. This plan promotes the spike into a
product command and ships TWO reference parsers (claude-code, codex) plus a generic
fallback, so a third parser (Aider, OpenHands, shell) becomes a small follow-up rather
than new architecture. Capture runs after a session ends and must be hook-safe: a
malformed or missing transcript can never break the session that triggered it.

## Goal

`osc capture --from claude-code|codex|jsonl-generic --transcript <path> [--out <path>] [--detect]`
reads a finished agent-session transcript and writes a valid `osc.ambient-work-record.v1`
record (source `transcript-extraction`) with non-null assistant turns, a tool-call
census, and token totals — proven against the real Claude Code and Codex transcripts on
this machine — without the worker's cooperation and without ever modifying the transcript.

## Constraints / Out of scope

- No daemons, watchers, or network calls. Capture is a one-shot read of one file.
- Capture never writes anything except the single output record; the transcript is read-only.
- Real session transcripts stay out of git. Fixtures are small hand-built synthetic JSONL.
- The schema is not forked: parsers map into the existing `osc.ambient-work-record.v1`
  shape via shared helpers exported from `src/ambient.ts`.
- Where a runtime lacks a contract field (e.g. Codex has no cache-creation split), the
  record stores `null` plus a note in `observed.notes`; values are never invented.
- No USD costs anywhere; tokens are the cost metric.

## Files to touch

- `src/ambient.ts` — export shared transcript-record shape helpers (`ambientDigest`,
  `AmbientUsage`, `AmbientObserved`, `buildTranscriptWorkRecord`) so parsers reuse the
  record shape instead of duplicating it.
- `src/capture.ts` (new) — format registry, claude-code/codex/jsonl-generic parsers,
  `--detect` sniffing, redact-then-digest, and the path-safe record writer.
- `src/cli.ts` — `capture` command dispatch, core-help line under the record section,
  and full-help detail. Core help stays ≤35 lines.
- `tests/capture.test.ts` (new) + `tests/fixtures/capture/*.jsonl` — per-format parsing,
  detection, malformed-line tolerance, redaction, output writer, schema validity.
- `tests/cli-capture.test.ts` (new) — CLI surface: exit-code rules (0 hook-safe on bad
  data, 2 on direct misuse), `--detect`, `--out`, schema of written record.
- `tests/framework-cleanup-metric.test.ts` — repin maintained LOC + file count up.
- `tests/cli-lifecycle-help.test.ts` — add the capture line to the core-help arrays.
- `tests/section-parser.test.ts` — repin the plan-corpus sha256 (this plan file moves it).
- `docs/CAPTURE.md` (new) + `README.md` bullet + `examples/hooks/` (Claude Code SessionEnd
  hook + Codex notify recipe) + `examples/spikes/NOTES.md` promotion pointer.

## Acceptance criteria

- [ ] `osc capture --from codex --transcript <real rollout>` produces a valid
      `osc.ambient-work-record.v1` with non-null turns, tool census, and tokens.
- [ ] Same for `--from claude-code` against the spike's contract (turns, usage split,
      tool census, files touched, session span, final-message digest + claim words).
- [ ] `--detect` picks the right parser on both fixture families and exits 2 on ambiguity.
- [ ] Hook-safe: malformed/missing input never breaks a session — the hook-wrapper path
      exits 0 with no record; direct CLI misuse (bad `--from`, no transcript) exits 2.
- [ ] Redaction runs before digesting, so no secret or local path leaks into the record.
- [ ] Full chain green at every commit; pinned tests repinned with rationale.

## Verification steps

1. `npm run build` — TypeScript compiles with the new `src/capture.ts`.
2. `npm test` — capture unit tests, CLI surface tests, and all repinned landmines pass.
3. `./verify.sh --strict` — 10 pass, 0 fail; `git diff --check` clean.
4. `node dist/cli.js capture --from codex --transcript <real rollout> --out /tmp/codex-record.json`
   and `--from claude-code` against a real Claude transcript — both declare schema
   `osc.ambient-work-record.v1` with non-null turn counts and token totals.

## Open questions

- None. The read-only `get_ambient_record` MCP tool is deferred to a follow-up rather
  than forced into this plan; the spec marks it optional and capture stands alone without it.
