# Slice Close Protocol

Open Scaffold does not treat "the agent says it is done" as done. Slice close — the evidence-backed closeout decision — happens only when the repo can show what was attempted, what evidence exists, what acceptance criteria passed or failed, what the operator decided, and what the next slice inherits.

This protocol productizes the closed loop:

```text
slice -> run -> evidence -> postflight -> approval decision -> correction routing -> next slice
```

## Executive rule

```text
A slice is not closed by chat.
A slice is closed by evidence, acceptance-gate status, and an explicit decision.
```

Chat threads, runtime transcripts, terminal logs, and coordinator task comments can help humans operate the work. They are not enough by themselves. The durable close record must point back to Open Scaffold files, task/run identifiers, GitHub artifacts, or evidence paths.

## Layer ownership

| Layer | Owns | Does not own |
|---|---|---|
| Open Scaffold core | close protocol, evidence receipt shape, postflight fields, next-slice inheritance rules | live task board, agent spawning, runtime auth |
| Task system / coordinator | live state such as ready/running/blocked/review/done | final proof by itself |
| Runtime harness / agent | execution attempt while alive | canonical closure or approval |
| Operator surface | questions, approvals, visible status | source of truth |
| GitHub / release layer | branch, PR, review, CI, release note | runtime session truth |
| Evidence | proof of outputs, checks, decisions, and gaps | vague vibes |

## Identity chain

A meaningful slice should be reconstructable from stable identifiers:

```text
roadmap_item
  -> plan_or_spec
  -> task_id
  -> run_id(s)
  -> evidence_receipt(s)
  -> postflight_decision
  -> next_action
```

Not every tiny task needs every link. But if a slice changes product direction, public docs, code, release notes, or a multi-agent workflow, it should have enough of this chain for the next human or agent to resume without chat memory.

## Work-record replay

`osc trace <plan-slug>` is the reconstruction path for one slice. It searches the plan stage folders, local run packets, evidence/release notes, and recognized references in local files, then prints a human-readable chain with each link labeled as `local`, `external`, `missing`, or `unverified`.

Use trace when a reviewer, operator, or future agent needs to understand what is known before deciding what to check next:

```bash
osc trace <plan-slug>
osc trace <plan-slug> --json
```

Trace is explanatory. It does not make a close decision, judge evidence quality, verify GitHub state, call external services, run tests, spawn runtimes, provide compliance guarantees, or approve the slice.

## Evidence chain verification

Use `osc trace <plan-slug>` to replay the known local chain for a human. Use `osc verify --evidence-chain --plan <plan-slug>` to check whether the structural evidence links are intact.

`osc verify --evidence-chain` checks whether the repo work record links together structurally: done plan, acceptance criteria, run packet, evidence note, close decision, and release or PR references.

The command reports local links as:

```text
intact | broken | missing | unverifiable
```

Use it when closing or reviewing meaningful slices:

```bash
osc verify --evidence-chain --plan <plan-slug>
osc verify --evidence-chain --strict
osc verify --evidence-chain --json
```

The check is deliberately narrow. It verifies only that local artifact references exist, required closeout links are present, and external references are recognized as outside local verification. It does not judge evidence quality, decide correctness, certify compliance, approve merge/release decisions, run CI, call GitHub, spawn runtimes, rank models, retrieve context, or anchor evidence externally.

Incremental evidence-chain mode such as `--since <ref-or-date>` is intentionally deferred. The current verifier is local filesystem only and should be treated as a structural work-record check, not a correctness or certification layer.

## Slice states

Recommended slice states:

```text
planned
  -> packaged
  -> dispatched | manual_execution
  -> running
  -> evidence_ready
  -> postflighted
  -> approved | weak_approved | rejected | blocked
  -> closed | next_slice_created
```

State meanings:

