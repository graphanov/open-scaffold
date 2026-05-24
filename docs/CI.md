# CI templates

Open Scaffold keeps work reviewable by making the repo record testable. The workflows in `.github/workflows/` turn the same local checks into GitHub gates for pull requests, scheduled hygiene, evidence notes, and version-tag publishing.

These workflows are active in this repository and can also be copied into downstream Open Scaffold projects.

## Workflows

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `.github/workflows/ci.yml` | PRs and pushes to `main` | Full build, test, strict verifier, and CLI verifier. |
| `.github/workflows/plan-validate.yml` | PRs touching `.osc/plans/**/*.md` | Validates changed plan files with `osc plan validate`. Errors fail the PR; warnings remain visible but non-blocking. |
| `.github/workflows/evidence-validate.yml` | PRs touching `.osc/releases/**/*.md` | Runs `./verify.sh --strict` and checks changed evidence notes for required sections and stale `pending` claims. |
| `.github/workflows/stale-plans.yml` | Weekly Monday 09:00 UTC and manual dispatch | Detects active plans older than the configured threshold and opens or updates a GitHub Issue. |
| `.github/workflows/npm-publish.yml` | Version tag pushes matching `v*` | Builds, tests, verifies, checks the tag against `package.json`, then publishes to npm using `NPM_TOKEN`. |

## Plan validation

`plan-validate.yml` checks out full history, builds the local CLI, finds changed plan files against the PR base branch, and runs:

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

`stale-plans.yml` runs weekly and can also be started manually from the Actions tab. It scans `.osc/plans/active/*.md`, computes the last git modification date, and opens an issue titled:

```text
Stale active plans — week of YYYY-MM-DD
```

The workflow does not move plans automatically. A human or coordinator still decides whether to continue, move to `blocked/`, or close to `done/` with evidence.

To customize the threshold:

- Manual run: set the `stale-days` input.
- Permanent change: edit the workflow input default from `30` to the desired number.
- Private fork: keep the same workflow, but adjust labels, issue wording, or schedule to match the team cadence.

## npm publishing

`npm-publish.yml` is intentionally tag-gated. It does not run on regular pushes or pull requests.

Required setup:

1. Add an npm automation token as the repository secret `NPM_TOKEN`.
2. Ensure `package.json` has the version that should be released.
3. Push a matching tag such as `v0.4.19`.

The workflow refuses to publish if the tag does not match `package.json` or if that package version is already on npm.

Projects using npm trusted publishing can keep a separate manual trusted-publishing workflow instead. Do not run both publish paths for the same release without an owner decision.

## Enabling, disabling, and adapting

- To disable a workflow, rename the file extension away from `.yml` or remove its trigger block.
- To keep workflows as templates only, move them out of `.github/workflows/` before committing.
- For private npm registries, change `registry-url` and the publish token secret name in `npm-publish.yml`.
- For non-Node projects, keep plan/evidence/stale-plan workflows and replace only the build/test steps in `ci.yml` and `npm-publish.yml`.

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
