# Extended FAQ — open-scaffold

Questions that did not fit in the main README but are still worth answering.

---

### Is this useful for consulting, client delivery, or compliance/audit work?

> Yes, with caveats. Consulting and client delivery benefit because the mission, plans, amendments, evidence receipts, and evidence-backed close protocol make it possible to answer "what did you actually do, why, and how do you know it worked?" months later without reconstructing a chat log. Compliance and audit work benefit because every meaningful change traces back to a plan, acceptance criteria, verification commands, and an approval decision — all in version control. **What this is not:** a substitute for SOC 2, ISO 27001, HIPAA, GDPR, or any formal compliance regime. The scaffold gives those processes durable, reviewable repo artifacts to point at; it does not implement controls, encryption, access policy, or auditor relationships. Use it as evidence substrate, not as the compliance program. See [Auditability boundary](TRUST_BOUNDARIES.md#auditability-boundary).

### When is Open Scaffold overkill?

> When the work fits in one clean session and nobody else needs to reconstruct it: one-off scripts, disposable prototypes, a one-hour automation you will never read again. The scaffold's value comes from work that outlives its first session. If yours doesn't, save the 15 minutes.

### Can I run this for 5 hours straight and come back to a finished product?

> Not by Open Scaffold itself. Open Scaffold is not a hands-off product factory. What you *can* do: write a plan, give it to an outside tool or runner, and come back to work that still traces back to your acceptance criteria. Examples include a private coordinator deployment such as Hermes/Claw, OMC with `/autopilot`/`/ralph` for Claude Code, or OMX with Codex team/retry/execution workflows. These are runtime lanes or private deployment examples, not Open Scaffold dependencies; see [`ADAPTERS.md#reference-labels-for-named-tools`](ADAPTERS.md#reference-labels-for-named-tools). The difference the scaffold makes is **recoverability** — because the plan is on disk, you can read what the agent did, compare against the ACs, and know exactly where to resume. Without it, a long run is hard to audit.

### Does this reduce token usage / cost?

> Not globally proven. Plans may reduce context-stuffing and blind retries, but token/cost savings require receipts. Treat cost reduction as a workflow-control hypothesis to measure in your own repo. For repeated-attempt loops, start with the diagnostic/experimental `osc evolve analyze <loop-dir> --efficiency` report; if token/cost telemetry is missing, the report must say missing rather than guessing. For bounded naked-Codex comparisons with source-labeled receipts, inspect `osc prove compare examples/proof/codex-token-efficient-resume/manifest.json --format markdown` (4.330033x median reported total-token reduction for one cold-resume decision) and `osc prove compare examples/proof/scaffold-vs-naked-codex/manifest.json --format markdown` (older compact evolution-controller fixture).

### Will my agent actually follow the protocol, or will it just ignore the files?

> Depends on the agent and how you prompt it. Claude Code and Codex read [CLAUDE.md](../CLAUDE.md) and [AGENTS.md](../AGENTS.md) automatically. Cursor, Aider, and most others will too if you tell them to once. The protocol holds up better because the instructions are direct and `verify.sh` is mechanical — not only a judgment call. If your agent routinely ignores explicit instructions, no scaffold can fully solve that.

### Why are CLAUDE.md and AGENTS.md hand-duplicated instead of generated from one source?

> Because a build script that breaks in six months is worse than two files that might drift in six months. Drift you notice on the next read; a broken generator rots the template silently. The paired-view header in each file tells you to mirror edits, and if drift happens three times in the first year, we revisit. ([Design choices](decisions/README.md))

### Isn't this just Agile / PRD-driven development with new vocabulary?

> Partially. The mission/plan/amendment loop is lifted from disciplined engineering practice — none of it is new. What *is* new: the protocol is designed so an agent can execute it mechanically. Plans are structured so they parse. Amendments are numbered so they order. `verify.sh` is a compliance check, not a process meeting. It's Agile for a workforce that reads markdown.

### How much time does this actually save me vs. just winging it?

> Not benchmarked, honestly. Treat any specific time-savings number as a hypothesis until you have measured before/after artifacts. Open Scaffold does not make the model smarter and is not a public proof of productivity. What can be measured locally is workflow control: smaller handoff packets, required decision fields preserved, missing criteria surfaced, blind retries prevented, and token/cost receipts recorded when available.

### What if I'm bad at writing plans? Does this fall apart?

> No. The [handoff template](../.osc/plans/handoff-template.md) is a fill-in-the-blanks form with 7 sections. If you can answer "what am I trying to do, how will I know it worked, what's out of scope," you can write a plan. If you can't answer those yet, pause before coding — that uncertainty is exactly what the plan is supposed to expose.

### Is this just going to slow me down? I'm used to vibing.

> A little on day one. That is the tax. After that, the value is still a hypothesis until measured: less re-explanation, fewer blind retries, cleaner handoff recovery, and clearer stop/inspect/redesign decisions. For anything you will work on more than once, the trade may be worth it; verify it with artifacts rather than assuming it.

### Can I adopt this mid-project, or is it only for new repos?

> Mid-project works fine. Copy the template files into your existing repo, write a `MISSION.md` describing what the project is *now* (not what it was when you started), and create your first plan for whatever you're working on next. Everything before adoption stays as-is; everything after gets the discipline.

### Does this work for non-code projects — writing, research, design?

> Yes. Swap "files to touch" for "deliverables" and "acceptance criteria" for "done means" — the rest maps cleanly. Mission definitions, immutable plans, amendments, and session handovers are writing-agnostic. Research projects arguably benefit *more* — their drift problem is worse, not better.

### What happens if my agent and the methodology disagree?

> The methodology wins, and the agent writes an ADR explaining why it thinks the rule is wrong. If the rule actually *is* wrong, the amendment protocol is how you fix it: propose a change, get it reviewed, write it down. What you don't do is silently ignore the rule.

### Can I customize the plan schema / folder layout / amendment rules?

> Yes. It's your fork. The handoff template is a starting point, not a law. Add a "Risks" section if your project needs one, rename folders if you want, bring your own ADR format. Just keep the immutability rule — that's the load-bearing one.

### Do I have to commit plans to git, or can I keep them local?

> You have to commit them. Immutability means "committed to version control." An uncommitted plan is a draft; a committed plan is a record. Uncommitted plans can be edited silently, which is exactly what the protocol exists to prevent.

### What changes after I adopt it?

> You stop losing as much context between sessions, stop re-explaining the same constraints, and stop waking up to "what did I decide last Tuesday?" For a multi-session project, that is a bigger deal than it sounds.

### Who built this?

> [@graphanov](https://github.com/graphanov). Scoped, planned, implemented, reviewed, and shipped using the scaffold's own methodology.

### How ready is it — is it a toy?

> Not as a mature production platform. Open Scaffold is a pre-1.0 repo-record layer with a stable-enough local workflow for mission, plan, evidence, handoff, structural verification, review, and gate files. It is not a hosted orchestrator, compliance program, production-readiness guarantee, or proof of broad adoption. Pin versions if you depend on exact CLI output, read [`STABILITY.md`](STABILITY.md) for command maturity, and treat the proof ledger as bounded evidence rather than a universal benchmark.

### Was this built with AI? Isn't that ironic?

> Yes, and no. The point is that AI-assisted development needs discipline *more* than traditional development, not less — the failure modes (context loss, silent drift, scope creep) are amplified, not introduced, by AI. Dogfooding the methodology on itself is the tightest possible test loop.

### How stable is the methodology? Will the schema change next month?

> The core rules — plan immutability, amendment protocol, mission-first gating — are stable and won't break. The plan schema may gain optional sections. The scripts may grow flags. If anything breaks, you'll see it in a CHANGELOG and — because the scaffold eats its own dogfood — in an amendment file to the scaffold's own plans.

### What's the "I tried it and it didn't work" story?

> The most likely failure mode: you write the mission and the first plan, then never touch the methodology again. The files go stale, the amendment protocol becomes a "later" item, and you're back to winging it with extra paperwork on top. Fix: treat `verify.sh` as a habit, not a ceremony. If the check fails, fix it before moving on. If that sounds like too much work, this isn't for you — and that's a reasonable conclusion to reach.

### Do plans get stale and rot over time?

> Plans are *supposed* to get stale. That's the point of immutability — they're a record of what you decided *at the time*, not a living document. When the world changes, you write an amendment, not an edit. The mission-level changelog is your map of how the project's understanding has evolved over time.

### What if I have to pivot hard and the mission is now wrong?

> Rewrite `MISSION.md`, stamp the changelog with a "pivot" entry explaining why, and either amend the outstanding plans or mark them superseded. The protocol handles pivots fine — it just requires you to *document* them instead of silently changing direction. That documentation is the whole feature.

### How does Open Scaffold compare to spec-kit, BMAD, Agent OS, and LangSmith?

Treat this as orientation, not a live feature matrix. Those projects evolve quickly; verify current behavior upstream.

Open Scaffold is the repo record layer: mission, immutable plans, amendments, run packets, evidence, verification, and approval traces as files beside the work. It can sit underneath or beside a spec workflow, role methodology, agent-context system, or observability platform.

spec-kit, BMAD, and Agent OS are more prescriptive methodology/tooling stacks. LangSmith is closer to runtime tracing/evaluation/observability. Open Scaffold's differentiator is durable repo truth and runtime neutrality, not feature breadth or benchmarked productivity. adjacent layers are not enemies; Open Scaffold is a durable notebook next to the code.

Use Open Scaffold when work needs to survive context loss across sessions, agents, PRs, or audits. Do not treat this comparison as a benchmark or final word.
