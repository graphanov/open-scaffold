# Plan: 067-plan-dependency-graph

## Status

backlog

## Context

Plans in `.osc/plans/` can reference each other — a feature plan may depend on a refactor plan, an architecture decision may block three implementation plans, a follow-up plan inherits from a prior slice. But there is no way to visualize these relationships. A developer looking at 20 active and backlog plans has no answer to "what should I work on first?" or "what's blocking what?" A dependency graph — even a simple ASCII or Mermaid rendering — turns a flat list of files into a navigable work map.

## Goal

Ship `osc plan graph [--format ascii|mermaid|json]` that reads plan cross-references and renders a dependency DAG showing which plans depend on which, which are blocking others, and the critical path.

## Constraints / Out of scope

- Parse dependencies from plan content: look for explicit references like `depends on: 050-npm-publish`, `blocks: 052-interactive-plan-wizard`, `follows: 001-generic-osc-core`, or `--plan <slug>` style references in the Context and Open Questions sections.
- Does NOT infer dependencies from file timestamps or git history — dependencies must be explicitly declared in plan text.
- Output formats: `ascii` (terminal-friendly tree), `mermaid` (copy-pasteable Mermaid flowchart for docs/PRs), `json` (machine-parseable for tooling and CI).
- Does NOT detect circular dependencies in v1 (warns but doesn't block).
- Does NOT validate that dependency targets actually exist in v1 (reports "unresolved dependency" as warning).
- Does NOT modify plans to add dependency metadata — parsing only.

## Files to touch

- `src/plan-graph.ts` — new file: dependency extraction (regex patterns), DAG construction, cycle detection, format renderers
- `src/cli.ts` — wire `osc plan graph [--format ascii|mermaid|json] [--stage active|backlog|all] [--direction downstream|upstream|both]`
- `tests/plan-graph.test.ts` — test dependency extraction from various plan formats, DAG construction, cycle detection, renderer output
- `docs/WORKFLOW.md` — mention `osc plan graph` in the Plan phase

## Acceptance criteria

- [ ] `osc plan graph` prints an ASCII tree showing all plans in active/ and backlog/ with their declared dependencies as indented children
- [ ] `osc plan graph --format mermaid` outputs a valid Mermaid flowchart that can be pasted into GitHub markdown and renders correctly
- [ ] `osc plan graph --format json` outputs a JSON DAG with nodes (plan slug, stage, goal summary) and edges (from, to, relationship type: depends_on|blocks|follows)
- [ ] Dependency patterns detected: `depends on: <slug>`, `blocks: <slug>`, `follows: <slug>`, `--plan <slug>`, `see plan <slug>`, `blocked by: <slug>`, `inherits from: <slug>`
- [ ] `--stage active` filters to only active plans and their dependencies
- [ ] `--stage all` includes all stages (active, backlog, blocked, done)
- [ ] `--direction downstream` shows only what this plan depends on
- [ ] `--direction upstream` shows only what depends on this plan (reverse dependency — "what's blocked on this?")
- [ ] `--direction both` (default) shows the full neighborhood
- [ ] Warnings printed to stderr for: unresolved dependencies (target plan not found), circular dependencies detected
- [ ] Plans with zero declared dependencies show as standalone nodes (not an error)
- [ ] Exit code 0 even with warnings (warnings are informational, not blocking)
- [ ] All existing tests pass; new graph tests cover dependency extraction and rendering

## Verification steps

1. **Basic graph:** Create three plans: A depends on B, B depends on C. Run `osc plan graph`. Verify A → B → C chain rendered correctly.
2. **Blocks relationship:** Create plan X that says "blocks: Y". Run `osc plan graph --direction upstream` and verify Y shows X as upstream dependent.
3. **Mermaid output:** Run `osc plan graph --format mermaid`. Copy output to a GitHub issue or Mermaid live editor. Verify it renders as a flowchart.
4. **JSON output:** Run `osc plan graph --format json | jq .edges`. Verify correct from/to/relationship structure.
5. **Unresolved dependency:** Create a plan that says "depends on: nonexistent-plan". Run `osc plan graph`. Verify warning on stderr about unresolved dependency.
6. **Circular dependency:** Create A depends on B, B depends on A. Run `osc plan graph`. Verify circular dependency warning on stderr, graph still renders (with cycle indicated).
7. **Empty state:** Run `osc plan graph` in empty scaffold. Verify output is "No plans found" or empty graph.

## Open questions

- Should `osc plan graph` also read dependency data from a machine-readable field in the plan YAML frontmatter (if we add frontmatter support)? This would be more reliable than regex parsing. Decision: regex parsing for v1 (works with existing plans). If frontmatter is added in a future plan, add a `dependencies:` field that the graph command reads preferentially.
- Should the graph show done plans by default? No — done plans clutter the graph. But `--stage all` includes them for historical context.
- Should `osc plan graph --critical-path` compute the longest dependency chain (critical path for project completion)? This is a natural analytics feature. Defer to v2 — requires proper DAG topological sort, which is straightforward but adds scope.
