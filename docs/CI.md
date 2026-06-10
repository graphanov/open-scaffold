# CI templates

Open Scaffold keeps work reviewable by making the repo record testable. The workflows in `.github/workflows/` turn the same local checks into GitHub gates for pull requests, scheduled hygiene, evidence notes, and version-tag publishing.

These workflows are active in this repository and can also be copied into downstream Open Scaffold projects.

## Workflows

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `.github/workflows/ci.yml` | PRs and pushes to `main` | Full build, test, strict verifier, and CLI verifier. |
| `.github/workflows/plan-validate.yml` | PRs touching staged plan files under `.osc/plans/{active,backlog,blocked,done}/` | Validates changed plan files with `osc plan validate`. Errors fail the PR; warnings remain visible but non-blocking. |
| `.github/workflows/evidence-validate.yml` | PRs touching `.osc/releases/**/*.md` | Runs `./verify.sh --strict` and checks changed evidence notes for required sections and stale `pending` claims. |
| `.github/workflows/open-scaffold-pr-check.yml` | PRs and manual dispatch | Fork-safe structural `osc pr check` workflow; optional same-repo comment mirror when `OSC_PR_CHECK_COMMENT=true`. |
| `.github/workflows/stale-plans.yml` | Weekly Monday 09:00 UTC and manual dispatch | Detects active plans older than the configured threshold and opens or updates a GitHub Issue. |
| `.github/workflows/publish-npm.yml` | Manual dispatch | The only active npm publish path: builds, tests, verifies, checks the requested version, then publishes with npm trusted publishing and provenance. |

## Plan validation

`plan-validate.yml` checks out full history, builds the local CLI, finds changed stage plan files against the PR base branch, and runs:

```bash
node dist/cli.js plan validate <changed-plan>
```

The command fails on structural errors such as missing required sections, TODO markers, or status/folder drift. Non-strict warnings are printed but do not block the PR.

## Evidence validation

`evidence-validate.yml` is scoped to `.osc/releases/**/*.md`. It runs the repository strict verifier and then checks each changed evidence note for:

- `## Summary`
- `## Traceability`
- `## Verification`
- `## Outcome`
- no `pending` wording while also citing merged PRs, closed issues, tags, or GitHub Releases

This keeps release/evidence notes from becoming stale proof claims.

## Stale active plans

`stale-plans.yml` runs weekly and can also be started manually from the Actions tab. It scans `.osc/plans/active/*.md`, computes the latest git modification date across each parent plan and its amendment files, and opens an issue titled:

```text
Stale active plans — week of YYYY-MM-DD
```

The workflow does not move plans automatically. A human or coordinator still decides whether to continue, move to `blocked/`, or close to `done/` with evidence.

To customize the threshold:

- Manual run: set the `stale-days` input.
- Permanent change: edit the workflow input default from `30` to the desired number.
- Private fork: keep the same workflow, but adjust labels, issue wording, or schedule to match the team cadence.

## npm publishing

Open Scaffold uses one active npm publish path: manual GitHub Actions trusted publishing.

### Trusted publishing

`publish-npm.yml` is manually dispatched by the owner. It uses GitHub Actions OIDC / npm trusted publishing with least-privilege permissions:

```yaml
permissions:
  contents: read
  id-token: write
```

Required setup:

1. Configure npm trusted publishing for this repository and workflow filename.
2. Ensure `package.json` has the version that should be released.
3. Run the workflow manually with `expected-version` and `npm-tag` inputs.

The workflow refuses to publish if `package.json` does not match the requested version or if that package version is already on npm.

Version tags and GitHub Releases are publication markers only. They do not publish npm packages. The old token-based `npm-publish.yml` tag workflow was retired after v1 because creating the GitHub Release tag can otherwise trigger a duplicate publish run.

## Enabling, disabling, and adapting

- To disable a workflow, rename the file extension away from `.yml` or remove its trigger block.
- To keep workflows as templates only, move them out of `.github/workflows/` before committing.
- For private npm registries, change `registry-url` and the publish token or trusted-publishing setup in the selected publish workflow.
- For non-Node projects, keep plan/evidence/stale-plan workflows and replace only the build/test steps in `ci.yml` and the selected publish workflow.

## Local testing

Manual syntax check without extra tools:

```bash
python3 - <<'PY'
from pathlib import Path
import yaml
for path in Path('.github/workflows').glob('*.yml'):
    yaml.safe_load(path.read_text())
    print(f'valid yaml: {path}')
PY
```

With `act`, run one workflow locally when Docker is available:

```bash
act pull_request -W .github/workflows/plan-validate.yml
act workflow_dispatch -W .github/workflows/stale-plans.yml
```

`act` does not perfectly emulate GitHub tokens, issue creation, or npm publication. Treat local `act` runs as syntax and shell-flow checks, then rely on GitHub Actions for the final integration proof.

## Lifecycle E2E smoke

`npm run smoke:e2e` proves a fresh downstream project can complete the core Open Scaffold lifecycle without private infrastructure:

```text
fresh temp/downstream project
  -> mission defined
  -> active plan created
  -> tiny implementation or fixture change verified
  -> evidence/release note written
  -> plan closed
  -> final scaffold verification passes
```

The smoke asserts project-specific mission state, one active plan before close, real verification output, an evidence note, `close.sh` movement to `done/`, empty `active/` except `.gitkeep`, and final `./verify.sh --standard`.

It must not require Discord, Hermes, OMC/OMX, Codex connector review, GitHub PR creation, credentials, network access, or hosted dashboards.

Anti-cheat checks: fresh temp project per run, artifacts newer than the smoke start marker, no copied maintainer mission/history/private `.osc-dev/`, active plan absent after close, evidence linked to plan and verification, changelog stamped, final verifier green, and no writes outside the temp directory.

Smoke ladder: core lifecycle -> GitHub workflow -> simulated operator surface -> real operator transport -> runtime harness.
