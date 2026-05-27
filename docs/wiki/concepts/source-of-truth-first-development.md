---
title: Source-of-Truth-First Development
created: 2026-05-15
updated: 2026-05-15
type: concept
tags: [open-scaffold, source-of-truth, workflow, evidence]
sources: [MISSION.md, ROADMAP.md, docs/SLICE_CLOSE_PROTOCOL.md]
confidence: high
contested: false
---

# Source-of-Truth-First Development

Source-of-truth-first development is the Open Scaffold principle that durable project state must live in versioned artifacts before it is trusted by humans or agents.

The practical rule is simple: chat, runtime transcripts, task boards, and model memory can help coordinate work, but they are not final truth. A project should be recoverable from mission, roadmap, plans, run records, evidence, decisions, release notes, and PR history.

## Why it matters

Agent-assisted development often loses context because important decisions are buried in a vanished chat window or a one-off runtime log. Open Scaffold makes context durable by routing each kind of information to the right place:

- mission and product intent -> `MISSION.md` and `ROADMAP.md`;
- scope and acceptance criteria -> `.osc/plans/`;
- execution attempts -> `.osc/runs/`;
- verification and outcomes -> `.osc/releases/`, evidence, CI, and PRs;
- compiled concepts -> `docs/wiki/`.

## Boundary

This does not mean every thought needs a file. It means meaningful claims should become inspectable artifacts before they shape future work.

Related: [[repo-native-work-record]], [[evidence-first-development]], [[agent-resumability]].
