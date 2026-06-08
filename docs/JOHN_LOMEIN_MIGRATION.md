# John Lomein migration note

John Lomein was the source prototype for several useful runtime/control mechanisms now being integrated into Open Scaffold.

This is not a product rename and not a blind code dump. The migration keeps useful mechanisms and removes the prototype meme surface.

## Migrated ideas

- Controlled work run packages.
- Human gates for missing context.
- Gate answers as task input, not approval.
- Event/status receipts for future app surfaces.
- Feedback records and repair hypotheses.
- Accepted improvement inheritance.
- Compact handoff packet/compiler behavior.
- Benchmark/reproduction receipts with strict proof boundaries.
- Path traversal and symlink-safe artifact writes.

## Not migrated as product surface

The public Open Scaffold product should not use prototype meme command names or John-persona wording.

Do not expose these names as Open Scaffold branding or user-facing commands:

- `john-lomein`
- `jon`
- `damn-food`
- `soy-sauce`
- `vegetables`

The user-facing harness grammar is:

```text
$interview
$plan
$work
$team
```

## Evidence interpretation

Source prototype evidence showed useful signals, especially cost/speed and compact handoff behavior. It did not cleanly prove broad dominance over naked Codex.

Open Scaffold docs should preserve that truth:

- Source prototype evidence can be cited as provenance.
- Open Scaffold proof requires Open Scaffold-run evidence.
- Broad dominance remains mixed / not proven unless Open Scaffold reproduces it cleanly with live paired runs and ablations.

## Current PR scope

This integration establishes the harness foundation and simulated proof machinery. It does not implement a full desktop app, publish npm, create a release, merge PRs, force-push, or make Open Scaffold an autonomous authority.

## Follow-up roadmap

The full migration continues through a planned PR chain: controlled runtime parity, feedback/handoff improvement parity, reproduction proof parity, team/control-room adapter parity, and release readiness. See [`JOHN_LOMEIN_MIGRATION_ROADMAP.md`](JOHN_LOMEIN_MIGRATION_ROADMAP.md) for the current state, PR associations, closeout gates, and step-by-step plan.
