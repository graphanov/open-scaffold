You are naked Codex without Open Scaffold helper commands. Do not run tools. You are given raw local loop artifacts from an AI work attempt history. Decide the next controller action. Return ONLY compact JSON with keys action, reasons, resume, acceptance, required_next_fields, boundary_note.

Correct actions must be grounded only in the raw artifacts below, not guessed.

## loop.json
```json
{
  "schema": "open-scaffold.evolution-loop.v1",
  "loop_id": "20260522T100000Z-reviewable-csv-importer-evolution",
  "idempotency_key": "evolve:fixture:reviewable-csv-importer:7c8a6e6c9f01f2ab",
  "created_at": "2026-05-22T10:00:00.000Z",
  "updated_at": "2026-05-22T10:30:00.000Z",
  "subject": {
    "source": "plan",
    "plan": ".osc/plans/active/reviewable-csv-importer.md",
    "plan_slug": "reviewable-csv-importer",
    "task_id": null,
    "run_id": null,
    "run_packet": null
  },
  "objective": "Make the contacts CSV importer reviewable across repeated attempts.",
  "constraints": {
    "hard": [
      "Do not spawn runtimes from Open Scaffold core.",
      "Do not rank models or agents.",
      "Do not treat the frontier as merge, publish, or release approval."
    ],
    "soft": [
      "Keep the fixture small enough to inspect in one sitting."
    ]
  },
  "acceptance_criteria": [
    "Quoted fields with embedded commas parse correctly.",
    "Malformed rows return an error that identifies the row and column of the offending token.",
    "UTF-8 BOM is stripped and does not leak into the first parsed field."
  ],
  "scorer": {
    "kind": "human",
    "name": "operator",
    "approval_authority": false,
    "notes": "Scores are operator-graded evidence against acceptance criteria, not automatic approval."
  },
  "mutation_surface": [
    "implementation",
    "prompt-or-handoff",
    "runtime-profile",
    "docs",
    "plan-amendment"
  ],
  "strategy": {
    "name": "manual",
    "executes_in_core": false,
    "notes": "Open Scaffold records operator-driven attempt/frontier state only; external runtimes or humans execute attempts outside core."
  },
  "stop_condition": {
    "max_attempts": null,
    "all_acceptance_criteria_pass": true,
    "human_approval": true,
    "blocked_dependency": true,
    "budget_limit": null,
    "explicit_owner_stop": true
  },
  "source_refs": [
    ".osc/plans/active/reviewable-csv-importer.md"
  ],
  "artifacts": {
    "attempts": "attempts.jsonl",
    "frontier": "frontier.json"
  },
  "boundary": {
    "runtime_spawning": false,
    "model_benchmarking": false,
    "compliance_certification": false,
    "approval_or_release_decision": false,
    "external_anchoring": false
  },
  "notes": [
    "This fixture records multi-attempt evolution state and frontier promotion. It does not spawn runtimes, rank models, certify compliance, or approve release.",
    "The attempt records were authored for reproducibility; they demonstrate ledger shape, not agent or model performance."
  ]
}

```

