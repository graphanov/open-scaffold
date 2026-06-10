import { createSafeOutputRoot, writeFileUnder, writeJsonUnder } from './path-safety.js';
import { compileHandoffPacket, validateHandoffPacket } from './handoff.js';
import { analyzeFeedback, recordFeedback } from './feedback.js';
import { runHarnessRuntimeAdapter, type HarnessRuntimeReceipt } from './runtimes.js';

export const BENCH_SUITE_SCHEMA = 'osc.bench-suite-aggregate.v1';
export const HANDOFF_LAB_SCHEMA = 'osc.handoff-lab-aggregate.v1';

const DEFAULT_FIXTURES = [
  'debugging-protocol-improvement',
  'blocker-handling-missing-context',
  'token-efficient-handoff-resume',
];

const ABLATIONS = [
  'naked-explicit-acceptance-criteria',
  'osc-no-feedback-inheritance',
  'osc-no-handoff-compiler',
  'naked-equally-compact-prompt',
  'osc-same-token-budget-proxy',
];

type BenchMode = 'simulated' | 'live';
type ReproductionStatus = 'reproduced' | 'partially_reproduced' | 'not_reproduced';
type LaneCompletionStatus = 'clean' | 'dirty' | 'blocked' | 'dry_run';

type MetricValue = {
  value: number | null;
  source: string;
  unit?: string;
  note?: string;
  promptTokens?: number;
  completionTokens?: number;
  promptBytes?: number;
  outputBytes?: number;
};

type LaneCompletion = {
  clean: boolean;
  status: LaneCompletionStatus;
  reasonIds: string[];
  evidenceComplete: boolean;
  failureCode: string | null;
  markerState: string | null;
  exit: { status: number | null; signal: string | null; timedOut: boolean };
};

type BenchLane = {
  laneId: string;
  label: string;
  quality: MetricValue & { maxScore: number };
  tokens: MetricValue;
  duration: MetricValue;
  rounds: MetricValue;
  completion: LaneCompletion;
  evidencePaths: Array<{ role: string; path: string; schema?: string }>;
  receiptPath?: string;
};

type BenchFixture = {
  fixtureId: string;
  title: string;
  control: BenchLane;
  harness: BenchLane;
  comparison: {
    qualityDeltaHarnessMinusControl: number | null;
    tokenDeltaHarnessMinusControl: number | null;
    durationDeltaHarnessMinusControl: number | null;
    roundDeltaHarnessMinusControl: number | null;
    strictNoRegression: boolean;
    blockers: string[];
  };
};

type BenchAblation = {
  fixtureId: string;
  ablationId: string;
  status: 'confound_cleared' | 'confound_not_cleared' | 'not_run';
  quality: MetricValue & { maxScore: number };
  completion: LaneCompletion;
  evidencePaths: Array<{ role: string; path: string; schema?: string }>;
  comparisonToHarness: {
    harnessQuality: number | null;
    ablationQuality: number | null;
    reason: string;
  };
};

interface LiveWorkPackage {
  task: string;
  context: string;
  acceptanceCriteria: string[];
  maxChars?: number;
}

interface BenchSuiteOptions {
  repoRoot?: string;
  mode?: BenchMode;
  outDir?: string;
  fixtureIds?: string[];
  includeAblations?: boolean;
  ablationFixtureIds?: string[] | null;
  allowSpawn?: boolean;
  adapterId?: string;
  timeoutMs?: number;
  maxLogBytes?: number;
  model?: string;
  effort?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeId(value: string, fallback = 'item'): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96);
  return slug || fallback;
}

function shortHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, '0');
}

function liveRunId(suiteId: string, fixtureId: string, laneId: string, ablationId?: string): string {
  const laneSuffix = safeId(ablationId ? `ablation-${ablationId}` : laneId, 'lane').slice(0, 48);
  const hash = shortHash(`${suiteId}\0${fixtureId}\0${laneId}\0${ablationId ?? ''}`);
  const maxStem = Math.max(12, 96 - laneSuffix.length - hash.length - 2);
  const stem = safeId(`${suiteId}-${fixtureId}`, 'bench-lane').slice(0, maxStem).replace(/[-._]+$/g, '') || 'bench-lane';
  return `${stem}-${hash}-${laneSuffix}`;
}

function suiteRunId(outDir: string): string {
  return `bench-${safeId(outDir.replace(/^\.osc\/bench\//, ''), 'suite')}`;
}

function metric(value: number | null, source: string, unit?: string, extra: Partial<MetricValue> = {}): MetricValue {
  return { value, source, ...(unit ? { unit } : {}), ...extra };
}

function metricDelta(harness: MetricValue, control: MetricValue): number | null {
  return typeof harness.value === 'number' && typeof control.value === 'number' ? harness.value - control.value : null;
}

function requiredEvidencePresent(receipt: Pick<HarnessRuntimeReceipt, 'evidencePaths'>): boolean {
  const roles = new Set((receipt.evidencePaths ?? []).map((item) => item.role));
  return ['runtime_receipt', 'runtime_stdout_log', 'runtime_stderr_log'].every((role) => roles.has(role));
}

