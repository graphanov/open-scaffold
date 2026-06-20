# Mission

Open Scaffold exists to keep AI-assisted work in the repository instead of in
vanishing chat history. It is the repo-native work record for goals, plans,
attempts, handoffs, evidence, reviews, gates, approvals, and lessons — durable
files that a fresh session, smaller model, teammate, reviewer, or client can
read later without inventing what happened.

The mission is timeless; the means are not. Models, schemas, tools, and
workflows will keep changing with the technology, and everything below this
paragraph is expected to change with them. What does not change is the
commitment: AI work should leave an honest, reviewable record so future readers
can recover context, check claims against evidence, and route expensive frontier
model effort only where it is actually needed.

## How the mission is pursued today (subject to change)

Open Scaffold records what agents actually did as git-tracked, observed-fact
files, compiles that record into handoff packets a fresh session or a different
model can pick up without inventing history, and lets cheap or locally-hosted
models review and gate recorded attempts inside explicit proof boundaries.
Developers and teams use it when AI work must survive context loss, PR review,
client delivery, audit-sensitive handoff, or repeated attempts. The current
public package line remains intentionally pre-1.0: useful for structural records
and evidence-backed handoffs, not a mature production-readiness guarantee.

## Goals

- Make the work record ambient: extracted from observed facts (transcripts, receipts, test results, scores) around any workflow — never worker-authored ceremony, never a tax on the model doing the work.
- Make handoff compact and evidence-backed: `osc handoff` compiles the record into a packet that lets the next reader — fresh session, smaller model, other vendor, or human — reconstruct what happened from files instead of hallucinating it.
- Make cheap review real: reviewer profiles for low-tier and locally-hosted models (haiku-class, DeepSeek, Qwen, Ollama/MLX) that read the record, judge claims against evidence, and authorize or block the next attempt via `osc review`/`osc analyze` and `osc gate` — with feedback packets that flow upward to the frontier worker's next attempt.
- Be an open, vendor-neutral standard for recording and handing off agent work: versioned schemas, plain files, a generic MCP server; no runtime becomes the canonical brain.
- Claim only what is measured, publish the boundaries, keep public surfaces clear that current evidence is pilot-grade and pre-1.0, and keep the dead claims next to the live ones (evidence: `docs/PROOF_HARNESS.md` and the independent benchmark repo).
- Dogfood Open Scaffold on Open Scaffold itself: use the framework to grow the framework.

## Non-Goals

Explicit things this project is NOT trying to do. Legitimate scope discipline starts here. When new information arrives that would change what belongs in this list, follow the amendment protocol in `.osc/plans/README.md` — do not silently edit the list.

- Open Scaffold does not run, orchestrate, or discipline the worker's loop. The measured verdict stands: workers self-administering protocol got worse, not better. Judgment lives outside the worker; execution belongs to whatever workflow the user already runs.
- Open Scaffold does not claim to improve a frontier model's in-session output — a measured non-goal, kept published.
- Open Scaffold core does not make Discord, Slack, Telegram, or any chat surface the source of truth.
- Open Scaffold core does not require Claude Code, Codex, Gemini, OMC, OMX, or any other specific runtime; capture adapters are thin and optional.
- Open Scaffold core does not store secrets, raw runtime sessions, or uncurated agent logs as public product truth; records are curated, redacted, observed facts.
- Open Scaffold core does not replace GitHub Issues/branches/PRs for public/versioned implementation work, and it is not a compliance certification.
- Open Scaffold does not claim mature production readiness, broad third-party adoption, or universal benchmark dominance; current evidence is pilot-grade and bounded to recorded surfaces.

## Changelog

Historical entries below preserve the wording used at the time, including superseded identities such as harness, cockpit, or operating-system language. The current product identity is the mission above: repo-native work record, handoff, review/gate, and evidence boundaries.

One-line dated entries for every scope pivot. Format: `YYYY-MM-DD: <one-line pivot description + link to amendment file if applicable>`. Append entries in chronological order. Never rewrite history here.

