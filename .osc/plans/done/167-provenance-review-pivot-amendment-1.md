# Amendment 1: 167-provenance-review-pivot

## Parent

167-provenance-review-pivot

## Date

2026-06-12

## Learning

The owner's interview answers reframed the customer: not "people who need
review tooling" but people who want to stop using frontier models for
everything — Open Scaffold is the rigor layer that lets lower-tier, cheaper,
and locally-hosted models (haiku-class, DeepSeek, Qwen, MLX/Ollama) hold real
roles in agentic workflows: reviewing, gating, bookkeeping, and feeding
evidence-based suggestions back to the frontier worker's next attempt. The
open record/handoff standard is the trust mechanism that makes those roles
safe. Two consequences got decided now rather than later: local/cheap-model
reviewer support moves into this plan, and the harness $-verb grammar leaves
the public surface entirely (code removal staged as a follow-up plan).

## New direction

Goal restated: Open Scaffold's public surface presents the cheap/local-model
enablement story — ambient records, handoff packets, and review/gate (with the
gate's packet feeding the next attempt) — under the names `osc handoff`,
`osc review`, and `osc gate`; the MCP server is generic from day one and
exercised against Claude Code and Codex; a reviewer profile speaks to any
OpenAI-compatible endpoint so local and third-party cheap models can judge;
the $-verb grammar appears nowhere except a deprecation note in `help --all`.

## Impact on acceptance criteria

- AC1 (README/MISSION) reworded: the product story is cheap/local-model
  enablement on top of records/handoff/review-gate; evidence appears as a short
  linked section, not the narrative lead; no $-verb grammar anywhere public.
- AC2 (help) tightened: core help shows `handoff`, `review`, `gate` aliases as
  the front door; $-verbs demoted to a deprecation note in `help --all`;
  a follow-up plan (168, backlog) owns their code removal.
- AC3 (MCP) widened: generic MCP, smoke-tested against Claude Code AND Codex.
- NEW AC6: a reviewer profile targets an OpenAI-compatible endpoint (covers
  Ollama/MLX-local, DeepSeek, Qwen) and is exercised once end-to-end on a real
  record (local model if available, else any cheap endpoint).
- NEW AC7: one validation run of the cheap-judge-feeds-frontier-worker loop
  (review packet from a low-tier judge injected into a frontier worker's next
  attempt), receipts committed — the owner's "suggestions upward" mechanism.
- AC4 (Spike A) pinned to instrumenting open-scaffold itself (owner answer F1).