- `planned` — a roadmap item, issue, plan, or spec exists.
- `packaged` — a bounded run packet or manual execution contract exists.
- `dispatched` — a coordinator launched or assigned execution.
- `manual_execution` — a human or direct agent worked without runtime dispatch, still under the plan/spec.
- `running` — work is active.
- `evidence_ready` — outputs and verification evidence are available for review.
- `postflighted` — someone or something compared evidence to acceptance criteria.
- `approved` — strong approval; the result meets the product bar.
- `weak_approved` — procedural or fatigue approval; acceptable to move on, but downstream slices should treat it as weak signal.
- `rejected` — output does not meet the bar; correction required.
- `blocked` — cannot close because a human, dependency, credential, access, or external input is missing.
- `closed` — no follow-up required beyond routine archive/release bookkeeping.
- `next_slice_created` — follow-up work has a durable plan/issue/task.

## Evidence receipt

An evidence receipt is a short durable record that lets reviewers audit the close decision without reading an entire transcript.

Recommended location:

```text
.osc/runs/<run_id>/evidence.md
.osc/runs/<run_id>/postflight.md
```

If a repo does not track generated `.osc/runs/`, use a stable tracked location such as:

```text
docs/evidence/<date>-<slice>.md
```

Minimum receipt shape:

```yaml
schema: open-scaffold.evidence.v1
slice: docs-runtime-dispatch
plan: .osc/plans/active/001-example.md
task_id: issue:42
run_id: 20260512T090000Z-docs-runtime-dispatch
operator_surface: github-pr
pr: 12
commit_or_branch: feat/docs-runtime-dispatch
acceptance_gate:
  status: pass | partial | fail | blocked
  criteria:
    - id: AC1
      status: pass
      evidence: docs/RUNTIME_HARNESS_DISPATCH.md
    - id: AC2
      status: partial
      evidence: "Manual review: wording still needs example"
verification:
  - command: ./verify.sh --standard
    result: pass
  - command: npm run osc -- verify
    result: pass
artifacts:
  changed_files:
    - docs/RUNTIME_HARNESS_DISPATCH.md
    - docs/TASK_RUN_MODEL.md
  outputs:
    - docs/RUNTIME_HARNESS_DISPATCH.md#where-we-are-right-now
known_gaps:
  - "Runtime binding starter kit remains future work."
approval:
  status: approved | weak_approved | rejected | blocked
  approver: human | maintainer | reviewer | automated-check
  rationale: "Why this decision was made."
next_action:
  type: close | amend_plan | create_next_slice | update_roadmap | open_issue | retry_run | block
  target: .osc/plans/backlog/002-next-slice.md
```

The schema is intentionally plain text/YAML-friendly. Tools can validate it later, but humans should be able to write and review it today.

## Evaluation envelope

An evaluation envelope is the structured post-run record that turns acceptance criteria, evidence, verification, and user/reviewer feedback into a close decision and improvement route.

Core owns this envelope shape. It does not own every evaluator. Humans, CI, review bots, runtime adapters, domain systems, and external evaluators can all supply evidence or feedback, but the durable Open Scaffold record should preserve how that input mapped to the slice criteria.

Minimum shape:

