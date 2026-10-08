# Amendment 1: 195-windows-helper-navigation

## Parent

195-windows-helper-navigation

## Date

2026-10-08

## Learning

Fresh independent private design acceptance reproduced a compatibility regression. Baseline and the submitted candidate both move a regular POSIX amendment filename containing a literal backslash and report it in the complete moved list. The baseline retargets its POSIX helper field, but the candidate leaves that same related field stale. The candidate's all-separator uniformity/filename exclusion confused a legal POSIX filename character with a directory separator. No real source or public effect occurred; preserve the private submission and counterexample.

## New direction

Interpret separators at the recognized directory boundaries. Preserve the old POSIX terminal-path meaning for an exact actual-moved regular filename, including a literal backslash filename allowed by the shell's existing amendment glob. Do not reinterpret that filename character as a Windows directory separator, and do not use its normalized nested path as an alias lookup. Unrelated literal fields remain unchanged.

Normalize directory forms only for recognized uniform Windows helper paths, with the admitted raw and normalized alias guards. Continue excluding genuinely mixed directory forms, drive/UNC/absolute/traversal paths, unrelated suffix/prose/fenced/inline records and unmoved filenames. Keep complete public moved lists, already-done early behavior and all plan193 metadata/refusal safeguards.

The implementation scope remains the original five paths; source ceiling, no golf/module/budget change, future-only serialization preservation and Windows qualification limits remain. Integrate a private revised design and obtain fresh independent acceptance before any real writer admission.

## Impact on acceptance criteria

Criterion 2 explicitly includes regular POSIX literal-backslash filenames actually moved by the current shell close, preserving their old terminal-field retarget behavior.

Criterion 3 distinguishes mixed directory separators from literal filename characters, and requires unchanged unrelated normalized nested aliases when a related POSIX literal field is retargeted. Preserve raw-path alias checks for POSIX fields; Windows directory forms retain raw plus normalized alias checks.

Criterion 4 adds a paired baseline/candidate regression for the legitimate related field and an unrelated literal-field/normalized-nested-alias control. No old protocol requirement, source path, metric or authority gate is silently relaxed. Criteria5/6 and all other exclusions remain.
