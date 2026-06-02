# PR review with Open Scaffold

`osc pr check` gives reviewers a compact structural read of a PR's work record.

It checks whether the referenced plan/evidence/run/close-decision shape is present. It does **not** decide whether the implementation is correct, secure, compliant, production-ready, or approved.

## Local use

```bash
osc pr check <plan-slug>
osc pr check <plan-slug> --format json
```

Optional GitHub-online modes may be used when network and credentials are available, but offline structural checking remains the default:

```bash
osc pr check <plan-slug> --online-github
```

Output always includes a structural-only warning.

## What reviewers should look for

- Plan path and stage.
- Acceptance criteria and whether they are checked.
- Evidence note presence and whether it is still a skeleton.
- Run-packet references, when execution was delegated.
- Close-decision fields: `approval.status` and `approval.rationale`.
- Verification commands and results in the PR body or evidence note.

## GitHub workflow template

This repo includes `.github/workflows/open-scaffold-pr-check.yml` as a fork-safe template:

- PR-code checkout/build/check job has `contents: read` only.
- Comment writing is a separate opt-in job guarded to same-repo, non-Dependabot PRs.
- Forks still get the structural check and artifacts; comment mutation is skipped.
- The workflow writes Markdown and JSON artifacts and mirrors Markdown into `$GITHUB_STEP_SUMMARY`.

Enable PR comments by setting repository variable `OSC_PR_CHECK_COMMENT=true`. For deterministic checks, set `OSC_PR_CHECK_PLAN=<plan-slug>` or use the manual workflow input. On PRs without an explicit slug, the workflow attempts to detect changed non-amendment plan files.

## Boundary

Treat this as review support, not a gate that replaces CI, Codex review, security review, domain review, or owner approval.