## attempts.jsonl
```json
{"schema":"open-scaffold.evolution-attempt.v1","attempt_id":"attempt-a","recorded_at":"2026-05-22T10:10:00.000Z","run_id":"attempt-a","task_id":"task-reviewable-csv-importer","run_packet":".osc/runs/attempt-a/run.json","evaluation_id":"eval-attempt-a","evaluation":"docs/evidence/attempt-a-evaluation.json","evaluation_decision":"approved","decision":"promote","score":0.62,"rationale":"First useful baseline; AC2 still returns a generic error. Promoted to set the frontier so improvement attempts can be measured against it.","evidence_refs":["docs/evidence/attempt-a-proof.md","docs/evidence/attempt-a-evaluation.json"],"adapter_receipts":[],"boundary":{"runtime_spawning":false,"model_benchmarking":false,"compliance_certification":false,"approval_or_release_decision":false,"external_anchoring":false}}
{"schema":"open-scaffold.evolution-attempt.v1","attempt_id":"attempt-b-prompt-rewrite","recorded_at":"2026-05-22T10:20:00.000Z","run_id":"attempt-b-prompt-rewrite","task_id":"task-reviewable-csv-importer","run_packet":".osc/runs/attempt-b-prompt-rewrite/run.json","evaluation_id":"eval-attempt-b-prompt-rewrite","evaluation":"docs/evidence/attempt-b-prompt-rewrite-evaluation.json","evaluation_decision":"approved","decision":"reject","score":0.54,"rationale":"Rejected. Prompt-rewrite approach regressed AC3 and did not fix AC2. Filed in the ledger so the next attempt does not retry the same approach.","evidence_refs":["docs/evidence/attempt-b-prompt-rewrite-proof.md","docs/evidence/attempt-b-prompt-rewrite-evaluation.json"],"adapter_receipts":[],"boundary":{"runtime_spawning":false,"model_benchmarking":false,"compliance_certification":false,"approval_or_release_decision":false,"external_anchoring":false}}
{"schema":"open-scaffold.evolution-attempt.v1","attempt_id":"attempt-c","recorded_at":"2026-05-22T10:30:00.000Z","run_id":"attempt-c","task_id":"task-reviewable-csv-importer","run_packet":".osc/runs/attempt-c/run.json","evaluation_id":"eval-attempt-c","evaluation":"docs/evidence/attempt-c-evaluation.json","evaluation_decision":"approved","decision":"promote","score":0.94,"rationale":"Promoted to current frontier. AC2 now reports row and column of the offending token; AC1 and AC3 remain passing. Operator promoted after manual review of the evaluation envelope.","evidence_refs":["docs/evidence/attempt-c-proof.md","docs/evidence/attempt-c-evaluation.json"],"adapter_receipts":[],"boundary":{"runtime_spawning":false,"model_benchmarking":false,"compliance_certification":false,"approval_or_release_decision":false,"external_anchoring":false}}

```

## frontier.json
```json
{
  "schema": "open-scaffold.evolution-frontier.v1",
  "loop_id": "20260522T100000Z-reviewable-csv-importer-evolution",
  "updated_at": "2026-05-22T10:30:00.000Z",
  "current": {
    "attempt_id": "attempt-c",
    "run_id": "attempt-c",
    "evaluation_id": "eval-attempt-c",
    "score": 0.94,
    "rationale": "Promoted to current frontier. AC2 now reports row and column of the offending token; AC1 and AC3 remain passing. Operator promoted after manual review of the evaluation envelope.",
    "promoted_at": "2026-05-22T10:30:00.000Z",
    "evidence_refs": [
      "docs/evidence/attempt-c-proof.md",
      "docs/evidence/attempt-c-evaluation.json"
    ]
  },
  "history": [
    {
      "attempt_id": "attempt-a",
      "run_id": "attempt-a",
      "evaluation_id": "eval-attempt-a",
      "score": 0.62,
      "rationale": "First useful baseline; AC2 still returns a generic error. Promoted to set the frontier so improvement attempts can be measured against it.",
      "promoted_at": "2026-05-22T10:10:00.000Z",
      "evidence_refs": [
        "docs/evidence/attempt-a-proof.md",
        "docs/evidence/attempt-a-evaluation.json"
      ]
    }
  ],
  "boundary": {
    "runtime_spawning": false,
    "model_benchmarking": false,
    "compliance_certification": false,
    "approval_or_release_decision": false,
    "external_anchoring": false
  },
  "notes": [
    "Frontier promotion is a recorded operator decision, not proof of correctness or automatic approval."
  ]
}

```

