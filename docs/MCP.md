# Open Scaffold MCP Server

Open Scaffold can expose repository truth through MCP (Model Context Protocol) so MCP-capable agents can inspect plans, mission context, evidence notes, and scaffold health without reimplementing markdown parsing.

The server is local-first and optional:

- stdio transport only;
- no network access required;
- read-only by default;
- write tools are visible but blocked unless the server starts with `--allow-write`;
- no agent spawning, runtime launching, deployment, publication, or approval automation.

## Solo coding-agent quickstart

Use this path when you are already inside an MCP-capable coding agent such as
Claude Code, Codex, Cursor, Continue, or another local MCP client and you want
the agent to read Open Scaffold repo truth.

Replace `/absolute/path/to/repo` with the repository root you want the agent to
inspect. This config starts the packaged `osc-mcp` binary through `npx` and
keeps the server read-only:

```json
{
  "mcpServers": {
    "open_scaffold": {
      "command": "npx",
      "args": [
        "-y",
        "-p",
        "open-scaffold@latest",
        "osc-mcp",
        "--repo",
        "/absolute/path/to/repo"
      ]
    }
  }
}
```

If your client accepts a single command string instead of JSON command/args, use
the same argv shape:

```bash
npx -y -p open-scaffold@latest osc-mcp --repo /absolute/path/to/repo
```

Client config wrappers differ, but the command and args above are the portable
part:

- Claude Code / Claude Desktop: put the `open_scaffold` server object in the
  MCP config surface your client supports.
- Codex CLI: use an underscore server name (`open_scaffold`) so tool names are
  sanitized predictably.
- Cursor: place the same `mcpServers.open_scaffold` object in the project or
  user MCP config.
- Continue: put the same command and args under its MCP server list.

This is not a compatibility matrix. It is the local stdio command Open Scaffold
ships; use each client's current MCP docs for the surrounding config file
location and reload behavior.

### Try these first

Once connected, ask your agent to call these read tools before it reads source
files:

- `get_status` — mission state, plan counts, and local scaffold validation.
- `get_handoff` — the current resume packet compiled from repo truth.
- `list_plans` — active/backlog/done/blocked plan inventory.
- `list_evidence`, then `get_evidence` — evidence inventory, then one evidence
  note by path, file name, or slug. `get_evidence` needs an existing evidence
  note to read.

### Verify the connection

These line-delimited JSON-RPC smoke checks exercise the same packaged command
without needing a full client UI.

Call `get_status`:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_status","arguments":{}}}' \
  | npx -y -p open-scaffold@latest osc-mcp --repo /absolute/path/to/repo
```

Call `get_handoff`:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_handoff","arguments":{}}}' \
  | npx -y -p open-scaffold@latest osc-mcp --repo /absolute/path/to/repo
```

Both responses should be JSON-RPC `result` envelopes with `structuredContent`.

### Authority boundary

By default MCP is read-only. Starting the server with `--allow-write` only
enables scaffold-file helpers such as plan, amendment, close, and evidence
file creation/mutation. It still has no authority to spawn runtimes, launch
adapters, run shell commands, commit, push, open PRs, merge, publish, release,
deploy, read secrets, or use credentials.

## Start the server

From an Open Scaffold repository:

```bash
npx open-scaffold@latest mcp serve
```

From any directory, point at a repository root:

```bash
npx open-scaffold@latest mcp serve --repo /absolute/path/to/repo
```

After local install/build, these are equivalent:

```bash
osc mcp serve --repo /absolute/path/to/repo
osc-mcp --repo /absolute/path/to/repo
node dist/cli.js mcp serve --repo /absolute/path/to/repo
node dist/mcp-cli.js --repo /absolute/path/to/repo
```

Health check without starting the stdio loop:

```bash
npx open-scaffold@latest mcp serve --repo /absolute/path/to/repo --validate
```

That prints JSON with mission status, plan counts, and the same local scaffold validation used by `osc verify`, without launching runtimes or subprocesses.

## Tools

Read tools work without extra flags:

- `list_plans` — list plan slugs and paths, optionally filtered by `active`, `backlog`, `blocked`, or `done`.
- `get_plan` — parse one plan into structured sections, acceptance criteria, verification steps, and raw markdown.
- `get_mission` — return mission status, goals, non-goals, and recent changelog entries.
- `list_evidence` — list `.osc/releases/` evidence notes, optionally filtered by slug.
- `get_evidence` — read an evidence note by path, file name, or latest note matching a slug.
- `get_status` — return mission state, plan counts, and local verification status.
- `search_plans` — full-text search across plan markdown.
- `list_amendments` — list amendment files for a plan.

The product front door is exposed read-only (plan 167):

- `get_handoff` — compile the handoff/resume packet from repo truth; equivalent to `osc handoff`.
- `analyze_loop` — analyze a recorded evolution loop: plateau state, per-criterion deltas, recommendation; equivalent to `osc review` / `osc analyze`.
- `gate_loop` — compute the judgment checkpoint and retry authorization for a loop, optionally folding in an independent judge ruling; equivalent to `osc gate`. The gate rules on the record but cannot modify it, so a cheap or locally-hosted judge model needs no write access.

