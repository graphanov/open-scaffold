# Plan: 103-osc-dispatch-adapter-glue

## Status

backlog

## Context

`osc run` creates run packets, and optional runtime packages can consume them, but users still have to manually bridge the packet to the adapter. The post-v1 target needs a single adapter invocation command that records receipts and evidence without making core a hidden runtime.

## Goal

Add an explicit `osc dispatch RUN_JSON --adapter ADAPTER_ID` glue command that invokes a selected adapter package, captures its receipt/evidence paths, and prints the next verification/approval step.

## Constraints / Out of scope

- Do not add default-on spawning to core.
- Do not auto-install adapters from a registry.
- Do not supervise long-running runtime sessions, tmux, credentials, or provider auth.
- Do not support unknown third-party adapter execution without a local trust decision.
- Do not merge this with `osc work`; dispatch acts on an existing run packet.

## Files to touch

- `src/cli.ts` or CLI command modules — `osc dispatch` parsing/help.
- `src/` adapter resolution helpers — trusted local adapter lookup and refusal behavior.
- `tests/` — fake adapter fixture, receipt/evidence capture tests, unsafe adapter refusal tests.
- `docs/RUNTIME_ADOPTION_WORKFLOW.md` / runtime docs — command semantics and boundaries.
- `.osc/releases/` — evidence note if shipped.

## Implementation Architecture Coverage

- Strengthens: runtime boundary, adapter portability, and receipt/evidence recovery.
- Audit envelope: run packet path, adapter id, dispatch receipt, adapter evidence, exit status/refusal code.
- Evaluation envelope: fake/local adapter tests prove command behavior without real provider execution.
- Feedback routing: adapter resolution and registry questions feed into the existing runtime adapter registry backlog after at least two adapters exist.
- Boundary: dispatch invokes a trusted adapter; the adapter owns launch policy, and core records outputs.

## Acceptance criteria

- [ ] `osc dispatch RUN_JSON --adapter ADAPTER_ID` works with a fake/local adapter fixture.
- [ ] The command refuses missing, unknown, auto-installing, or unsafe adapters by default.
- [ ] Receipt/evidence/log paths remain under the run directory or a documented safe output path.
- [ ] The command prints clear next steps for verification and human approval.
- [ ] Tests prove core does not import provider SDKs or hardcode Codex/OMX launch behavior.
- [ ] `./verify.sh --strict`, `npm test`, `npm run build`, and `git diff --check` pass.

## Verification steps

1. Run focused `osc dispatch` tests with fake/local adapters.
2. Run a scratch `osc run` -> `osc dispatch` no-spawn smoke.
3. Run `./verify.sh --strict`.
4. Run `npm test`.
5. Run `npm run build`.
6. Run `git diff --check`.

## Open questions

- Should adapter discovery start as explicit `--adapter-command PATH` only, or use a repo-local registry file after the fake/local fixture passes?
