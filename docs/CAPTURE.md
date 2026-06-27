# Ambient capture (`osc capture`)

`osc capture` turns a finished agent-session transcript into an
`osc.ambient-work-record.v1` record — assistant turns, token usage, a tool-call
census, files touched, the session span, and a redacted final-message digest —
without the worker's cooperation. It reads one file and writes one record; it never
modifies the transcript, spawns a runtime, approves work, or certifies correctness.

Universality lives in the **output**, not the parser. Every runtime logs differently,
so each gets a thin normalizer into the one record shape (see `src/ambient.ts`). Adding
a new runtime is a new parser, never a new schema.

## Usage

```
osc capture --from <claude-code|codex|jsonl-generic> --transcript <path> \
  [--out <path>] [--detect] [--session-id <id>] [--repo <root>] [--json] [--hook-safe]
osc capture verify <record> [--json]
```

- `--from <format>` — the transcript format (below). Omit it and pass `--detect` to sniff.
- `--transcript <path>` — the session JSONL to read.
- `--detect` — infer the format from the first parseable lines; exits 2 on ambiguity.
- `--out <path>` — where to write the record. Default: `.osc/state/ambient/<session-id>.json`
  inside an `.osc` repo (covered by `.osc/.gitignore`'s `state/` rule), otherwise
  `<session-id>.ambient-record.json` next to the working directory.
- `--session-id <id>` — overrides the record `runId` (defaults to the transcript filename).
- `--repo <root>` — the repository the record is written under (defaults to the nearest
  `.osc` root, then the working directory).
- `--hook-safe` — never exit non-zero. For SessionEnd-style hook wrappers: bad or missing
  input records nothing and exits 0 rather than breaking the session.
- `osc capture verify <record>` — validates an existing ambient record and prints a sanitized
  trust report. `--json` emits the report model, not the original record.

Exit codes: `0` on success; `2` on direct CLI misuse (unknown `--from`, missing
`--transcript`, neither `--from` nor `--detect`). For `capture verify`, malformed JSON,
wrong schema/version, missing runtime, wrong root identity fields, or malformed observed
containers exit `2`. Under `--hook-safe`, capture creation always exits `0`.

## Trust report

`osc capture verify <record>` turns record JSON into a review-safe report. It validates:

- root JSON is an object with `schema: "osc.ambient-work-record.v1"`;
- `runId`, `source`, and `state` are strings;
- `runtime` is an object with reportable adapter/status/token fields;
- `observed`, when present, has object `usage` and `tool_calls`, string-list
  `files_touched` and `notes`, and numeric/null token splits.

The report summarizes source, run/session id, state, runtime adapter/status/failure/marker,
runtime token availability, transcript-observed availability, assistant turns, user events,
tool-call census, files touched, usage splits, session span, and missing-fidelity notes.
Unavailable fields are reported as warnings or `unavailable`; values are never invented.

The verifier never copies `boundary.note` or other record-authored authority prose. It
generates its own authority boundary:

- `transcript-extraction` with `observed`: transcript-observed facts are available.
- `ambient-postflight` without `observed`: postflight runtime receipt only; transcript
  facts are unavailable.
- unknown source: source is unrecognized, while the no-approval boundary still applies.

Human and JSON modes emit only the sanitized report model. Record-derived strings, path
labels, parse/read errors, tool names, file labels, notes, and warnings are redacted,
terminal-control-neutralized, and length-bounded before display; raw transcript content,
secrets, and private local paths are not exposed.

## Formats

| `--from` | Source | Fidelity |
| --- | --- | --- |
| `claude-code` | Claude Code session JSONL (`type:"assistant"` with `message.usage`) | full: per-turn usage with cache split, tool-call census, files touched |
| `codex` | Codex rollout JSONL (`{timestamp, type, payload}`) | full turns + tool census; token totals from the cumulative `token_count` event; no cache-creation split (recorded `null` with a note) |
| `jsonl-generic` | any JSONL with `role`/`type` and a timestamp field | best-effort: line/role/timestamp counts only; tokens, tools, and files are not available at this fidelity |

Where a runtime lacks a contract field, the record stores `null` plus a note in
`observed.notes`. Values are never invented. Packet text is run through the redaction
helpers (`src/redaction.ts`) before any digest, so secrets and local paths never land in
the record.

## Hook recipes

### Claude Code (SessionEnd)

`examples/hooks/ambient-hook.mjs` reads the hook JSON on stdin
(`transcript_path`, `session_id`, `cwd`) and runs `osc capture --from claude-code`.
Register it owner-locally in `.claude/settings.local.json` (gitignored):

```json
{ "hooks": { "SessionEnd": [ { "hooks": [ { "type": "command",
  "command": "node examples/hooks/ambient-hook.mjs" } ] } ] } }
```

The hook always exits 0 and can never block or fail a session.

### Codex (notify)

`examples/hooks/codex-notify.md` documents capturing the rollout named by Codex's
`notify` event `thread-id` on `agent-turn-complete` / session end. The notify program
receives event JSON and runs `osc capture --from codex --hook-safe` on the matching
`~/.codex/sessions/.../rollout-*<thread-id>*.jsonl`, so concurrent sessions cannot be
cross-captured.

## Boundary

A captured record is observed facts, not claims. It is not approval, not a correctness
certification, and not authorization to retry. It is the cheapest possible input to the
next reader — review, gate, or a fresh session.
