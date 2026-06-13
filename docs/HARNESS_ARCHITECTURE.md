# Open Scaffold architecture

Open Scaffold is a repo-native work-record protocol, not a runtime supervisor.
Plan 168 retired the `$`-verb command router, `osc harness`, and root
adapter/dispatch glue. The maintained architecture is now smaller:

```text
Mission / roadmap
  -> plan or amendment
  -> optional run.json package
  -> external worker/runtime/coordinator does the work
  -> evidence, evaluation, PR/check output, feedback
  -> handoff / review / gate
  -> close
```

## Kept layers

### Work record

The durable record lives in files: `MISSION.md`, `ROADMAP.md`, `.osc/plans/`,
`.osc/runs/`, `.osc/evolution/`, `.osc/releases/`, and public GitHub artifacts.
Chat, terminal sessions, and runtime logs are working context until promoted
into those files.

### Handoff

`osc handoff` / `osc resume` compile repo truth into a bounded packet for the
next reader. The packet is read-only and grants no merge, publish, release, or
runtime-spawn authority.

### Review and gate

`osc review` is the front door for recorded-attempt analysis. `osc analyze` is
kept as the original-name synonym. `osc gate` turns the analysis plus optional
judge input into a retry/stop decision over recorded facts. The worker does not
grade itself.

### Run packets

`osc run` and `osc delegate` can still create no-spawn run packages. A run
packet records task intent, files, acceptance criteria, runtime intent, bindings,
and commit policy. It is a package for another tool to consume, not an execution
request that Open Scaffold core fulfills.

### Evidence and feedback

`osc evidence`, `osc verify`, `osc trace`, `osc pr check`, and the evolution
ledger keep verification and review tied to acceptance criteria. Feedback and
repair hypotheses are record inputs; they are not owner approval.

### Operator visibility

`osc cockpit` can project status to operator surfaces. Those messages mirror
state; they are not canonical state. Durable truth still belongs in the work
record, PRs, checks, and evidence notes.

## Retired layers

The following existed in earlier lab slices and are now historical:

- `osc harness` backend commands;
- `$interview`, `$plan`, `$work`, and `$team` as Open Scaffold command grammar;
- root `osc adapter` trust/list/check commands;
- root `osc dispatch` local adapter invocation;
- root dispatch receipts as a core-emitted schema.

The reason for the retirement is product clarity: Open Scaffold should make the
record, handoff, and review loop trustworthy without implying it owns or
supervises autonomous runtime execution.

## Event vocabulary

Operator/cockpit events should stay small and traceable:

| Event kind | Meaning |
| --- | --- |
| `status` | Progress update with a plan/run/PR/evidence reference. |
| `blocker` | Work cannot proceed without new input or a failed gate being resolved. |
| `question` | Task input is needed; answers are not merge/publish/release authority. |
| `approval_request` | Explicit human gate request with the exact side effect named. |
| `completion_report` | Work appears complete and points to evidence/verification. |
| `pr_link` | Public review surface exists; GitHub remains public/versioned truth. |

## Boundary statements

- Open Scaffold core does not spawn agents.
- External runtimes may consume `run.json`, but their logs are not durable truth
  until curated into evidence or PR/check output.
- Humans own merge, publish, release, deployment, force-push, and taste gates.
- A review/gate decision is based on recorded facts; it is not a correctness
  certificate or compliance claim.
