# Human-reviewer replication boundary

Status: `not_demonstrated` for this checked-in Codex 2x cold-resume fixture.

What is demonstrated here: committed Codex receipts plus deterministic, human-facing reader-usability scoring over the answers in `../answers/`, summarized in `../receipts/aggregate.json`.

What is not demonstrated here: blind human reviewers independently reconstructing the paused-work decision from with-record and without-record packets.

Minimum source-labeled replication packet before this status may change:

1. preregistered human-review protocol and answer key committed before review;
2. blinded packet pair(s), reviewer instructions, and reviewer identity anonymization policy;
3. raw reviewer responses or sanitized per-question receipts;
4. grading script/output and aggregate accuracy/confabulation/cost or time summary;
5. explicit boundary saying the result is human-reviewer replication for the named fixture only, not universal proof.

Until those files exist, any human-reviewer claim must remain fail-closed as `not_demonstrated`.