Write tools are intentionally gated:

- `create_plan`
- `amend_plan`
- `close_plan`
- `create_evidence`

Without `--allow-write`, write tools return JSON-RPC error code `-32000` with:

```text
Write operations require --allow-write flag
```

Only enable writes for a trusted local client and a repository where the operator expects file mutation:

```bash
npx open-scaffold@latest mcp serve --repo /absolute/path/to/repo --allow-write
```

## Resources

The server exposes these resource URIs:

- `osc://plans/active`
- `osc://plans/backlog`
- `osc://plans/done`
- `osc://plans/blocked`
- `osc://releases/latest`
- `osc://mission/goals`
- `osc://mission/changelog`
- `osc://rules`
- `osc://roadmap`

Plan resources return JSON. Rules, roadmap, and latest evidence return markdown.

## JSON-RPC smoke checks

Initialize:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}' \
  | npx open-scaffold@latest mcp serve --repo /absolute/path/to/repo
```

List tools:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | npx open-scaffold@latest mcp serve --repo /absolute/path/to/repo
```

Read-only write gate:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_plan","arguments":{"slug":"test-plan","stage":"backlog"}}}' \
  | npx open-scaffold@latest mcp serve --repo /absolute/path/to/repo
```

Expected result: JSON-RPC error code `-32000`.

## Client configuration examples

Replace `/absolute/path/to/repo` with the Open Scaffold repository you want the
client to inspect. These examples use the same packaged `osc-mcp` command from
the solo quickstart.

### Claude Code / Claude Desktop

```json
{
  "mcpServers": {
    "open_scaffold": {
      "command": "npx",
      "args": [
        "-y",
        "-p",
        "open-scaffold@latest",
        "osc-mcp",
        "--repo",
        "/absolute/path/to/repo"
      ]
    }
  }
}
```

### Cursor

```json
{
  "mcpServers": {
    "open_scaffold": {
      "command": "npx",
      "args": [
        "-y",
        "-p",
        "open-scaffold@latest",
        "osc-mcp",
        "--repo",
        "/absolute/path/to/repo"
      ]
    }
  }
}
```

### Continue

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "name": "open_scaffold",
        "command": "npx",
        "args": [
          "-y",
          "-p",
          "open-scaffold@latest",
          "osc-mcp",
          "--repo",
          "/absolute/path/to/repo"
        ]
      }
    ]
  }
}
```

### Codex CLI

```bash
codex mcp add open_scaffold -- npx -y -p open-scaffold@latest osc-mcp --repo /absolute/path/to/repo
```

Name the server with underscores (`open_scaffold`, not `open-scaffold`).
Observed on codex-cli 0.139.0: tools are namespaced under a sanitized server
name, and a hyphenated registration makes every tool call fail instantly with
"user cancelled MCP tool call" while the tool listing still works.

### Hermes Agent

Hermes configuration uses YAML, but the command shape is the same:

```yaml
mcp_servers:
  open_scaffold:
    command: npx
    args:
      - -y
      - -p
      - open-scaffold@latest
      - osc-mcp
      - --repo
      - /absolute/path/to/repo
```

## Boundary notes

- MCP exposes local scaffold state; it does not make MCP the source of truth.
- Git-tracked Open Scaffold files, GitHub issues/PRs, evidence notes, and operator approvals remain the durable record.
- `--allow-write` only enables scaffold file helpers. It still does not authorize runtime spawning, shell execution, commits, pushes, PRs, merges, publication, release mutation, deployment, secret reads, or credential changes.

## Readiness posture

The current MCP server is useful, local-first, and optional. It is not yet a contract-stable integration surface.

Smoke-verified clients (2026-06-12, plan 167): Claude Code (inline `--mcp-config`, `get_handoff` returned the live resume packet in 3 turns) and Codex CLI 0.139.0 (global `codex mcp add open_scaffold`, same tool, same packet). These are one-shot receipts, not a compatibility matrix.

The 2026-05-29 MCP posture ADR keeps the surface read-oriented while Open Scaffold matures the surrounding contracts. Before MCP is promoted as standardized/conformance-tested, it needs:

- versioned tool and resource schema fixtures;
- golden JSON-RPC smoke fixtures for initialize, tool/resource listing, tool calls, resource reads, and error responses;
- a compatibility matrix for documented clients;
- a stability/deprecation policy for tool names, resource URIs, input schemas, and output fields;
- an explicit decision on whether the zero-dependency JSON-RPC loop remains sufficient or whether adopting `@modelcontextprotocol/sdk` is worth the dependency tradeoff.

Any future write-capable MCP surface must inherit the `osc work` controller gate model rather than bypass it: no adapter dispatch, verification command execution, runtime spawning, network/credential access, commit, push, PR, merge, publish, release, deploy, or external-production side effect without an explicit human approval gate.

See [`docs/decisions/2026-05-29-mcp-integration-surface-posture.md`](decisions/2026-05-29-mcp-integration-surface-posture.md).