```yaml
schema: open-scaffold.evaluation.v1
evaluation_id: 20260512T090000Z-docs-runtime-dispatch-eval
task_id: issue:42
run_id: 20260512T090000Z-docs-runtime-dispatch
plan: .osc/plans/active/001-example.md
evaluated_at: 2026-05-12T09:30:00Z
inputs:
  run_packet: .osc/runs/20260512T090000Z-docs-runtime-dispatch/run.json
  evidence:
    - .osc/runs/20260512T090000Z-docs-runtime-dispatch/evidence.md
  feedback:
    - id: FB1
      source: human | reviewer | user | ci | adapter | external-evaluator
      kind: approval | defect | correction | preference | new_requirement | blocker
      target: AC1
      severity: blocker | major | minor | note
      summary: "What the feedback says."
acceptance_criteria:
  - id: AC1
    text: "Criterion text copied or referenced from the plan."
    status: pass | partial | fail | blocked | not_evaluated
    evaluator:
      kind: human | automated-check | adapter | domain-oracle | external-review
      name: "optional"
    evidence:
      - kind: path | url | command | pr | issue | ci | screenshot | manual-review | comment | other
        ref: docs/evidence/example.md
        summary: "What this evidence proves."
    rationale: "Why this status was assigned."
    correction:
      route: close | retry_run | amend_plan | create_next_slice | open_issue | update_roadmap | block
      target: .osc/plans/backlog/002-next-slice.md
      rationale: "How non-pass outcomes are routed, or why pass can close."
    confidence: high | medium | low
    gaps:
      - "Known limitation or uncertainty."
decision:
  status: approved | weak_approved | rejected | blocked
  approver: human | maintainer | reviewer | automated-check
  rationale: "Why this close decision was made."
improvement:
  route: close | retry_run | amend_plan | create_next_slice | open_issue | update_roadmap | block
  target: .osc/plans/backlog/002-next-slice.md
  carried_forward:
    - "Specific learning or correction to inherit."
  do_not_assume:
    - "Weak approval is not proof of product quality."
```

The evaluation envelope is a record of judgment and routing, not an automatic claim of correctness. Domain/business-rule evaluators, model benchmarks, production scoring, and compliance decisions can feed it, but they do not become Open Scaffold core by default.

The v1 CLI surface emits and checks JSON envelopes so the first implementation can stay dependency-light and deterministic:

```bash
osc eval init <run-or-plan> [--out <path>]
osc eval check <evaluation-path>
```

`osc eval init` drafts the envelope from plan acceptance criteria or a run packet. `osc eval check` validates schema, criterion coverage, evidence/rationale presence, evaluator source, decision consistency, and correction routing. It does not run verification commands, judge domain correctness, benchmark models, certify compliance, approve release/merge, spawn runtimes, or anchor evidence externally.

## Audit envelope

An audit envelope is the integrity-oriented companion to the evaluation envelope. It identifies the durable artifacts needed to reconstruct what was planned, run, evidenced, reviewed, approved, and carried forward.

The v1 CLI surface starts with local digest manifests:

```bash
osc audit init <run-or-plan> [--artifact <role> <path>]... [--out <path>]
osc audit check <audit-manifest-path>
```

`osc audit init` records a JSON `open-scaffold.audit-envelope.v1` manifest for a plan or run packet plus explicitly supplied curated artifacts. `osc audit check` validates the manifest shape, subject identity, artifact IDs/roles, repo-relative paths, local file presence, and sha256 digest consistency.

Minimum manifest concepts:

```yaml
schema: open-scaffold.audit-envelope.v1
audit_envelope_id: 20260517T120000Z-docs-runtime-dispatch-audit
subject:
  source: plan | run
  task_id: issue:42
  run_id: 20260512T090000Z-docs-runtime-dispatch
  plan: .osc/plans/done/001-example.md
  plan_slug: 001-example
  run_packet: .osc/runs/20260512T090000Z-docs-runtime-dispatch/run.json
artifacts:
  - id: plan:.osc/plans/done/001-example.md
    role: plan | run_packet | evaluation | evidence | postflight | release_note | changed_file | verification | review | other
    path: .osc/plans/done/001-example.md
    digest:
      alg: sha256
      value: "lowercase-hex"
boundary:
  digest_integrity_only: true
  local_files_only: true
  compliance_certification: false
  approval_or_release_decision: false
  runtime_spawning: false
  model_benchmarking: false
  external_anchoring: false
```

This check proves only local artifact presence and byte-level digest consistency at check time. It does not run verification commands, judge domain correctness, certify compliance, approve release/merge, spawn runtimes, benchmark models, or anchor evidence externally.

Future work can define parent links, Merkle batch roots, envelope self-digests, and external-anchor receipt shape. Provider submission, key custody, network retries, legal attestation, runtime event capture, and systems-of-record audit logs belong to optional adapters or external systems.

