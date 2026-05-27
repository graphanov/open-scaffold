# Plan: 111-anatomy-of-a-slice-public-proof

## Status

backlog

## Context

The project has strong dogfood evidence, but a first-time visitor cannot easily reconstruct one real slice from roadmap to release. A public anatomy page would turn the existing chain into credibility without relying on broad claims about auditability or methodology.

## Goal

Publish one public-safe walkthrough of a real Open Scaffold slice that links the plan, amendment or run packet, evidence note, PR, release note, and package/release outcome.

## Constraints / Out of scope

- Documentation only unless missing links require tiny evidence corrections.
- Use owner-neutral wording and public repository facts only.
- Do not expose private research, private chat surfaces, raw agent logs, or unpublished credentials.
- Do not claim the example proves all future work is correct; it demonstrates reconstructability.
- Prefer one excellent slice over a catalog of many examples.

## Files to touch

- `docs/anatomy-of-a-slice.md` — new walkthrough page.
- `README.md` or `docs/index.html` — one link to the walkthrough.
- Existing `.osc/releases/*.md` — only if a public path reference is stale and must be corrected.

## Implementation Architecture Coverage

- Strengthens: audit trails, recovery, adoption trust, and human review.
- Audit envelope: chosen slice ID, PR URL, plan path, evidence path, release note, package/release facts.
- Evaluation envelope: every link in the walkthrough must resolve and map to the same slice.
- Feedback routing: if the chosen slice has gaps, record those as follow-up backlog rather than silently editing history.
- Boundary: no raw transcripts, no private evidence, no compliance certification.

## Acceptance criteria

- [ ] The page walks one slice end-to-end: why it existed, where the plan lived, what was executed, what evidence was captured, what PR changed, and what release/public surface changed.
- [ ] All internal links resolve to tracked repository files or public GitHub URLs.
- [ ] The page includes a small diagram or ordered chain showing `roadmap -> plan -> run/evidence -> PR -> release`.
- [ ] The page explicitly says the chain demonstrates reconstructability, not automatic correctness.
- [ ] README or docs index links the page from a credibility/proof section.
- [ ] The chosen example is current enough that CLI/package names match npm latest at the time of the PR.

## Verification steps

1. Manually click or grep-check every local link in `docs/anatomy-of-a-slice.md`.
2. Verify the public PR URL and release/tag URL exist with `gh pr view` and `gh release view` where applicable.
3. Run a forbidden-content scan for private workspace markers, private chat-surface names, and raw agent-log paths in the new page.
4. Run `./verify.sh --strict`.

## Open questions

- Which shipped slice should be the canonical example: work dry-run preview, evolution compare visibility, or v1.0.0 launch?
- Should this page be purely docs, or should the README include a small static screenshot from the walkthrough?