## examples/evolution-ledger-demo/docs/evidence/attempt-a-evaluation.json
```json
{
  "schema": "open-scaffold.evaluation.v1",
  "evaluation_id": "eval-attempt-a",
  "subject": {
    "source": "run",
    "plan": ".osc/plans/active/reviewable-csv-importer.md",
    "plan_slug": "reviewable-csv-importer",
    "task_id": "task-reviewable-csv-importer",
    "run_id": "attempt-a",
    "run_packet": ".osc/runs/attempt-a/run.json"
  },
  "scorer": {
    "kind": "human",
    "name": "operator",
    "notes": "Operator-graded against the acceptance criteria list; this score is evidence, not automatic approval."
  },
  "acceptance_criteria": [
    {
      "id": "AC1",
      "text": "Quoted fields with embedded commas parse correctly.",
      "status": "pass",
      "evaluator": {
        "kind": "human",
        "name": "operator",
        "ref": null
      },
      "evidence": [
        {
          "kind": "path",
          "ref": "docs/evidence/attempt-a-proof.md",
          "summary": "Fixture evidence reviewed against the acceptance criterion."
        }
      ],
      "rationale": "Quoted contact names with embedded commas parsed correctly."
    },
    {
      "id": "AC2",
      "text": "Malformed rows return an error that identifies the row and column of the offending token.",
      "status": "fail",
      "evaluator": {
        "kind": "human",
        "name": "operator",
        "ref": null
      },
      "evidence": [
        {
          "kind": "path",
          "ref": "docs/evidence/attempt-a-proof.md",
          "summary": "Fixture evidence reviewed against the acceptance criterion."
        }
      ],
      "rationale": "Malformed input returned only a generic error, so a reviewer could not identify the offending row and column."
    },
    {
      "id": "AC3",
      "text": "UTF-8 BOM is stripped and does not leak into the first parsed field.",
      "status": "pass",
      "evaluator": {
        "kind": "human",
        "name": "operator",
        "ref": null
      },
      "evidence": [
        {
          "kind": "path",
          "ref": "docs/evidence/attempt-a-proof.md",
          "summary": "Fixture evidence reviewed against the acceptance criterion."
        }
      ],
      "rationale": "The leading UTF-8 BOM was stripped before field parsing."
    }
  ],
  "decision": {
    "status": "approved",
    "approver": "operator",
    "rationale": "Evaluation envelope reviewed for the fixture demonstration."
  },
  "improvement": {
    "route": "retry",
    "target": null,
    "carried_forward": [
      "Fix AC2 without regressing AC1 or AC3."
    ],
    "do_not_assume": [
      "No model benchmark claim.",
      "No automatic release approval."
    ]
  }
}

```

## examples/evolution-ledger-demo/docs/evidence/attempt-b-prompt-rewrite-evaluation.json
```json
{
  "schema": "open-scaffold.evaluation.v1",
  "evaluation_id": "eval-attempt-b-prompt-rewrite",
  "subject": {
    "source": "run",
    "plan": ".osc/plans/active/reviewable-csv-importer.md",
    "plan_slug": "reviewable-csv-importer",
    "task_id": "task-reviewable-csv-importer",
    "run_id": "attempt-b-prompt-rewrite",
    "run_packet": ".osc/runs/attempt-b-prompt-rewrite/run.json"
  },
  "scorer": {
    "kind": "human",
    "name": "operator",
    "notes": "Operator-graded against the acceptance criteria list; this score is evidence, not automatic approval."
  },
  "acceptance_criteria": [
    {
      "id": "AC1",
      "text": "Quoted fields with embedded commas parse correctly.",
      "status": "pass",
      "evaluator": {
        "kind": "human",
        "name": "operator",
        "ref": null
      },
      "evidence": [
        {
          "kind": "path",
          "ref": "docs/evidence/attempt-b-prompt-rewrite-proof.md",
          "summary": "Fixture evidence reviewed against the acceptance criterion."
        }
      ],
      "rationale": "Quoted contact names with embedded commas still parsed correctly."
    },
    {
      "id": "AC2",
      "text": "Malformed rows return an error that identifies the row and column of the offending token.",
      "status": "fail",
      "evaluator": {
        "kind": "human",
        "name": "operator",
        "ref": null
      },
      "evidence": [
        {
          "kind": "path",
          "ref": "docs/evidence/attempt-b-prompt-rewrite-proof.md",
          "summary": "Fixture evidence reviewed against the acceptance criterion."
        }
      ],
      "rationale": "The prompt rewrite still returned a generic malformed-row error."
    },
    {
      "id": "AC3",
      "text": "UTF-8 BOM is stripped and does not leak into the first parsed field.",
      "status": "fail",
      "evaluator": {
        "kind": "human",
        "name": "operator",
        "ref": null
      },
      "evidence": [
        {
          "kind": "path",
          "ref": "docs/evidence/attempt-b-prompt-rewrite-proof.md",
          "summary": "Fixture evidence reviewed against the acceptance criterion."
        }
      ],
      "rationale": "BOM handling regressed; the first parsed field retained the BOM marker."
    }
  ],
  "decision": {
    "status": "approved",
    "approver": "operator",
    "rationale": "Evaluation envelope reviewed for the fixture demonstration."
  },
  "improvement": {
    "route": "retry",
    "target": null,
    "carried_forward": [
      "Fix AC2 without regressing AC1 or AC3."
    ],
    "do_not_assume": [
      "No model benchmark claim.",
      "No automatic release approval."
    ]
  }
}

```

