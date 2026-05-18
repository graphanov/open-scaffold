# Plan: 072-cross-platform-workflow-docs

## Status

backlog

## Context

The GitHub Workflow document (`docs/GITHUB_WORKFLOW.md`) and the broader identity chain (issue → plan → run → PR → evidence → release) are described exclusively in GitHub terms: Issues, Pull Requests, `gh` CLI, Codex connector. But many teams use GitLab, Bitbucket, Gitea, or Azure DevOps. The protocol itself is platform-agnostic — plans, runs, and evidence are just files — but the workflow documentation makes it seem GitHub-only. Cross-platform workflow documentation would make Open Scaffold adoptable by teams on any git forge without them having to translate the GitHub-specific instructions themselves.

## Goal

Ship cross-platform workflow documentation covering GitLab, Bitbucket, and Gitea, mapping the GitHub identity chain to each platform's equivalent primitives (Issues → merge requests → CI → releases), with platform-specific command examples.

## Constraints / Out of scope

- Documentation only — no code changes to the scaffold itself. The scaffold is already platform-agnostic; the docs just need to reflect that.
- Covers GitLab (Self-Managed and SaaS), Bitbucket Cloud, and Gitea as the three most common non-GitHub forges.
- Does NOT implement platform-specific CLI commands or adapters — documents how to use existing `osc` commands with each platform.
- Does NOT test or certify the workflows on each platform (that would require platform accounts and CI setup beyond the scope of a docs plan).
- Codex connector is GitHub-only; document alternatives for each platform (GitLab CI review jobs, Bitbucket Pipeline review steps, manual review).

## Files to touch

- `docs/GITLAB_WORKFLOW.md` — new file: GitLab workflow mapping (Issues → Merge Requests → CI → Releases), command examples using `glab` CLI, MR template
- `docs/BITBUCKET_WORKFLOW.md` — new file: Bitbucket workflow mapping (Issues → Pull Requests → Pipelines → Downloads/Releases), command examples
- `docs/GITEA_WORKFLOW.md` — new file: Gitea workflow mapping (Issues → Pull Requests → Actions → Releases), command examples using `tea` CLI
- `docs/GITHUB_WORKFLOW.md` — add a "Cross-Platform" section at the top linking to the other platform docs
- `docs/OPEN_SCAFFOLD_SYSTEM.md` — update the GitHub/public versioning layer section to mention platform agnosticism
- `docs/COMPARISON.md` — add note about platform flexibility as a differentiator

## Acceptance criteria

- [ ] `docs/GITLAB_WORKFLOW.md` exists with: platform overview, identity chain mapping (GitHub Issue → GitLab Issue, PR → Merge Request, Codex review → GitLab CI review job, GitHub Release → GitLab Release), `glab` CLI examples for issue creation, MR creation, and CI status checking, MR template with scaffold traceability fields
- [ ] `docs/BITBUCKET_WORKFLOW.md` exists with: platform overview, identity chain mapping (GitHub Issue → Bitbucket Issue, PR → Pull Request, Codex review → Pipeline review step, GitHub Release → Bitbucket Download/Release), `curl`/API examples for issue and PR management (Bitbucket has no official CLI), PR template
- [ ] `docs/GITEA_WORKFLOW.md` exists with: platform overview, identity chain mapping (GitHub Issue → Gitea Issue, PR → Pull Request, Codex review → Gitea Actions review job, GitHub Release → Gitea Release), `tea` CLI examples
- [ ] Each platform doc follows the same structure: (1) Platform overview, (2) Identity chain mapping table, (3) Setup: creating the first issue from a roadmap item, (4) Branching and PR/MR workflow, (5) CI integration, (6) Release and evidence, (7) Platform-specific limitations (e.g., no Codex connector, different CI syntax)
- [ ] Each platform doc includes a copy-pasteable PR/MR template body with scaffold traceability fields (plan slug, run ID, task ID, verification, evidence path)
- [ ] `docs/GITHUB_WORKFLOW.md` has a prominent "Other Platforms" section at the top linking to the three new docs
- [ ] `docs/OPEN_SCAFFOLD_SYSTEM.md` section 7 ("GitHub/public versioning layer") is renamed to "Public versioning layer" and states that the protocol works with any git forge, with GitHub as the documented reference implementation
- [ ] All docs use neutral language: "merge request" for GitLab, "pull request" for Bitbucket/Gitea, not assuming GitHub terminology
- [ ] `./verify.sh --standard` passes (new docs are additive, no plan/schema violations)

## Verification steps

1. **Structure parity:** For each platform doc, verify it has all 7 sections listed in AC #4. Check heading counts match across docs.
2. **Platform accuracy:** For each doc, verify that the CLI commands and API examples use the correct platform tool: `glab` for GitLab, `tea` for Gitea, `curl` with correct Bitbucket API endpoints.
3. **Terminology audit:** Search each doc for "GitHub" outside of comparison tables. Verify GitHub is only used in cross-reference contexts, not as default terminology.
4. **Links:** Verify all cross-document links are valid (relative paths between docs/ files).
5. **Verify:** Run `./verify.sh --standard`. Verify passes.

## Open questions

- Should the scaffold generate platform-specific CI templates (`.gitlab-ci.yml`, `bitbucket-pipelines.yml`) like it does `.github/workflows/`? Defer to a follow-up plan — the docs are the first step. CI templates require testing on each platform, which is significantly more effort.
- Azure DevOps support? Deferred — Azure DevOps has a different enough model (work items, boards, pipelines as separate products) that a proper mapping requires more research. Add if there's demand.
- Should the platform docs be in a `docs/platforms/` subdirectory? Yes — as the number of platform docs grows, they should be grouped. Do this as part of this plan: `docs/platforms/github.md` (move and rename existing), `docs/platforms/gitlab.md`, `docs/platforms/bitbucket.md`, `docs/platforms/gitea.md`, with `docs/GITHUB_WORKFLOW.md` becoming a redirect/symlink for backward compatibility.
