import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const receiptsDir = join(fixtureRoot, 'receipts');
mkdirSync(receiptsDir, { recursive: true });
const reuseCommittedReceipts = process.argv.includes('--reuse-committed-receipts');

const arms = [
  { id: 'control', label: 'Naked Codex over raw paused-session artifacts', prompt: 'prompts/control-naked-raw-prompt.txt' },
  { id: 'scaffolded', label: 'Open Scaffold resume capsule + Codex', prompt: 'prompts/scaffolded-resume-capsule-prompt.md' },
];
const replicates = [1, 2, 3];
const requiredNextFields = [
  'human_approval_or_closeout_decision',
  'release_evidence_note',
  'next_slice_or_done_routing',
];
const qualityRubric = {
  id: 'deterministic-human-facing-decision-rubric-v1',
  kind: 'deterministic reader-usability proxy',
  note: 'These checks are deterministic, but they are aimed at whether a human reader can understand and act on the answer without rereading the raw paused-session artifacts.',
  criteria: [
    { id: 'reader_action_is_plain', label: 'The answer gives a plain closeout/stop action.' },
    { id: 'reader_reasons_explain_decision', label: 'The reasons explain the frontier, acceptance evidence, and why another attempt is not authorized.' },
    { id: 'reader_resume_pointer_is_unambiguous', label: 'The resume pointer names attempt-f-closeout-candidate as the current/frontier state.' },
    { id: 'reader_acceptance_and_remaining_work_are_clear', label: 'The acceptance status and remaining work are explicit.' },
    { id: 'reader_next_fields_and_evidence_are_traceable', label: 'The next fields are complete and at least one direct evidence reference lets a reader continue.' },
    { id: 'reader_boundary_is_plain', label: 'The boundary plainly says this is decision support, not approval/release/deployment/compliance.' },
  ],
};
const coldResumePacketContract = {
  id: 'cold-resume-packet-v2-readable-closeout',
  required_fields: [
    'plan',
    'objective',
    'action',
    'resume_current_frontier_evaluation',
    'acceptance_summary',
    'reasons',
    'required_next_fields',
    'evidence_refs',
    'authority_boundary',
  ],
  source_refs: [
    'prompts/scaffolded-resume-capsule-prompt.md',
    'generate-fixture.mjs',
  ],
  fail_closed_if_missing: true,
  boundary: 'Packet-field contract for this fixture only; it does not claim a stable public schema or universal resume format.',
};

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