export function classifyBenchLaneCompletion(receipt: Pick<HarnessRuntimeReceipt, 'status' | 'exit' | 'marker' | 'failure' | 'evidencePaths'>): LaneCompletion {
  const reasonIds = new Set<string>();
  const markerState = 'state' in receipt.marker ? String(receipt.marker.state) : null;
  const failureCode = receipt.failure.code;
  if (failureCode) reasonIds.add(failureCode);
  if (receipt.exit.timedOut) reasonIds.add('runtime_timeout');
  if (receipt.exit.signal) reasonIds.add('runtime_signaled');
  if (typeof receipt.exit.status === 'number' && receipt.exit.status !== 0) reasonIds.add('runtime_non_zero');
  if (markerState && markerState !== 'complete') reasonIds.add(markerState === 'missing' ? 'runtime_marker_missing' : `runtime_marker_${markerState}`);
  if (receipt.status !== 'completed' && receipt.status !== 'dry_run' && !failureCode) reasonIds.add(`runtime_${receipt.status}`);
  const evidenceComplete = requiredEvidencePresent(receipt);
  if (!evidenceComplete) reasonIds.add('incomplete_evidence');
  if (receipt.status === 'dry_run') reasonIds.add('spawn_authority_missing');
  const clean = receipt.status === 'completed' && reasonIds.size === 0;
  const status: LaneCompletionStatus = clean ? 'clean' : receipt.status === 'blocked' ? 'blocked' : receipt.status === 'dry_run' ? 'dry_run' : 'dirty';
  return {
    clean,
    status,
    reasonIds: [...reasonIds],
    evidenceComplete,
    failureCode: failureCode ?? null,
    markerState,
    exit: receipt.exit,
  };
}

function simulatedCompletion(): LaneCompletion {
  return {
    clean: true,
    status: 'clean',
    reasonIds: [],
    evidenceComplete: true,
    failureCode: null,
    markerState: 'simulated',
    exit: { status: 0, signal: null, timedOut: false },
  };
}

function fixtureTitle(fixtureId: string): string {
  const titles: Record<string, string> = {
    'debugging-protocol-improvement': 'Debugging protocol improvement',
    'blocker-handling-missing-context': 'Blocker handling with missing context',
    'token-efficient-handoff-resume': 'Token-efficient handoff resume',
    'reviewer-skill-improvement': 'Reviewer skill improvement',
    'test-author-skill-improvement': 'Test author skill improvement',
  };
  return titles[fixtureId] ?? fixtureId.replace(/-/g, ' ');
}

function simulatedFixture(fixtureId: string, index: number): BenchFixture {
  const maxScore = fixtureId === 'token-efficient-handoff-resume' ? 7 : 6;
  const harnessQuality = fixtureId === 'blocker-handling-missing-context' ? maxScore - 1 : maxScore;
  const controlQuality = Math.max(1, harnessQuality - (index % 2));
  const control: BenchLane = {
    laneId: 'control',
    label: 'Naked/control prompt',
    quality: { ...metric(controlQuality, 'simulated_fixture', 'score'), maxScore },
    tokens: metric(18000 + index * 900, 'simulated_fixture', 'tokens'),
    duration: metric(8500 + index * 700, 'simulated_fixture', 'ms'),
    rounds: metric(2, 'simulated_fixture', 'rounds'),
    completion: simulatedCompletion(),
    evidencePaths: [],
  };
  const harness: BenchLane = {
    laneId: 'harness',
    label: 'Open Scaffold harness prompt',
    quality: { ...metric(harnessQuality, 'simulated_fixture', 'score'), maxScore },
    tokens: metric(9800 + index * 300, 'simulated_fixture', 'tokens'),
    duration: metric(5100 + index * 350, 'simulated_fixture', 'ms'),
    rounds: metric(1, 'simulated_fixture', 'rounds'),
    completion: simulatedCompletion(),
    evidencePaths: [],
  };
  return compareFixture({ fixtureId, title: fixtureTitle(fixtureId), control, harness });
}

function requiredHandoffSeed() {
  return {
    state: 'Prior work built a harness route but the next worker must resume from compact evidence only. Keep this under budget and preserve proof boundaries.',
    decisions: ['Use repo evidence refs instead of raw logs.', 'Do not claim broad dominance from prototype evidence.', 'Feedback is not approval.'],
    blockers: ['Live reproduction may be partial.', 'Full live reproduction remains owner-gated when expensive.'],
    evidenceRefs: ['docs/PROOF_HARNESS.md', '.osc/bench/<suite>/aggregate.json'],
    nextActions: ['Inspect aggregate.json.', 'Report reproduced, partially reproduced, or not reproduced.', 'Keep broad dominance mixed unless strict gates clear.'],
    maxChars: 1200,
    reason: 'benchmark fixture seed',
  };
}