## Evolution loop

A single evaluation envelope answers how one run or plan result maps to acceptance criteria. An evolution loop records multiple attempts against the same objective and the explicit frontier decision between them.

The v1 CLI surface is:

```bash
osc evolve init <run-or-plan> [--out <dir>] [--strategy <manual|greedy|tournament|novelty|map_elites|custom>]
osc evolve record <loop-dir> --run <run-packet> [--evaluation <evaluation-json>] [--receipt <dispatch-receipt.json>] [--evidence <path>]... --decision <promote|reject|retry|block> [--score <0..1>] --rationale <text>
osc evolve check <loop-dir>
```

It writes curated loop state under `.osc/evolution/<loop_id>/`:

```text
loop.json
attempts.jsonl
frontier.json
```

The bridge is:

```text
plan/spec -> run attempts -> evaluation envelopes -> attempt journal -> frontier -> next attempt | next slice | close | block
```

`osc evolve` is structure-only. It does not spawn runtimes, execute strategies, rank models, certify compliance, approve release, or replace human judgment. It is designed so OMX-based agentic runtime packages, other adapters, coordinators, CI, or humans can execute attempts externally and promote only the curated evidence back into Open Scaffold. See [`docs/EVOLUTION_LOOP.md`](EVOLUTION_LOOP.md).

## Postflight checklist

Before a slice is called closed, answer these in writing:

1. **What was the slice goal?** Link the plan/spec/issue.
2. **What changed?** Link changed files, artifacts, PR, or release note.
3. **Which acceptance criteria passed?** Mark each `pass`, `partial`, `fail`, or `blocked`.
4. **What verification ran?** Include exact commands, manual checks, screenshots, reviewer comments, or CI links.
5. **What evidence proves it?** Link durable files, PR comments, CI logs, screenshots, generated outputs, or release notes.
6. **What gaps remain?** Include known defects, weak evidence, skipped checks, or unresolved product taste questions.
7. **What did the operator decide?** Use the approval taxonomy below.
8. **What happens next?** Close, amend, create next slice, retry, block, or release.

## Approval taxonomy

Use a small, explicit vocabulary.

### `approved`

Strong product approval.

Use when:

- acceptance criteria pass;
- evidence is durable and inspectable;
- known gaps are acceptable or separately tracked;
- the human/product owner or required review gate explicitly accepts the result.

Downstream meaning: future slices may treat this output as stable baseline unless new evidence appears.

### `weak_approved`

Procedural, fatigue, or weak-positive approval.

Use when:

- the result is allowed to move forward, but confidence is limited;
- approval came from "good enough for now", not strong taste/product validation;
- verification passed mechanically but the product bar is uncertain;
- review was shallow, time-boxed, or explicitly provisional.

Downstream meaning: future slices must inherit the caution. Do not use weak approval as proof of product quality.

### `rejected`

The slice does not meet the bar.

Use when:

- acceptance criteria fail;
- evidence is missing or fake;
- the output drifts from the goal;
- a reviewer/product owner says the result is not acceptable.

Downstream meaning: create a correction plan, amend the existing plan if scope changed, or retry with a new run.

### `blocked`

The slice cannot be judged yet.

Use when:

- credentials, access, external input, stakeholder decision, environment, or human review is missing;
- the evidence exists but cannot be validated yet;
- a blocking question is open.

Downstream meaning: record the blocker and owner. Do not call the slice closed.

## Correction routing

When postflight finds new information, route it deliberately:

