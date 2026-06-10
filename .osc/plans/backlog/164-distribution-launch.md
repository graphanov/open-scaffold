# Plan: 164-distribution-launch

## Status

backlog

## Context

Phase 4 of the 2026-06-10 harness-identity pivot (see plan 161). Once the surface is collapsed (162) and the winnable proof exists (163), Open Scaffold needs distribution assets that show rather than tell. Folds the intent of backlog plans 110 (attempt-diff demo readme), 111 (anatomy of a slice), 115 (downstream example proof), and 116 (launch readiness distribution pack).

## Goal

A stranger can watch a 60-second screencast (kill the session mid-task, resume cold from the packet), clone one real downstream example repo, and reproduce the experience in their own repo within five minutes.

## Constraints / Out of scope

- No paid promotion mechanics; this slice produces assets, not campaigns.
- The screencast shows real commands against a real repo; no staged output.
- The downstream example is a genuinely separate repo using the published npm package, not a fixture inside this repo.
- Publish/release/announcement remain owner-gated decisions.

## Files to touch

- `.github/assets/` — refreshed resume screencast (gif + mp4) matching the post-162 surface.
- New downstream example repository (separate repo, linked from README).
- `README.md` — embed the screencast and the three proof numbers from plan 163.
- `docs/EXAMPLES.md` — anatomy-of-a-slice walkthrough using the downstream repo.
- Launch checklist note under `.osc/releases/`.

## Acceptance criteria

- [ ] Screencast under 75 seconds demonstrating interrupt-then-resume with the shipped surface.
- [ ] Downstream example repo exists, uses the published package, and its work record passes `osc verify --evidence-chain`.
- [ ] README five-minute path tested on a clean machine (or container) from copy-paste only.
- [ ] Launch checklist enumerates owner gates: npm publish, GitHub Release, announcement venues.

## Verification steps

1. Fresh-container walkthrough of the README path, timed.
2. `osc verify` green inside the downstream example.
3. Asset weight check: gif sized for GitHub README rendering.

## Open questions

- Downstream example domain: CLI tool, small web app, or data script (owner taste).
- Whether the screencast also demos `$team` or stays single-lane for clarity.
