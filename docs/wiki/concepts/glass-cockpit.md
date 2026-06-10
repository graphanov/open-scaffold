---
title: Glass Cockpit
created: 2026-05-15
updated: 2026-05-15
type: concept
tags: [open-scaffold, governance, workflow, agent-orchestration]
sources: [ROADMAP.md]
confidence: high
contested: false
---

# Glass Cockpit

A glass cockpit is an operator-facing view of agentic work: what is running, what is blocked, what needs approval, and where the durable evidence lives.

Open Scaffold treats chat surfaces, dashboards, and status streams as visibility layers. They are useful because they make work observable, but they do not replace repository truth.

## Typical events

- Nudge or start event.
- Active session update.
- Blocker or question.
- Human answer or approval request.
- Completion report.
- Evidence receipt.
- PR link.

## Boundary

The cockpit points back to durable IDs: issue, task, plan, run, evidence, PR, release note. If a status post cannot be traced back to repo or GitHub truth, it is only a notification.

Related: [[human-in-the-loop-governance]], [[run-packets]], [[repo-native-work-record]].
