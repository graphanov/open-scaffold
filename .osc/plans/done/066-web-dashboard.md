# Plan: 066-web-dashboard

## Status

done


## Context

The TUI dashboard (plan 065) serves terminal-native users, but many developers and stakeholders want a visual dashboard in the browser. A static HTML dashboard — no backend, no server, no database — generated from repo state and viewable by opening a single file or serving via `osc dashboard --serve` — makes the scaffold's state accessible to non-terminal users, project managers, and public build-in-public streams. This is the glass cockpit protocol rendered as a web page, with the same data sources as the TUI but a richer visual presentation.

## Goal

Ship `osc dashboard --web` that generates a single self-contained HTML page from scaffold state, and `osc dashboard --serve` that serves it locally, providing a browser-based glass cockpit for Open Scaffold projects.

## Constraints / Out of scope

- The HTML page is fully self-contained — no external CSS, no CDN fonts, no JavaScript framework CDN. All styles and scripts are inline or generated.
- Read-only — displays state, does not mutate plans or evidence.
- No backend process required for the static file. `--serve` mode spins up a temporary HTTP server (Node.js built-in `http` module) for local viewing; it is NOT a production server.
- Must NOT require network access to render (self-contained). `--serve` mode is localhost-only.
- Dark theme by default (matches the product's premium brutalism aesthetic), with a system-theme toggle.
- Data refreshes on page reload. No WebSocket, no live updates in v1 (the TUI covers live refresh).
- Must work when opened as `file://` (CSP-friendly, no fetch requests to external origins).
- Does NOT embed git history, runtime logs, or any data beyond what `osc status --json` + plan file content provides.

## Files to touch

- `src/dashboard-web.ts` — new file: HTML generation from scaffold state (inline CSS, inline JS for interactivity, data embedded as JSON in a `<script>` tag)
- `src/cli.ts` — wire `osc dashboard --web [--out <path>]` and `osc dashboard --serve [--port <port>]`
- `tests/dashboard-web.test.ts` — test HTML generation, data embedding, self-contained property (no external refs), serve mode
- `docs/GLASS_COCKPIT_PROTOCOL.md` — add "Web Dashboard" section as a cockpit mode

## Acceptance criteria

- [ ] `osc dashboard --web` generates a self-contained `.osc/dashboard.html` file (or outputs to `--out <path>`)
- [ ] `osc dashboard --serve` starts a local HTTP server, prints the URL, and serves the dashboard
- [ ] The HTML page displays: mission summary (goals excerpt), plan kanban columns (active, backlog, blocked, done) with plan names and status, recent evidence notes with links, verification status indicator, identity chain visualization (roadmap → plan → run → PR → evidence), and task summary if `.osc/tasks.db` exists
- [ ] Clicking a plan name expands it inline to show goal, acceptance criteria (with check marks for completed), and open questions
- [ ] The page uses a dark theme with clean typography, subtle borders, and color-coded status indicators (green=done, yellow=stale, red=blocked, blue=active)
- [ ] The page is responsive — works on desktop and mobile viewports
- [ ] The page has zero external dependencies: no `<link>` tags to external CSS, no `<script src="...">` to external JS, no CDN fonts, no analytics
- [ ] Opening the generated `.osc/dashboard.html` as a `file://` URL works without errors (no CORS issues, no blocked fetches)
- [ ] `osc dashboard --serve --port 9999` serves on that port and prints `http://localhost:9999`
- [ ] `osc dashboard --serve` exits cleanly on Ctrl+C (SIGINT handled)
- [ ] Generated HTML is committed to `.osc/dashboard.html` so it can be viewed directly on GitHub Pages or raw git hosting
- [ ] All existing tests pass; new web dashboard tests cover HTML generation and serve mode

## Verification steps

1. **Generate:** Run `osc dashboard --web --out /tmp/test-dashboard.html`. Open `/tmp/test-dashboard.html` in a browser. Verify all sections render with correct data.
2. **Self-contained check:** Run `grep -E '(href=|src=)' /tmp/test-dashboard.html`. Verify no external URLs (only inline `#` anchors and data URIs).
3. **Serve mode:** Run `osc dashboard --serve --port 9876`. In another terminal, run `curl -s http://localhost:9876 | head -20`. Verify HTML response. Press Ctrl+C, verify server stops.
4. **Empty state:** Run `osc dashboard --web` in an empty scaffold dir. Verify generated HTML shows "No plans yet" message, not a crash.
5. **Verification:** Run `./verify.sh --standard`. Verify passes (web dashboard is additive).

## Open questions

- Should the dashboard include a Mermaid.js diagram of the identity chain (roadmap → plan → run → PR → evidence)? Mermaid is an external CDN dependency — violates the self-contained constraint. Alternative: render an ASCII art diagram or simple CSS-only flowchart. Decision: simple CSS flowchart for v1. Mermaid can be added as an optional `--with-mermaid` flag that acknowledges the CDN dependency.
- Should `osc dashboard --serve` support `--open` to auto-open the browser? Yes — a common UX expectation. Add `--open` flag that uses `open` (macOS), `xdg-open` (Linux), or `start` (Windows).
- Should `.osc/dashboard.html` be gitignored or tracked? Track it — it's a generated artifact that represents repo state at a point in time. Similar to `.osc/releases/` evidence notes. Users can regenerate it anytime.
