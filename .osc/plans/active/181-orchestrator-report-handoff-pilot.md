# Plan: 181-orchestrator-report-handoff-pilot

## Status

active

## Context

On 2026-10-06 the owner selected reliable outside-user adoption first, then identified long-running orchestrators with many agents exchanging and synthesizing reports as Open Scaffold's next frontier. The maintenance slice in plan 180 repairs task-specific handoff before this experiment begins. Open Scaffold keeps the work record; John Lomein or another coordinator owns execution and routing.

## Goal

Demonstrate whether task-scoped Open Scaffold reports let one orchestrator recover and synthesize three independent workers' findings more accurately or economically than a plain-message baseline.

## Constraints / Out of scope

- Begin only after the maintenance baseline in plan 180 is reviewed and integrated.
- Start with one coordinator, three isolated worker reports, and an independent reader/reviewer; do not claim hundred-agent scalability from this pilot.
- Preserve task/run identity, evidence attribution, uncertainty, disagreements, and unresolved decisions through synthesis and a fresh-session resume.
- Workers write isolated run/report artifacts; one coordinator promotes shared project state to avoid concurrent lifecycle writes.
- Keep executor/model choice interchangeable. Invoking John Lomein, external models, live services, and spending requires a concrete scoped execution decision.

## Files to touch

- `examples/orchestrator-handoff/` — reproducible small report-transfer and synthesis fixture.
- `docs/TASK_RUN_MODEL.md` — document any experimentally validated agent/coordinator report contract.
- Handoff/report tests and schema sources — only if the pilot proves a missing contract or defect.
- `.osc/releases/` — record baseline, outcomes, boundaries, and next action.

## Acceptance criteria

- [ ] Each worker report has an unambiguous task/run binding and links findings to evidence while distinguishing observed, inferred, and unresolved facts.
- [ ] The coordinator preserves disagreements and provenance when combining all three reports.
- [ ] A fresh reader resumes the correct task without mixing another worker's blocker or claimed completion.
- [ ] A preregistered comparison against plain messages measures factual recovery, unsupported claims, synthesis omissions, and context/token size.
- [ ] Results and failed claims are published with raw local fixtures and pilot boundaries; scaling remains unproven until tested separately.

## Verification steps

1. Define fixture answer keys and evaluation criteria before either comparison arm runs.
2. Validate task/run isolation and evidence references for every worker and the synthesis record.
3. Run both comparison arms with identical worker facts and interruptions; report measured outcomes and uncertainty.
4. Have an independent reader evaluate the final handoff without access to the originating chat.

## Open questions

- Which coordinator should run the first live pilot: the current John Lomein workflows or a small provider-neutral fixture driver?
- Which outcome matters most in the first comparison: lost context, unsupported completion claims, or synthesis omissions? Choose before preregistration, using the owner's next product discussion.
