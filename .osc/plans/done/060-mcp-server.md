# Plan: 060-mcp-server

## Status

done


## Context

MCP (Model Context Protocol) has become the ecosystem standard for AI agent tool integration. Claude Desktop, Claude Code, Hermes, Continue, Cursor, and other tools now speak MCP natively. Open Scaffold currently requires agents to parse markdown files directly — every agent reinvents plan parsing. An MCP server exposing plan/run/evidence state as queryable tools and resources would make Open Scaffold immediately useful to the entire MCP ecosystem without requiring any agent to adopt the full scaffold protocol. This is the highest-leverage integration surface available today: one server, every MCP-compatible agent benefits. Follows the protocol infrastructure established by M0-M17 and the runtime binding contract.

## Goal

Ship an MCP server that exposes Open Scaffold repository state as standard MCP tools and resources, so any MCP-compatible AI agent can list plans, read acceptance criteria, check verification status, navigate evidence, and query scaffold health without parsing markdown directly.

## Constraints / Out of scope

- The MCP server is an optional add-on (`osc mcp serve`), not a core requirement for scaffold use.
- Uses stdio transport exclusively in v1 (the MCP standard for local tools).
- Read-only by default. Write operations (plan create, amend, close, evidence new) require explicit `--allow-write` flag.
- Must NOT require network access. All data comes from local filesystem.
- Does NOT implement streaming, SSE transport, or HTTP transport in v1 (those are extensions).
- Does NOT spawn agents, launch runtimes, or execute code — query-only.
- Does NOT replace the CLI — it's an alternative interface for agents, not humans.
- The MCP server binary is `osc-mcp` (separate package.json bin entry) or `osc mcp serve`.

## Files to touch

- `src/mcp-server.ts` — new file: MCP server implementation (tool handlers, resource handlers, stdio transport, JSON-RPC message loop)
- `src/mcp-tools.ts` — new file: tool definitions with JSON Schema input/output shapes, separated from transport logic
- `src/mcp-resources.ts` — new file: resource URI definitions and content resolvers
- `src/cli.ts` — wire `osc mcp serve [--allow-write] [--validate]` command and `osc-mcp` bin alias
- `package.json` — add `"osc-mcp": "dist/mcp-cli.js"` bin entry (or share CLI entry point with argv[1] dispatch)
- `tests/mcp-server.test.ts` — test tool handlers, resource resolution, read-only enforcement, JSON-RPC message parsing
- `docs/MCP.md` — new file: integration guide with config examples for Claude Desktop, Hermes, Claude Code, Continue, Cursor
- `docs/OPEN_SCAFFOLD_SYSTEM.md` — add MCP server to the integration layers section
- `.osc/releases/README.md` — no changes needed (MCP is additive, not structural)

## Acceptance criteria

- [ ] `osc mcp serve` starts a stdio MCP server that responds to `initialize`, `tools/list`, `resources/list`, and `tools/call` JSON-RPC methods
- [ ] Tools exposed: `list_plans` (filters by stage: active|backlog|blocked|done), `get_plan` (returns all sections as structured JSON), `get_mission` (returns goals, non-goals, recent changelog), `list_evidence` (filters by slug), `get_evidence` (full content), `get_status` (scaffold health: mission defined, plan counts, stale warnings, verify result), `search_plans` (full-text search across plan goals and AC), `list_amendments` (amendments for a given plan slug)
- [ ] Resources exposed: `osc://plans/active` (list of active plan slugs), `osc://plans/backlog`, `osc://plans/done`, `osc://plans/blocked`, `osc://releases/latest` (most recent evidence note), `osc://mission/goals`, `osc://mission/changelog`, `osc://rules` (.osc/RULES.md content), `osc://roadmap` (ROADMAP.md content)
- [ ] All read operations work without `--allow-write`
- [ ] Write operations (`create_plan`, `amend_plan`, `close_plan`, `create_evidence`) return error JSON-RPC error code -32000 with message "Write operations require --allow-write flag" when flag is absent
- [ ] `osc mcp serve --validate` starts, validates scaffold state, outputs JSON status to stdout, and exits — useful for CI health checks and connection testing
- [ ] Server handles malformed JSON-RPC gracefully (returns parse error, does not crash)
- [ ] Server handles requests for nonexistent plans/evidence with structured error (not crash)
- [ ] Documentation explains registration config for at least 3 MCP clients with copy-pasteable JSON config blocks
- [ ] All existing tests pass (`npm test`), new MCP tests cover tool dispatch, resource resolution, read-only gate, and error handling
- [ ] `npm run build` succeeds with new files
- [ ] `./verify.sh --standard` passes (MCP files are additive, no plan/schema violations)

## Verification steps

1. **Unit tests:** Run `npm test -- --reporter=verbose` and verify all MCP test cases pass.
2. **Manual stdio test:** Start server with `echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}' | npx tsx src/cli.ts mcp serve --validate 2>/dev/null`. Verify JSON-RPC response includes server info and capabilities.
3. **Tool list test:** Pipe `{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}` into server, verify response lists all tools with correct input schemas.
4. **Read enforcement test:** Pipe a `tools/call` for `create_plan` without `--allow-write`, verify response is error code -32000.
5. **Real data test:** Run `osc mcp serve --validate` in the open-scaffold repo, verify output includes plan counts matching `osc status --json`.
6. **Build check:** Run `npm run build`, verify `dist/mcp-server.js` and related files exist.
7. **Schema check:** Run `./verify.sh --strict`, verify plan schema checks pass (new MCP files are docs/code, not plans, so no plan violations).

## Open questions

- Should the MCP server use a separate npm package (`@graphanov/open-scaffold-mcp`) or ship inside the main `open-scaffold` package? Preference: ship inside main package for lower adoption friction; users shouldn't need two packages. Downside: main package gains a dependency on MCP SDK types.
- Which MCP SDK to use? The official `@modelcontextprotocol/sdk` is the obvious choice but adds a dependency. Alternative: implement the JSON-RPC stdio loop directly (it's ~200 lines) to stay zero-dependency. Trade-off: zero-deps is cleaner but misses ecosystem compatibility testing and future protocol upgrades. Recommendation: zero-dependency implementation for v1 since MCP stdio transport is simple and stable enough.
- Should resources use `osc://` URI scheme or `open-scaffold://`? `osc://` is shorter and matches the CLI brand. Confirm with owner.
- Should `get_plan` return raw markdown or parsed JSON? Both: parsed JSON as the primary output (sections, AC, files, etc.) with a `raw_markdown` field for tools that want the original text.
