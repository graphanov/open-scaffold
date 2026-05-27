# Amendment 1: 071-evidence-chain-verifier

## Parent

071-evidence-chain-verifier

## Date

2026-05-27

## Learning

The post-v1 adoption strategy review identified traceability as one of Open Scaffold's strongest existing stories and evidence-chain verification as the highest-leverage trust slice. The current plan is still directionally right, but the product reason is sharper: this command should turn a folder of plans, runs, evidence, releases, and PR references into a one-command answer to "does the work record check out?" without claiming evidence quality or legal compliance.

## New direction

Prioritize `osc verify --evidence-chain` as the structural trust command for the repo-native work record. It should produce both a concise human-readable chain summary and JSON findings, stay local-only by default, and preserve the boundary between structural linkage verification and correctness/compliance judgment.

## Impact on acceptance criteria

- Add an acceptance criterion for a concise summary line such as: `plans checked`, `links intact`, `broken`, `missing`, `unverifiable`, and `strict result`.
- Add an acceptance criterion for a documented `--since GIT_REF_OR_DATE` or explicitly deferred incremental mode, so larger repos can adopt the verifier without reading the whole history every time.
- Add docs wording that frames the command as "the story checks out structurally," not "the work is correct" or "the project is compliance-grade."
- Keep the local-only constraint: GitHub, npm, CI, and external URLs may be recognized syntactically, but network verification remains out of scope for this plan.
