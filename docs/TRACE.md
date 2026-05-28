# Trace work records

`osc trace <plan-slug>` is a read-only work-record replay command. It reconstructs the known local chain for one plan: plan file, status, acceptance criteria summary, run packets, evidence/release notes, and recognized PR/issue references found in local files.

Use it to understand, review, or resume a slice before deciding what to verify or close.

## Quick start

```bash
osc trace <plan-slug>
osc trace <plan-slug> --json
osc trace <plan-slug> --include-unverified
```

Example:

```bash
osc trace 117-osc-trace-work-record-replay
osc verify --evidence-chain --plan 117-osc-trace-work-record-replay
```

Trace explains the known chain. Evidence-chain verification checks the chain structurally.

## What `osc trace` reads

`osc trace` reads only local files under the current Open Scaffold root:

- `.osc/plans/{active,backlog,blocked,done}/<plan-slug>.md`
- `.osc/runs/*/run.json`
- `.osc/releases/*.md`
- recognized GitHub PR and issue references already written in those local notes, including full GitHub URLs and common local shorthand such as `PR #123`, `Pull Request: owner/repo#123`, and `Issue: #456`

The command resolves the scaffold root from the current working directory, so it can be run from a subdirectory inside the repo.

## Output labels

Trace links are labeled with four statuses:

- `local` — a local file or local plan/run/release link was found.
- `external` — a PR or issue reference was recognized in a local file, but not checked over the network.
- `missing` — an expected local work-record link was not found.
- `unverified` — an optional weak local mention was included with `--include-unverified`.

Missing links do not make trace fail. They tell the reviewer what part of the work record has not been written yet.

## Trace vs verify

Use the commands together, but do not treat them as interchangeable:

- `osc trace <plan-slug>` is the human-readable replay view for a plan's local work record.
- `osc verify --evidence-chain --plan <plan-slug>` is the structural integrity checker for evidence-chain links.

Neither command judges whether the implementation is correct, whether the evidence is strong, whether CI passed, or whether a PR should merge.

## JSON output

`--json` emits a stable machine-readable object with schema `open-scaffold.trace.v1`. This abridged placeholder example shows the shape; real output includes the plan's actual criteria and discovered links.

```json
{
  "schema": "open-scaffold.trace.v1",
  "query": {
    "plan_slug": "example-plan",
    "include_unverified": false
  },
  "plan": {
    "slug": "example-plan",
    "stage": "done",
    "status": "done",
    "path": ".osc/plans/done/example-plan.md",
    "goal": "Replay the local work record.",
    "acceptance_criteria": [
      { "id": "AC1", "text": "Document the trace output.", "checked": true }
    ]
  },
  "links": [
    { "type": "plan_file", "status": "local", "reference": ".osc/plans/done/example-plan.md", "detail": "Plan file found in local scaffold stage." },
    { "type": "run_packet", "status": "missing", "reference": ".osc/runs/*/run.json", "detail": "No local run packet found for example-plan." }
  ],
  "warnings": [],
  "summary": {
    "local": 1,
    "external": 0,
    "missing": 1,
    "unverified": 0,
    "runs": 0,
    "release_notes": 0,
    "external_refs": 0
  }
}
```

Use JSON mode for dashboards, scripts, or reviews that need deterministic link data without parsing terminal text.

## Boundaries

`osc trace` is local and read-only by default. It does not:

- call GitHub or require network access;
- verify PR, issue, CI, npm, or release state;
- run tests or CI;
- spawn runtimes, agents, or adapters;
- approve work, close a plan, merge a PR, publish npm, or create a release;
- judge correctness, evidence quality, or readiness;
- provide compliance, trust, or external provenance guarantees.

External references are listed as recognized references, not verified facts. It does not call GitHub, does not spawn runtimes, and does not judge correctness, evidence quality, or readiness.

## Troubleshooting incomplete chains

If trace prints `missing` links, decide what the slice actually needs:

- No run packet may be fine for docs-only or planning-only work.
- No release/evidence note usually means the slice is not ready for closeout.
- External references should be checked through the normal PR/CI/release workflow when they matter.
- If the chain should be structurally complete, run `osc verify --evidence-chain --plan <plan-slug>` and fix the reported links.
