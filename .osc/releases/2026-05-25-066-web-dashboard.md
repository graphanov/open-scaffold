# Release / Evidence Note: 066-web-dashboard

## Summary

Added a read-only browser dashboard for Open Scaffold state. The new `osc dashboard --web` path writes a self-contained `.osc/dashboard.html` snapshot, while `osc dashboard --serve` serves the same view on localhost for review without making a chat or browser surface canonical truth.

## Traceability

- Roadmap / issue / task: selected backlog plan `066-web-dashboard`.
- Plan: `.osc/plans/done/066-web-dashboard.md`.
- Run ID / run packet: N/A — direct repository automation slice, no external runtime packet.
- Branch / PR: `feat/066-web-dashboard`; pending owner review PR.

## Verification

- `node dist/cli.js dashboard --web --out /tmp/test-dashboard.html` plus a self-contained source check for external refs — passed.
- `node dist/cli.js dashboard --serve --port 9878` plus localhost fetch — passed and printed `http://localhost:9878`.
- `git diff --check` — passed.
- `npm test -- --run` — passed, 38 files / 336 tests.
- `npm run build` — passed.
- `./verify.sh --strict` — passed with 10 pass, 0 fail, 0 warn while the plan was active.

## Outcome

The web dashboard slice is implemented and ready for PR review. The dashboard remains static/read-only, self-contained, localhost-only in serve mode, and no-spawn safe for `--open`. This is not a merge, npm publication, GitHub Release, deployment, or production server approval.

## Follow-up

- Owner gate: review/merge the PR.
- Owner gate: batch npm publication and GitHub Latest Release alignment separately if this package-visible CLI surface is selected for a release train.