<!-- append YYYY-MM-DD entries below this line -->
- 2026-06-20: closed 174-evidence-battery-package-sync — Published open-scaffold@0.33.0 to npm latest and created GitHub Release v0.33.0 as Latest; shipped the fail-closed evidence battery from PR #226 to the public package surface.
- 2026-06-18: closed v1-public-positioning-polish — polished v1 public positioning and release-readiness boundaries
- 2026-06-18: closed 173-codex-token-efficiency-proof — closed proof-battery hardening with fail-closed evidence battery and source-labeled Codex 2x fixture boundaries
- 2026-06-18: Owner expanded proof-battery hardening: add source-labeled evidence-battery metadata for more fixtures, human-reviewer replication status, controlled ablation status, and cold-resume packet contract without broadening the Codex 2x claim. — see .osc/plans/done/173-codex-token-efficiency-proof-amendment-1.md
- 2026-06-15: closed 172-public-readiness-package-sync — Published open-scaffold@0.32.1 to npm latest and created GitHub Release v0.32.1 as Latest.
- 2026-06-15: closed public-readiness-hardening — hardened public readiness messaging
- 2026-06-13: closed 171-capture-package-sync — Published open-scaffold@0.32.0 to npm latest and created GitHub Release v0.32.0 as Latest.
- 2026-06-13: closed 170-ambient-capture — Shipped osc capture ambient transcript extraction with claude-code, codex, and generic JSONL parsers; verified against owner-local real transcripts.
- 2026-06-12: closed 168-dollar-verb-retirement — retired the dollar-verb harness/dispatch layer, made osc review the recorded-attempt analysis front door, and removed the outdated README GIF
- 2026-06-12: Owner added README first-screen cleanup: remove the outdated resume screencast GIF from README and delete the obsolete tracked GIF asset in this slice. — see .osc/plans/done/168-dollar-verb-retirement-amendment-1.md
- 2026-06-12: closed 167-provenance-review-pivot — Product recentered on record/handoff/review-gate with receipts: read-only MCP front door smoke-tested vs Claude Code and Codex, OpenAI-compatible reviewer profile validated with a local judge on a real record, live ambient SessionEnd hook, and a 6/8-to-8/8 judge-feeds-worker run; $-verb removal staged as plan 168.
- 2026-06-12: Owner interview answers folded in: primary customer is the cheap/local-model enablement story (DeepSeek/Qwen/MLX-local reviewers in scope NOW via an OpenAI-compatible reviewer profile, plus a cheap-judge-feeds-frontier-worker validation run); generic MCP from day one tested against Claude Code and Codex; aliases osc handoff/review/gate become the front door; the harness $-verb grammar leaves every public surface with deprecation labels and its code removal becomes a follow-up plan; README/mission rewritten product-first with a short evidence section rather than the self-conviction narrative; doc budget may grow slightly; Spike A live hooks run on open-scaffold itself. — see .osc/plans/active/167-provenance-review-pivot-amendment-1.md
- 2026-06-12: closed 166-claim-ledger-repositioning — Plan 166 completed by PR #209 after refresh on merged PR #208 and full 631-test verification.
- 2026-06-12: closed 165-harness-enforced-evolution-loop — Plan 165 completed by PR #208 after latest-head Codex clean review and 631-test verification.
- 2026-06-10: Lock the v2 design: the three mechanism benchmarks run on one shared visual substrate (a seeded canvas game with deterministic event-log replays) built in an independent benchmark repo per the 2026-06-01 correction; arms are naked, naked+minimal-checklist, and open-scaffold with the evolve loop as the retry-trap instrument; execution lane is Claude headless on subscription, so budget is recorded as captured token counts from CLI usage fields, never invented USD. — see .osc/plans/active/163-proof-harness-v2-amendment-1.md
- 2026-06-10: closed 161-harness-identity-pivot — harness identity pivot and docs<=25 shipped via PR #205
- 2026-06-10: closed 162-surface-collapse-and-resume — osc resume + one-screen surface shipped via PR #204
- 2026-06-10: ratified the harness-identity pivot — the harness is the product, the work record is its substrate; supersedes the 2026-05-15 orchestration stance — see .osc/plans/done/161-harness-identity-pivot.md
- 2026-06-10: closed 160-harness-release-readiness-package-sync — Published open-scaffold@0.31.1, verified npm/latest and fresh npx help smokes, and created GitHub Release v0.31.1 as Latest.
- 2026-06-10: closed 159-harness-release-readiness — PR #199 merged; harness release-readiness docs and command help parity are in main while npm publish and GitHub Release remain owner-gated.
- 2026-06-10: closed 157-reproduction-proof-parity — PR #196 merged; reproduction proof parity shipped with Open Scaffold-owned bench suite, handoff lab, proof-gate, and benchmark feedback evidence.
- 2026-06-09: closed 158-team-control-room-adapter-parity — Implemented team/control-room adapter contracts with shared lanes, gates, feedback, events, and docs.
- 2026-06-09: closed 156-feedback-handoff-improvement-parity — Close feedback handoff improvement parity slice.
- 2026-06-09: closed 155-controlled-runtime-parity — Controlled runtime parity implemented and verified for PR #194 candidate.
- 2026-06-08: closed 154-harness-command-surface — PR #192 merged; harness command surface foundation landed with follow-up migration plans queued.
- 2026-06-08: closed 153-scaffold-vs-naked-proof-harness — bounded proof harness and source-labeled naked-Codex fixture landed
- 2026-06-07: closed 152-framework-cleanup-package-sync — Published open-scaffold@0.31.0, verified npm/latest and fresh npx, and created GitHub Release v0.31.0 as Latest.
- 2026-06-06: closed 151-framework-cleanup-shrink — Merged PR #183 after green CI, latest-head Codex clean/thread-zero review, and owner approval; close the framework cleanup shrink slice.
- 2026-06-04: closed 150-open-scaffold-efficiency-reset — close efficiency reset after merged controller diagnostics and run-packet gates
- 2026-06-03: closed 144-next-action-packet-npx-release-sync — published open-scaffold@0.30.1, verified npm latest/fresh npx, and created GitHub Release v0.30.1
- 2026-06-03: closed 143-framework-value-next-action-packet — PR #175 merged; next-action packet shipped as workflow-neutral handoff guidance
- 2026-06-03: closed 142-private-pilot-usage-and-evolve-control — landed evolve repair hypotheses and usage telemetry
- 2026-06-03: closed 141-0300-npx-release-sync — published open-scaffold@0.30.0, verified npm latest/fresh npx, and created GitHub Release v0.30.0
- 2026-06-02: closed 138-blueprint-security-adoption-program — Closed blueprint program through child plans 139 and 140; remaining owner gates are PR review, merge, publish/release decisions, and real runtime side effects.
- 2026-06-02: closed 140-blueprint-mega-security-adoption — Completed remaining blueprint security, adoption, runtime-boundary, proof, help, and schema surfaces in the mega Ralph-loop branch.
- 2026-06-02: Owner requested one Ralph-loop mega PR for the remaining blueprint items; child plan 140 supersedes the original small-PR sequencing while preserving no-publish/no-release/no-spawn gates. — see .osc/plans/active/138-blueprint-security-adoption-program-amendment-1.md
- 2026-06-02: closed 139-dispatch-env-timeout-log-bounds — hardened dispatch env timeout and log bounds
- 2026-06-01: closed 137-decouple-2000m-benchmark-boundary — Close decoupling repair plan after PR #165 merge
- 2026-06-01: closed 136-compact-evidence-mode — Add compact evidence mode for run and evolution-loop summaries
- 2026-06-01: closed 135-osc-eval-external-scorer-adapter — Close 135 after eval external scorer import
- 2026-06-01: closed 134-osc-evolve-analyze-plateau-and-impossible-ac — shipped osc evolve analyze via PR #160
- 2026-05-31: closed 133-2000m-postmortem-evolve-reset — Create 2000m benchmark postmortem and evolve reset package
- 2026-05-30: closed 132-plan-stats-command — Add osc plan stats portfolio summary command
- 2026-05-30: closed 129-zero-context-resume-proof — published open-scaffold@0.20.4, verified fresh npx compare demo, and created GitHub Release v0.20.4
- 2026-05-29: closed 131-mcp-integration-surface-readiness — closed 131-mcp-integration-surface-readiness after PR #153 MCP posture ADR merge
- 2026-05-29: record MCP posture ADR and readiness proof — see .osc/plans/done/131-mcp-integration-surface-readiness-amendment-1.md
- 2026-05-29: closed 130-section-parser-canonical-contract — published open-scaffold@0.20.3 and aligned canonical section parser public surfaces
- 2026-05-29: closed 128-methodology-pr-summary-ab-package-sync — published open-scaffold@0.20.2, verified npm latest/fresh npx, and created GitHub Release v0.20.2
- 2026-05-29: closed 126-pr-native-evidence-surface — PR-native read-only osc pr-summary renderer plus optional opt-in single-comment mirror
- 2026-05-29: closed 127-ab-comparison-pilot-harness — Pre-registered A/B pilot packet (runbook, pre-registration, raw-data template, reviewer rubric) plus read-only osc ab check validator; no data collected and no causal claim
- 2026-05-28: closed 125-methodology-evidence-harness — Close methodology evidence harness
- 2026-05-28: closed 124-trace-package-release-sync — Close trace package release sync after npm and GitHub Release proof
- 2026-05-28: closed 117-osc-trace-work-record-replay — added read-only work-record trace command
- 2026-05-28: closed 123-evidence-chain-package-release-sync — Close evidence-chain package release sync after 0.20.0 npm publish and GitHub Release
- 2026-05-27: closed 071-evidence-chain-verifier — evidence-chain verifier implemented and verified
- 2026-05-27: closed 122-compare-package-release-sync — published 1.0.5 and aligned compare package public surfaces
- 2026-05-27: closed 109-bare-attempt-compare — added prerequisite-free bare attempt comparison
- 2026-05-27: broaden positioning beyond software-only work — see .osc/plans/done/108-public-work-record-positioning-amendment-1.md
- 2026-05-27: closed 108-public-work-record-positioning — aligned public work-record positioning
- 2026-05-27: align public category language around repo-native work records — see .osc/plans/done/108-public-work-record-positioning.md
- 2026-05-27: prioritize evidence-chain verifier as the trust-story command from adoption strategy audit — see .osc/plans/backlog/071-evidence-chain-verifier-amendment-1.md
- 2026-05-27: defer runtime adapter registry until second adapter and conformance proof exist — see .osc/plans/backlog/070-runtime-adapter-registry-amendment-1.md
- 2026-05-27: closed 107-work-dry-run-package-sync — published 1.0.4 and aligned work dry-run public surfaces
- 2026-05-26: closed 104-osc-work-dry-run-target — Closed 104 osc work dry-run target.
- 2026-05-26: closed 106-dispatch-adapter-glue-package-sync — Closed 106 dispatch adapter glue package sync after v1.0.3 npm and GitHub Release verification.
- 2026-05-26: closed 103-osc-dispatch-adapter-glue — added explicit dispatch adapter glue
- 2026-05-26: closed 105-codex-runtime-adapter-package-release-sync — published 1.0.2 Codex runtime preset package sync
- 2026-05-26: closed 102-codex-runtime-adapter-package-hardening — hardened Codex runtime adapter path
- 2026-05-26: closed 101-osc-start-codex-agent-entry — added no-spawn osc start Codex handoff
- 2026-05-26: closed 100-verify-strict-filename-quoting — hardened strict verifier filename handling
- 2026-05-26: closed 099-runtime-adoption-ux-reset — captured post-v1 Codex-first runtime adoption workflow target
- 2026-05-26: closed 074-v1-launch-docs-polish — polished v1 launch docs and release truth
- 2026-05-25: closed 064-devcontainer-profile — devcontainer profile shipped in PR #108
- 2026-05-25: closed 069-v1-launch — prepared v1.0.0 release candidate with stability docs and owner publication gates
- 2026-05-25: limit automation to v1 release-candidate preparation; publication remains owner-gated — see .osc/plans/done/069-v1-launch-amendment-1.md
- 2026-05-25: closed 068-python-reference-parser — added Python reference parser
- 2026-05-25: closed 067-plan-dependency-graph — added plan dependency graph CLI
- 2026-05-25: closed 066-web-dashboard — added static web dashboard CLI
- 2026-05-25: keep web dashboard open flag no-spawn safe — see .osc/plans/done/066-web-dashboard-amendment-1.md
- 2026-05-25: closed 065-tui-dashboard — added terminal dashboard CLI
- 2026-05-24: align devcontainer image with published package and workspace post-create install — see .osc/plans/done/064-devcontainer-profile-amendment-1.md
- 2026-05-24: closed 063-github-actions-ci-templates — added GitHub Actions CI templates
- 2026-05-24: closed 098-omo-security-hardening-package-sync — published open-scaffold@0.4.18 and aligned GitHub Latest Release
- 2026-05-23: closed 097-omo-security-hardening — hardened release-path and dependency security posture
- 2026-05-23: closed 096-glass-cockpit-webhooks-public-surface-sync — Publish open-scaffold@0.4.17 and align GitHub Latest Release for cockpit webhooks.
- 2026-05-23: closed 062-glass-cockpit-webhooks — added push-only Discord and Slack cockpit webhooks
- 2026-05-23: closed 095-local-task-database-public-surface-sync — published 0.4.16 and aligned local task database public surfaces
- 2026-05-23: record packaged init hotfix after public npx verification — see .osc/plans/done/095-local-task-database-public-surface-sync-amendment-1.md
- 2026-05-23: closed 061-local-task-database — added local task database CLI
- 2026-05-22: closed 060-mcp-server — added optional read-only MCP server
- 2026-05-22: closed 094-evolution-ledger-demo-proof — added reproducible evolution-ledger demo proof
- 2026-05-22: closed 093-pr89-public-surface-sync — published 0.4.13 and aligned public package/release surfaces
- 2026-05-22: closed 092-evolution-loop-visibility-v1 — made evolution loop comparison visible
- 2026-05-22: closed 091-readme-work-record-evolution-ledger — clarified README around work records and evolution ledgers
- 2026-05-22: closed 090-evolution-compare — added evolution compare CLI
- 2026-05-21: closed 059-adoption-metrics — added local adoption metrics CLI
- 2026-05-21: closed 054-multi-language-agent-entry-points — translated agent entry points shipped in PR #84
- 2026-05-21: Tighten translation verification: preserve heading order and documented source literals — see .osc/plans/done/054-multi-language-agent-entry-points-amendment-1.md
- 2026-05-21: closed 031-agentic-orchestration-model-lab-vision — closed model-lab hypothesis as evidence-gated non-core direction
- 2026-05-21: closed 089-runtime-omx-evolution-ledger-package-sync — published 0.4.10 and aligned runtime OMX ledger package surfaces
- 2026-05-21: closed 088-runtime-omx-evolution-ledger-bridge — Close 088 runtime OMX evolution ledger bridge
- 2026-05-21: closed 087-closed-evolution-loop-contract — added evolution loop contract CLI
- 2026-05-20: closed 030-agent-runtime-selection-vision — reconciled runtime selection vision
- 2026-05-20: closed 086-init-help-flags — Added init help flag handling
- 2026-05-20: closed 085-runtime-list-json — added JSON output for runtime profile listing
- 2026-05-20: closed 084-macos-tmp-brownfield-init — fixed macOS /tmp brownfield init
- 2026-05-20: closed 058-doctor-auto-fix — added doctor auto-fix CLI
- 2026-05-20: closed 083-verify-help-flags — Added verify help flag handling
- 2026-05-20: closed 082-evidence-new-plan-validation — validated evidence note creation against plan slugs
- 2026-05-20: closed 081-lifecycle-help-flags — Added lifecycle help flag handling
- 2026-05-20: closed 057-automated-evidence-collection — added automated evidence collection CLI
- 2026-05-20: align evidence collection with current .osc/releases evidence-note path — see .osc/plans/done/057-automated-evidence-collection-amendment-1.md
- 2026-05-20: closed 080-readme-resume-screencast-dark-theme — README resume screencast replaced with dark theme media
- 2026-05-20: closed 079-readme-resume-screencast — README resume screencast shipped as approved show-first media
- 2026-05-19: closed 056-run-dry-run-preview — Added osc run --dry-run preview for run packets
- 2026-05-19: closed 055-plan-linter — added mechanical plan validation CLI
- 2026-05-19: closed 053-plan-template-library — added plan template library and template-based plan creation
- 2026-05-19: closed 078-github-actions-node24-runtime-refresh — refreshed GitHub Actions pins after Node 20 deprecation annotation
- 2026-05-19: closed 077-npm-trusted-publishing-workflow — added npm trusted publishing workflow setup
- 2026-05-19: closed 076-plan-wizard-package-release-sync — prepared plan wizard package release candidate
- 2026-05-19: closed 052-interactive-plan-wizard — added interactive plan wizard
- 2026-05-19: closed 075-brownfield-package-release-sync — prepared brownfield init package release candidate
- 2026-05-19: closed 051-brownfield-init-from-existing — brownfield init from existing repos shipped
- 2026-05-19: closed 074-package-public-surface-sync — published 0.4.2 and aligned package public surfaces
- 2026-05-18: closed 050-npm-publish-and-npx-init — reconciled live npm/npx package truth and created package public-surface follow-up
- 2026-05-18: reconcile stale npm publish blocker with live 0.4.1 package evidence — see .osc/plans/done/050-npm-publish-and-npx-init-amendment-1.md
- 2026-05-18: closed 049-plan-stage-move — added plan stage movement CLI
- 2026-05-18: closed 048-cli-lifecycle-parity — CLI lifecycle parity helpers shipped
- 2026-05-18: closed 047-roadmap-open-question-reconciliation — roadmap open-question reconciliation shipped
- 2026-05-18: closed 044-cli-friction-reduction — CLI plan and evidence helpers shipped
- 2026-05-18: closed 043-one-real-runtime-adapter-spike — OMX $ralplan explicit runtime launch gate shipped
- 2026-05-18: closed 042-reference-adapter-package-no-spawn — OMX no-spawn runtime package scaffold shipped
- 2026-05-18: closed 046-executable-open-scaffold-architecture — executable Open Scaffold architecture captured
- 2026-05-18: Align 043 with OMX-first ralplan runtime spike direction — see .osc/plans/backlog/043-one-real-runtime-adapter-spike-amendment-1.md
- 2026-05-18: Align 042 with in-repo packages/runtime-omx agentic runtime direction — see .osc/plans/backlog/042-reference-adapter-package-no-spawn-amendment-1.md
- 2026-05-18: closed 041-adapter-conformance-contract-v1 — adapter conformance contract v1 shipped
- 2026-05-17: record full-history checkout for strict CI verification — see .osc/plans/done/045-github-actions-ci-amendment-2.md
- 2026-05-17: record CI-exposed lifecycle timestamp flake fix — see .osc/plans/done/045-github-actions-ci-amendment-1.md
- 2026-05-17: closed 045-github-actions-ci — GitHub Actions CI workflow added
- 2026-05-17: closed 040-vocabulary-compression-v2 — compressed first-touch vocabulary while preserving runtime boundaries
- 2026-05-17: closed 039-session-2-aha-walkthrough — session-2 aha walkthrough shipped
- 2026-05-17: closed 038-first-run-adoption-hardening — first-run adoption hardening shipped and npm package published
- 2026-05-17: closed 037-audit-envelope-digest-manifest — added structure-only audit envelope digest manifest CLI mechanics
- 2026-05-17: closed 036-evaluation-envelope-schema-and-osc-eval — added structure-only evaluation envelope schema and osc eval init/check mechanics
- 2026-05-17: rescope PR39 around evaluation and audit envelope standards — see .osc/plans/done/033-implementation-architecture-evaluation-lens-amendment-1.md
- 2026-05-17: closed 033-implementation-architecture-evaluation-lens — implementation architecture lens shipped
- 2026-05-16: closed 035-runtime-docs-simplification — runtime docs simplification and hypothesis reconciliation shipped
- 2026-05-15: closed 034-runtime-profiles-v0 — runtime profiles v0 shipped with schema-backed built-in and project-local runtime selection
- 2026-05-15: closed 009-runtime-harness-adapter-refresh — runtime adapter refresh audit and conformance lane coverage shipped
- 2026-05-15: closed 019-comparison-page — comparison page shipped in public trust/readiness bundle
- 2026-05-15: closed 010-product-packaging-release — packaging readiness evidence shipped in public trust/readiness bundle
- 2026-05-15: closed 007-cli-validation-upgrades — CLI validation upgrades shipped in public trust/readiness bundle
- 2026-05-15: closed 021-identity-rename-audit — public identity audit completed in bundled adoption path
- 2026-05-15: closed 016-docs-positioning-compression — first-read positioning compression shipped in bundled adoption path
- 2026-05-15: closed 008-user-facing-examples — user-facing examples index shipped in bundled adoption path
- 2026-05-15: closed 014-downstream-example-project — downstream example walkthrough shipped in bundled adoption path
- 2026-05-15: closed 032-adapter-conformance-fixture — adapter conformance fixture shipped
- 2026-05-15: amend 020-reference-truth-audit to permit the mechanical close stamp required by close.sh — see .osc/plans/done/020-reference-truth-audit-amendment-1.md
- 2026-05-15: closed 020-reference-truth-audit — reference truth labels shipped for public/private/tool references
- 2026-05-15: closed 024-roadmap-scope-discipline — roadmap scope discipline applied; public planned milestones capped and speculative compliance/hashgraph exploration deferred
- 2026-05-15: closed 029-project-wiki-knowledge-seed — project wiki knowledge seed shipped in PR #28
- 2026-05-15: closed 028-project-wiki-skeleton — project wiki skeleton shipped
- 2026-05-14: closed 015-cli-packaging-ux — Added tiered scaffold initialization for min, standard, and max downstream repo setup.
- 2026-05-14: closed 025-minimum-viable-scaffold — minimum viable scaffold guide shipped
- 2026-05-14: closed 023-worked-downstream-example — lifecycle E2E smoke fixture shipped
- 2026-05-14: closed 027-lifecycle-e2e-smoke-strategy — E2E smoke review strategy promoted
- 2026-05-14: closed 026-vocabulary-compression — first-touch vocabulary compression shipped in PR #22
- 2026-05-14: closed 022-sixty-second-demo — 60-second viewer demo shipped in PR #22
- 2026-05-14: closed 018-readme-compression — first-touch adoption path shipped in PR #22
- 2026-05-14: closed 017-runtime-strategy-native-runtime-exploration — runtime strategy boundary shipped through PR #17 research synthesis and PR #18 spawning boundary; core remains non-spawning, adapter/receipt path documented
- 2026-05-13: added native runtime / thin spawner exploration as an explicit long-term roadmap question rather than an accidental core scope change
- 2026-05-12: closed 013-binding-example
- 2026-05-12: closed 012-independent-review-hardening — independent review hardening shipped: quick/standard/strict tier behavior corrected, vitest upgraded to clear npm audit, OMC/OMX runtime state ignored, verification clean
- 2026-05-12: closed 011-codex-pr10-verify-feedback — PR #11 merged; verification hotfix accepted, strict/standard/CLI/test/build checks passing before post-v0.3 review roadmap work
- 2026-05-12: closed 006-v2-roadmap-stale-state-checks — closed 006-v2-roadmap-stale-state-checks — reconciled v1 state, created v2 backlog, officialized .osc/releases, added stale-state validation, and prepared v0.3.0 in PR #10
- 2026-05-12: closed 001-generic-osc-core — closed 001-generic-osc-core — foundational .osc core, task/run protocol, runtime binding, and self-dogfood baseline shipped through PRs #2-#9; v2 follow-ups moved to backlog
- 2026-05-12: closed 005-self-dogfood-release-loop — closed 005-self-dogfood-release-loop — proved Milestone 6 issue/plan/run/PR/Codex/verification/release-note chain in PR #9
- 2026-05-12: closed 004-runtime-binding-contract — closed 004-runtime-binding-contract — shipped docs/RUNTIME_BINDING_CONTRACT.md in PR #7; Codex connector blocked by missing environment, local verification green
- 2026-05-12: closed 003-glass-cockpit-event-protocol — shipped docs/GLASS_COCKPIT_PROTOCOL.md in PR #6 with Codex feedback addressed
- 2026-05-12: closed 002-slice-close-evidence-loop — shipped docs/SLICE_CLOSE_PROTOCOL.md in PR #5 with Codex review clean
2026-05-11: Defined Open Scaffold as a runtime-neutral repo-native operating system for agent-orchestrated development, with explicit orchestrator/harness/glass-cockpit boundaries.
2026-05-11: Reframed Open Scaffold ontology and roadmap via `.osc/plans/active/001-generic-osc-core-amendment-1.md`.
2026-05-11: Adopted external OMC/OMX/Hermes/clawhip boundary correction via `.osc/plans/active/001-generic-osc-core-amendment-2.md`.
2026-05-11: Documented task/run/operator-surface model and added v1 run binding schema via `.osc/plans/active/001-generic-osc-core-amendment-3.md`.
2026-05-12: Document runtime harness dispatch bridge pattern for Open Scaffold core — see `.osc/plans/active/001-generic-osc-core-amendment-4.md`.