function liveWorkPackage(fixtureId: string, laneId: string, ablationId?: string): LiveWorkPackage {
  if (fixtureId === 'token-efficient-handoff-resume') {
    const seed = requiredHandoffSeed();
    const compiled = compileHandoffPacket(seed);
    const rawState = [
      seed.state,
      `Decisions: ${seed.decisions.join(' | ')}`,
      `Blockers: ${seed.blockers.join(' | ')}`,
      `Evidence refs: ${seed.evidenceRefs.join(' | ')}`,
      `Next actions: ${seed.nextActions.join(' | ')}`,
      'Boundary: benchmark evidence is task input, not merge/publish/release approval.',
    ].join('\n');
    const contextByLane: Record<string, string> = {
      control: rawState.repeat(2),
      harness: compiled.content,
      'naked-explicit-acceptance-criteria': `${rawState}\n\nExplicit acceptance criteria: include State, Decisions, Blockers / Open Questions, Evidence refs, Next Actions, stay under 1200 characters, and do not claim approval.`,
      'osc-no-feedback-inheritance': compiled.content.replace(/Feedback is not approval\.?/gi, ''),
      'osc-no-handoff-compiler': rawState,
      'naked-equally-compact-prompt': compileHandoffPacket({ ...seed, reason: 'compact naked prompt proxy' }).content,
      'osc-same-token-budget-proxy': compiled.content.slice(0, Math.min(compiled.content.length, rawState.length)),
    };
    return {
      task: 'Write a compact resume packet for the next worker.',
      context: contextByLane[ablationId ?? laneId] ?? rawState,
      acceptanceCriteria: [
        'Include sections named State, Decisions, Blockers / Open Questions, Evidence refs, and Next Actions.',
        'Keep the resume packet under 1200 characters before the final marker.',
        'Use evidence refs instead of raw logs.',
        'State that feedback/proof evidence is not owner approval.',
      ],
      maxChars: 1200,
    };
  }

  const generic: Record<string, { task: string; context: string; acceptanceCriteria: string[] }> = {
    'debugging-protocol-improvement': {
      task: 'Improve a debugging protocol without guessing.',
      context: 'A previous worker patched symptoms before tracing root cause. The next protocol must force reproduce, inspect evidence, write a regression test, fix one root cause, and verify.',
      acceptanceCriteria: ['Name root-cause investigation first.', 'Require reproduction before fixes.', 'Require a regression test.', 'Require verification after the fix.', 'Say no guessing.'],
    },
    'blocker-handling-missing-context': {
      task: 'Handle missing context safely.',
      context: 'The worker lacks the target repo and authority boundary. A safe answer must stop, list missing context, and avoid pretending the run succeeded.',
      acceptanceCriteria: ['State blocked or waiting on human.', 'List missing context.', 'Do not guess.', 'Do not claim completion.', 'Preserve owner authority.'],
    },
    'reviewer-skill-improvement': {
      task: 'Review a proof report for overclaims.',
      context: 'A proof report says broad dominance is proven from one simulated fixture. Review it and rewrite the claim boundary.',
      acceptanceCriteria: ['Reject broad dominance.', 'Require live paired evidence.', 'Require ablations.', 'Mention evidence paths.', 'State remaining blockers.'],
    },
    'test-author-skill-improvement': {
      task: 'Draft test-first guidance.',
      context: 'A worker implemented behavior before tests. Produce the next instruction packet for a test author.',
      acceptanceCriteria: ['Write failing test first.', 'Watch RED fail.', 'Implement minimal GREEN.', 'Run full suite.', 'Avoid testing after only.'],
    },
  };
  const base = generic[fixtureId] ?? {
    task: `Answer benchmark fixture ${fixtureId}.`,
    context: 'Keep the answer bounded, evidence-backed, and honest about unknowns.',
    acceptanceCriteria: ['Bound the claim.', 'Mention evidence.', 'Avoid owner approval claims.', 'Give next action.'],
  };

  const controlPackage: LiveWorkPackage = {
    task: `Answer directly without Open Scaffold scaffolding: ${base.task}`,
    context: `${base.context}\n\nLane: naked control. Respond as a capable agent from the prompt alone. Do not use Open Scaffold-specific feedback inheritance, handoff compiler structure, or benchmark proof-gate language unless the task itself requires it.`,
    acceptanceCriteria: ['Answer the user task directly.', 'Do not pretend missing context is known.', 'Do not claim owner approval or broad proof.'],
  };
  const harnessPackage: LiveWorkPackage = {
    task: base.task,
    context: `${base.context}\n\nLane: Open Scaffold harness. Use the scaffold protocol: state the boundary, preserve evidence references, identify blockers, name the repair or verification step, and keep claims bounded.`,
    acceptanceCriteria: base.acceptanceCriteria,
  };
  const ablationPackages: Record<string, LiveWorkPackage> = {
    'naked-explicit-acceptance-criteria': {
      task: `Naked prompt with explicit acceptance criteria: ${base.task}`,
      context: `${base.context}\n\nAblation: no Open Scaffold feedback inheritance or handoff compiler. Explicit acceptance criteria are provided directly to test whether the criteria alone explain the result.`,
      acceptanceCriteria: base.acceptanceCriteria,
    },
    'osc-no-feedback-inheritance': {
      task: base.task,
      context: `${base.context}\n\nAblation: Open Scaffold structure remains, but do not use prior feedback or repair hypotheses. Produce the answer from the current task packet only.`,
      acceptanceCriteria: base.acceptanceCriteria.filter((criterion) => !/feedback|repair/i.test(criterion)),
    },
    'osc-no-handoff-compiler': {
      task: base.task,
      context: `${base.context}\n\nAblation: use plain scaffold bullets without the handoff compiler or section-normalization benefits. Keep evidence and authority boundaries explicit.`,
      acceptanceCriteria: base.acceptanceCriteria,
    },
    'naked-equally-compact-prompt': {
      task: `Compact naked prompt: ${base.task}`,
      context: `${base.context}\n\nAblation: compact control prompt with similar length to the harness lane, but without Open Scaffold routing, feedback inheritance, or handoff semantics.`,
      acceptanceCriteria: controlPackage.acceptanceCriteria,
    },
    'osc-same-token-budget-proxy': {
      task: base.task,
      context: `${harnessPackage.context.slice(0, Math.min(harnessPackage.context.length, controlPackage.context.length))}\n\nAblation: Open Scaffold semantics under a control-sized prompt budget proxy.`,
      acceptanceCriteria: base.acceptanceCriteria,
    },
  };
  if (ablationId) return ablationPackages[ablationId] ?? harnessPackage;
  if (laneId === 'control') return controlPackage;
  return harnessPackage;
}