function readEvents(path) {
  return readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function round(value) {
  return Number(value.toFixed(6));
}

function assertColdResumePacketContract() {
  const packet = readFileSync(join(fixtureRoot, 'prompts', 'scaffolded-resume-capsule-prompt.md'), 'utf8').toLowerCase();
  const checks = {
    plan: 'plan:',
    objective: 'objective:',
    action: 'action:',
    resume_current_frontier_evaluation: 'resume: current=',
    acceptance_summary: 'acceptance: 5/5 pass',
    reasons: 'reasons:',
    required_next_fields: 'required next fields:',
    evidence_refs: 'evidence refs:',
    authority_boundary: 'boundary:',
  };
  const missing = Object.entries(checks)
    .filter(([, needle]) => !packet.includes(needle))
    .map(([field]) => field);
  if (missing.length > 0) {
    throw new Error(`cold resume packet contract missing fields: ${missing.join(', ')}`);
  }
}

function usageFromEvents(events) {
  const turn = [...events].reverse().find((event) => event.type === 'turn.completed' && event.usage);
  if (!turn) throw new Error('missing turn.completed usage event');
  const usage = turn.usage;
  const inputTokens = Number(usage.input_tokens);
  const outputTokens = Number(usage.output_tokens);
  if (!Number.isInteger(inputTokens) || !Number.isInteger(outputTokens)) throw new Error('usage event lacks integer input/output tokens');
  return {
    input_tokens: inputTokens,
    cached_input_tokens: Number.isInteger(usage.cached_input_tokens) ? usage.cached_input_tokens : null,
    output_tokens: outputTokens,
    reasoning_output_tokens: Number.isInteger(usage.reasoning_output_tokens) ? usage.reasoning_output_tokens : null,
    total_tokens: inputTokens + outputTokens,
    total_tokens_derivation: 'Codex CLI reported input_tokens and output_tokens; this fixture uses input_tokens + output_tokens as total_tokens and records cached/reasoning splits separately.',
  };
}

function usageWallTimeProvenance(usingRawEvents) {
  return {
    origin: 'original live codex-cli exec / gpt-5.5 run',
    usage_source: 'Codex CLI --json turn.completed usage event',
    wall_time_source: 'per-run meta receipt captured during the live Codex invocation',
    raw_event_log_committed: false,
    raw_event_log_policy: 'raw-events/*.jsonl are local runtime residue; rerun live Codex to regenerate them before a fresh score',
    recomputed_from_raw_events_this_invocation: usingRawEvents,
    preserved_during_rubric_rescore: !usingRawEvents,
  };
}

function scoreAnswer(answer) {
  const text = JSON.stringify(answer).toLowerCase();
  const reasons = Array.isArray(answer.reasons) ? answer.reasons.filter((reason) => typeof reason === 'string') : [];
  const reasonsText = reasons.join(' ').toLowerCase();
  const resumeText = JSON.stringify(answer.resume ?? '').toLowerCase();
  const acceptanceText = JSON.stringify(answer.acceptance ?? '').toLowerCase();
  const nextFieldsText = JSON.stringify(answer.required_next_fields ?? '').toLowerCase();
  const boundaryText = typeof answer.boundary_note === 'string' ? answer.boundary_note.toLowerCase() : '';
  const action = typeof answer.action === 'string' && /closeout|stop/.test(answer.action.toLowerCase());
  const reasonsExplain = reasons.length >= 3 && reasonsText.length >= 120
    && /attempt-f-closeout-candidate|frontier|current/.test(reasonsText)
    && /5\/5|all five|acceptance|approved|evaluation/.test(reasonsText)
    && /no new implementation|not retry|rejected|closeout|approval routing/.test(reasonsText);
  const resumePointer = resumeText.includes('attempt-f-closeout-candidate')
    && /current|frontier|route/.test(resumeText);
  const acceptance = /5\/5|all five/.test(text)
    && /remaining/.test(acceptanceText)
    && /\b0\b|\[\]|none/.test(acceptanceText);
  const evidenceTraceable = /docs\/evidence\/attempt-f-evaluation\.json|docs\/evidence\/attempt-f-proof\.md|\.osc\/releases\/2026-06-16-bounded-invoice-importer-resume\.md/.test(text);
  const requiredFields = requiredNextFields.every((field) => nextFieldsText.includes(field));
  const boundary = /decision support|handoff/.test(boundaryText)
    && /not/.test(boundaryText)
    && ['merge', 'publish', 'release', 'deployment', 'compliance', 'approval'].every((term) => boundaryText.includes(term));
  const checks = [
    { id: 'reader_action_is_plain', label: qualityRubric.criteria[0].label, pass: action },
    { id: 'reader_reasons_explain_decision', label: qualityRubric.criteria[1].label, pass: reasonsExplain },
    { id: 'reader_resume_pointer_is_unambiguous', label: qualityRubric.criteria[2].label, pass: resumePointer },
    { id: 'reader_acceptance_and_remaining_work_are_clear', label: qualityRubric.criteria[3].label, pass: acceptance },
    { id: 'reader_next_fields_and_evidence_are_traceable', label: qualityRubric.criteria[4].label, pass: requiredFields && evidenceTraceable },
    { id: 'reader_boundary_is_plain', label: qualityRubric.criteria[5].label, pass: boundary },
  ];
  return { rubric: qualityRubric.id, human_facing: true, score: checks.filter((check) => check.pass).length, total: checks.length, checks };
}

assertColdResumePacketContract();

const receipts = [];
for (const arm of arms) {
  for (const replicate of replicates) {
    const rawEventsPath = join(fixtureRoot, 'raw-events', `${arm.id}-r${replicate}.jsonl`);
    const answerPath = join(fixtureRoot, 'answers', `${arm.id}-r${replicate}.json`);
    const metaPath = join(fixtureRoot, 'receipts', `${arm.id}-r${replicate}-meta.json`);
    const receiptPath = join(receiptsDir, `${arm.id}-r${replicate}.json`);
    const answer = readJson(answerPath);
    const existingReceipt = existsSync(receiptPath) ? readJson(receiptPath) : null;
    const usingRawEvents = existsSync(rawEventsPath);
    if (!usingRawEvents && !reuseCommittedReceipts) throw new Error(`missing raw Codex event log: ${rawEventsPath}`);
    if (!usingRawEvents && !existingReceipt) throw new Error(`cannot reuse missing committed receipt: ${receiptPath}`);
    const usage = usingRawEvents ? usageFromEvents(readEvents(rawEventsPath)) : existingReceipt.usage;
    const wallSeconds = usingRawEvents ? readJson(metaPath).wall_seconds : existingReceipt.wall_seconds;
    const receipt = {
      schema: 'open-scaffold.codex-token-efficiency-receipt.v1',
      arm: arm.id,
      replicate,
      runtime: 'codex-cli exec / gpt-5.5',
      prompt: arm.prompt,
      answer: `answers/${arm.id}-r${replicate}.json`,
      usage,
      wall_seconds: wallSeconds,
      prompt_bytes: statSync(join(fixtureRoot, arm.prompt)).size,
      quality: scoreAnswer(answer),
      source: {
        local_codex_json_event_log: `raw-events/${arm.id}-r${replicate}.jsonl (not committed; original measurement came from this live Codex event log; rerun live Codex before a fresh score)`,
        usage_wall_time_provenance: usageWallTimeProvenance(usingRawEvents),
        quality_score_source: usingRawEvents ? 'answer JSON scored during fresh raw-event receipt generation' : 'committed answer JSON re-scored; usage and wall time kept from original event-derived receipt',
        committed_public_receipt: `receipts/${arm.id}-r${replicate}.json`,
      },
      boundary: {
        read_only_codex_exec: true,
        no_tools_requested: true,
        bounded_cold_resume_fixture_only: true,
        not_broad_model_or_workload_proof: true,
      },
    };
    writeFileSync(join(receiptsDir, `${arm.id}-r${replicate}.json`), `${JSON.stringify(receipt, null, 2)}\n`);
    receipts.push(receipt);
  }
}

function lane(armId) {
  const scoped = receipts.filter((receipt) => receipt.arm === armId);
  return {
    prompt_bytes: scoped[0].prompt_bytes,
    median_codex_reported_total_tokens: median(scoped.map((receipt) => receipt.usage.total_tokens)),
    median_codex_reported_input_tokens: median(scoped.map((receipt) => receipt.usage.input_tokens)),
    median_codex_reported_output_tokens: median(scoped.map((receipt) => receipt.usage.output_tokens)),
    median_wall_seconds: median(scoped.map((receipt) => receipt.wall_seconds)),
    median_quality_score: median(scoped.map((receipt) => receipt.quality.score)),
    quality_score_total: scoped[0].quality.total,
    receipts: scoped.map((receipt) => `receipts/${receipt.arm}-r${receipt.replicate}.json`),
  };
}

const control = lane('control');
const scaffolded = lane('scaffolded');
const aggregate = {
  schema: 'open-scaffold.proof-aggregate.v1',
  comparison_id: 'codex-token-efficient-resume-2026-06-16',
  replicates_per_arm: 3,
  generated_from: {
    prompt_generator: 'generate-fixture.mjs',
    scorer: 'score-fixture.mjs',
  },
  quality_rubric: qualityRubric,
  cold_resume_packet_contract: coldResumePacketContract,
  arms: { control, scaffolded },
  deltas: {
    prompt_payload_reduction_ratio: round(control.prompt_bytes / scaffolded.prompt_bytes),
    codex_total_token_reduction_ratio_median: round(control.median_codex_reported_total_tokens / scaffolded.median_codex_reported_total_tokens),
    wall_time_speedup_ratio_median: round(control.median_wall_seconds / scaffolded.median_wall_seconds),
    quality_score_delta_median: scaffolded.median_quality_score - control.median_quality_score,
    quality_per_1k_codex_tokens_control: round(control.median_quality_score / (control.median_codex_reported_total_tokens / 1000)),
    quality_per_1k_codex_tokens_scaffolded: round(scaffolded.median_quality_score / (scaffolded.median_codex_reported_total_tokens / 1000)),
    evolution_compiled_record_delta: 1,
  },
  proof_thresholds: {
    codex_total_token_reduction_ratio_median_minimum: 2,
    met: control.median_codex_reported_total_tokens / scaffolded.median_codex_reported_total_tokens >= 2,
  },
  boundary: {
    bounded_cold_resume_fixture_only: true,
    codex_usage_source: 'Original per-replicate codex exec --json turn.completed usage, preserved in committed receipts; raw event logs are omitted as local runtime residue.',
    total_tokens_derivation: 'input_tokens + output_tokens because this Codex CLI build did not emit total_tokens directly.',
    not_universal_benchmark: true,
  },
};
writeFileSync(join(receiptsDir, 'aggregate.json'), `${JSON.stringify(aggregate, null, 2)}\n`);

const sourceRefs = [
  'receipts/aggregate.json',
  ...control.receipts,
  ...scaffolded.receipts,
];
const manifest = {
  schema: 'open-scaffold.proof-comparison.v1',
  comparison_id: aggregate.comparison_id,
  title: 'Codex cold-resume token efficiency: raw artifacts vs Open Scaffold capsule',
  question: 'For a bounded paused-work resume decision, does an Open Scaffold compact resume capsule let Codex preserve decision quality while using at least 2x fewer reported total tokens than a naked raw-artifact prompt?',
  arms: {
    control: { id: 'naked-codex-raw-paused-session', label: arms[0].label, runtime: 'codex-cli exec / gpt-5.5' },
    scaffolded: { id: 'open-scaffold-resume-capsule-codex', label: arms[1].label, runtime: 'codex-cli exec / gpt-5.5' },
  },
  metrics: [
    {
      id: 'quality.decision_score_median',
      label: 'Median human-facing decision quality score',
      category: 'quality',
      unit: `points / ${control.quality_score_total}`,
      direction: 'higher',
      control: control.median_quality_score,
      scaffolded: scaffolded.median_quality_score,
      source_refs: sourceRefs,
      notes: 'Six deterministic reader-usability checks cover plain action, explanatory reasons, unambiguous resume pointer, clear acceptance/remaining-work status, complete next fields plus at least one traceable evidence ref, and a plain no-approval boundary.',
    },
    {
      id: 'usage.codex_reported_total_tokens_median',
      label: 'Median Codex-reported total tokens',
      category: 'tokens',
      unit: 'tokens',
      direction: 'lower',
      control: control.median_codex_reported_total_tokens,
      scaffolded: scaffolded.median_codex_reported_total_tokens,
      minimum_ratio: 2,
      source_refs: sourceRefs,
      notes: 'Derived from Codex CLI input_tokens + output_tokens in turn.completed usage for three read-only replicates per arm.',
    },
    {
      id: 'usage.prompt_payload_bytes',
      label: 'Prompt payload bytes given to Codex',
      category: 'tokens',
      unit: 'bytes',
      direction: 'lower',
      control: control.prompt_bytes,
      scaffolded: scaffolded.prompt_bytes,
      minimum_ratio: 2,
      source_refs: ['prompts/control-naked-raw-prompt.txt', 'prompts/scaffolded-resume-capsule-prompt.md', 'receipts/aggregate.json'],
      notes: 'Direct prompt payload size, not an inferred model-token count.',
    },
    {
      id: 'speed.wall_seconds_median',
      label: 'Median wall-clock seconds for Codex response',
      category: 'speed',
      unit: 'seconds',
      direction: 'lower',
      control: control.median_wall_seconds,
      scaffolded: scaffolded.median_wall_seconds,
      source_refs: sourceRefs,
      notes: 'Wall time includes local Codex CLI startup/plugin overhead on the measured machine.',
    },
    {
      id: 'evolution.compiled_record_available',
      label: 'Compiled Open Scaffold resume record available',
      category: 'evolution',
      unit: 'present',
      direction: 'higher',
      control: 0,
      scaffolded: 1,
      source_refs: ['prompts/scaffolded-resume-capsule-prompt.md', 'generate-fixture.mjs', 'receipts/aggregate.json'],
      notes: 'This is the mechanism difference: raw artifacts vs a compiled Open Scaffold resume capsule. It is not a claim that the model became smarter.',
    },
  ],
  evidence_battery: [
    {
      id: 'codex-2x-cold-resume-replicates',
      kind: 'cold_resume_fixture',
      status: 'demonstrated',
      required_for_pass: true,
      claim: `${replicates.length} read-only Codex replicates per arm preserved decision quality at ${scaffolded.median_quality_score}/${scaffolded.quality_score_total} while reducing median Codex-reported total tokens by ${aggregate.deltas.codex_total_token_reduction_ratio_median}x.`,
      boundary: 'One paused-work cold-resume decision on codex-cli exec / gpt-5.5; not a universal workload, model, or production-readiness claim.',
      source_refs: sourceRefs,
    },
    {
      id: 'cold-resume-packet-contract',
      kind: 'cold_resume_packet',
      status: 'demonstrated',
      required_for_pass: true,
      claim: 'The scaffolded arm uses a compact packet with explicit plan, objective, action, resume pointer, acceptance summary, reasons, next fields, evidence refs, and authority boundary.',
      boundary: 'Packet-field contract for this fixture only; it does not define a universal resume schema or claim human-reviewer replication.',
      source_refs: ['prompts/scaffolded-resume-capsule-prompt.md', 'generate-fixture.mjs', 'receipts/aggregate.json'],
    },
    {
      id: 'human-reviewer-replication',
      kind: 'human_reviewer_replication',
      status: 'not_demonstrated',
      required_for_pass: false,
      claim: 'No blind human-reviewer replication is claimed for this Codex 2x fixture.',
      boundary: 'The shipped quality score is deterministic and human-facing; a real human-reader replication needs separate preregistration, answer keys, blinded packets, and receipts.',
      source_refs: ['evidence/human-reviewer-replication-boundary.md', 'receipts/aggregate.json'],
    },
    {
      id: 'controlled-ablations',
      kind: 'controlled_ablation',
      status: 'mixed_not_proven',
      required_for_pass: false,
      claim: 'No minimal-checklist, packet-only, or alternate-packet ablation is claimed by this fixture.',
      boundary: 'Ablations are disclosure-only here and cannot support broad dominance; future ablation claims must ship their own committed receipts.',
      source_refs: ['evidence/controlled-ablations-boundary.md', 'receipts/aggregate.json'],
    },
  ],
  required_evidence: [
    'codex-2x-cold-resume-replicates',
    'cold-resume-packet-contract',
  ],
  caveats: [
    'Bounded fixture proof only: one paused-work cold-resume decision, not all AI work or all repositories.',
    'Codex CLI did not emit total_tokens directly in this environment; receipts record input/output splits and derive total as input_tokens + output_tokens.',
    'The raw control prompt is intentionally a long paused-session artifact stream; the scaffolded arm is the compact packet compiled from those facts.',
    'The quality score is deterministic and human-facing, but it is still a rubric over committed answers rather than a blind human-reader study.',
    'Open Scaffold did not approve closeout, merge, publish, release, deployment, or compliance.',
  ],
};
writeFileSync(join(fixtureRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

if (!aggregate.proof_thresholds.met) {
  throw new Error(`2x token threshold not met: ${aggregate.deltas.codex_total_token_reduction_ratio_median}x`);
}

console.log(JSON.stringify({
  aggregate: 'receipts/aggregate.json',
  ratio: aggregate.deltas.codex_total_token_reduction_ratio_median,
  controlTokens: control.median_codex_reported_total_tokens,
  scaffoldedTokens: scaffolded.median_codex_reported_total_tokens,
}, null, 2));

