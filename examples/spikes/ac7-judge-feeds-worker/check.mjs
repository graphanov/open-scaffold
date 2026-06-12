#!/usr/bin/env node
// AC7 validation (plan 167): coordinator-side oracle. Evaluates the worker's
// parse-duration.mjs against the eight held-back criteria, then writes the
// run packet and evaluation envelope the evolution loop records. The worker
// never sees this file; failing criteria reach the next attempt only through
// the judged gate packet.
//
// Usage: node check.mjs --workspace <dir> --attempt <n>

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};

const workspace = resolve(arg('workspace'));
const attempt = Number(arg('attempt'));
if (!workspace || !Number.isInteger(attempt) || attempt < 1) {
  console.error('Usage: check.mjs --workspace <dir> --attempt <n>');
  process.exit(2);
}

let parseDuration = null;
let loadError = null;
try {
  const mod = await import(`${pathToFileURL(join(workspace, 'parse-duration.mjs')).href}?attempt=${attempt}`);
  parseDuration = mod.default;
  if (typeof parseDuration !== 'function') throw new Error('default export is not a function');
} catch (error) {
  loadError = error instanceof Error ? error.message : String(error);
}

function valueCase(id, text, input, expected) {
  if (!parseDuration) return { id, text, status: 'fail', rationale: `module unloadable: ${loadError}` };
  try {
    const actual = parseDuration(input);
    return actual === expected
      ? { id, text, status: 'pass', rationale: `${JSON.stringify(input)} -> ${actual}` }
      : { id, text, status: 'fail', rationale: `${JSON.stringify(input)} -> ${JSON.stringify(actual)}, expected ${expected}` };
  } catch (error) {
    return { id, text, status: 'fail', rationale: `${JSON.stringify(input)} threw ${error?.constructor?.name}: ${error?.message}` };
  }
}

function throwCase(id, text, inputs, errorClass) {
  if (!parseDuration) return { id, text, status: 'fail', rationale: `module unloadable: ${loadError}` };
  for (const input of inputs) {
    try {
      const actual = parseDuration(input);
      return { id, text, status: 'fail', rationale: `${JSON.stringify(input)} returned ${JSON.stringify(actual)}, expected ${errorClass.name}` };
    } catch (error) {
      if (!(error instanceof errorClass) || error.constructor !== errorClass) {
        return { id, text, status: 'fail', rationale: `${JSON.stringify(input)} threw ${error?.constructor?.name}, expected exactly ${errorClass.name}` };
      }
    }
  }
  return { id, text, status: 'pass', rationale: `all probes threw ${errorClass.name}` };
}

const criteria = [
  valueCase('AC1', "parseDuration('90s') returns 90.", '90s', 90),
  valueCase('AC2', "parseDuration('1h30m') returns 5400.", '1h30m', 5400),
  valueCase('AC3', "parseDuration('2d') returns 172800.", '2d', 172800),
  valueCase('AC4', "whitespace is tolerated — parseDuration(' 1h 30m ') returns 5400.", ' 1h 30m ', 5400),
  valueCase('AC5', "units are case-insensitive — parseDuration('1H30M') returns 5400.", '1H30M', 5400),
  valueCase('AC6', "fractional values work — parseDuration('1.5h') returns 5400.", '1.5h', 5400),
  throwCase('AC7', 'invalid input (empty string, non-string, unparseable text) throws TypeError.', ['', 42, 'abc'], TypeError),
  throwCase('AC8', "negative durations (e.g. '-5m') throw RangeError.", ['-5m'], RangeError),
];

const passCount = criteria.filter((criterion) => criterion.status === 'pass').length;
const runId = `ac7-attempt-${attempt}`;
const runDir = join(workspace, '.osc', 'runs', runId);
mkdirSync(runDir, { recursive: true });
mkdirSync(join(workspace, 'evidence'), { recursive: true });

const runPath = join(runDir, 'run.json');
writeFileSync(runPath, JSON.stringify({
  schemaVersion: 'open-scaffold.run.v1',
  runId,
  taskId: 'ac7-parse-duration',
  plan: {
    slug: 'parse-duration',
    path: '.osc/plans/active/parse-duration.md',
    acceptanceCriteria: criteria.map((criterion) => criterion.text),
  },
  artifacts: { evidence: [`evidence/eval-attempt-${attempt}.json`] },
}, null, 2));

const evalPath = join(workspace, 'evidence', `eval-attempt-${attempt}.json`);
writeFileSync(evalPath, JSON.stringify({
  schema: 'open-scaffold.evaluation.v1',
  evaluation_id: `eval-${runId}`,
  subject: { source: 'run', plan: '.osc/plans/active/parse-duration.md', plan_slug: 'parse-duration', task_id: 'ac7-parse-duration', run_id: runId, run_packet: `.osc/runs/${runId}/run.json` },
  acceptance_criteria: criteria.map((criterion) => ({
    id: criterion.id,
    text: criterion.text,
    status: criterion.status,
    evaluator: { kind: 'machine', name: 'ac7-check-script', ref: null },
    evidence: [{ kind: 'path', ref: `evidence/eval-attempt-${attempt}.json`, summary: criterion.rationale }],
    rationale: criterion.rationale,
  })),
  decision: { status: passCount === criteria.length ? 'approved' : 'rejected', approver: 'machine', rationale: `${passCount}/${criteria.length} criteria pass.` },
  improvement: { route: passCount === criteria.length ? 'none' : 'retry_run', target: null, carried_forward: [], do_not_assume: ['No benchmark or model-ranking claim.'] },
}, null, 2));

console.log(`attempt ${attempt}: ${passCount}/${criteria.length} pass`);
for (const criterion of criteria) console.log(`  ${criterion.id} ${criterion.status}: ${criterion.rationale}`);
console.log(`run: ${runPath}`);
console.log(`eval: ${evalPath}`);
process.exit(passCount === criteria.length ? 0 : 1);