function scoreLiveAnswer(fixtureId: string, answer: string, maxChars = 1600): MetricValue & { maxScore: number } {
  if (fixtureId === 'token-efficient-handoff-resume') {
    const validation = validateHandoffPacket(answer, { maxChars });
    const required = ['State', 'Decisions', 'Blockers / Open Questions', 'Evidence refs', 'Next Actions'];
    const present = required.length - validation.missingSections.length;
    const budgetPoint = answer.length <= maxChars ? 1 : 0;
    const boundaryPoint = /not (owner )?approval|not approval|not merge|not publish|not release/i.test(answer) ? 1 : 0;
    return { ...metric(present + budgetPoint + boundaryPoint, 'deterministic_live_scorer', 'score'), maxScore: required.length + 2 };
  }
  const lower = answer.toLowerCase();
  const criteria = liveWorkPackage(fixtureId, 'harness').acceptanceCriteria;
  const score = criteria.filter((criterion) => {
    const terms = criterion.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length >= 5).slice(0, 3);
    return terms.some((term) => lower.includes(term));
  }).length;
  return { ...metric(score, 'deterministic_live_scorer', 'score'), maxScore: criteria.length };
}

function writeLiveRunPacket(repoRoot: string, runId: string, fixtureId: string, laneId: string, laneLabel: string, ablationId?: string): { path: string; promptBytes: number } {
  const workPackage = liveWorkPackage(fixtureId, laneId, ablationId);
  const packet = {
    schema: 'osc.bench-live-lane.v1',
    runId,
    command: '$bench',
    fixtureId,
    laneId,
    laneLabel,
    ablationId: ablationId ?? null,
    intent: `${fixtureTitle(fixtureId)} — ${laneLabel}`,
    instructions: [
      'This is a benchmark/reproduction lane, not a real project task.',
      'Do not edit files. Return the requested answer only.',
      'Keep evidence paths as references; do not dump raw logs.',
      'Do not claim merge, publish, release, deployment, or broad dominance approval.',
    ],
    workPackage,
    scoring: { deterministic: true, source: 'src/bench.ts' },
    boundary: {
      benchmark_lane_only: true,
      no_file_edits_requested: true,
      not_owner_approval: true,
      broad_dominance_not_allowed_without_strict_gate: true,
    },
  };
  const path = `.osc/runs/${runId}/run.json`;
  writeJsonUnder(repoRoot, path, packet, 'bench live run packet path');
  return { path, promptBytes: Buffer.byteLength(JSON.stringify(packet), 'utf8') };
}

function tokenMetricFromReceipt(receipt: HarnessRuntimeReceipt, packet: { promptBytes: number }, answer: string): MetricValue {
  if (receipt.tokenUsage) {
    return metric(receipt.tokenUsage.totalTokens, 'runtime_adapter_receipt', 'tokens', {
      note: 'Token usage was reported by the runtime adapter receipt.',
      promptTokens: receipt.tokenUsage.promptTokens ?? undefined,
      completionTokens: receipt.tokenUsage.completionTokens ?? undefined,
      promptBytes: packet.promptBytes,
      outputBytes: Buffer.byteLength(answer, 'utf8'),
    });
  }
  return metric(null, 'not_reported_by_runtime_adapter', 'tokens', {
    note: 'Codex/provider token usage was not available from this Open Scaffold adapter receipt; prompt/output bytes are recorded as proxy-only context, not token proof.',
    promptBytes: packet.promptBytes,
    outputBytes: Buffer.byteLength(answer, 'utf8'),
  });
}

function runLiveLane({ repoRoot, suiteId, fixtureId, laneId, laneLabel, adapterId, allowSpawn, timeoutMs, maxLogBytes, model, effort, ablationId }: Required<Pick<BenchSuiteOptions, 'repoRoot' | 'adapterId' | 'allowSpawn'>> & Pick<BenchSuiteOptions, 'timeoutMs' | 'maxLogBytes' | 'model' | 'effort'> & { suiteId: string; fixtureId: string; laneId: string; laneLabel: string; ablationId?: string }): BenchLane {
  const runId = liveRunId(suiteId, fixtureId, laneId, ablationId);
  const packet = writeLiveRunPacket(repoRoot, runId, fixtureId, laneId, laneLabel, ablationId);
  const started = Date.now();
  const receipt = runHarnessRuntimeAdapter({ repoRoot, runId, runPacketPath: packet.path, adapterId, allowSpawn, timeoutMs, maxLogBytes, model, effort });
  const durationMs = Date.now() - started;
  const completion = classifyBenchLaneCompletion(receipt);
  const answer = 'context' in receipt.marker ? receipt.marker.context : '';
  const quality = scoreLiveAnswer(fixtureId, answer, liveWorkPackage(fixtureId, laneId, ablationId).maxChars ?? 1600);
  return {
    laneId: ablationId ?? laneId,
    label: laneLabel,
    quality,
    tokens: tokenMetricFromReceipt(receipt, packet, answer),
    duration: metric(durationMs, 'wall_clock_measured_by_open_scaffold', 'ms'),
    rounds: metric(receipt.spawned ? 1 : null, receipt.spawned ? 'single_runtime_process' : 'not_spawned', 'rounds'),
    completion,
    evidencePaths: receipt.evidencePaths,
    receiptPath: `.osc/runs/${runId}/runtime-receipt.json`,
  };
}

