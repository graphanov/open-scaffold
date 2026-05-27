---
title: Repo-Native Work Record
created: 2026-05-15
updated: 2026-05-27
type: concept
tags: [open-scaffold, agent-orchestration, workflow, source-of-truth]
sources: [MISSION.md, ROADMAP.md, AGENTS.md]
confidence: high
contested: false
---

# Repo-Native Work Record

Open Scaffold treats a repository as the work record for human-plus-agent project work. The repo holds the durable protocol: mission, roadmap, plans, handoffs, run packets, evidence, decisions, and release receipts.

The repo provides stable conventions that different humans, agents, task systems, and runtime harnesses can use without relying on hidden session state.

## What the repo owns

- Product intent and constraints.
- Work item scope and acceptance criteria.
- Evidence and verification receipts.
- Handoff contracts between orchestrators and execution lanes.
- Public project knowledge in this wiki.

## What the repo does not own

- Live chat state.
- Private owner context.
- Long-running process supervision by default.
- Credentials or runtime-specific secret state.

Related: [[source-of-truth-first-development]], [[run-packets]], [[open-scaffold-vs-agent-memory]].
