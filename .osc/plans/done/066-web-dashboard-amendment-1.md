# Amendment 1: 066-web-dashboard

## Parent

066-web-dashboard

## Date

2026-05-25

## Learning

The plan's open-question note proposed an `--open` flag that shells out to platform browser-launch commands. The current core boundary tests intentionally keep Open Scaffold core free of general process-launching APIs except narrow evidence/metrics collectors. A dashboard command may serve localhost HTML, but it should not add OS command spawning to core just to open a browser.

## New direction

Keep `osc dashboard --serve --open` as a convenience flag, but make it no-spawn safe: print the localhost URL and a browser-open instruction instead of invoking `open`, `xdg-open`, `start`, or any child-process API. Preserve the read-only, localhost-only dashboard behavior.

## Impact on acceptance criteria

No listed acceptance criterion changes. This clarifies the open-question implementation note for `--open` so it stays compatible with the runtime no-spawn boundary while still surfacing the browser URL.