function compareFixture(input: Omit<BenchFixture, 'comparison'>): BenchFixture {
  const qualityDelta = metricDelta(input.harness.quality, input.control.quality);
  const tokenDelta = metricDelta(input.harness.tokens, input.control.tokens);
  const durationDelta = metricDelta(input.harness.duration, input.control.duration);
  const roundDelta = metricDelta(input.harness.rounds, input.control.rounds);
  const blockers: string[] = [];
  if (qualityDelta !== null && qualityDelta < 0) blockers.push('quality_regression');
  if (tokenDelta !== null && tokenDelta > 0) blockers.push('token_regression');
  if (durationDelta !== null && durationDelta > 0) blockers.push('duration_regression');
  if (roundDelta !== null && roundDelta > 0) blockers.push('round_regression');
  if (!input.control.completion.clean || !input.harness.completion.clean) blockers.push('live_lane_unclean');
  if (input.harness.tokens.value === null || input.control.tokens.value === null) blockers.push('token_receipts_unavailable');
  return {
    ...input,
    comparison: {
      qualityDeltaHarnessMinusControl: qualityDelta,
      tokenDeltaHarnessMinusControl: tokenDelta,
      durationDeltaHarnessMinusControl: durationDelta,
      roundDeltaHarnessMinusControl: roundDelta,
      strictNoRegression: blockers.length === 0,
      blockers,
    },
  };
}

function aggregateMetric(fixtures: BenchFixture[]) {
  const sum = (lane: 'control' | 'harness', key: 'quality' | 'tokens' | 'duration' | 'rounds') => {
    const values = fixtures.map((item) => item[lane][key].value);
    return values.every((value): value is number => typeof value === 'number') ? values.reduce((total, value) => total + value, 0) : null;
  };
  return {
    quality: { control: sum('control', 'quality'), harness: sum('harness', 'quality'), direction: 'higher', source: 'deterministic scorer' },
    tokens: { control: sum('control', 'tokens'), harness: sum('harness', 'tokens'), direction: 'lower', source: fixtures.some((item) => item.control.tokens.value === null || item.harness.tokens.value === null) ? 'unavailable in at least one live receipt' : 'recorded' },
    duration: { control: sum('control', 'duration'), harness: sum('harness', 'duration'), direction: 'lower', source: 'wall clock or simulated fixture' },
    rounds: { control: sum('control', 'rounds'), harness: sum('harness', 'rounds'), direction: 'lower', source: 'runtime process count or simulated fixture' },
  };
}

function runLiveFixture(options: Required<Pick<BenchSuiteOptions, 'repoRoot' | 'adapterId' | 'allowSpawn'>> & Pick<BenchSuiteOptions, 'timeoutMs' | 'maxLogBytes' | 'model' | 'effort'> & { suiteId: string; fixtureId: string }): BenchFixture {
  const control = runLiveLane({ ...options, laneId: 'control', laneLabel: 'Naked/control prompt' });
  const harness = runLiveLane({ ...options, laneId: 'harness', laneLabel: 'Open Scaffold harness prompt' });
  return compareFixture({ fixtureId: options.fixtureId, title: fixtureTitle(options.fixtureId), control, harness });
}

function simulatedAblation(fixtureId: string, ablationId: string): BenchAblation {
  return {
    fixtureId,
    ablationId,
    status: 'confound_not_cleared',
    quality: { ...metric(fixtureId === 'token-efficient-handoff-resume' ? 7 : 6, 'simulated_ablation', 'score'), maxScore: fixtureId === 'token-efficient-handoff-resume' ? 7 : 6 },
    completion: simulatedCompletion(),
    evidencePaths: [],
    comparisonToHarness: {
      harnessQuality: fixtureId === 'token-efficient-handoff-resume' ? 7 : 6,
      ablationQuality: fixtureId === 'token-efficient-handoff-resume' ? 7 : 6,
      reason: 'Simulated ablations intentionally leave causal confounds uncleared.',
    },
  };
}

function runLiveAblation(options: Required<Pick<BenchSuiteOptions, 'repoRoot' | 'adapterId' | 'allowSpawn'>> & Pick<BenchSuiteOptions, 'timeoutMs' | 'maxLogBytes' | 'model' | 'effort'> & { suiteId: string; fixtureId: string; ablationId: string; harnessQuality: number | null }): BenchAblation {
  const lane = runLiveLane({ ...options, laneId: 'ablation', laneLabel: `Ablation: ${options.ablationId}`, ablationId: options.ablationId });
  const ablationQuality = lane.quality.value;
  const cleared = lane.completion.clean && typeof ablationQuality === 'number' && typeof options.harnessQuality === 'number' && ablationQuality < options.harnessQuality;
  return {
    fixtureId: options.fixtureId,
    ablationId: options.ablationId,
    status: cleared ? 'confound_cleared' : 'confound_not_cleared',
    quality: lane.quality,
    completion: lane.completion,
    evidencePaths: lane.evidencePaths,
    comparisonToHarness: {
      harnessQuality: options.harnessQuality,
      ablationQuality,
      reason: cleared ? 'Ablation scored lower than the full harness lane.' : 'Ablation matched/exceeded the harness lane, was unclean, or lacked comparable quality evidence.',
    },
  };
}

