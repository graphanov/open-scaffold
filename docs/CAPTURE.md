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

The report summarizes a verifier-owned session id label, allowlisted source/state,
allowlisted runtime adapter/status/failure/marker labels, runtime token availability,
transcript-observed availability, assistant turns, user events, a bounded tool-call
census, a file-touch count with safe samples/redacted counts, usage splits, strict
ISO session span, a valid SHA-256 final-message digest when present, and generated
fidelity notes. Unavailable fields are reported as warnings or `unavailable`; values
are never invented.

The verifier never copies `boundary.note` or other record-authored authority prose. It
generates its own authority boundary:

- `transcript-extraction` with `observed`: transcript-observed facts are available.
- `ambient-postflight` without `observed`: postflight runtime receipt only; transcript
  facts are unavailable.
- unknown source: source is unrecognized, while the no-approval boundary still applies.

Human and JSON modes emit only the normalized public summary model. Unknown source,
state, adapter, status, marker, unsafe session ids, unsafe tool names, unsafe file paths,
record-authored notes, and invalid digests are suppressed or replaced with fixed
verifier-owned labels. Raw transcript content, record-authored authority prose, secrets,
terminal controls, and private local paths are not exposed.

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

Use the setup helper first. It prints a safe dry-run by default and does not dump
unrelated local config values:

```bash
osc capture setup claude-code
osc capture setup codex
osc capture setup all
```

Add `--write` to install the proposed local config. Write mode is idempotent; it refuses
to clobber incompatible existing Claude hooks or Codex top-level `notify` settings. For
`setup all --write`, any blocker stops all writes so capture is not half-installed.

The generated commands use the current Node executable plus the shipped hook path under
`examples/hooks`. Because runtime configs store absolute hook paths, run setup from the
installed package or checkout you intend to keep. If the package cache or checkout is
deleted later, rerun setup from the durable location.

Use `--json` for a machine-readable summary. Test or owner-local paths can be overridden
with `--claude-settings <path>` and `--codex-config <path>`.

### Claude Code (SessionEnd)

`examples/hooks/ambient-hook.mjs` reads the hook JSON on stdin
(`transcript_path`, `session_id`, `cwd`) and runs `osc capture --from claude-code`.
`osc capture setup claude-code --write` installs the owner-local
`.claude/settings.local.json` hook and, for the default path, adds
`.claude/settings.local.json` to the repository root `.gitignore` if needed. If you need
to register it manually, keep the file owner-local/gitignored and use the absolute command
printed by the dry-run:

```json
{ "hooks": { "SessionEnd": [ { "hooks": [ { "type": "command",
  "command": "/path/to/node /path/to/open-scaffold/examples/hooks/ambient-hook.mjs" } ] } ] } }
```

The hook always exits 0 and can never block or fail a session.

### Codex (notify)

`examples/hooks/codex-notify.md` documents capturing the rollout named by Codex's
`notify` event `thread-id` on `agent-turn-complete` / session end. The notify program
receives event JSON and runs `osc capture --from codex --hook-safe` on the matching
`~/.codex/sessions/.../rollout-*<thread-id>*.jsonl`, so concurrent sessions cannot be
cross-captured. `osc capture setup codex --write` inserts a top-level `notify` stanza in
`${CODEX_HOME:-$HOME/.codex}/config.toml` before any tables when no top-level `notify`
already exists.

Manual fallback:

```toml
notify = ["/path/to/node", "/path/to/open-scaffold/examples/hooks/codex-notify.mjs"]
```

If you already have a different top-level `notify` value, the helper blocks instead of
rewriting it. Merge that setup manually and keep table-local `notify` settings under
profiles separate from the top-level ambient capture hook.

## Resume and handoff flow

After a Codex or Claude Code hook captures a session under `.osc/state/ambient/`, run:

```bash
osc handoff
osc handoff --ambient-session <session-id>
osc resume --json
```

`osc handoff` and `osc resume` include the latest compact ambient summaries when records
exist. `--ambient-session` selects one record by its safe ambient filename/session id.
The packet includes summaries and digests, not raw transcripts. If no records exist the
normal resume path stays quiet; if an explicit session is missing, the packet says the
requested ambient session is unavailable without echoing the selector.

MCP clients get the same behavior through `get_handoff` with optional
`ambient_session`. Direct `osc review` / `osc gate` ingestion of ambient records is
intentionally deferred; capture remains observed transcript evidence, not approval,
correctness certification, retry authorization, execution authority, or spawn authority.

## Boundary

A captured record is observed facts, not claims. It is not approval, not a correctness
certification, not authorization to retry, and not execution or spawn authority. It is
the cheapest possible input to the next reader: review, gate, or a fresh session.
