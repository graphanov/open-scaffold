# Runtime Strategy Research Evidence Appendix

This appendix records the worker-report evidence used by `docs/RUNTIME_STRATEGY_RESEARCH_SYNTHESIS.md` for Milestone 16 runtime strategy discovery.

The full raw worker reports are local research artifacts, not canonical public project truth. The curated synthesis is the tracked decision input. Raw reports may be promoted later if a specific finding needs public provenance.

## Research run

```text
Run folder: /tmp/open-scaffold-m16-research/20260513T154743Z-m16-runtime-framework-research
Reports:    /tmp/open-scaffold-m16-research/20260513T154743Z-m16-runtime-framework-research/reports
Criteria:   docs/RUNTIME_STRATEGY_RESEARCH_CRITERIA.md
Synthesis:  docs/RUNTIME_STRATEGY_RESEARCH_SYNTHESIS.md
```

## Report inventory

| Report | Target | Size | Completion marker | Evidence role | Caveat |
|---|---|---:|---|---|---|
| `oh-my-codex.md` | `Yeachan-Heo/oh-my-codex` | 57,069 bytes | `REPORT_COMPLETE` | Codex-specific harness/native-runtime reference; strongest input for runtime authority, dispatch, replay, readiness, event vocabulary. | Source-grounded worker report, not independently executed by Open Scaffold. |
| `oh-my-claudecode.md` | `yeachan-heo/oh-my-claudecode` | 44,256 bytes | `REPORT_COMPLETE` | Claude Code orchestration/governance reference; strongest input for thin-spawn complexity and adapter-package boundary. | First lane hit max turns; recovered with compact corpus and completed. |
| `oh-my-openagent.md` | `code-yeongyu/oh-my-openagent` | 51,287 bytes | `REPORT_COMPLETE` | OpenCode plugin/harness reference; strongest input for non-runtime plugin strategy, worktree/team patterns, and hashline/edit-safety lessons. | Claude process ended with max-turns after writing a complete report; usable with caveat. |
| `oh-my-openagent-v4-hashing.md` | `code-yeongyu/oh-my-openagent` v4.x hashing | 37,422 bytes | `REPORT_COMPLETE` | Focused input for content anchors, deterministic hash identity, and edit-drift validation. | Narrow evidence topic; does not itself decide runtime/spawning strategy. |
| `get-shit-done.md` | `gsd-build/get-shit-done` | 53,125 bytes | `REPORT_COMPLETE` | Spec-driven multi-runtime workflow reference; strongest input for gates, repo-native state, runtime isolation, and adapter packages. | Source-grounded worker report, not independently executed by Open Scaffold. |
| `ouroboros.md` | `Q00/ouroboros` | 40,824 bytes | `REPORT_COMPLETE` | Specification-first Agent OS / multi-backend runtime reference; strongest input for `AgentRuntime`-style adapter protocol and sandbox-class translation. | Source-grounded worker report, not independently executed by Open Scaffold. |

## Worker prompt contract

Each worker received the shared research criteria from `docs/RUNTIME_STRATEGY_RESEARCH_CRITERIA.md` and was instructed to evaluate the target against the Milestone 16 options:

1. Open Scaffold remains runtime-neutral / non-spawning.
2. Open Scaffold adds thin opt-in `osc spawn` adapter invocation.
3. Runtime launching moves into adapter packages.
4. Open Scaffold eventually grows a sibling native runtime product.
5. The framework is irrelevant or strategically misleading.

Workers were also instructed to cite source files, docs, URLs, release notes, or examples for important claims and to distinguish source evidence from inference.

## Evidence-quality notes

- The worker reports are useful comparative research artifacts, but they are not themselves architectural decisions.
- The synthesis intentionally promotes only the cross-framework findings that affect Open Scaffold's product direction.
- The raw reports live outside the repo under `/tmp`; this keeps the public branch focused while preserving local provenance for review during the session.
- Any future public decision that depends on a specific claim should either cite the upstream framework directly or promote the relevant report excerpt into a tracked evidence note.

## Key convergence from the reports

The reports broadly agree that Open Scaffold should avoid accidental runtime ownership. The strongest near-term path is:

```text
protocol/evidence substrate first
adapter/runtime contract second
fake/local dispatch receipt third
real adapter packages later
native runtime only if regulated proofability and governed evolution require owning execution
```

They also support a stronger long-term product hypothesis: Open Scaffold could eventually justify native runtime ownership if the runtime is differentiated by regulated evidence, traceability, auditability, proofability, human authority, and governed evolution of skills/protocols — not by convenience spawning alone.

REPORT_COMPLETE