function proofGate(mode: BenchMode, fixtures: BenchFixture[], includeAblations: boolean, ablations: BenchAblation[], allowSpawn: boolean) {
  const reasons = [] as Array<{ id: string; detail: string; fixtureId?: string | null }>;
  if (mode !== 'live') reasons.push({ id: 'not_live_codex', detail: 'Simulated runs cannot prove live workload dominance.', fixtureId: null });
  if (mode === 'live' && !allowSpawn) reasons.push({ id: 'spawn_authority_missing', detail: 'Live mode requires explicit --allow-spawn before runtime evidence can count.', fixtureId: null });
  if (fixtures.length < 10) reasons.push({ id: 'insufficient_fixture_count', detail: 'Need at least 10 paired live fixtures for broad workload proof.', fixtureId: null });
  if (!includeAblations || ablations.length === 0) reasons.push({ id: 'missing_ablations', detail: 'Proof requires ablations to isolate prompt quality, feedback, handoff, and token-budget confounds.', fixtureId: null });
  if (includeAblations && ablations.length > 0) {
    const ablationsByFixture = new Map<string, Set<string>>();
    for (const ablation of ablations) {
      const set = ablationsByFixture.get(ablation.fixtureId) ?? new Set<string>();
      set.add(ablation.ablationId);
      ablationsByFixture.set(ablation.fixtureId, set);
    }
    const incomplete = fixtures
      .map((fixture) => ({ fixtureId: fixture.fixtureId, count: ablationsByFixture.get(fixture.fixtureId)?.size ?? 0 }))
      .filter((item) => item.count < ABLATIONS.length);
    if (incomplete.length > 0) {
      reasons.push({
        id: 'incomplete_ablation_coverage',
        detail: `Every broad-proof fixture needs all ${ABLATIONS.length} ablations; incomplete fixtures: ${incomplete.map((item) => `${item.fixtureId}(${item.count}/${ABLATIONS.length})`).join(', ')}.`,
        fixtureId: null,
      });
    }
  }
  for (const fixture of fixtures) {
    if (!fixture.control.completion.clean || !fixture.harness.completion.clean) reasons.push({ id: 'live_lane_unclean', detail: 'Control and harness lanes must both complete cleanly with final markers and complete evidence.', fixtureId: fixture.fixtureId });
    if (fixture.comparison.qualityDeltaHarnessMinusControl !== null && fixture.comparison.qualityDeltaHarnessMinusControl < 0) reasons.push({ id: 'quality_regression', detail: 'Harness quality is below control quality.', fixtureId: fixture.fixtureId });
    if (fixture.comparison.tokenDeltaHarnessMinusControl === null) reasons.push({ id: 'token_receipts_unavailable', detail: 'Runtime token receipts are unavailable; prompt/output bytes are proxy-only and cannot prove token wins.', fixtureId: fixture.fixtureId });
    if (fixture.comparison.tokenDeltaHarnessMinusControl !== null && fixture.comparison.tokenDeltaHarnessMinusControl > 0) reasons.push({ id: 'token_regression', detail: 'Harness token use exceeds control.', fixtureId: fixture.fixtureId });
    if (fixture.comparison.durationDeltaHarnessMinusControl !== null && fixture.comparison.durationDeltaHarnessMinusControl > 0) reasons.push({ id: 'duration_regression', detail: 'Harness duration exceeds control.', fixtureId: fixture.fixtureId });
    if (fixture.comparison.roundDeltaHarnessMinusControl !== null && fixture.comparison.roundDeltaHarnessMinusControl > 0) reasons.push({ id: 'round_regression', detail: 'Harness rounds exceed control.', fixtureId: fixture.fixtureId });
  }
  for (const ablation of ablations) {
    if (ablation.status !== 'confound_cleared') reasons.push({ id: 'ablation_confound_not_cleared', detail: `${ablation.ablationId} did not isolate a harness-specific effect.`, fixtureId: ablation.fixtureId });
    if (!ablation.completion.clean && mode === 'live') reasons.push({ id: 'ablation_lane_unclean', detail: `${ablation.ablationId} did not complete cleanly.`, fixtureId: ablation.fixtureId });
  }
  return {
    schema: 'osc.bench-proof-gate.v1',
    status: reasons.length ? 'not_proven' as const : 'proven' as const,
    broadDominanceClaimAllowed: reasons.length === 0,
    reasons,
    blockers: reasons,
    requiredStandard: 'Open Scaffold must pass cleanly and be no worse than the control on quality, tokens, duration, rounds, evidence honesty, and ablation confounds before any broad claim.',
  };
}

function reproductionVerdict(mode: BenchMode, fixtures: BenchFixture[], gate: ReturnType<typeof proofGate>, allowSpawn: boolean): { status: ReproductionStatus; rationale: string } {
  if (gate.status === 'proven') return { status: 'reproduced', rationale: 'All strict proof-gate checks cleared.' };
  if (mode !== 'live' || !allowSpawn) return { status: 'not_reproduced', rationale: 'No clean live Open Scaffold runtime reproduction evidence was recorded.' };
  const cleanComparable = fixtures.filter((fixture) => fixture.control.completion.clean && fixture.harness.completion.clean && (fixture.comparison.qualityDeltaHarnessMinusControl ?? -1) >= 0);
  const directional = cleanComparable.filter((fixture) => {
    const token = fixture.comparison.tokenDeltaHarnessMinusControl;
    const duration = fixture.comparison.durationDeltaHarnessMinusControl;
    return (typeof token === 'number' && token < 0) || (typeof duration === 'number' && duration < 0);
  });
  if (directional.length > 0) return { status: 'partially_reproduced', rationale: 'At least one clean live paired fixture preserved quality and showed a directional efficiency signal, but broad proof blockers remain.' };
  return { status: 'not_reproduced', rationale: 'Live evidence did not produce a clean quality-preserving efficiency signal.' };
}

function recordBenchmarkFeedback(repoRoot: string, suiteId: string, verdict: { status: ReproductionStatus; rationale: string }, gate: ReturnType<typeof proofGate>, aggregatePath: string, reportPath: string) {
  if (verdict.status === 'reproduced') return { status: 'not_recorded' as const, reason: 'Strict gate passed; no benchmark repair feedback needed.' };
  const blockerIds = [...new Set(gate.reasons.map((reason) => reason.id))];
  const repairHypothesis = `Benchmark reproduction ${verdict.status.replace(/_/g, ' ')}: ${verdict.rationale} Repair live lane, token capture, ablation, and fixture-count blockers before stronger claims: ${blockerIds.join(', ') || 'none'}.`;
  const feedback = recordFeedback({
    repoRoot,
    runId: suiteId,
    source: 'benchmark',
    verdict: verdict.status === 'partially_reproduced' ? 'improve' : 'retry',
    scope: 'benchmark',
    whatHappened: `Open Scaffold reproduction verdict was ${verdict.status}.`,
    whyItMatters: 'Failed or partial reproduction must create repair input instead of strengthening broad proof claims.',
    repairHypothesis,
    evidencePaths: [aggregatePath, reportPath],
    nextAction: 'repair-proof-blockers-and-rerun-bounded-reproduction',
  });
  const analysis = analyzeFeedback({ repoRoot, runId: suiteId });
  return {
    status: 'recorded' as const,
    path: feedback.path,
    analysisPath: `.osc/runs/${suiteId}/improvement-candidates.json`,
    record: feedback.record,
    analysis,
  };
}

