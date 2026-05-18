# Plan: 065-tui-dashboard

## Status

backlog

## Context

`osc status` is the only command that shows scaffold state, and it prints a flat list of plan counts by stage. For a project with 50+ done plans, 10 active plans, and multiple evidence notes, the flat list is inadequate. Users need a rich terminal dashboard that shows the full picture at a glance: active plans with staleness indicators, recent evidence activity, pending reviews, verification status, and the identity chain from roadmap to release. A TUI (terminal UI) dashboard makes the scaffold feel alive — it turns "what's going on?" from a grep exercise into a single command. This is the glass cockpit made real for the terminal.

## Goal

Ship `osc dashboard` (or `osc status --dashboard`) — an interactive terminal dashboard that displays active plans with status, recent evidence, stale warnings, verification health, and the identity chain in a single refreshing view.

## Constraints / Out of scope

- Pure terminal UI — no browser, no Electron, no web server.
- Must use a lightweight TUI library compatible with Node.js (blessed, ink, or similar). Prefer `ink` (React-based, widely used in CLI tools) or a zero-dependency approach using ANSI escape codes and raw terminal I/O.
- Must work in standard terminal dimensions (80x24 minimum). Graceful degradation on smaller terminals.
- Must NOT require a daemon or background process — runs once (like `htop`) or with optional `--watch` flag for live refresh.
- Read-only — no editing plans from the dashboard in v1.
- Keyboard-navigable: arrow keys to scroll plan list, Enter to expand plan details, `q` to quit, `r` to refresh.
- Color-coded: green for clean/done, yellow for stale/warning, red for broken/blocked, blue for active/in-progress.

## Files to touch

- `src/dashboard.ts` — new file: TUI implementation (layout, data fetching, keyboard handling, refresh loop)
- `src/cli.ts` — wire `osc dashboard` and `osc status --dashboard` commands
- `tests/dashboard.test.ts` — test data fetching logic and output formatting (TUI rendering is hard to unit test; focus on data layer)
- `docs/GLASS_COCKPIT_PROTOCOL.md` — add "Terminal Dashboard" section as the simplest glass cockpit implementation

## Acceptance criteria

- [ ] `osc dashboard` starts a full-screen terminal UI showing at minimum: header with project name and mission status, active plans pane (plan name, last modified, staleness indicator), backlog count, done count, blocked count, recent evidence (last 3 evidence notes), and a footer with keyboard shortcuts
- [ ] Active plans are color-coded: green (modified <7 days ago), yellow (7-30 days), red (>30 days)
- [ ] Arrow keys move selection between plans in the active pane
- [ ] Pressing Enter on a selected plan expands it inline to show full goal, AC summary, and last verification status
- [ ] Pressing `q` or `Esc` quits the dashboard and restores the terminal
- [ ] Pressing `r` refreshes all data from disk
- [ ] `osc dashboard --watch` automatically refreshes every 30 seconds (configurable with `--interval <seconds>`)
- [ ] `osc status --dashboard` is an alias for `osc dashboard`
- [ ] Dashboard gracefully handles empty scaffold (zero plans): shows "No active plans. Create one with `osc plan new <slug> --stage active`"
- [ ] Dashboard shows verify status indicator: green if `./verify.sh --standard` passes, yellow if warnings only, red if failures
- [ ] Dashboard works in terminals as small as 80x24 — content is scrollable if it exceeds viewport
- [ ] All existing tests pass; new dashboard tests cover data fetching and state formatting

## Verification steps

1. **Launch:** Run `osc dashboard` in the open-scaffold repo. Verify full-screen TUI appears with plan data.
2. **Navigation:** Press arrow keys. Verify selection moves. Press Enter. Verify plan detail expands.
3. **Color coding:** Check that active plans show appropriate colors based on age.
4. **Quit:** Press `q`. Verify terminal is restored to pre-dashboard state (no leftover ANSI codes).
5. **Empty state:** Run `osc dashboard` in an empty scaffold directory. Verify friendly empty-state message.
6. **Watch mode:** Run `osc dashboard --watch --interval 5`. In another terminal, create a plan with `osc plan new test-dash --stage active`. Verify the new plan appears in the dashboard within 10 seconds.
7. **Small terminal:** Resize terminal to 80x24. Run `osc dashboard`. Verify no overflow/crash.

## Open questions

- Which TUI library? `ink` uses React, which is heavy for a CLI tool but provides excellent component model. `blessed` is more traditional and lighter. A zero-dependency implementation with raw ANSI codes is the most portable but most labor-intensive. Recommendation: use `ink` — it's the modern standard for Node.js TUI apps (used by Stripe, Shopify, Vercel CLIs) and its React model makes the dashboard composable. Accept the dependency weight.
- Should `osc dashboard` replace `osc status` over time? Not initially — `osc status` is quick, scriptable, and JSON-output-capable. The dashboard is for human consumption. Both should coexist.
- Should the dashboard show `osc task` data when task DB exists? Yes — add a task summary pane (counts by status) when `.osc/tasks.db` is detected. This makes the dashboard a unified cockpit.
