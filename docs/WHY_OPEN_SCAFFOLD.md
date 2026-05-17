# Why Open Scaffold exists

A short visual story for first-time viewers who want to understand what Open Scaffold solves before reading the protocol pages. The diagrams here describe the same loop covered in `README.md` and `docs/EXAMPLES.md`, drawn out in a way that is easier to scan.

For the full system boundary map see [`docs/OPEN_SCAFFOLD_SYSTEM.md`](OPEN_SCAFFOLD_SYSTEM.md). For reference-truth labels (public, private, future, adapter) see [`docs/REFERENCE_TRUTH.md`](REFERENCE_TRUTH.md).

## The problem

AI-assisted work tends to dissolve into chat logs and terminal sessions. Weeks later nobody can reconstruct what was asked, what changed, what was verified, or who approved it.

```mermaid
flowchart LR
    A["Idea / request"] --> B["Chat thread"]
    B --> C["Agent session"]
    C --> D["PR"]
    D --> E["'looks done?'"]
    E -.-> F["Lost intent\nLost acceptance criteria\nLost evidence\nLost approval"]

    classDef bad fill:#FEE2E2,stroke:#B91C1C,color:#7f1d1d;
    class F bad;
```

The chat, the session, and the PR all exist, but the loop has no durable backbone. Each artifact is fragile on its own.

## What Open Scaffold adds

Open Scaffold makes the repository the shared memory. Chat, terminals, agent sessions, and GitHub comments still help operate the work, but durable truth lives in files and PRs.

```mermaid
flowchart LR
    M["MISSION.md\n(what we are building)"] --> P[".osc/plans/...\n(plan: goal, constraints,\nacceptance criteria,\nverification)"]
    P --> R[".osc/runs/<run_id>/run.json\n(run packet: work package bound to\ntask, branch, status channel,\nevidence path)"]
    R --> X["Branch / PR\n(implementation)"]
    X --> V["./verify.sh\n(methodology check)"]
    V --> E[".osc/releases/...\n(release / evidence note)"]
    E --> N["Next slice / amendment\n(scope evolves cleanly)"]
    N --> P

    classDef artefact fill:#DCFCE7,stroke:#16A34A,color:#052e16;
    class M,P,R,X,V,E,N artefact;
```

Each artefact is a small file. Together they form a chain that survives context loss across sessions, agents, reviewers, and time.

## Where the scaffold stops

Open Scaffold is the repo foundation; it is not the runtime. Coordinators, runtimes, status/approval channels, and GitHub all sit around that foundation and read or write to it.

```mermaid
flowchart TB
    subgraph CORE["Open Scaffold core (this repo protocol)"]
        M2["mission / roadmap"]
        P2["plans / amendments"]
        R2["run.json work packages\n(run packets)"]
        V2["verification"]
        E2["evidence / releases"]
    end

    COORD["Task trackers/coordinators\n(task bridges: GitHub Issues, Linear/Jira,\ncustom bots, private examples)"] -. "writes plans, reads evidence" .-> CORE
    RT["Runtime wrappers / runners\n(Claude Code, Codex, Cursor,\nGemini, OMC, OMX, human)"] -. "executes bounded work" .-> CORE
    GS["Status / approval channels\n(operator surfaces: Discord, Slack, Telegram,\nGitHub comments, CLI)"] -. "shows status, asks questions" .-> CORE
    GH["GitHub\n(issues, PRs, CI, releases)"] -. "publishes implementation" .-> CORE

    classDef core fill:#DBEAFE,stroke:#2563EB,color:#0f172a;
    classDef adj fill:#F1F5F9,stroke:#475569,color:#0f172a;
    class M2,P2,R2,V2,E2 core;
    class COORD,RT,GS,GH adj;
```

The same protocol works with any compliant runtime or coordinator. Replace one box without touching the others.

## When the scaffold helps

Open Scaffold is useful when work needs to survive context loss: multi-session AI-assisted development, consulting and client delivery where "what was asked, decided, and verified" must be reviewable later, compliance- or audit-sensitive work that wants lightweight file-level evidence, and multi-agent handoffs where chat history is not enough.

It is overkill for one-off scripts, disposable prototypes, or tasks that fit in a single clean session.
