# Plan: 136-compact-evidence-mode

## Status

done

## Context

The 2000m two-lane run showed the tradeoff in Open Scaffold's evidence model. The scaffolded lane was easier to reconstruct, but repeated attempts produced hundreds of evidence files. That is acceptable for local forensics, but too heavy for public repos and long-running loops. Open Scaffold needs a compact mode that keeps raw detail local while promoting enough curated evidence to understand what happened.

## Goal

Add compact evidence mode for repeated runs so committed artifacts contain a concise summary, manifest, and digest-backed pointers while raw logs and bulky runtime evidence stay local or ignored.

## Constraints / Out of scope

- Do not delete local raw evidence automatically.
- Do not hide required verification failures or failed acceptance criteria.
- Do not treat compact evidence as tamper-proof external anchoring.
- Do not store secrets, local absolute paths, private runtime state, or raw transcripts in public artifacts.
- Do not make model-authored notes canonical attempts/frontier state.
- Do not change package payload behavior until tests and release gates prove it.

## Files to touch

- `src/run*.ts`, `src/evolution.ts`, or a focused evidence module — compact evidence data model and rendering.
- `src/cli.ts` — flags or commands for compact evidence mode.
- `tests/*` — fixtures proving raw logs stay out of committed summaries and required evidence is still visible.
- `docs/EVOLUTION_LOOP.md` — explain compact evidence in repeated-attempt loops.
- `docs/TASK_RUN_MODEL.md` — clarify promoted evidence versus runtime-local/raw evidence if needed.
- `.osc/releases/<date>-compact-evidence-mode.md` — release/evidence note for the implementation slice.

## Execution strategy

### Task decomposition

| ID | Task | Dependencies | Parallel group |
| --- | --- | --- | --- |
| T1 | Define the compact evidence manifest shape. | None | A |
| T2 | Define raw/local versus promoted/tracked evidence rules. | None | A |
| T3 | Implement compact summary generation. | T1, T2 | B |
| T4 | Add tests for no raw-log leakage and sufficient reconstruction. | T3 | C |
| T5 | Update docs and examples. | T1, T2 | B |

### Parallel groups

- **Group A:** contract and boundary rules are independent but must both finish before implementation.
- **Group B:** implementation and docs can proceed in parallel after the contract exists.
- **Group C:** verification waits for implementation.

### Dependencies

T3 must wait for T1/T2 because evidence compaction without explicit boundaries risks hiding failures or leaking raw logs.

### Delegation notes

A separate reviewer should inspect compact fixtures for both over-disclosure and under-disclosure.

## Implementation Architecture Coverage

- Strengthens: audit trails, recovery, repo hygiene, public safety, and long-running loop usability.
- Audit envelope: compact summary, manifest, digest list, scorer/evaluation refs, raw-local pointer policy, and tests proving reconstruction remains possible.
- Evaluation envelope: compact summaries must preserve acceptance status, verification status, scorer summary, decision, and improvement route.
- Feedback routing: failed or ambiguous runs still route to retry/block/next slice; compaction must not make failures look clean.
- Boundary: no external anchoring, no secret handling, no automatic deletion, no proof of correctness by digest alone.

## Acceptance criteria

- [ ] Compact mode emits a concise markdown summary and machine-readable manifest for a run or evolution loop.
- [ ] The summary includes objective, attempt/run ids, scorer/evaluation status, pass/fail counts, failed criteria, verification commands, decision, and next recommendation.
- [ ] Raw logs, JSONL transcripts, private runtime state, and local absolute paths are omitted by default.
- [ ] Raw/local evidence can be referenced by safe relative labels or digests without copying the raw payload into public docs.
- [ ] Model-authored candidate notes are labeled as candidate notes and cannot overwrite canonical attempt journals or frontier state.
- [ ] Tests prove compact mode still exposes failed criteria and verification failures.
- [ ] Tests prove compact mode does not include local absolute paths or raw transcript content in public summaries.
- [ ] Docs explain compact mode as a repo-hygiene option, not as a replacement for raw local forensic evidence.

## Verification steps

1. Add fixtures with raw logs, JSONL-like files, scorer output, and evaluation envelopes.
2. Run focused compact-evidence tests and expect no raw/private leakage while failures remain visible.
3. Run `npm test` and expect the full suite to pass.
4. Run `npm run build` and expect TypeScript/package build success.
5. Run `./verify.sh --strict` and expect repository compliance to pass.
6. Run `git diff --check` and expect no whitespace errors.
7. Manually inspect generated summaries for local paths, private context, raw-score win claims, and adoption-proof claims.

## Open questions

- Should compact mode be a flag on `osc run`/`osc evolve record`, a separate `osc evidence compact` command, or both?
- Should digest manifests hash raw local files even when those files are ignored and not committed?
- What is the minimum summary that lets a fresh agent continue without copying bulky logs?
