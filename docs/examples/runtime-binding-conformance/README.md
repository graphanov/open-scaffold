# Runtime Binding Conformance Fixture

This fixture demonstrates the smallest safe adapter contract: a fake/local adapter consumes a `run.json` work package (run packet), writes an adapter receipt file (`dispatch-receipt.json`) and evidence artifact, and exits without launching a real runtime.

It is not a production adapter SDK. It is a deterministic conformance target for future adapter packages.

## Run the fixture

Given a `run.json` work package (run packet) at `.osc/runs/<run_id>/run.json`:

```bash
node docs/examples/runtime-binding-conformance/fake-local-adapter.mjs \
  .osc/runs/<run_id>/run.json \
  --out .osc/runs/<run_id>/dispatch-receipt.json
```

Expected result:

- exits `0` for an executable package with no blockers and `executor.spawning: false`;
- writes `dispatch-receipt.json` with `schema_version: open-scaffold.dispatch-receipt.v1` and the minimum fields from `docs/SPAWNING_BOUNDARY.md`;
- writes a deterministic evidence markdown file at the first `artifacts.evidence[]` path, or a default fake-local evidence path;
- states that no runtime was launched, no credentials were read, and no network was required.

## Boundary

The fixture validates the adapter boundary before real runtime work exists:

```text
Open Scaffold core packages work.
A fake/local adapter consumes the package.
The adapter writes receipt/evidence artifacts.
No Claude, Codex, OMC, OMX, GSD, or other runtime is launched.
```

Future adapters can use this fixture as a minimum behavior target before adding runtime-specific launch mechanics.

## What this proves / does not prove

This fixture proves four structural facts only:

- a valid `open-scaffold.run.v1` packet can be consumed;
- `executor.spawning: false` is enforced;
- an `open-scaffold.dispatch-receipt.v1` receipt is written;
- deterministic evidence is written under the repository root.

It does **not** prove real runtime launch, production adapter support, runtime-support endorsement, or task correctness. Postflight/evaluation still decides whether acceptance criteria passed.

## Accepted fixture lane tokens

- `plain-agent` with no runtime command/mode (`harness skill`);
- `human` / `manual` with no runtime command/mode (`harness skill`);
- `omc-claude` with `/deep-interview`, `/ralplan`, `/team`, `/ralph`, or `/ultrawork`;
- `omx-codex` with `$deep-interview`, `$ralplan`, `$team`, `$ralph`, `$ultrawork`, or `$ultragoal`.

Accepted here means the fake/local adapter can validate the package and write receipt/evidence artifacts for that lane token. It does not mean the named runtime is installed, launched, certified, or production-supported.
