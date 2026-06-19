# Reproduce

Every claim Open Scaffold makes is backed by committed receipts you can audit without spending a cent, or re-run yourself if you want to spend. Nothing here is a screenshot of vibes.

## 1. Audit the headline token-efficiency result (zero spend, ~10 seconds)

The claim: a 1.5 KB Open Scaffold resume capsule lets a model preserve decision quality while using 4.33× fewer tokens than a 419 KB raw paused-session transcript.

The receipts are committed in this repo. Validate and compare them without calling any model:

```bash
git clone https://github.com/graphanov/open-scaffold
cd open-scaffold

# Validate the manifest against its committed receipts (no model, no network)
npx open-scaffold@latest prove check examples/proof/codex-token-efficient-resume/manifest.json

# Print the full comparison table from those same receipts
npx open-scaffold@latest prove compare examples/proof/codex-token-efficient-resume/manifest.json --format markdown
```

You will see the exact numbers — 419,233 bytes vs 1,557 bytes, 137,327 vs 31,715 median tokens, 6/6 decision quality tied — printed from JSON files you can open and read yourself:

```bash
cat examples/proof/codex-token-efficient-resume/receipts/aggregate.json
```

The tool prints its own caveats inline, including the one that matters most: the quality score is a deterministic rubric over committed answers, not a blind human-reader study, on one cold-resume decision. It does not prove universal savings. We lead with the honest boundary because that is the price of being believed.

## 2. Audit the reviewability result (zero spend, read-only)

The claim: a mid-tier reviewer answering factual questions about finished work got 94% right with the work record, 30% without, and zero confident wrong answers with the record (eight without).

The receipts live in the independent [harness-bench](https://github.com/graphanov/harness-bench) repo — deliberately separate from this one, so the framework is never grading its own homework:

```bash
git clone https://github.com/graphanov/harness-bench
cd harness-bench

# The preregistration: hypotheses, answer keys, kill rules — committed before any model ran
cat PREREGISTRATION.md

# The mechanical scorer validates against committed golden answers
node scorer/scorer-v2.mjs --selftest

# The raw per-run JSONL receipts (every token, every answer, every score)
ls results/
```

You can read every receipt, re-grade against the committed keys, and check the kill rule yourself. The scorer is mechanical and deterministic — taste is not in the loop.

## 3. The honest spend boundary

Auditing (steps 1–2) costs nothing. **Re-running** the experiments costs money, because the worker and reviewer are real model calls:

- Re-running the token-efficiency fixture requires Codex CLI access and paid `codex exec` / model calls (3 replicates per arm).
- Re-running the reviewability trial requires a worker model and a reviewer model (paid calls).
- The receipts above are the proof. Re-running is for someone who does not trust committed receipts and wants to see them regenerated live.

If you re-run and get a different number, that is the single most useful thing you can do for this project. Open an issue with your receipts.

## 4. The challenge

The one thing no amount of self-authored benchmarks can prove is adoption. The credibility lever that actually matters is a stranger reproducing a result on their own repo.

So: take the discipline (see [`SKILL.md`](SKILL.md)) into a real multi-session slice of your own work where context loss actually hurt. Run `osc handoff` after an interruption. Have a cheap model review the record with `osc review`. Publish your number — tokens saved, recovery time, or review accuracy — with your own receipts.

If the record did not help, publish that too. The negative results are part of the product. We measured where the scaffold does not help (near-zero recoverable state, in-session task quality for a strong model) and published those at equal weight with the wins. Do the same.

## What this does not prove

- Not a production-readiness claim.
- Not broad third-party adoption (yet).
- Not universal superiority over naked agents.
- Not that the scaffold makes your model smarter (measured: it does not).
- Not compliance certification of any kind.

It proves: the work record turns a cheap model into a trustworthy auditor of finished work, and a compact record preserves a resume decision at a fraction of the token cost. Those are the two claims. Everything else is honestly bounded.
