# Amendment 1: 193-close-generated-navigation

## Parent

193-close-generated-navigation

## Date

2026-10-08

## Learning

Fresh independent v3 design review found that the shell no-anchor fallback unconditionally replaced MISSION from mktemp. Baseline appended in place. Private controls show identical output bytes with changed mode, lost symlink-target stamping and split hardlinks. None of those effects were authorized. Production admission remains closed; preserve v3 artifacts and add the missing compatibility requirement before any real implementation.

## New direction

Retain the existing bounded navigation recognition, source cap and paired correction. The shell no-anchor branch must keep its original append-in-place behavior, including MISSION inode/mode, symlink identity and target update, and hardlink identity/shared-target update. This requirement is separate from anchored stamping's explicitly documented baseline behavior and raw-line preservation improvements.

The real implementation scope remains the same five parent-plan paths. A private v4 redesign must fix this regression and retain v3 results as rejected; fresh independent acceptance is still required before a writer lease.

## Impact on acceptance criteria

Criterion 3 additionally requires no-anchor shell regular-file modes (including executable/private modes), symlink identity/target content and hardlink inode/shared content to match baseline append semantics.

Criterion 4's fallback compatibility explicitly includes those file-identity/metadata effects, in addition to existing bytes/messages/errors/order/idempotence controls. The new regressions must be placed in the existing shell test file.

Other criteria, unchanged source cap and all exclusions remain. Private prototype success or a design recommendation remains separate from production admission, committed-head verification and public effects.
