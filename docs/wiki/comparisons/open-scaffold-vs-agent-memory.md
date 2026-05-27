---
title: Open Scaffold vs Agent Memory
created: 2026-05-15
updated: 2026-05-15
type: comparison
tags: [open-scaffold, source-of-truth, agent-orchestration, compiled-knowledge]
sources: [MISSION.md, ROADMAP.md, docs/wiki/SCHEMA.md]
confidence: high
contested: false
---

# Open Scaffold vs Agent Memory

Open Scaffold and agent memory solve different problems.

Agent memory helps an assistant remember preferences, facts, and prior context. It is useful, but it is usually hidden, model-dependent, and hard to audit.

Open Scaffold makes project truth explicit in the repository. It is useful because humans, agents, and reviewers can inspect the same files and GitHub artifacts.

## Difference

| Question | Agent memory | Open Scaffold |
|---|---|---|
| Who remembers? | A specific assistant or memory backend. | The repository and GitHub history. |
| Who can audit it? | Usually limited. | Anyone with repo access. |
| Best for | Preferences and recall hints. | Plans, evidence, decisions, handoffs, releases. |
| Failure mode | Hidden or stale context. | Over-structuring if used without scope discipline. |

## How they work together

Agent memory can point to the repo. It should not replace the repo.

Related: [[source-of-truth-first-development]], [[repo-native-work-record]], [[body-of-work-wiki]].
