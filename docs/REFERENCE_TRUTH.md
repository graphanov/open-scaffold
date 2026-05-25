# Public Reference Truth Labels

Open Scaffold deliberately mentions external coordinators, runtime harnesses, and operator surfaces. Those names are examples and boundary references, not hidden product dependencies.

Use these labels when public docs mention a tool whose availability or role could be misunderstood:

| Label | Meaning |
|---|---|
| **Public example** | Publicly reachable tool, service, or repository used as an example. |
| **Private deployment example** | A private installation or dogfood environment that proves a pattern, but is not part of Open Scaffold core and is not required to adopt it. |
| **Coordinator/orchestrator** | A tool or service that selects, routes, supervises, or bridges work without becoming Open Scaffold core truth. |
| **Adapter candidate** | A future or optional adapter direction; the Open Scaffold core contract is stable enough to describe, but no core runtime launch dependency is implied. |
| **Runtime lane** | A tool that can execute a bounded run packet outside Open Scaffold core. It is not canonical project truth. |
| **Operator surface** | A chat, PR, CLI, dashboard, or notification layer that shows status or asks questions. It is not the source of truth. |
| **Historical/unmigrated repository** | A public repository that exists under an older owner or namespace. Treat links as historical until an owner-approved migration happens. |
| **External anchor adapter** | Optional future anchoring provider for audit-envelope roots or digests. Not required for core adoption and not a compliance certification claim. |

## Current public references

| Reference | Label | Public truth |
|---|---|---|
| GitHub Issues / PRs / CI | Public example | GitHub can own public work artifacts and review gates. Open Scaffold does not replace it. |
| Discord / Slack / Telegram / CLI dashboards | Operator surface | These can expose status and approvals, but repo files and GitHub remain durable truth. |
| Hermes / Hermes Kanban | Private deployment example / Coordinator/orchestrator | Mentioned as one coordinator pattern. Not required, bundled, or a dependency of Open Scaffold. |
| Claw / OpenClaw | Coordinator/orchestrator | Mentioned as a possible orchestrator/agent surface. Not bundled or required. |
| OMC / oh-my-claudecode | Runtime lane / adapter candidate | Claude Code-oriented harness lane that can consume Open Scaffold run packets through an adapter outside core. |
| OMX / oh-my-codex | Runtime lane / adapter candidate | Codex-oriented harness lane that can consume Open Scaffold run packets through an adapter outside core. |
| Command Center / private cockpit examples | Private deployment example | Owner-local dogfood evidence only. Do not copy private state, auth assumptions, or project-specific machinery into public core. |
| Python reference parser | Public example | Optional read-only parser for Python tooling and vendored scripts. It mirrors core plan/scaffold parsing semantics but does not replace the TypeScript CLI or mutate plans. |
| Hedera Consensus Service / Sigstore-Rekor / timestamping services | External anchor adapter | Possible future providers for anchoring audit-envelope roots or digests. They are not core dependencies, not required for adoption, and not proof of legal compliance by themselves. |

## Writing rule

When adding or editing docs, keep the distinction explicit:

```text
Open Scaffold core packages and preserves truth.
Coordinators choose and route work.
Runtime lanes execute outside core.
Operator surfaces show status and collect approvals.
Private dogfood examples prove patterns but are not adoption requirements.
```
