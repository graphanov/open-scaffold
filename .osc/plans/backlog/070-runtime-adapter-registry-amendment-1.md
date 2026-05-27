# Amendment 1: 070-runtime-adapter-registry

## Parent

070-runtime-adapter-registry

## Date

2026-05-27

## Learning

The post-v1 adoption strategy review found that an adapter registry shipped while Open Scaffold has only one serious adapter path would weaken the runtime-neutral claim. A registry with only the OMX/Codex lane reads as a directory of absence, not an ecosystem. The safer sequence is: first prove a second adapter, then publish a registry, then add installer behavior only after separate safety review.

## New direction

Keep the registry plan, but gate it behind a second reference adapter and a public conformance story. The first registry should be a curated, read-only directory with explicit self-declared status and conformance evidence. It may show installation commands, but it must not execute arbitrary registry-provided commands or imply adapter certification.

## Impact on acceptance criteria

- AC #37 changes from "includes at minimum the built-in OMX adapter" to "includes at least two reference adapters with linked conformance evidence."
- AC #42 and AC #43 are deferred or rewritten: `osc runtimes install ADAPTER_ID` may print/manual-confirm a known safe command, but automatic `--yes` execution is out of scope until a separate installer-safety plan exists.
- Add an acceptance criterion that registry docs state: listed adapters are curated records, not security certification, compliance certification, or runtime endorsement.
- This plan should be sequenced after a second-reference-adapter proof and preferably after the public conformance pack exists.
