# Plan: 084-macos-tmp-brownfield-init

## Status

done

## Context

OSC Sentinel reproduced a first-run brownfield failure on macOS: `npx open-scaffold@latest init --from-existing --tier min --target /tmp/<dir> --force` refuses to run because `/tmp` is a system compatibility symlink to `/private/tmp`. The symlink guard is useful for project-owned paths, but rejecting the standard macOS `/tmp` alias makes copy-paste smoke commands fail before users even reach scaffold setup. The repo is clean, no PR is open, and this is a narrow product-friction fix from the build-in-public checker context.

## Goal

Allow brownfield init targets under the standard macOS `/tmp` compatibility alias by canonicalizing that alias to `/private/tmp`, while preserving symlink rejection for arbitrary project paths and scaffold-owned destinations.

## Constraints / Out of scope

- Do not weaken symlink safety for arbitrary user-created symlinks.
- Do not broaden brownfield init beyond `--tier min` or change scaffold file sets.
- Do not start a publish-only release loop; `package.json` already carries the current unpublished release-train candidate.
- Do not mutate npm, GitHub Releases, secrets, or deployment surfaces.

## Files to touch

- `src/init.ts` — normalize the macOS `/tmp` alias before the existing symlink guard runs.
- `tests/init.test.ts` — add regression coverage for the macOS `/tmp` brownfield path when the platform exposes that alias.
- `README.md` or `docs/MINIMUM_VIABLE_SCAFFOLD.md` — document the canonical target behavior if user-visible output changes.
- `.osc/releases/2026-05-20-084-macos-tmp-brownfield-init.md` — evidence note with automation provenance.

## Acceptance criteria

- [ ] On macOS, `init --from-existing --tier min --target /tmp/<dir> --force` succeeds instead of rejecting `/tmp` as a symlink.
- [ ] Arbitrary symlinked target paths outside the known macOS `/tmp` alias remain rejected.
- [ ] Brownfield init still preserves existing project files and scaffold-owned conflict behavior.
- [ ] Evidence and PR body explicitly state John Lomein autopilot provenance and owner gates.
- [ ] `git diff --check`, targeted tests, full tests, build, package dry-run, and `./verify.sh --strict` pass before reporting success.

## Verification steps

1. Run `npm test -- tests/init.test.ts --run` — targeted init regression tests pass.
2. Run `node dist/cli.js init --from-existing --tier min --target /tmp/<fresh-dir> --force` after build on macOS — command succeeds and writes files under the canonical `/private/tmp` path.
3. Run `git diff --check`, `npm test -- --run`, `npm run build`, `npm pack --dry-run --json`, and `./verify.sh --strict` — all pass.

## Open questions

None.
