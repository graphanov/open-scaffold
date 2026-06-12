#!/usr/bin/env node
// Spike B (plan 167): claims-vs-actual with a plain test runner as the criteria
// source — no benchmark scorer involved. Maps vitest JSON results into an
// open-scaffold.evaluation.v1 envelope (one criterion per test file), then
// compares a worker-style claim ("complete") against the observed results and
// emits a mismatch verdict.
//
// Usage:
//   npx vitest run --reporter=json --outputFile=/tmp/vitest.json
//   node examples/spikes/claims-from-tests.mjs --results /tmp/vitest.json \
//     [--claim verdict.json] [--out /tmp/envelope.json]
//
// The claim file is the same shape the benchmark used:
//   { "status": "complete" | "redesign_needed" | "blocked", "rationale": "..." }
// Without --claim, the spike only renders the envelope and the pass summary.

import { readFileSync, writeFileSync } from 'node:fs';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : d;
};

const resultsPath = arg('results');
if (!resultsPath) {
  console.error('Usage: claims-from-tests.mjs --results <vitest-json> [--claim <verdict.json>] [--out <envelope.json>]');
  process.exit(2);
}

const results = JSON.parse(readFileSync(resultsPath, 'utf8'));
const files = results.testResults ?? [];
if (files.length === 0) {
  console.error('No testResults in the provided file — is it a vitest --reporter=json output?');
  process.exit(2);
}

const criteria = files.map((f) => {
  const name = String(f.name ?? 'unknown').replace(/^.*\/(tests?\/)/, '$1');
  const failed = (f.assertionResults ?? []).filter((a) => a.status === 'failed').length;
  const passed = (f.assertionResults ?? []).filter((a) => a.status === 'passed').length;
  const status = f.status === 'passed' && failed === 0 ? 'pass' : 'fail';
  return {
    id: name,
    text: `Test file ${name} passes (${passed + failed} tests)`,
    status,
    evaluator: { kind: 'tests', name: 'vitest', ref: 'package.json#test' },
    evidence: [],
    rationale: status === 'pass' ? `${passed} tests passed` : `${failed} of ${passed + failed} tests failed`,
  };
});

const passCount = criteria.filter((c) => c.status === 'pass').length;
const envelope = {
  schema: 'open-scaffold.evaluation.v1',
  evaluation_id: `tests-${new Date().toISOString().slice(0, 10)}`,
  created_at: new Date().toISOString(),
  subject: { source: 'tests', plan: null, plan_slug: null, task_id: 'claims-from-tests-spike', run_id: null, run_packet: null },
  acceptance_criteria: criteria,
};

const out = arg('out');
if (out) writeFileSync(out, JSON.stringify(envelope, null, 2) + '\n');

console.log(`criteria (test files): ${criteria.length}, passing: ${passCount}, failing: ${criteria.length - passCount}`);
const failing = criteria.filter((c) => c.status === 'fail').map((c) => c.id);
if (failing.length) console.log(`failing: ${failing.join(', ')}`);

const claimPath = arg('claim');
if (claimPath) {
  const claim = JSON.parse(readFileSync(claimPath, 'utf8'));
  const claimsComplete = claim.status === 'complete';
  const actuallyComplete = passCount === criteria.length;
  const mismatch = claimsComplete && !actuallyComplete;
  console.log(`claim: ${claim.status} | observed: ${passCount}/${criteria.length} passing`);
  console.log(mismatch
    ? `CLAIMS-VS-ACTUAL MISMATCH: worker claims complete while ${criteria.length - passCount} test file(s) fail — verdict: do not accept; route to review.`
    : 'claims-vs-actual: consistent.');
  process.exit(mismatch ? 1 : 0);
}
