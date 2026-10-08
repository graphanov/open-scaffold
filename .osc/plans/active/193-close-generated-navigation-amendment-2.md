# Amendment 2: 193-close-generated-navigation

## Parent

193-close-generated-navigation

## Date

2026-10-08

## Learning

Fresh private v4 acceptance injected a renderer printf failure. The submitted shell ignored it, copied incomplete temporary history into MISSION, then reported successful closure. Baseline no-anchor append preserved that history under the same hook. No real repository file was affected and no production writer exists. Preserve the counterexample; explicitly guard the newly introduced renderer and temporary-output failures before admitting code.

## New direction

The paired repair must propagate failure from each newly introduced shell renderer write and the while-loop output redirection. A failed historical-line render, EOF-anchor separator or anchored entry render must exit nonzero before temporary content can replace or overwrite MISSION and before success is reported. Temporary creation/redirection failures must likewise refuse the history update.

Retain amendment1 file-identity behavior, the existing bounded recognition/caller/source-cap contract and legacy synchronous partial-failure limits. No rollback or atomic-close guarantee is added; plans may already have moved before this refusal. Existing unrelated baseline failure semantics are not silently expanded into a blanket guarantee.

The production scope remains the same five parent-plan paths. A private v5 design and fresh independent acceptance are required before production admission.

## Impact on acceptance criteria

Criterion 3 additionally requires fault-injected renderer/output failures to refuse incomplete history updates, with unchanged MISSION bytes before rendering succeeds.

Criterion 4 requires explicit renderer-site/redirection failure controls and retains the documented already-moved-plan partial-failure boundary. The guards and controls belong in close.sh and the existing shell test file.

Criterion 6 still requires separate actual writer admission, failed-first production regressions, unchanged committed-head verification and fresh full-publication review/CI. Private feasibility results do not satisfy those production gates. All other constraints remain unchanged.
