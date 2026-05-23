# Plan: 097-omo-security-hardening

## Status

active

## Context

A read-only OmO `/security-research` run, followed by Hermes verification, found several actionable release-path and supply-chain hygiene improvements. The high-severity `actions@v6` claim was verified as a false positive and is intentionally excluded from this patch.

## Goal

Harden Open Scaffold's release and dependency maintenance posture without changing runtime behavior or promoting OmO into core.

## Constraints / Out of scope

- Do not implement runtime spawning or new adapter behavior.
- Do not act on the rejected `actions/checkout@v6` / `actions/setup-node@v6` false positive.
- Do not publish npm, create a GitHub Release, or merge without owner approval.
- Keep fixes narrow: release workflow pinning, dependency update scanning, and documented security posture.

## Files to touch

- `.github/workflows/publish-npm.yml` — remove publish-time `npm@latest` drift by pinning the npm CLI used in the trusted publishing job.
- `.github/dependabot.yml` — add automated update scanning for npm manifests and GitHub Actions.
- `SECURITY.md` — document reporting, trusted publishing posture, optional native dependency posture, runtime command trust boundary, and cockpit config trust boundary.
- `package.json` — include `SECURITY.md` in the published npm package surface.
- `src/tasks.ts` — clarify that the local task database uses an optional native dependency and core workflows can avoid it.
- `packages/runtime-omx/README.md` — document `--omx-command` as trusted-operator-only when explicit spawning is allowed.

## Implementation Architecture Coverage

- Strengthens: release-path supply-chain hygiene, dependency maintenance, adoption trust, runtime authority disclosure.
- Audit envelope: OmO evidence in `.osc/runs/omo-security-research-20260523T205502Z/`, this plan, the patch diff, and verification output.
- Evaluation envelope: `git diff --check`, `./verify.sh --strict`, `npm test -- --run`, `npm run build`, and targeted checks that the new Dependabot config and SECURITY posture exist.
- Feedback routing: rejected or low-confidence OmO findings remain in the verified report; only verified findings become tracked code/docs changes.
- Boundary: no npm publish, GitHub Release, runtime spawn behavior, credential handling, or security certification.

## Acceptance criteria

- [ ] Trusted publishing workflow no longer installs unbounded `npm@latest` in the privileged publish job.
- [ ] Dependabot covers npm and GitHub Actions update surfaces.
- [ ] Public security posture documents reporting path, optional native dependency posture, trusted publishing, runtime command override boundary, and cockpit webhook config trust boundary.
- [ ] Runtime OMX docs make clear `--omx-command` is trusted-operator-only and only relevant with explicit `--allow-spawn`.
- [ ] Open Scaffold verification and Node test/build gates pass.

## Verification steps

1. `git diff --check`
2. `./verify.sh --strict`
3. `npm test -- --run`
4. `npm run build`
5. Inspect `.github/workflows/publish-npm.yml`, `.github/dependabot.yml`, `SECURITY.md`, `src/tasks.ts`, and `packages/runtime-omx/README.md` for the acceptance criteria.

## Open questions

- None for this immediate hardening patch. Actual npm publication and GitHub Release alignment remain separate owner-gated public-surface steps if a package release is desired.
