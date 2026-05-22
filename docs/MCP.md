# Open Scaffold MCP Server

Open Scaffold can expose repository truth through MCP (Model Context Protocol) so MCP-capable agents can inspect plans, mission context, evidence notes, and scaffold health without reimplementing markdown parsing.

The server is local-first and optional:

- stdio transport only;
- no network access required;
- read-only by default;
- write tools are visible but blocked unless the server starts with `--allow-write`;
- no agent spawning, runtime launching, deployment, publication, or approval automation.

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

Replace `/absolute/path/to/repo` with the Open Scaffold repository you want the client to inspect.

### Claude Desktop

```json
{
  "mcpServers": {
    "open-scaffold": {
      "command": "npx",
      "args": [
        "-y",
        "open-scaffold@latest",
        "mcp",
        "serve",
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
    "open-scaffold": {
      "command": "npx",
      "args": [
        "-y",
        "open-scaffold@latest",
        "mcp",
        "serve",
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
        "name": "open-scaffold",
        "command": "npx",
        "args": [
          "-y",
          "open-scaffold@latest",
          "mcp",
          "serve",
          "--repo",
          "/absolute/path/to/repo"
        ]
      }
    ]
  }
}
```

### Hermes Agent

Hermes configuration uses YAML, but the command shape is the same:

```yaml
mcp_servers:
  open_scaffold:
    command: npx
    args:
      - -y
      - open-scaffold@latest
      - mcp
      - serve
      - --repo
      - /absolute/path/to/repo
```

## Boundary notes

- MCP exposes local scaffold state; it does not make MCP the source of truth.
- Git-tracked Open Scaffold files, GitHub issues/PRs, evidence notes, and operator approvals remain the durable record.
- `--allow-write` only enables scaffold file helpers. It still does not authorize merge, publication, release mutation, deployment, credential changes, or runtime spawning.