## examples/evolution-ledger-demo/docs/evidence/attempt-c-evaluation.json
```json
{
  "schema": "open-scaffold.evaluation.v1",
  "evaluation_id": "eval-attempt-c",
  "subject": {
    "source": "run",
    "plan": ".osc/plans/active/reviewable-csv-importer.md",
    "plan_slug": "reviewable-csv-importer",
    "task_id": "task-reviewable-csv-importer",
    "run_id": "attempt-c",
    "run_packet": ".osc/runs/attempt-c/run.json"
  },
  "scorer": {
    "kind": "human",
    "name": "operator",
    "notes": "Operator-graded against the acceptance criteria list; this score is evidence, not automatic approval."
  },
  "acceptance_criteria": [
    {
      "id": "AC1",
      "text": "Quoted fields with embedded commas parse correctly.",
      "status": "pass",
      "evaluator": {
        "kind": "human",
        "name": "operator",
        "ref": null
      },
      "evidence": [
        {
          "kind": "path",
          "ref": "docs/evidence/attempt-c-proof.md",
          "summary": "Fixture evidence reviewed against the acceptance criterion."
        }
      ],
      "rationale": "Quoted contact names with embedded commas still parsed correctly."
    },
    {
      "id": "AC2",
      "text": "Malformed rows return an error that identifies the row and column of the offending token.",
      "status": "pass",
      "evaluator": {
        "kind": "human",
        "name": "operator",
        "ref": null
      },
      "evidence": [
        {
          "kind": "path",
          "ref": "docs/evidence/attempt-c-proof.md",
          "summary": "Fixture evidence reviewed against the acceptance criterion."
        }
      ],
      "rationale": "Malformed input now reports the row and column of the offending token."
    },
    {
      "id": "AC3",
      "text": "UTF-8 BOM is stripped and does not leak into the first parsed field.",
      "status": "pass",
      "evaluator": {
        "kind": "human",
        "name": "operator",
        "ref": null
      },
      "evidence": [
        {
          "kind": "path",
          "ref": "docs/evidence/attempt-c-proof.md",
          "summary": "Fixture evidence reviewed against the acceptance criterion."
        }
      ],
      "rationale": "The leading UTF-8 BOM is stripped before field parsing."
    }
  ],
  "decision": {
    "status": "approved",
    "approver": "operator",
    "rationale": "Evaluation envelope reviewed for the fixture demonstration."
  },
  "improvement": {
    "route": "close",
    "target": null,
    "carried_forward": [],
    "do_not_assume": [
      "No model benchmark claim.",
      "No automatic release approval."
    ]
  }
}

```
