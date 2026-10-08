# Plan: 200-trace-plan-identity

## Status

active

## Context

A finite private task/run/feedback journey on source228806 correctly reconstructs taskA failure then verified retry despite a newer competing taskB. One inconsistent external record reproduces a trace defect: changing only B packet's plan.slug toA while retaining plan.pathB makes trace classify the packet as local for both plans and import B's run/PR/issue references into A. Plan-pinned handoff rejects that conflict; restoring the one field restores the exact control inspection. Synthetic statuses/gates/URLs do not prove real approval/adoption, and the API normally generates consistent packets.

## Goal

Trace excludes run packets with conflicting object plan identities from local reconstruction and their external-reference imports, while preserving supported consistent legacy links.

## Constraints / Out of scope

- Scope trace's existing plan matcher and associated link classification/diagnostics only. When supplied object slug/path identities disagree, neither query may classify that packet as local or import its external references. Do not change raw run packets or other records.
- Preserve supported legacy string plan identity, slug-only/path-only object identity, exact matching and previous-stage plan paths. Do not require the stored stage to equal the plan's current stage. Do not invent a taskId-to-plan mapping, full run schema certification, task/status writer or approval authority.
- Keep the existing optional include-unverified behavior: conflicting/weak mentions may remain clearly unverified when requested, with an honest non-sensitive conflict diagnostic, but no local or external-reference promotion. Default trace remains structural-only/read-only; stable JSON schema/warning shape and existing path containment/refusal controls remain intact.
- No shared-module/refactor, CLI grammar, executor/daemon, dependency or handoff/runtime/feedback change. No networking to validate external URLs, model/npm-installed/Windows/adoption or correctness/approval guarantee. Preserve ordinary valid retry/competing-plan chain and old packet bytes.
- Four implementation paths only. Optional exact readable source growth up to30lines (16,929 maximum) may update both cap literals plus plan200rationale; zero growth retains existing cap. Same roots/counting algorithm/20,890 baseline/41-file ceiling/shell equality. No line golf or unrelated compression.
- Parent184/README/assets/workflows/frozen persona/evaluator/controller/legacy runtime excluded. Canonical owner drafts outside this task; bytebaseline equality unknown. Prior199local closeout may travel in next publication and needs complete diff review.
- Direct-owner six-day routine maintenance delegation applies only after independent committed-head floor, fresh full-publication review/current CI/head/base/threads and actual effect readback; no synthetic authorization/protection bypass. Parent184 remains active.

## Files to touch

- `src/trace.ts` — reject conflicting object plan identities before local matching/reference promotion; appropriate warning/unverified treatment.
- `tests/trace.test.ts` — single-field conflict/restore real API/CLI regression plus legacy/path-only/stage/exact/refusal/read-only controls.
- `tests/framework-cleanup-metric.test.ts` — optional exact measured readability cap/rationale with unchanged metric contract.
- `.osc/releases/2026-10-08-200-trace-plan-identity.md` — discovery/failures/focus/floor/review/delivery facts and scope limits.

## Acceptance criteria

- [ ] A run with conflicting supplied object plan.slug and plan.path is excluded from both plans' local run links and external-reference imports; ordinary consistent restore control recovers its original links.
- [ ] Supported consistent legacy string/slug-only/path-only and previous-stage identities retain exact associations; unrelated/weak/unsafe inputs do not become local evidence, and requested unverified conflicts remain labeled with an honest diagnostic.
- [ ] Real API/CLI conflict regressions fail on baseline and pass on candidate; normal failed-attempt/retry/competing-plan reconstruction, source/fixture byte preservation and existing safety/refusal/schema/formatting behavior remain supported.
- [ ] Only admitted paths change, with measured readable growth within intent and unchanged metric roots/algorithm/baseline/filecap, excluded source/dependencies/README/workflows/frozen definitions and ownerdraft exclusions/unknowns.
- [ ] Independent unchanged committed-head strict/build/full verification and fresh complete publication review/current CI precede authorized merge/readback/release/factual closeout.

## Verification steps

1. Bind discovery29processrecords/seal/twofinitejourneys/one-fieldrestore and source; obtain exact private design and fresh independent acceptance before writer admission.
2. Run meaningful baseline failures first, then candidate real API/CLI default/include-unverified/legacy/stage/exact/containment controls without changing records or granting authority.
3. Validate note schema/metric intent and inspect complete diff; independently run ./verify.sh --strict,npm run build,npm test on unchanged committed HEAD with fresh full-publication review.
4. Reserve one scoped draft publication; read back actualhead/base/files, require current producer-bound checks/review/threads/head/base before routine merge, verify whole tree/parent/defaultmain and release.
5. Close factual records via supported helpers/parser-only verification, leaving parent184active through the interval.

## Open questions

- Exact conflict representation/diagnostic and legacy path semantics need fresh design acceptance; no implementation admitted by this preparation.