| Finding | Durable destination |
|---|---|
| Original goal changed | plan amendment via `./amend.sh <plan-slug>` |
| Acceptance criteria changed | plan amendment |
| Evidence exists for the current run | `.osc/runs/<run_id>/` or tracked evidence doc |
| Product direction changed | `ROADMAP.md` update or roadmap amendment/PR |
| Operational task status changed | task system / issue / coordinator comment |
| Public code/docs changed | branch / PR / release note |
| Follow-up work is needed | new plan in `.osc/plans/backlog/` or issue/task |
| Runtime failed or was blocked | new run record or blocker note; do not rewrite the failed run |
| Evaluation found AC-specific gaps | evaluation envelope + retry/amend/next-slice route |
| Audit/integrity requirement emerged | audit envelope / anchor-adapter follow-up plan |
| Approval was weak | evidence receipt + next-slice caution |

The rule: **promote the learning to the layer that will need it next**. The loop improves the project only when findings become durable: amendment, retry run, next slice, adapter backlog, validation rule, roadmap update, blocker note, release evidence, or audit/evaluation envelope. Do not hide product corrections in chat. Do not turn every task comment into roadmap truth.

## Next-slice inheritance

A next slice should inherit only explicit durable facts:

```yaml
inherits_from:
  previous_slice: docs-runtime-dispatch
  previous_run: 20260512T090000Z-docs-runtime-dispatch
  approval_status: weak_approved
  carried_forward:
    - "Runtime-specific binding examples still missing."
    - "Need one complete PR-to-release dogfood example."
  do_not_assume:
    - "Weak approval means the UX language is product-grade."
```

If the previous slice was `weak_approved`, `rejected`, or `blocked`, the next slice must name the inherited caution or blocker. This prevents accidental laundering of weak evidence into strong product truth.

## Close decision examples

### Strong close

```text
Decision: approved
Reason: all acceptance criteria passed, docs are linked from README and task/run model, verify.sh and osc verify passed, Codex review found no major issues.
Next action: merge PR and add release note.
```

### Weak close

```text
Decision: weak_approved
Reason: mechanical checks passed and the doc is usable, but no external user validated the terminology yet.
Next action: create next slice for examples/user-facing quickstart; inherit terminology caution.
```

### Rejected

```text
Decision: rejected
Reason: output explains runtime dispatch but accidentally makes Discord look canonical.
Next action: amend plan with boundary correction and retry docs slice.
```

### Blocked

```text
Decision: blocked
Reason: CI evidence cannot be inspected because the integration is unavailable.
Next action: task owner wires CI access; do not close slice.
```

## Anti-patterns

Avoid:

- calling a slice closed because an agent said "done";
- treating a runtime transcript as evidence without durable links;
- merging weak approval into the next slice as if it were strong product validation;
- rewriting a failed run instead of creating a retry;
- burying corrections in chat or a private task board;
- requiring one specific coordinator, chat surface, or runtime harness for closure;
- treating `postflighted` as the same thing as `approved`.

## Relationship to cockpit events

Slice close decisions often appear first as cockpit events: `completion_report`, `approval_request`, `evidence_receipt`, or `pr_link`. Those events are visibility and control messages. The durable close record still belongs in the run packet, evidence file, PR/release note, issue/task, or plan/amendment. See [`docs/GLASS_COCKPIT_PROTOCOL.md`](GLASS_COCKPIT_PROTOCOL.md) for the event vocabulary.

## Minimal manual template

Copy this into a PR body, issue comment, or evidence file when no tooling exists yet:

```markdown
## Slice close

- Plan/spec:
- Task ID:
- Run ID:
- PR/branch:
- Acceptance gate: pass | partial | fail | blocked
- Verification:
  - `command` -> result
- Evidence:
  - path/link
- Known gaps:
  - ...
- Approval decision: approved | weak_approved | rejected | blocked
- Rationale:
- Correction routing:
- Next-slice inheritance:
```

## Product implication

Open Scaffold's job is not to make every run autonomous. Its job is to make semi-autonomous work auditable:

```text
Open Scaffold core = contract + evidence shape
Coordinator = live state + dispatch choice
Harness/agent = execution
Operator surface = human visibility and decisions
GitHub = public review and release
Evidence receipt = proof and inheritance
```