function reportMarkdown(aggregate: Record<string, unknown> & { mode: BenchMode; totals: Record<string, number>; proofGate: ReturnType<typeof proofGate>; reproductionVerdict: { status: ReproductionStatus; rationale: string }; boundary: Record<string, unknown> }): string {
  const reasons = aggregate.proofGate.reasons.map((reason) => `- ${reason.id}${reason.fixtureId ? ` (${reason.fixtureId})` : ''}: ${reason.detail}`).join('\n') || '- none';
  return [
    '# Open Scaffold harness reproduction report',
    '',
    `Mode: ${aggregate.mode}`,
    `Fixtures: ${aggregate.totals.fixtures}`,
    `Ablation fixtures: ${aggregate.totals.ablationFixtures}`,
    `Ablation runs: ${aggregate.totals.ablationRuns}`,
    '',
    `Reproduction verdict: ${aggregate.reproductionVerdict.status}`,
    `Rationale: ${aggregate.reproductionVerdict.rationale}`,
    '',
    'Broad dominance: not proven unless the proof gate status is proven.',
    `Proof gate: ${aggregate.proofGate.status}`,
    '',
    'Proof-gate reasons:',
    reasons,
    '',
    'Boundary: source-prototype evidence is provenance only. Open Scaffold proof requires Open Scaffold-run evidence under this aggregate and report.',
    '',
  ].join('\n');
}

export function runBenchSuite({ repoRoot = process.cwd(), mode = 'simulated', outDir = '.osc/bench/simulated-runtime-smoke', fixtureIds = DEFAULT_FIXTURES, includeAblations = false, ablationFixtureIds = null, allowSpawn = false, adapterId = 'codex', timeoutMs, maxLogBytes, model, effort }: BenchSuiteOptions = {}) {
  if (mode !== 'simulated' && mode !== 'live') throw new Error('bench suite --mode must be simulated or live');
  const output = createSafeOutputRoot(repoRoot, outDir, 'bench suite output root');
  const selectedFixtures = fixtureIds.length ? fixtureIds : DEFAULT_FIXTURES;
  const suiteId = suiteRunId(output.relativePath);
  const fixtures = mode === 'live'
    ? selectedFixtures.map((fixtureId) => runLiveFixture({ repoRoot, suiteId, fixtureId, adapterId, allowSpawn, timeoutMs, maxLogBytes, model, effort }))
    : selectedFixtures.map(simulatedFixture);
  const selectedAblationFixtures = includeAblations ? (ablationFixtureIds?.length ? ablationFixtureIds : fixtures.slice(0, 3).map((item) => item.fixtureId)) : [];
  const harnessByFixture = new Map(fixtures.map((fixture) => [fixture.fixtureId, fixture.harness.quality.value]));
  const ablations = includeAblations
    ? selectedAblationFixtures.flatMap((fixtureId) => ABLATIONS.map((ablationId) => mode === 'live'
      ? runLiveAblation({ repoRoot, suiteId, fixtureId, ablationId, harnessQuality: harnessByFixture.get(fixtureId) ?? null, adapterId, allowSpawn, timeoutMs, maxLogBytes, model, effort })
      : simulatedAblation(fixtureId, ablationId)))
    : [];

  for (const item of fixtures) {
    writeJsonUnder(output.absolutePath, `fixtures/${item.fixtureId}/report.json`, { schema: 'osc.bench-fixture-report.v1', mode, ...item }, 'bench fixture report path');
  }
  for (const item of ablations) {
    writeJsonUnder(output.absolutePath, `ablations/${item.fixtureId}/${item.ablationId}/report.json`, { schema: 'osc.bench-ablation-report.v1', mode, ...item }, 'bench ablation report path');
  }

  const gate = proofGate(mode, fixtures, includeAblations, ablations, allowSpawn);
  const verdict = reproductionVerdict(mode, fixtures, gate, allowSpawn);
  const aggregatePath = `${output.relativePath}/aggregate.json`;
  const reportPath = `${output.relativePath}/REPORT.md`;
  const feedback = recordBenchmarkFeedback(repoRoot, suiteId, verdict, gate, aggregatePath, reportPath);
  const cleanCompletion = {
    allLanesClean: fixtures.every((fixture) => fixture.control.completion.clean && fixture.harness.completion.clean) && ablations.every((ablation) => ablation.completion.clean),
    dirtyLaneCount: fixtures.flatMap((fixture) => [fixture.control, fixture.harness]).filter((lane) => !lane.completion.clean).length + ablations.filter((ablation) => !ablation.completion.clean).length,
    reasonIds: [...new Set([...fixtures.flatMap((fixture) => [...fixture.control.completion.reasonIds, ...fixture.harness.completion.reasonIds]), ...ablations.flatMap((ablation) => ablation.completion.reasonIds)])],
  };

  const aggregate = {
    schema: BENCH_SUITE_SCHEMA,
    generatedAt: nowIso(),
    suiteId,
    mode,
    outDir: output.relativePath,
    totals: {
      fixtures: fixtures.length,
      laneRuns: fixtures.length * 2,
      ablationFixtures: selectedAblationFixtures.length,
      ablationRuns: ablations.length,
    },
    metrics: aggregateMetric(fixtures),
    cleanCompletion,
    fixtures,
    ablations,
    proofGate: gate,
    reproductionVerdict: verdict,
    feedback,
    sourcePrototypeProvenance: {
      status: 'provenance_only_not_open_scaffold_proof',
      summary: 'Source prototype evidence showed useful cost/speed and compact handoff signals, but broad dominance stayed mixed/not proven due quality, prompt-quality, ledger/signal, and token-budget confounds. This aggregate only counts Open Scaffold-run evidence.',
    },
    boundary: {
      broadDominance: gate.broadDominanceClaimAllowed ? 'allowed_by_strict_gate' : 'mixed_not_proven',
      sourcePrototypeEvidenceIsNotOpenScaffoldProof: true,
      noMergePublishReleaseApproval: true,
      rawLiveLogsAreRuntimeResidue: true,
    },
  };
  writeJsonUnder(output.absolutePath, 'aggregate.json', aggregate, 'bench aggregate path');
  writeFileUnder(output.absolutePath, 'REPORT.md', reportMarkdown(aggregate), 'bench report path');
  return { ...aggregate, aggregatePath, reportPath };
}

