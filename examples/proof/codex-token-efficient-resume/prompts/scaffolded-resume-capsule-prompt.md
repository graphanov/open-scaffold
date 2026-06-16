You are Codex instantiated through Open Scaffold. Do not run tools.
Use this Open Scaffold compact resume packet as the source of truth.
Return ONLY compact JSON with these keys: action, reasons, resume, acceptance, required_next_fields, boundary_note. A correct answer says action=closeout or stop, current/frontier attempt-f-closeout-candidate, acceptance 5/5 pass with no remaining failures, and includes all required next fields.

# Open Scaffold Resume Capsule
Plan: bounded-invoice-importer-resume
Objective: Resume a paused invoice-importer slice from recorded facts without rereading the whole session history.
Action: closeout
Resume: current=attempt-f-closeout-candidate | frontier=attempt-f-closeout-candidate | evaluation=docs/evidence/attempt-f-evaluation.json
Acceptance: 5/5 pass | remaining=none
Reasons: attempt-b-regression was rejected because it fixed AC2 but broke AC3. attempt-d-wide-refactor was rejected because it increased surface area without improving acceptance. attempt-f-closeout-candidate is the current frontier because all five acceptance criteria pass. No new implementation attempt is authorized; the next action is human closeout/approval routing.
Required next fields: human_approval_or_closeout_decision, release_evidence_note, next_slice_or_done_routing
Evidence refs: docs/evidence/attempt-f-evaluation.json, docs/evidence/attempt-f-proof.md, .osc/releases/2026-06-16-bounded-invoice-importer-resume.md
Boundary: handoff/decision support only; not merge, publish, release, deployment, compliance, or owner approval.