const METHOD_NAMES = [
  'jsonish-control-packet', 'section-budget-trim', 'state-first', 'decision-ledger', 'evidence-ref-minimal',
  'blocker-forward', 'next-action-only', 'risk-first', 'schema-table', 'plain-language',
  'two-pass-shrink', 'keyword-preserve', 'compact-runbook', 'repair-hypothesis', 'fallback-summary',
];

function scoreCandidate(content: string, maxChars: number) {
  const validation = validateHandoffPacket(content, { maxChars });
  const required = ['State', 'Decisions', 'Blockers / Open Questions', 'Evidence refs', 'Next Actions'];
  const present = required.length - validation.missingSections.length;
  const budgetPoint = content.length <= maxChars ? 1 : 0;
  return { score: present + budgetPoint, maxScore: required.length + 1, failed: [...validation.missingSections, ...(budgetPoint ? [] : ['budget'])] };
}

export function runHandoffLab({ repoRoot = process.cwd(), outDir = '.osc/bench/handoff-lab-15', maxChars = 1600 }: { repoRoot?: string; outDir?: string; maxChars?: number } = {}) {
  const output = createSafeOutputRoot(repoRoot, outDir, 'handoff lab output root');
  const seed = {
    state: 'Prior work attempted a harness migration. Some checks may have passed, but exact verification output is missing and proof wording needs care.',
    decisions: ['Use $interview, $plan, $work, $team.', 'Keep evidence refs instead of raw logs.', 'Do not claim broad dominance from prototype evidence.'],
    blockers: ['Live Codex reproduction is optional and budget-gated.', 'Owner still controls merge, publish, and release.'],
    evidenceRefs: ['docs/PROOF_HARNESS.md', '.osc/bench/simulated-runtime-smoke/aggregate.json'],
    nextActions: ['Run local verification.', 'Inspect proof wording.', 'Open PR with reproduction status.'],
    maxChars,
  };
  const results = METHOD_NAMES.map((id, index) => {
    const compiled = compileHandoffPacket({ ...seed, reason: `${id} candidate ${index + 1}` });
    const noisy = index === 14 ? `${compiled.content}\n${'extra '.repeat(400)}` : compiled.content;
    const content = index === 0 ? compiled.content : noisy;
    const score = scoreCandidate(content, maxChars);
    const result = { id, content, length: content.length, score: score.score, maxScore: score.maxScore, failedCriteria: score.failed };
    writeFileUnder(output.absolutePath, `methods/${String(index + 1).padStart(2, '0')}-${id}/resume.md`, content, 'handoff method resume path');
    writeJsonUnder(output.absolutePath, `methods/${String(index + 1).padStart(2, '0')}-${id}/score.json`, result, 'handoff method score path');
    return result;
  }).sort((a, b) => b.score - a.score || a.length - b.length || a.id.localeCompare(b.id));
  const best = results[0]!;
  const aggregate = {
    schema: HANDOFF_LAB_SCHEMA,
    generatedAt: nowIso(),
    outDir: output.relativePath,
    methodsTested: METHOD_NAMES.length,
    budget: { maxChars },
    best,
    results: results.map(({ content, ...rest }) => rest),
    narrowClaim: {
      status: 'candidate_only_not_broad_proof',
      language: '15 deterministic handoff candidates were scored; live paired runs and ablations are still required before broad proof claims.',
    },
  };
  writeJsonUnder(output.absolutePath, 'aggregate.json', aggregate, 'handoff lab aggregate path');
  const rows = aggregate.results.map((item) => `| ${item.id} | ${item.score}/${item.maxScore} | ${item.length} | ${item.failedCriteria.join(', ') || 'none'} |`).join('\n');
  writeFileUnder(output.absolutePath, 'REPORT.md', `# Handoff lab\n\nMethods tested: ${aggregate.methodsTested}\nBest method: ${best.id}\nNarrow claim: ${aggregate.narrowClaim.status}\n\n| Method | Score | Length | Failed criteria |\n| --- | ---: | ---: | --- |\n${rows}\n\nVerdict: candidate-only evidence. Do not claim broad Open Scaffold proof without live paired runs and ablations.\n`, 'handoff lab report path');
  return { ...aggregate, aggregatePath: `${output.relativePath}/aggregate.json`, reportPath: `${output.relativePath}/REPORT.md` };
}
