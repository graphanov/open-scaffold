import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, win32 } from 'node:path';
import { parsePlanFile, findScaffoldRoot } from './scaffold.js';
import type { ValidationIssue, ValidationResult } from './validation.js';

export const EVOLUTION_LOOP_SCHEMA = 'open-scaffold.evolution-loop.v1';
export const EVOLUTION_ATTEMPT_SCHEMA = 'open-scaffold.evolution-attempt.v1';
export const EVOLUTION_FRONTIER_SCHEMA = 'open-scaffold.evolution-frontier.v1';
export const EVOLUTION_NEXT_ACTION_PACKET_SCHEMA = 'open-scaffold.evolution-next-action-packet.v1';
export const EVOLUTION_CONTROLLER_SIGNAL_SCHEMA = 'open-scaffold.evolution-controller-signal.v1';
export const EVOLUTION_JUDGMENT_CHECKPOINT_SCHEMA = 'open-scaffold.evolution-judgment-checkpoint.v1';
export const EVOLUTION_EFFICIENCY_REPORT_SCHEMA = 'open-scaffold.evolution-efficiency-report.v1';
const RUN_SCHEMA = 'open-scaffold.run.v1';
const EVALUATION_SCHEMA = 'open-scaffold.evaluation.v1';
const DISPATCH_RECEIPT_SCHEMA = 'open-scaffold.dispatch-receipt.v1';

export const EVOLUTION_STRATEGIES = ['manual', 'greedy', 'tournament', 'novelty', 'map_elites', 'custom'] as const;
export type EvolutionStrategy = (typeof EVOLUTION_STRATEGIES)[number];
export const EVOLUTION_DECISIONS = ['promote', 'reject', 'retry', 'block'] as const;
export type EvolutionDecision = (typeof EVOLUTION_DECISIONS)[number];

const UNSUPPORTED_BOUNDARY_TRUE_FIELDS = [
  'runtime_spawning',
  'model_benchmarking',
  'compliance_certification',
  'approval_or_release_decision',
  'external_anchoring',
];

const PRIVATE_PATH_PREFIXES = [
  '.git/',
  '.osc/state/',
  '.osc/research/',
  '.osc-dev/',
  '.hermes/',
  'node_modules/',
];

export interface EvolutionSource {
  source: 'plan' | 'run';
  sourcePath: string;
  planPath: string;
  planSlug: string;
  taskId: string | null;
  runId: string | null;
  runPacketPath: string | null;
  objective: string;
  constraints: string[];
  acceptanceCriteria: string[];
  sourceRefs: string[];
}

export interface RenderEvolutionOptions {
  now?: Date;
  strategy?: EvolutionStrategy;
}

export interface EvolutionLoopFiles {
  loopId: string;
  loopJson: string;
  attemptsJsonl: string;
  frontierJson: string;
}

export interface WriteEvolutionResult {
  loopDir: string;
  loopPath: string;
  attemptsPath: string;
  frontierPath: string;
  loopId: string;
}

export interface RecordEvolutionAttemptOptions {
  runPath: string;
  evaluationPath?: string;
  receiptPaths?: string[];
  evidencePaths?: string[];
  decision: EvolutionDecision;
  score?: number;
  rationale: string;
  repairHypothesis?: EvolutionRepairHypothesis;
  usage?: EvolutionUsageSummary;
  now?: Date;
}

export interface RecordEvolutionAttemptResult {
  attempt: Record<string, unknown>;
  frontierUpdated: boolean;
  attemptsPath: string;
  frontierPath: string;
}

export interface EvolutionRepairHypothesis {
  hypothesis: string;
  targetMetric?: string | null;
  expectedGain?: number | null;
  actualDelta?: number | null;
}

export interface EvolutionUsageSummary {
  totalTokens?: number | null;
  estimatedUsd?: number | null;
  source?: string | null;
  unavailableReason?: string | null;
}

export interface EvolutionAttemptRepairHypothesis {
  hypothesis: string;
  targetMetric: string | null;
  expectedGain: number | null;
  actualDelta: number | null;
}

export interface EvolutionAttemptUsageSummary {
  totalTokens: number | null;
  estimatedUsd: number | null;
  source: string | null;
  unavailableReason: string | null;
}

function issue(level: 'fail' | 'warn', code: string, message: string, path?: string): ValidationIssue {
  return { level, code, message, path };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function meaningfulString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !/^(todo|tbd|n\/a|none)$/i.test(value.trim());
}

function optionalFiniteNumber(value: unknown, label: string): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

function optionalNonNegativeInteger(value: unknown, label: string): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return value;
}

function optionalNonNegativeNumber(value: unknown, label: string): number | null {
  const parsed = optionalFiniteNumber(value, label);
  if (parsed !== null && parsed < 0) throw new Error(`${label} must be non-negative.`);
  return parsed;
}

function toPosix(value: string): string {
  return value.split('\\').join('/');
}

function timestampId(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function shortDigest(parts: string[]): string {
  return createHash('sha256').update(parts.join('\n'), 'utf8').digest('hex').slice(0, 16);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function rootRealpath(root: string): string {
  return existsSync(root) ? realpathSync(root) : resolve(root);
}

function isInsideRoot(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function pathRelativeToRoot(root: string, path: string): string {
  const realRoot = rootRealpath(root);
  const absolute = isAbsolute(path) ? path : resolve(realRoot, path);
  const comparablePath = existsSync(absolute) ? realpathSync(absolute) : absolute;
  const rel = relative(realRoot, comparablePath);
  if (!rel || rel.startsWith('..')) return toPosix(path);
  return toPosix(rel);
}

function isPrivatePath(ref: string): boolean {
  if (/^[a-z]+:\/\//i.test(ref)) return false;
  const normalized = toPosix(ref).replace(/^\.\//, '');
  return PRIVATE_PATH_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix));
}

function repoRelativePathExists(root: string, ref: string): boolean {
  if (/^[a-z]+:\/\//i.test(ref)) return true;
  const realRoot = rootRealpath(root);
  const absolute = isAbsolute(ref) ? ref : resolve(realRoot, ref);
  if (!isInsideRoot(realRoot, absolute)) return false;
  return existsSync(absolute);
}

function adapterRefRelativeToRoot(root: string, refPath: string, label: string): string {
  const realRoot = rootRealpath(root);
  const absolute = isAbsolute(refPath) ? resolve(refPath) : resolve(realRoot, refPath);
  if (!existsSync(absolute)) throw new Error(`${label} does not exist: ${refPath}`);
  const real = realpathSync(absolute);
  if (!isInsideRoot(realRoot, real)) throw new Error(`${label} must stay under the scaffold repository root: ${refPath}`);
  const rel = toPosix(relative(realRoot, real));
  if (isPrivatePath(rel)) throw new Error(`Reference points at private/internal workspace state: ${rel}`);
  return rel;
}

function sourceFromPlan(sourcePath: string, root: string): EvolutionSource {
  const plan = parsePlanFile(sourcePath);
  const relPath = pathRelativeToRoot(root, sourcePath);
  const constraints = plan.sections.get('Constraints / Out of scope')
    ?.split('\n')
    .map((line) => line.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean) ?? [];
  return {
    source: 'plan',
    sourcePath: relPath,
    planPath: relPath,
    planSlug: plan.slug,
    taskId: null,
    runId: null,
    runPacketPath: null,
    objective: plan.goal || `Improve ${plan.slug}.`,
    constraints,
    acceptanceCriteria: plan.acceptanceCriteria,
    sourceRefs: [relPath],
  };
}

function sourceFromRunPacket(sourcePath: string, root: string): EvolutionSource {
  const packet = readJson(sourcePath);
  if (!isRecord(packet) || packet.schemaVersion !== RUN_SCHEMA) {
    throw new Error(`Run packet must declare schemaVersion: ${RUN_SCHEMA}`);
  }
  const plan = isRecord(packet.plan) ? packet.plan : {};
  const artifacts = isRecord(packet.artifacts) ? packet.artifacts : {};
  const planPath = asString(plan.path) ?? '(unknown plan)';
  const runPacketPath = pathRelativeToRoot(root, sourcePath);
  const runId = asString(packet.runId);
  const artifactRefs = Object.values(artifacts)
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === 'string');
  return {
    source: 'run',
    sourcePath: runPacketPath,
    planPath,
    planSlug: asString(plan.slug) ?? basename(planPath, extname(planPath)),
    taskId: asString(packet.taskId),
    runId,
    runPacketPath,
    objective: asString(plan.goal) ?? `Improve ${asString(plan.slug) ?? runId ?? 'run'}.`,
    constraints: [],
    acceptanceCriteria: asStringArray(plan.acceptanceCriteria),
    sourceRefs: [runPacketPath, planPath, ...artifactRefs],
  };
}

export function loadEvolutionSource(sourcePath: string, root = process.cwd()): EvolutionSource {
  const absolute = isAbsolute(sourcePath) ? sourcePath : resolve(root, sourcePath);
  if (!existsSync(absolute)) throw new Error(`Evolution source not found: ${sourcePath}`);
  if (!statSync(absolute).isFile()) throw new Error(`Evolution source is not a file: ${sourcePath}`);
  if (extname(absolute).toLowerCase() === '.json') return sourceFromRunPacket(absolute, root);
  return sourceFromPlan(absolute, root);
}

function defaultLoopDirName(loopId: string): string {
  return loopId.replace(/[^a-zA-Z0-9_.-]/g, '-');
}

function boundary() {
  return {
    runtime_spawning: false,
    model_benchmarking: false,
    compliance_certification: false,
    approval_or_release_decision: false,
    external_anchoring: false,
  };
}

export function renderEvolutionLoopFiles(source: EvolutionSource, options: RenderEvolutionOptions = {}): EvolutionLoopFiles {
  const now = options.now ?? new Date();
  const createdAt = now.toISOString();
  const stamp = timestampId(now);
  const loopId = `${stamp}-${source.runId ?? source.planSlug}-evolution`;
  const strategy = options.strategy ?? 'manual';
  const loop = {
    schema: EVOLUTION_LOOP_SCHEMA,
    loop_id: loopId,
    idempotency_key: `evolve:${source.source}:${source.runId ?? source.planSlug}:${shortDigest(source.acceptanceCriteria)}`,
    created_at: createdAt,
    updated_at: createdAt,
    subject: {
      source: source.source,
      plan: source.planPath,
      plan_slug: source.planSlug,
      task_id: source.taskId,
      run_id: source.runId,
      run_packet: source.runPacketPath,
    },
    objective: source.objective,
    constraints: {
      hard: source.constraints,
      soft: [],
    },
    acceptance_criteria: source.acceptanceCriteria,
    scorer: {
      kind: 'human',
      name: 'maintainer',
      approval_authority: false,
      notes: 'Scorer output is evidence for a maintainer/operator decision; it is not automatic approval.',
    },
    mutation_surface: ['implementation', 'prompt-or-handoff', 'runtime-profile', 'docs', 'plan-amendment'],
    strategy: {
      name: strategy,
      executes_in_core: false,
      notes: 'Open Scaffold records strategy metadata only; external coordinators/adapters execute attempts.',
    },
    stop_condition: {
      max_attempts: null,
      all_acceptance_criteria_pass: true,
      human_approval: true,
      blocked_dependency: true,
      budget_limit: null,
      explicit_owner_stop: true,
    },
    source_refs: source.sourceRefs,
    artifacts: {
      attempts: 'attempts.jsonl',
      frontier: 'frontier.json',
    },
    boundary: boundary(),
    notes: [
      'This loop records multi-attempt evolution state and frontier promotion. It does not spawn runtimes, rank models, certify compliance, or approve release.',
      'Runtime attempts are executed by external coordinators/adapters such as OMX, OMC, Hermes, or human/manual lanes.',
    ],
  };
  const frontier = {
    schema: EVOLUTION_FRONTIER_SCHEMA,
    loop_id: loopId,
    updated_at: createdAt,
    current: null,
    history: [],
    boundary: boundary(),
    notes: ['Frontier promotion is a recorded decision, not proof of correctness or automatic approval.'],
  };
  return {
    loopId,
    loopJson: `${JSON.stringify(loop, null, 2)}\n`,
    attemptsJsonl: '',
    frontierJson: `${JSON.stringify(frontier, null, 2)}\n`,
  };
}

export function writeEvolutionLoop(sourcePath: string, outDir: string, root = process.cwd(), options: RenderEvolutionOptions = {}): WriteEvolutionResult {
  const source = loadEvolutionSource(sourcePath, root);
  const files = renderEvolutionLoopFiles(source, options);
  const absoluteOutDir = isAbsolute(outDir) ? outDir : resolve(root, outDir || join('.osc/evolution', defaultLoopDirName(files.loopId)));
  mkdirSync(absoluteOutDir, { recursive: true });
  const loopPath = join(absoluteOutDir, 'loop.json');
  const attemptsPath = join(absoluteOutDir, 'attempts.jsonl');
  const frontierPath = join(absoluteOutDir, 'frontier.json');
  writeFileSync(loopPath, files.loopJson, { encoding: 'utf8', flag: 'wx' });
  writeFileSync(attemptsPath, files.attemptsJsonl, { encoding: 'utf8', flag: 'wx' });
  writeFileSync(frontierPath, files.frontierJson, { encoding: 'utf8', flag: 'wx' });
  return { loopDir: absoluteOutDir, loopPath, attemptsPath, frontierPath, loopId: files.loopId };
}

function readRunSummary(runPath: string, root: string): Record<string, unknown> {
  const packet = readJson(runPath);
  if (!isRecord(packet) || packet.schemaVersion !== RUN_SCHEMA) {
    throw new Error(`Run packet must declare schemaVersion: ${RUN_SCHEMA}`);
  }
  const artifacts = isRecord(packet.artifacts) ? packet.artifacts : {};
  const evidenceRefs = Object.values(artifacts)
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === 'string');
  return {
    runId: asString(packet.runId),
    taskId: asString(packet.taskId),
    runPacket: pathRelativeToRoot(root, runPath),
    evidenceRefs,
  };
}

function evaluationAcStatuses(parsed: unknown): Array<string | null> {
  if (!isRecord(parsed) || parsed.schema !== EVALUATION_SCHEMA) return [];
  const criteria = Array.isArray(parsed.acceptance_criteria) ? parsed.acceptance_criteria.filter(isRecord) : [];
  return criteria.map((criterion) => asString(criterion.status));
}

function countEvaluationPasses(parsed: unknown): number {
  return evaluationAcStatuses(parsed).filter((status) => status === 'pass').length;
}

function readEvaluationSummary(evaluationPath: string, root: string): Record<string, unknown> {
  const parsed = readJson(evaluationPath);
  if (!isRecord(parsed) || parsed.schema !== EVALUATION_SCHEMA) {
    throw new Error(`Evaluation envelope must declare schema: ${EVALUATION_SCHEMA}`);
  }
  const subject = isRecord(parsed.subject) ? parsed.subject : {};
  const decision = isRecord(parsed.decision) ? parsed.decision : {};
  return {
    evaluationId: asString(parsed.evaluation_id),
    evaluationPath: pathRelativeToRoot(root, evaluationPath),
    runId: asString(subject.run_id),
    decisionStatus: asString(decision.status),
    passCount: countEvaluationPasses(parsed),
  };
}

// 165: passCount of an attempt's already-linked evaluation, resolved from the
// attempt's repo-relative evaluation ref. Used by record auto-fill to compute
// actual_delta against the previous attempt without re-deriving the envelope shape.
function previousAttemptPassCount(attempt: Record<string, unknown> | undefined, root: string): number | null {
  if (!attempt) return null;
  const ref = asString(attempt.evaluation);
  if (!ref) return null;
  const evaluationPath = analysisEvaluationPath(root, ref);
  if (!evaluationPath || !existsSync(evaluationPath)) return null;
  try {
    return countEvaluationPasses(readJson(evaluationPath));
  } catch {
    return null;
  }
}

function readDispatchReceiptSummary(receiptPath: string, root: string, expectedRunId: string | null): Record<string, unknown> {
  const receiptRef = adapterRefRelativeToRoot(root, receiptPath, 'Dispatch receipt');
  const parsed = readJson(receiptPath);
  if (!isRecord(parsed) || parsed.schema_version !== DISPATCH_RECEIPT_SCHEMA) {
    throw new Error(`Dispatch receipt must declare schema_version: ${DISPATCH_RECEIPT_SCHEMA}`);
  }
  const receiptRunId = asString(parsed.run_id);
  if (!receiptRunId) throw new Error('Dispatch receipt must include run_id.');
  if (expectedRunId && receiptRunId !== expectedRunId) {
    throw new Error(`Dispatch receipt run_id ${receiptRunId} does not match run packet ${expectedRunId}.`);
  }
  return {
    receiptPath: receiptRef,
    receiptId: asString(parsed.receipt_id),
    runId: receiptRunId,
    adapterId: asString(parsed.adapter_id),
    status: asString(parsed.status),
  };
}

function uniqueRefs(refs: string[]): string[] {
  return [...new Set(refs)];
}

function readAttempts(attemptsPath: string): Array<Record<string, unknown>> {
  if (!existsSync(attemptsPath)) return [];
  const text = readFileSync(attemptsPath, 'utf8');
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

export type EvolutionCompareFormat = 'terminal' | 'markdown' | 'json';

export interface EvolutionCompareOptions {
  a?: string;
  b?: string;
}

export interface EvolutionCompareAttempt {
  attemptId: string;
  runId: string | null;
  taskId: string | null;
  recordedAt: string | null;
  decision: string | null;
  score: number | null;
  rationale: string;
  runPacket: string | null;
  evidenceRefs: string[];
  adapterReceipts: string[];
  evaluation: string | null;
  evaluationId: string | null;
  evaluationDecision: string | null;
  repairHypothesis: EvolutionAttemptRepairHypothesis | null;
  usage: EvolutionAttemptUsageSummary | null;
  boundary: Record<string, unknown>;
}

export interface EvolutionCompareCriterionDelta {
  id: string;
  text: string;
  aStatus: string | null;
  bStatus: string | null;
}

export type EvolutionCompareResult =
  | {
      kind: 'message';
      loop: { loopDir: string; loopId: string | null; objective: string | null; strategy: string | null; attemptCount: number };
      message: string;
    }
  | {
      kind: 'comparison';
      loop: { loopDir: string; loopId: string | null; objective: string | null; strategy: string | null; attemptCount: number };
      a: EvolutionCompareAttempt;
      b: EvolutionCompareAttempt;
      scoreDelta: number | null;
      evidence: { onlyInA: string[]; onlyInB: string[]; inBoth: string[] };
      evaluation: { a: { present: boolean; path: string | null; id: string | null; decision: string | null }; b: { present: boolean; path: string | null; id: string | null; decision: string | null } };
      acceptanceCriteria: { rows: EvolutionCompareCriterionDelta[]; aPresent: boolean; bPresent: boolean };
      boundaryDifferences: Array<{ field: string; a: unknown; b: unknown }>;
      frontierHistory: Array<{ attemptId: string; runId: string | null; score: number | null; promotedAt: string | null; decision: string | null }>;
    };

function normalizeCompareAttempt(attempt: Record<string, unknown>): EvolutionCompareAttempt {
  const attemptId = asString(attempt.attempt_id);
  if (!attemptId) throw new Error('missing attempt_id');
  const boundaryValue = isRecord(attempt.boundary) ? attempt.boundary : {};
  return {
    attemptId,
    runId: asString(attempt.run_id),
    taskId: asString(attempt.task_id),
    recordedAt: asString(attempt.recorded_at),
    decision: asString(attempt.decision),
    score: asNumber(attempt.score),
    rationale: asString(attempt.rationale) ?? '',
    runPacket: asString(attempt.run_packet),
    evidenceRefs: asStringArray(attempt.evidence_refs),
    adapterReceipts: asStringArray(attempt.adapter_receipts),
    evaluation: asString(attempt.evaluation),
    evaluationId: asString(attempt.evaluation_id),
    evaluationDecision: asString(attempt.evaluation_decision),
    repairHypothesis: readAttemptRepairHypothesis(attempt),
    usage: readAttemptUsage(attempt),
    boundary: boundaryValue,
  };
}

function normalizeCompareAttempts(attemptsPath: string): EvolutionCompareAttempt[] {
  return readAttempts(attemptsPath).map((attempt, index) => {
    try {
      return normalizeCompareAttempt(attempt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`invalid-evolution-ledger: attempts.jsonl line ${index + 1} is ${message}. Use osc evolve record to write attempt records.`);
    }
  });
}

function readAttemptRepairHypothesis(attempt: Record<string, unknown>): EvolutionAttemptRepairHypothesis | null {
  const value = isRecord(attempt.repair_hypothesis) ? attempt.repair_hypothesis : null;
  if (!value) return null;
  const hypothesis = asString(value.hypothesis);
  if (!hypothesis) return null;
  return {
    hypothesis,
    targetMetric: asString(value.target_metric),
    expectedGain: asNumber(value.expected_gain),
    actualDelta: asNumber(value.actual_delta),
  };
}

function readAttemptUsage(attempt: Record<string, unknown>): EvolutionAttemptUsageSummary | null {
  const value = isRecord(attempt.usage) ? attempt.usage : null;
  if (!value) return null;
  return {
    totalTokens: asNumber(value.total_tokens),
    estimatedUsd: asNumber(value.estimated_usd),
    source: asString(value.source),
    unavailableReason: asString(value.unavailable_reason),
  };
}

function formatScore(score: number | null): string {
  return score === null ? '—' : Number(score.toFixed(6)).toString();
}

function formatDelta(delta: number | null): string {
  if (delta === null) return '—';
  const rounded = Number(delta.toFixed(6));
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : ''}${rounded} ${rounded > 0 ? '▲' : '▼'}`;
}

function formatInteger(value: number | null): string {
  return value === null ? '—' : value.toLocaleString('en-US');
}

function formatTokenDelta(a: number | null, b: number | null): string {
  if (a === null || b === null) return '—';
  const delta = b - a;
  if (delta === 0) return '0';
  return `${delta > 0 ? '+' : ''}${delta.toLocaleString('en-US')} ${delta > 0 ? '▲' : '▼'}`;
}

function formatUsd(value: number | null): string {
  return value === null ? '—' : `$${value.toFixed(4)}`;
}

function attemptHasControlFields(attempt: EvolutionCompareAttempt): boolean {
  return Boolean(attempt.repairHypothesis || attempt.usage);
}

function attemptHypothesisLabel(attempt: EvolutionCompareAttempt): string {
  return attempt.repairHypothesis?.hypothesis ?? '—';
}

function attemptTargetMetric(attempt: EvolutionCompareAttempt): string {
  return attempt.repairHypothesis?.targetMetric ?? '—';
}

function formatCriterionStatus(status: string | null): string {
  switch (status) {
    case 'pass':
      return '✓ pass';
    case 'fail':
      return '✗ fail';
    case 'partial':
      return '◐ partial';
    case 'blocked':
      return 'blocked';
    case 'not_evaluated':
      return 'not evaluated';
    case null:
      return '—';
    default:
      return status;
  }
}

function formatPlainCriterionStatus(status: string | null): string {
  return status ?? '—';
}

function criterionDeltaMarker(aStatus: string | null, bStatus: string | null): string {
  if (aStatus === bStatus || bStatus === null) return '';
  if (bStatus === 'pass' && aStatus !== 'pass') return ' ▲';
  if (aStatus === 'pass' && bStatus !== 'pass') return ' ▼';
  return ' changed';
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function evidenceDelta(aRefs: string[], bRefs: string[]) {
  const aSet = new Set(aRefs);
  const bSet = new Set(bRefs);
  return {
    onlyInA: aRefs.filter((ref) => !bSet.has(ref)),
    onlyInB: bRefs.filter((ref) => !aSet.has(ref)),
    inBoth: aRefs.filter((ref) => bSet.has(ref)),
  };
}

function boundaryDelta(a: Record<string, unknown>, b: Record<string, unknown>) {
  const fields = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  return fields
    .filter((field) => JSON.stringify(a[field]) !== JSON.stringify(b[field]))
    .map((field) => ({ field, a: a[field], b: b[field] }));
}

interface CompareCriterionStatus {
  id: string;
  text: string;
  status: string | null;
}

function readEvaluationCriteriaForCompare(root: string, evaluationRef: string | null): CompareCriterionStatus[] {
  if (!evaluationRef) return [];
  const evaluationPath = isAbsolute(evaluationRef) || win32.isAbsolute(evaluationRef) ? evaluationRef : resolve(root, evaluationRef);
  try {
    const parsed = readJson(evaluationPath);
    if (!isRecord(parsed) || parsed.schema !== EVALUATION_SCHEMA) return [];
    const criteria = Array.isArray(parsed.acceptance_criteria) ? parsed.acceptance_criteria.filter(isRecord) : [];
    return criteria.map((criterion, index) => {
      const id = asString(criterion.id) ?? `AC${index + 1}`;
      return {
        id,
        text: asString(criterion.text) ?? id,
        status: asString(criterion.status),
      };
    });
  } catch {
    return [];
  }
}

function acceptanceCriteriaDelta(root: string, a: EvolutionCompareAttempt, b: EvolutionCompareAttempt) {
  const aCriteria = readEvaluationCriteriaForCompare(root, a.evaluation);
  const bCriteria = readEvaluationCriteriaForCompare(root, b.evaluation);
  const rows = new Map<string, EvolutionCompareCriterionDelta>();
  for (const criterion of aCriteria) {
    rows.set(criterion.id, {
      id: criterion.id,
      text: criterion.text,
      aStatus: criterion.status,
      bStatus: null,
    });
  }
  for (const criterion of bCriteria) {
    const existing = rows.get(criterion.id);
    if (existing) {
      existing.text = existing.text || criterion.text;
      existing.bStatus = criterion.status;
    } else {
      rows.set(criterion.id, {
        id: criterion.id,
        text: criterion.text,
        aStatus: null,
        bStatus: criterion.status,
      });
    }
  }
  return {
    rows: [...rows.values()],
    aPresent: Boolean(a.evaluation),
    bPresent: Boolean(b.evaluation),
  };
}

function resolveAttemptTarget(target: string, attempts: EvolutionCompareAttempt[], currentFrontierId: string | null): EvolutionCompareAttempt {
  const resolvedTarget = target === 'frontier' ? currentFrontierId : target;
  if (!resolvedTarget) throw new Error('No current frontier attempt is recorded.');
  const found = attempts.find((attempt) => attempt.attemptId === resolvedTarget || attempt.runId === resolvedTarget);
  if (!found) throw new Error(`Unknown evolution attempt target: ${target}`);
  return found;
}

function frontierAttemptIds(frontier: Record<string, unknown>): { current: string | null; previous: string | null; history: Array<Record<string, unknown>> } {
  const current = isRecord(frontier.current) ? asString(frontier.current.attempt_id) : null;
  const history = Array.isArray(frontier.history) ? frontier.history.filter(isRecord) : [];
  const previous = history.length > 0 ? asString(history[history.length - 1].attempt_id) : null;
  return { current, previous, history };
}

function inferScaffoldRootFromLoopDir(loopDir: string): string | null {
  let current = resolve(loopDir);
  while (true) {
    if (basename(current) === '.osc') return dirname(current);
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function compareEvolutionLoop(loopDir: string, options: EvolutionCompareOptions = {}, root = process.cwd()): EvolutionCompareResult {
  const absoluteLoopDir = isAbsolute(loopDir) ? loopDir : resolve(root, loopDir);
  const comparisonRoot = findScaffoldRoot(absoluteLoopDir) ?? inferScaffoldRootFromLoopDir(absoluteLoopDir) ?? root;
  const loopPath = join(absoluteLoopDir, 'loop.json');
  const attemptsPath = join(absoluteLoopDir, 'attempts.jsonl');
  const frontierPath = join(absoluteLoopDir, 'frontier.json');
  const loop = readJson(loopPath);
  if (!isRecord(loop) || loop.schema !== EVOLUTION_LOOP_SCHEMA) {
    throw new Error(`Evolution loop must declare schema: ${EVOLUTION_LOOP_SCHEMA}`);
  }
  const frontier = readJson(frontierPath);
  if (!isRecord(frontier) || frontier.schema !== EVOLUTION_FRONTIER_SCHEMA) {
    throw new Error(`Evolution frontier must declare schema: ${EVOLUTION_FRONTIER_SCHEMA}`);
  }
  const attempts = normalizeCompareAttempts(attemptsPath);
  const strategy = isRecord(loop.strategy) ? asString(loop.strategy.name) : null;
  const loopInfo = {
    loopDir: basename(absoluteLoopDir),
    loopId: asString(loop.loop_id),
    objective: asString(loop.objective),
    strategy,
    attemptCount: attempts.length,
  };
  const frontierIds = frontierAttemptIds(frontier);
  const hasExplicitTarget = Boolean(options.a || options.b);

  if (!hasExplicitTarget && attempts.length < 2) {
    return { kind: 'message', loop: loopInfo, message: 'Only one attempt recorded; nothing to compare yet.' };
  }

  const defaultA = hasExplicitTarget ? (options.a ?? 'frontier') : frontierIds.previous;
  const defaultB = hasExplicitTarget ? (options.b ?? 'frontier') : frontierIds.current;
  if (!defaultA || !defaultB) {
    return { kind: 'message', loop: loopInfo, message: 'No previous frontier/current frontier comparison is recorded yet.' };
  }
  const a = resolveAttemptTarget(defaultA, attempts, frontierIds.current);
  const b = resolveAttemptTarget(defaultB, attempts, frontierIds.current);
  const scoreDelta = a.score !== null && b.score !== null ? Number((b.score - a.score).toFixed(6)) : null;
  const evidence = evidenceDelta(a.evidenceRefs, b.evidenceRefs);
  const attemptById = new Map(attempts.map((attempt) => [attempt.attemptId, attempt]));
  const frontierHistory = [
    ...frontierIds.history.map((entry) => ({
      attemptId: asString(entry.attempt_id),
      runId: asString(entry.run_id),
      score: asNumber(entry.score),
      promotedAt: asString(entry.promoted_at),
    })),
    ...(frontierIds.current ? [{
      attemptId: frontierIds.current,
      runId: isRecord(frontier.current) ? asString(frontier.current.run_id) : null,
      score: isRecord(frontier.current) ? asNumber(frontier.current.score) : null,
      promotedAt: isRecord(frontier.current) ? asString(frontier.current.promoted_at) : null,
    }] : []),
  ]
    .filter((entry): entry is { attemptId: string; runId: string | null; score: number | null; promotedAt: string | null } => Boolean(entry.attemptId))
    .map((entry) => ({ ...entry, decision: attemptById.get(entry.attemptId)?.decision ?? null }));

  const acceptanceCriteria = acceptanceCriteriaDelta(comparisonRoot, a, b);

  return {
    kind: 'comparison',
    loop: loopInfo,
    a,
    b,
    scoreDelta,
    evidence,
    evaluation: {
      a: { present: Boolean(a.evaluation), path: a.evaluation, id: a.evaluationId, decision: a.evaluationDecision },
      b: { present: Boolean(b.evaluation), path: b.evaluation, id: b.evaluationId, decision: b.evaluationDecision },
    },
    acceptanceCriteria,
    boundaryDifferences: boundaryDelta(a.boundary, b.boundary),
    frontierHistory,
  };
}

function linesOrNone(lines: string[], indent = '  '): string[] {
  return lines.length > 0 ? lines.map((line) => `${indent}${line}`) : [`${indent}—`];
}

function currentFrontierAttemptId(comparison: Extract<EvolutionCompareResult, { kind: 'comparison' }>): string | null {
  return comparison.frontierHistory.length > 0 ? comparison.frontierHistory[comparison.frontierHistory.length - 1].attemptId : null;
}

function attemptLabel(attempt: EvolutionCompareAttempt, currentAttemptId: string | null): string {
  const decision = attempt.decision ?? 'recorded';
  return attempt.attemptId === currentAttemptId ? `${decision}, current frontier` : decision;
}

function historyMarkers(item: { attemptId: string }, comparison: Extract<EvolutionCompareResult, { kind: 'comparison' }>, currentAttemptId: string | null): string {
  const markers = [];
  if (item.attemptId === comparison.a.attemptId) markers.push('A');
  if (item.attemptId === comparison.b.attemptId) markers.push('B');
  if (item.attemptId === currentAttemptId) markers.push('current');
  return markers.length > 0 ? ` ← ${markers.join('/')}` : '';
}

function renderTerminalComparison(comparison: Extract<EvolutionCompareResult, { kind: 'comparison' }>): string {
  const currentAttemptId = currentFrontierAttemptId(comparison);
  const evidenceDeltaLabel = comparison.evidence.onlyInB.length - comparison.evidence.onlyInA.length;
  const evidenceDeltaText = evidenceDeltaLabel === 0 ? '0' : `${evidenceDeltaLabel > 0 ? '+' : ''}${evidenceDeltaLabel}`;
  const hasControlFields = attemptHasControlFields(comparison.a) || attemptHasControlFields(comparison.b);
  const lines = [
    `Evolution Loop: ${comparison.loop.loopDir}`,
    `Objective: ${comparison.loop.objective ?? '—'}`,
    `Strategy: ${comparison.loop.strategy ?? '—'}`,
    `Attempts: ${comparison.loop.attemptCount} recorded`,
    '',
    `Comparing: A -> ${comparison.a.attemptId} (${comparison.a.decision ?? 'unknown'})`,
    `           B -> ${comparison.b.attemptId} (${comparison.b.decision ?? 'unknown'})`,
    '',
    'Summary',
    `  Decision: A=${comparison.a.decision ?? '—'} | B=${comparison.b.decision ?? '—'}`,
    `  Score: A=${formatScore(comparison.a.score)} | B=${formatScore(comparison.b.score)} | Δ=${formatDelta(comparison.scoreDelta)}`,
    `  Run ID: A=${comparison.a.runId ?? '—'} | B=${comparison.b.runId ?? '—'}`,
    `  Evidence files: A=${comparison.a.evidenceRefs.length} | B=${comparison.b.evidenceRefs.length} | Δ=${evidenceDeltaText}`,
    ...(hasControlFields ? [
      `  Target metric: A=${attemptTargetMetric(comparison.a)} | B=${attemptTargetMetric(comparison.b)}`,
      `  Expected gain: A=${formatScore(comparison.a.repairHypothesis?.expectedGain ?? null)} | B=${formatScore(comparison.b.repairHypothesis?.expectedGain ?? null)}`,
      `  Actual delta: A=${formatScore(comparison.a.repairHypothesis?.actualDelta ?? null)} | B=${formatScore(comparison.b.repairHypothesis?.actualDelta ?? null)}`,
      `  Token cost: A=${formatInteger(comparison.a.usage?.totalTokens ?? null)} | B=${formatInteger(comparison.b.usage?.totalTokens ?? null)} | Δ=${formatTokenDelta(comparison.a.usage?.totalTokens ?? null, comparison.b.usage?.totalTokens ?? null)}`,
      `  Estimated USD: A=${formatUsd(comparison.a.usage?.estimatedUsd ?? null)} | B=${formatUsd(comparison.b.usage?.estimatedUsd ?? null)}`,
    ] : []),
    `  Evaluation present?: A=${comparison.evaluation.a.present ? 'yes' : 'no'} | B=${comparison.evaluation.b.present ? 'yes' : 'no'}`,
    `  Receipt present?: A=${comparison.a.adapterReceipts.length > 0 ? 'yes' : 'no'} | B=${comparison.b.adapterReceipts.length > 0 ? 'yes' : 'no'}`,
    '',
    'Rationale',
    `  A (${comparison.a.decision ?? 'unknown'}): ${comparison.a.rationale || '—'}`,
    `  B (${comparison.b.decision ?? 'unknown'}): ${comparison.b.rationale || '—'}`,
    ...(hasControlFields ? [
      '',
      'Repair hypotheses',
      `  A: ${attemptHypothesisLabel(comparison.a)}`,
      `  B: ${attemptHypothesisLabel(comparison.b)}`,
    ] : []),
    '',
    ...(comparison.acceptanceCriteria.rows.length > 0 ? [
      'Acceptance criteria delta',
      ...comparison.acceptanceCriteria.rows.map((row) => `  ${row.id}: A=${formatPlainCriterionStatus(row.aStatus)} | B=${formatPlainCriterionStatus(row.bStatus)}${criterionDeltaMarker(row.aStatus, row.bStatus)} — ${row.text}`),
      '',
    ] : []),
    'Evidence files',
    '  Only in A:',
    ...linesOrNone(comparison.evidence.onlyInA, '    '),
    '  Only in B:',
    ...linesOrNone(comparison.evidence.onlyInB, '    '),
    '  In both:',
    ...linesOrNone(comparison.evidence.inBoth, '    '),
    '',
    'Boundary differences',
    ...(comparison.boundaryDifferences.length > 0
      ? comparison.boundaryDifferences.map((diff) => `  ${diff.field}: A=${JSON.stringify(diff.a)} | B=${JSON.stringify(diff.b)}`)
      : ['  —']),
    '',
    'Frontier history',
    ...(comparison.frontierHistory.length > 0
      ? comparison.frontierHistory.map((item) => `  ${item.attemptId} -> ${item.decision ?? 'recorded'} (${formatScore(item.score)})${historyMarkers(item, comparison, currentAttemptId)}`)
      : ['  —']),
    '',
    'Use --format markdown --out <path> to export this comparison for a PR or review thread.',
  ];
  return `${lines.join('\n')}\n`;
}

function renderMarkdownComparison(comparison: Extract<EvolutionCompareResult, { kind: 'comparison' }>): string {
  const currentAttemptId = currentFrontierAttemptId(comparison);
  const evidenceDeltaLabel = comparison.evidence.onlyInB.length - comparison.evidence.onlyInA.length;
  const evidenceDeltaText = evidenceDeltaLabel === 0 ? '0' : `${evidenceDeltaLabel > 0 ? '+' : ''}${evidenceDeltaLabel}`;
  const hasControlFields = attemptHasControlFields(comparison.a) || attemptHasControlFields(comparison.b);
  const lines = [
    `# Evolution loop: ${comparison.loop.loopDir} — A vs B`,
    '',
    `**Comparing:** \`${comparison.a.attemptId}\` (${attemptLabel(comparison.a, currentAttemptId)}) → \`${comparison.b.attemptId}\` (${attemptLabel(comparison.b, currentAttemptId)})`,
    '',
    '| Field | A | B | Δ |',
    '|---|---|---|---|',
    `| Decision | ${comparison.a.decision ?? '—'} | ${comparison.b.decision ?? '—'} | ${comparison.a.decision === comparison.b.decision ? '—' : 'changed'} |`,
    `| Score | ${formatScore(comparison.a.score)} | ${formatScore(comparison.b.score)} | ${formatDelta(comparison.scoreDelta)} |`,
    `| Run ID | ${comparison.a.runId ?? '—'} | ${comparison.b.runId ?? '—'} | ${comparison.a.runId === comparison.b.runId ? '—' : 'changed'} |`,
    `| Evidence files | ${comparison.a.evidenceRefs.length} | ${comparison.b.evidenceRefs.length} | ${evidenceDeltaText} |`,
    `| Evaluation envelope | ${comparison.evaluation.a.present ? '✓' : '—'} | ${comparison.evaluation.b.present ? '✓' : '—'} | ${comparison.evaluation.a.present === comparison.evaluation.b.present ? '—' : 'changed'} |`,
    ...(hasControlFields ? [
      `| Repair hypothesis | ${escapeMarkdownTableCell(attemptHypothesisLabel(comparison.a))} | ${escapeMarkdownTableCell(attemptHypothesisLabel(comparison.b))} | ${attemptHypothesisLabel(comparison.a) === attemptHypothesisLabel(comparison.b) ? '—' : 'changed'} |`,
      `| Target metric | ${attemptTargetMetric(comparison.a)} | ${attemptTargetMetric(comparison.b)} | ${attemptTargetMetric(comparison.a) === attemptTargetMetric(comparison.b) ? '—' : 'changed'} |`,
      `| Expected gain | ${formatScore(comparison.a.repairHypothesis?.expectedGain ?? null)} | ${formatScore(comparison.b.repairHypothesis?.expectedGain ?? null)} | — |`,
      `| Actual delta | ${formatScore(comparison.a.repairHypothesis?.actualDelta ?? null)} | ${formatScore(comparison.b.repairHypothesis?.actualDelta ?? null)} | — |`,
      `| Token cost | ${formatInteger(comparison.a.usage?.totalTokens ?? null)} | ${formatInteger(comparison.b.usage?.totalTokens ?? null)} | ${formatTokenDelta(comparison.a.usage?.totalTokens ?? null, comparison.b.usage?.totalTokens ?? null)} |`,
      `| Estimated USD | ${formatUsd(comparison.a.usage?.estimatedUsd ?? null)} | ${formatUsd(comparison.b.usage?.estimatedUsd ?? null)} | — |`,
    ] : []),
    '',
    '## Rationale',
    '',
    `**A (${comparison.a.decision ?? 'recorded'}):** ${comparison.a.rationale || '—'}`,
    '',
    `**B (${comparison.b.decision ?? 'recorded'}):** ${comparison.b.rationale || '—'}`,
    '',
    ...(comparison.acceptanceCriteria.rows.length > 0 ? [
      '## Acceptance criteria delta',
      '',
      '| Criterion | A | B |',
      '|---|---|---|',
      ...comparison.acceptanceCriteria.rows.map((row) => {
        const criterion = `${row.id} — ${row.text}`;
        const marker = criterionDeltaMarker(row.aStatus, row.bStatus);
        return `| ${escapeMarkdownTableCell(criterion)} | ${formatCriterionStatus(row.aStatus)} | ${formatCriterionStatus(row.bStatus)}${marker} |`;
      }),
      '',
    ] : []),
    '## Evidence files',
    '',
    `- Only in A: ${comparison.evidence.onlyInA.length > 0 ? comparison.evidence.onlyInA.map((ref) => `\`${ref}\``).join(', ') : '—'}`,
    `- Only in B: ${comparison.evidence.onlyInB.length > 0 ? comparison.evidence.onlyInB.map((ref) => `\`${ref}\``).join(', ') : '—'}`,
    `- In both: ${comparison.evidence.inBoth.length > 0 ? comparison.evidence.inBoth.map((ref) => `\`${ref}\``).join(', ') : '—'}`,
    '',
    '## Frontier history',
    '',
    ...(comparison.frontierHistory.length > 0 ? comparison.frontierHistory.map((item) => `- \`${item.attemptId}\` → ${item.decision ?? 'recorded'} (${formatScore(item.score)})${historyMarkers(item, comparison, currentAttemptId)}`) : ['- —']),
  ];
  return `${lines.join('\n')}\n`;
}

export function renderEvolutionComparison(comparison: EvolutionCompareResult, format: EvolutionCompareFormat = 'terminal'): string {
  if (format === 'json') return `${JSON.stringify(comparison, null, 2)}\n`;
  if (comparison.kind === 'message') {
    if (format === 'markdown') return `> ${comparison.message}\n`;
    return `${comparison.message}\n`;
  }
  if (format === 'markdown') return renderMarkdownComparison(comparison);
  return renderTerminalComparison(comparison);
}

export type EvolutionAnalysisFormat = EvolutionCompareFormat;
export type EvolutionAnalysisRecommendationAction = 'continue' | 'stop' | 'redesign' | 'inspect_scorer';

type EvolutionPlateauStatus = 'insufficient_data' | 'improving' | 'stagnating' | 'plateau' | 'regressed';
type EvolutionCriterionSensitivity = 'observed_positive' | 'observed_negative' | 'none' | 'unknown';

interface EvolutionAnalysisCriterionSnapshot {
  id: string;
  text: string;
  status: string | null;
  reasons: string[];
  evidence: string[];
  impossible: boolean;
  sensitivityOverride: EvolutionCriterionSensitivity | null;
}

export interface EvolutionAnalysisDeltaRow {
  id: string;
  text: string;
  previousStatus?: string | null;
  frontierStatus?: string | null;
  currentStatus: string | null;
}

export interface EvolutionAnalysisCriterion {
  id: string;
  text: string;
  currentStatus: string | null;
  previousStatus: string | null;
  frontierStatus: string | null;
  sensitivity: EvolutionCriterionSensitivity;
  impossible: boolean;
  // 165: criterion is non-pass in every recorded attempt with no observed positive
  // delta — a zero-sensitivity signal that the requirement itself may be unsatisfiable.
  alwaysFailing: boolean;
  reasons: string[];
  evidence: string[];
}

export interface EvolutionNextActionPacket {
  schema: typeof EVOLUTION_NEXT_ACTION_PACKET_SCHEMA;
  loop: { loopDir: string; loopId: string | null; objective: string | null };
  recommendedAction: EvolutionAnalysisRecommendationAction;
  summary: string;
  reasons: string[];
  resumeFrom: {
    currentAttemptId: string | null;
    currentRunId: string | null;
    currentEvaluation: string | null;
    frontierAttemptId: string | null;
    frontierRunId: string | null;
  };
  plateau: {
    status: EvolutionPlateauStatus;
    noImprovementCount: number;
    currentScore: number | null;
    bestScore: number | null;
  };
  acceptance: {
    currentPass: number;
    currentTotal: number;
    remainingFailures: Array<{
      id: string;
      text: string;
      status: string | null;
      sensitivity: EvolutionCriterionSensitivity;
      impossible: boolean;
      alwaysFailing: boolean;
      reasons: string[];
      evidence: string[];
    }>;
  };
  currentAttemptControl: {
    repairHypothesis: EvolutionAttemptRepairHypothesis | null;
    usage: EvolutionAttemptUsageSummary | null;
    budgetWarning: string | null;
  };
  requiredNextFields: string[];
  handoffChecklist: string[];
  // 165: on a zero-sensitivity plateau, explicit prompts to question the
  // requirement itself (not only the scorer) for each always-failing criterion.
  requirementQuestions: string[];
  evidenceRefs: string[];
  boundaryNotes: string[];
}

export interface EvolutionControllerSignal {
  schema: typeof EVOLUTION_CONTROLLER_SIGNAL_SCHEMA;
  action: EvolutionAnalysisRecommendationAction;
  summary: string;
  reasons: string[];
  resume: {
    currentAttemptId: string | null;
    frontierAttemptId: string | null;
    currentEvaluation: string | null;
  };
  plateau: EvolutionNextActionPacket['plateau'];
  acceptance: {
    currentPass: number;
    currentTotal: number;
    remainingFailureIds: string[];
    remainingFailures: EvolutionNextActionPacket['acceptance']['remainingFailures'];
  };
  requiredNextFields: string[];
  // 165: zero-sensitivity question-the-requirement prompts, carried into the compact signal.
  requirementQuestions: string[];
  usageReceipt: {
    totalTokens: number | null;
    estimatedUsd: number | null;
    source: string | null;
    unavailableReason: string | null;
    completeness: {
      present: number;
      total: number;
      missing: string[];
      ratio: number;
    };
  };
  warnings: string[];
  evidenceRefs: string[];
  boundaryNotes: string[];
}

export type EvolutionJudgeAction = 'continue' | 'stop_impossible' | 'stop_blocked';

export interface EvolutionJudgeRuling {
  action: EvolutionJudgeAction;
  impossibleAcs?: string[];
  rationale?: string;
}

export interface EvolutionJudgmentCheckpoint {
  schema: typeof EVOLUTION_JUDGMENT_CHECKPOINT_SCHEMA;
  action: EvolutionAnalysisRecommendationAction;
  retryAuthorized: {
    allow: boolean;
    mode: 'normal' | 'proof_only' | 'closeout_only' | 'blocked_by_packet' | 'stop';
    reason: string;
  };
  packet: EvolutionControllerSignal;
  judge: {
    present: boolean;
    action: EvolutionJudgeAction | null;
    impossibleAcs: string[];
    rationale: string | null;
  };
  requiredBeforeRetry: string[];
  boundary: {
    judgment_checkpoint_only: true;
    does_not_execute_runtime: true;
    does_not_approve_work: true;
    human_owns_closeout_merge_publish_release: true;
  };
}

export interface EvolutionAnalysisResult {
  kind: 'analysis';
  loop: { loopDir: string; loopId: string | null; objective: string | null; strategy: string | null; attemptCount: number };
  plateau: { status: EvolutionPlateauStatus; threshold: number; noImprovementCount: number; currentScore: number | null; bestScore: number | null; bestAttemptId: string | null; fingerprintPlateau: boolean; scoreObserved: boolean };
  currentAttempt: { attemptId: string | null; runId: string | null; decision: string | null; score: number | null; evaluation: string | null; repairHypothesis: EvolutionAttemptRepairHypothesis | null; usage: EvolutionAttemptUsageSummary | null };
  previousAttempt: { attemptId: string | null; runId: string | null; decision: string | null; score: number | null; evaluation: string | null; repairHypothesis: EvolutionAttemptRepairHypothesis | null; usage: EvolutionAttemptUsageSummary | null };
  frontierAttempt: { attemptId: string | null; runId: string | null; decision: string | null; score: number | null; evaluation: string | null; repairHypothesis: EvolutionAttemptRepairHypothesis | null; usage: EvolutionAttemptUsageSummary | null };
  acceptanceSummary: { currentPass: number; currentTotal: number; frontierPass: number; frontierTotal: number; remainingFailures: string[] };
  criteria: EvolutionAnalysisCriterion[];
  currentVsPrevious: { present: boolean; previousAttemptId: string | null; currentAttemptId: string | null; rows: EvolutionAnalysisDeltaRow[] };
  currentVsFrontier: { present: boolean; frontierAttemptId: string | null; currentAttemptId: string | null; rows: EvolutionAnalysisDeltaRow[] };
  recommendation: { action: EvolutionAnalysisRecommendationAction; summary: string; reasons: string[] };
  nextActionPacket: EvolutionNextActionPacket;
  notes: string[];
}

export interface EvolutionAnalyzeOptions {
  plateauThreshold?: number;
}

export interface EvolutionAnalysisRenderOptions {
  compact?: boolean;
}

function normalizeReason(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (normalized === 'probe_only_criterion') return 'probe_only';
  if (normalized === 'hardcoded_pass_false' || normalized === 'pass_false' || normalized === 'hardcoded_non_pass') return 'hardcoded_non_pass';
  if (normalized === 'artifact_type' || normalized === 'current_artifact_type') return 'artifact_type_mismatch';
  return normalized || 'impossible';
}

function normalizeSensitivity(value: string | null): EvolutionCriterionSensitivity | null {
  if (!value) return null;
  const normalized = normalizeReason(value);
  if (['none', 'no', 'no_score_movement', 'no_score_sensitivity', 'zero', 'low', 'probe_only'].includes(normalized)) return 'none';
  if (['observed_positive', 'positive', 'score_moving', 'score_sensitive'].includes(normalized)) return 'observed_positive';
  if (['observed_negative', 'negative', 'inverse'].includes(normalized)) return 'observed_negative';
  if (normalized === 'unknown') return 'unknown';
  return null;
}

const BLOCKING_IMPOSSIBLE_REASONS = new Set(['probe_only', 'hardcoded_non_pass', 'skipped', 'stale', 'impossible', 'artifact_type_mismatch']);

function isAnalysisRefSafe(ref: string): boolean {
  const clean = ref.trim();
  if (/^file:/i.test(clean)) return false;
  if (/^https?:\/\//i.test(clean)) return true;
  const normalized = toPosix(clean).replace(/^\.\//, '');
  if (isAbsolute(clean) || win32.isAbsolute(clean) || normalized.startsWith('/') || normalized.startsWith('~')) return false;
  if (normalized.split('/').some((segment) => segment === '..')) return false;
  if (isPrivatePath(normalized)) return false;
  return true;
}

function addReasonFromText(text: string, reasons: Set<string>): void {
  const lower = text.toLowerCase();
  if (/probe[- ]only|probe only/.test(lower)) reasons.add('probe_only');
  if (/hardcoded[^\n.]*(pass\s*=\s*false|non[- ]pass|fail)|pass\s*=\s*false|pass-false|always fail/.test(lower)) reasons.add('hardcoded_non_pass');
  if (/\bskipped\b|\bskip-only\b/.test(lower)) reasons.add('skipped');
  if (/\bstale\b|out[- ]of[- ]date/.test(lower)) reasons.add('stale');
  if (/impossible|cannot pass|can't pass|no attempt can|unreachable/.test(lower)) reasons.add('impossible');
  if (/current artifact type|artifact type mismatch|headless json driver/.test(lower)) reasons.add('artifact_type_mismatch');
}

function collectEvidenceRefsFromCriterion(criterion: Record<string, unknown>, analysis: Record<string, unknown>): string[] {
  const refs = [
    asString(analysis.source),
    asString(analysis.evidence_source),
    asString(analysis.ref),
    asString(criterion.source),
  ];
  const evaluator = isRecord(criterion.evaluator) ? criterion.evaluator : null;
  refs.push(evaluator ? asString(evaluator.ref) : null);
  const evidence = Array.isArray(criterion.evidence) ? criterion.evidence.filter(isRecord) : [];
  for (const item of evidence) refs.push(asString(item.ref));
  return uniqueRefs(refs.filter((ref): ref is string => Boolean(ref && ref.trim() && isAnalysisRefSafe(ref))));
}

function localAnalysisRef(root: string, ref: string): { path: string; ref: string } | null {
  if (/^[a-z]+:\/\//i.test(ref)) return null;
  if (ref.startsWith('~')) return null;
  const realRoot = rootRealpath(root);
  if (isAbsolute(ref) || win32.isAbsolute(ref)) {
    const absolute = resolve(ref);
    const comparablePath = existsSync(absolute) ? realpathSync(absolute) : absolute;
    if (!isInsideRoot(realRoot, comparablePath)) return null;
    const rel = toPosix(relative(realRoot, comparablePath));
    if (isPrivatePath(rel)) return null;
    return { path: comparablePath, ref: rel };
  }
  if (!isAnalysisRefSafe(ref)) return null;
  const safeRef = toPosix(ref).replace(/^\.\//, '');
  const absolute = resolve(realRoot, safeRef);
  const comparablePath = existsSync(absolute) ? realpathSync(absolute) : absolute;
  if (!isInsideRoot(realRoot, comparablePath)) return null;
  const rel = existsSync(absolute) ? toPosix(relative(realRoot, comparablePath)) : safeRef;
  if (isPrivatePath(rel)) return null;
  return { path: comparablePath, ref: rel };
}

function analysisEvaluationPath(root: string, evaluationRef: string): string | null {
  return localAnalysisRef(root, evaluationRef)?.path ?? null;
}

function safeAnalysisOutputRef(root: string, ref: string): string | null {
  if (/^https?:\/\//i.test(ref)) return ref;
  return localAnalysisRef(root, ref)?.ref ?? null;
}

function metadataForCriterion(criterion: Record<string, unknown>): { impossible: boolean; reasons: string[]; evidence: string[]; sensitivityOverride: EvolutionCriterionSensitivity | null } {
  const analysis = isRecord(criterion.analysis) ? criterion.analysis : {};
  const reasons = new Set<string>();
  for (const value of [analysis.reason, criterion.reason]) {
    if (typeof value === 'string') reasons.add(normalizeReason(value));
  }
  for (const value of [analysis.reasons, criterion.reasons]) {
    for (const reason of asStringArray(value)) reasons.add(normalizeReason(reason));
  }
  if (asBoolean(analysis.impossible) === true || asBoolean(criterion.impossible) === true) reasons.add('impossible');
  if (asBoolean(analysis.probe_only) === true || asBoolean(criterion.probe_only) === true) reasons.add('probe_only');
  if (asBoolean(analysis.hardcoded_non_pass) === true || asBoolean(criterion.hardcoded_non_pass) === true) reasons.add('hardcoded_non_pass');
  if (asBoolean(analysis.skipped) === true || asBoolean(criterion.skipped) === true) reasons.add('skipped');
  if (asBoolean(analysis.stale) === true || asBoolean(criterion.stale) === true) reasons.add('stale');

  const evidence = Array.isArray(criterion.evidence) ? criterion.evidence.filter(isRecord) : [];
  const textParts = [
    asString(criterion.rationale),
    asString(analysis.rationale),
    asString(analysis.notes),
    ...asStringArray(criterion.gaps),
    ...asStringArray(analysis.gaps),
    ...evidence.map((item) => asString(item.summary)),
  ].filter((value): value is string => Boolean(value));
  addReasonFromText(textParts.join('\n'), reasons);

  const sensitivityOverride = normalizeSensitivity(asString(analysis.score_sensitivity) ?? asString(criterion.score_sensitivity) ?? asString(analysis.sensitivity) ?? asString(criterion.sensitivity));
  const impossible = asBoolean(analysis.impossible) === true
    || asBoolean(criterion.impossible) === true
    || [...reasons].some((reason) => BLOCKING_IMPOSSIBLE_REASONS.has(reason));
  return {
    impossible,
    reasons: [...reasons].sort(),
    evidence: collectEvidenceRefsFromCriterion(criterion, analysis),
    sensitivityOverride,
  };
}

function readEvaluationCriteriaForAnalysis(root: string, evaluationRef: string | null): EvolutionAnalysisCriterionSnapshot[] {
  if (!evaluationRef) return [];
  const evaluationPath = analysisEvaluationPath(root, evaluationRef);
  if (!evaluationPath) return [];
  try {
    const parsed = readJson(evaluationPath);
    if (!isRecord(parsed) || parsed.schema !== EVALUATION_SCHEMA) return [];
    const criteria = Array.isArray(parsed.acceptance_criteria) ? parsed.acceptance_criteria.filter(isRecord) : [];
    return criteria.map((criterion, index) => {
      const metadata = metadataForCriterion(criterion);
      const id = asString(criterion.id) ?? `AC${index + 1}`;
      return {
        id,
        text: asString(criterion.text) ?? id,
        status: asString(criterion.status),
        reasons: metadata.reasons,
        evidence: metadata.evidence,
        impossible: metadata.impossible,
        sensitivityOverride: metadata.sensitivityOverride,
      };
    });
  } catch {
    return [];
  }
}

function criterionStatusRank(status: string | null): number {
  switch (status) {
    case 'pass':
      return 4;
    case 'partial':
      return 3;
    case 'blocked':
      return 2;
    case 'fail':
      return 1;
    case 'not_evaluated':
      return 0;
    default:
      return -1;
  }
}

// 165: per-AC pass/fail fingerprint for one attempt, derived from its linked
// evaluation criteria states (pass vs non-pass). Used to detect plateaus from
// AC states alone when score telemetry is absent. Null when no criteria are linked.
function attemptAcFingerprint(criteria: Map<string, EvolutionAnalysisCriterionSnapshot> | undefined): string | null {
  if (!criteria || criteria.size === 0) return null;
  const entries = [...criteria.values()]
    .map((snapshot) => `${snapshot.id}=${snapshot.status === 'pass' ? 'pass' : 'fail'}`)
    .sort();
  return entries.join('|');
}

// 165: length of the trailing run of consecutive attempts (ending at the most
// recent) that share the current attempt's non-null AC fingerprint.
function trailingFingerprintRun(fingerprints: Array<string | null>): number {
  const current = fingerprints.at(-1);
  if (!current) return 0;
  let run = 0;
  for (let index = fingerprints.length - 1; index >= 0; index -= 1) {
    if (fingerprints[index] === current) run += 1;
    else break;
  }
  return run;
}

// 165: criterion ids that are non-pass in every attempt that evaluated them and
// were evaluated in at least one attempt — the "failing in every attempt" set
// behind the zero-sensitivity question-the-requirement signal.
function alwaysFailingCriterionIds(ids: string[], criteriaByAttempt: Map<string, Map<string, EvolutionAnalysisCriterionSnapshot>>): Set<string> {
  const result = new Set<string>();
  const maps = [...criteriaByAttempt.values()];
  if (maps.length === 0) return result;
  for (const id of ids) {
    const seen = maps.map((map) => map.get(id)).filter((snapshot): snapshot is EvolutionAnalysisCriterionSnapshot => Boolean(snapshot));
    if (seen.length === 0) continue;
    if (seen.every((snapshot) => snapshot.status !== 'pass')) result.add(id);
  }
  return result;
}

function analyzePlateau(attempts: EvolutionCompareAttempt[], threshold: number, fingerprints: Array<string | null> = []) {
  // 165: a stable AC-state fingerprint across >=3 consecutive attempts is a
  // plateau even when score/target_metric/actual_delta are all absent.
  const fingerprintPlateau = trailingFingerprintRun(fingerprints) >= 3;
  const scored = attempts.filter((attempt) => attempt.score !== null);
  const scoreObserved = scored.length > 0;
  if (scored.length < 2) {
    const status: EvolutionPlateauStatus = fingerprintPlateau ? 'plateau' : 'insufficient_data';
    const noImprovementCount = fingerprintPlateau ? Math.max(0, trailingFingerprintRun(fingerprints) - 1) : 0;
    return { status, threshold, noImprovementCount, currentScore: scored.at(-1)?.score ?? null, bestScore: scored.at(-1)?.score ?? null, bestAttemptId: scored.at(-1)?.attemptId ?? null, fingerprintPlateau, scoreObserved };
  }
  let bestScore = scored[0].score ?? null;
  let bestAttemptId = scored[0].attemptId;
  let lastImprovementIndex = 0;
  const epsilon = 1e-9;
  for (let index = 1; index < scored.length; index += 1) {
    const score = scored[index].score;
    if (score !== null && bestScore !== null && score > bestScore + epsilon) {
      bestScore = score;
      bestAttemptId = scored[index].attemptId;
      lastImprovementIndex = index;
    }
  }
  const currentScore = scored[scored.length - 1].score;
  let noImprovementCount = Math.max(0, scored.length - lastImprovementIndex - 1);
  let status: EvolutionPlateauStatus = 'improving';
  if (currentScore !== null && bestScore !== null && currentScore < bestScore - epsilon) status = 'regressed';
  else if (noImprovementCount >= threshold) status = 'plateau';
  else if (noImprovementCount > 0) status = 'stagnating';
  // 165: a stable AC-state fingerprint across >=3 consecutive attempts escalates
  // a non-regressed score path to plateau, so frozen criteria are reported even
  // when the score wobbles below the threshold.
  if (fingerprintPlateau && status !== 'regressed' && status !== 'plateau') {
    status = 'plateau';
    noImprovementCount = Math.max(noImprovementCount, trailingFingerprintRun(fingerprints) - 1);
  }
  return { status, threshold, noImprovementCount, currentScore, bestScore, bestAttemptId, fingerprintPlateau, scoreObserved };
}

function snapshotById(snapshots: EvolutionAnalysisCriterionSnapshot[]): Map<string, EvolutionAnalysisCriterionSnapshot> {
  return new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
}

function buildCurrentPreviousRows(ids: string[], textById: Map<string, string>, previous: Map<string, EvolutionAnalysisCriterionSnapshot>, current: Map<string, EvolutionAnalysisCriterionSnapshot>): EvolutionAnalysisDeltaRow[] {
  return ids.map((id) => ({
    id,
    text: textById.get(id) ?? id,
    previousStatus: previous.get(id)?.status ?? null,
    currentStatus: current.get(id)?.status ?? null,
  }));
}

function buildCurrentFrontierRows(ids: string[], textById: Map<string, string>, frontier: Map<string, EvolutionAnalysisCriterionSnapshot>, current: Map<string, EvolutionAnalysisCriterionSnapshot>): EvolutionAnalysisDeltaRow[] {
  return ids.map((id) => ({
    id,
    text: textById.get(id) ?? id,
    frontierStatus: frontier.get(id)?.status ?? null,
    currentStatus: current.get(id)?.status ?? null,
  }));
}

function countPassing(snapshots: EvolutionAnalysisCriterionSnapshot[]): { pass: number; total: number; remainingFailures: string[] } {
  return {
    pass: snapshots.filter((snapshot) => snapshot.status === 'pass').length,
    total: snapshots.length,
    remainingFailures: snapshots.filter((snapshot) => snapshot.status !== 'pass').map((snapshot) => snapshot.id),
  };
}

function inferObservedSensitivity(id: string, attempts: EvolutionCompareAttempt[], criteriaByAttempt: Map<string, Map<string, EvolutionAnalysisCriterionSnapshot>>): EvolutionCriterionSensitivity | null {
  let observedPositive = false;
  let observedNegative = false;
  for (let index = 1; index < attempts.length; index += 1) {
    const previous = attempts[index - 1];
    const current = attempts[index];
    if (previous.score === null || current.score === null) continue;
    const previousStatus = criteriaByAttempt.get(previous.attemptId)?.get(id)?.status ?? null;
    const currentStatus = criteriaByAttempt.get(current.attemptId)?.get(id)?.status ?? null;
    if (previousStatus === currentStatus) continue;
    const scoreDelta = current.score - previous.score;
    const statusDelta = criterionStatusRank(currentStatus) - criterionStatusRank(previousStatus);
    if (Math.abs(scoreDelta) < 1e-9 || statusDelta === 0) continue;
    if ((scoreDelta > 0 && statusDelta > 0) || (scoreDelta < 0 && statusDelta < 0)) observedPositive = true;
    if ((scoreDelta > 0 && statusDelta < 0) || (scoreDelta < 0 && statusDelta > 0)) observedNegative = true;
  }
  if (observedPositive) return 'observed_positive';
  if (observedNegative) return 'observed_negative';
  return null;
}

function attemptSummary(root: string, attempt: EvolutionCompareAttempt | null) {
  return {
    attemptId: attempt?.attemptId ?? null,
    runId: attempt?.runId ?? null,
    decision: attempt?.decision ?? null,
    score: attempt?.score ?? null,
    evaluation: attempt?.evaluation ? safeAnalysisOutputRef(root, attempt.evaluation) : null,
    repairHypothesis: attempt?.repairHypothesis ?? null,
    usage: attempt?.usage ?? null,
  };
}

function isNoOpRetryAttempt(attempt: EvolutionAnalysisResult['currentAttempt']): boolean {
  return attempt.decision === 'retry' && attempt.repairHypothesis?.actualDelta === 0;
}

function recommendAnalysis(plateau: EvolutionAnalysisResult['plateau'], criteria: EvolutionAnalysisCriterion[], currentTotal: number, currentAttempt: EvolutionAnalysisResult['currentAttempt']): EvolutionAnalysisResult['recommendation'] {
  if (currentTotal === 0) {
    return { action: 'inspect_scorer', summary: 'No current acceptance-criteria evidence is available; inspect the scorer or evaluation envelope before retrying.', reasons: ['no_current_acceptance_criteria'] };
  }
  const missingCurrent = criteria.filter((criterion) => criterion.currentStatus === null && (criterion.previousStatus !== null || criterion.frontierStatus !== null));
  const remaining = criteria.filter((criterion) => criterion.currentStatus !== null && criterion.currentStatus !== 'pass');
  if (remaining.length === 0) {
    if (missingCurrent.length > 0) {
      return { action: 'inspect_scorer', summary: 'Current evaluation omits criteria seen in earlier attempts; inspect the scorer or evaluation envelope before stopping.', reasons: ['missing_current_acceptance_criteria'] };
    }
    return { action: 'stop', summary: 'Current evaluation has all criteria passing; stop retrying and route to human approval/closeout.', reasons: ['all_current_criteria_pass'] };
  }
  const plateaued = plateau.status === 'plateau' || plateau.status === 'stagnating';
  const remainingNonMoving = remaining.every((criterion) => criterion.impossible || criterion.sensitivity === 'none');
  if (plateaued && missingCurrent.length === 0 && remainingNonMoving) {
    return {
      action: 'redesign',
      summary: `Plateaued with ${remaining.length} remaining failing criteria that are impossible or not moving the score; redesign the criterion, scorer, artifact shape, or benchmark instead of retrying.`,
      reasons: ['plateau', 'remaining_failures_non_score_moving'],
    };
  }
  // 165: zero-sensitivity plateau — criteria failing in every attempt with no
  // observed delta, with or without score signals (plan 165 AC3: a coordinator
  // recording scores must still get the question-the-requirement prompt). The
  // requirement itself may be unsatisfiable, so recommend redesign and question it.
  // A reason outside the blocking set (e.g. missing_tests) is reachability
  // evidence: the failure is actionable, so inspect/fix instead of questioning
  // the requirement.
  const alwaysFailing = remaining.filter((criterion) => criterion.alwaysFailing &&
    !criterion.reasons.some((reason) => !BLOCKING_IMPOSSIBLE_REASONS.has(reason)));
  if (plateau.status === 'plateau' && plateau.fingerprintPlateau && missingCurrent.length === 0 && alwaysFailing.length > 0) {
    const ids = alwaysFailing.map((criterion) => criterion.id).join(', ');
    return {
      action: 'redesign',
      summary: `Plateaued with ${alwaysFailing.length} remaining failing criteria (${ids}) that failed in every attempt with no observed delta; the requirement itself may be unsatisfiable — question and redesign the criterion before another retry instead of only inspecting the scorer.`,
      reasons: ['plateau', 'zero_sensitivity_plateau', 'question_the_requirement'],
    };
  }
  if (plateaued) {
    return { action: 'inspect_scorer', summary: 'Scores have stopped improving while failures remain; inspect scorer sensitivity and evaluation evidence before another attempt.', reasons: ['plateau', 'remaining_failures'] };
  }
  if (plateau.status === 'regressed') {
    return { action: 'inspect_scorer', summary: 'Latest score is below the best recorded score; inspect scorer/evidence before continuing.', reasons: ['score_regressed'] };
  }
  if (remaining.length > 0 && isNoOpRetryAttempt(currentAttempt)) {
    return {
      action: 'inspect_scorer',
      summary: 'The current retry reported actual delta 0 while criteria still fail; inspect the scorer/evidence or change the repair hypothesis before another attempt.',
      reasons: ['no_op_retry', 'remaining_failures'],
    };
  }
  return { action: 'continue', summary: 'Score or acceptance-criteria evidence is still moving; one more bounded attempt may be useful.', reasons: ['still_moving'] };
}

function requiredNextFieldsForAction(action: EvolutionAnalysisRecommendationAction): string[] {
  switch (action) {
    case 'stop':
      return [
        'human_approval_or_closeout_decision',
        'closeout_verification_evidence',
        'next_slice_or_done_routing',
      ];
    case 'redesign':
      return [
        'redesigned_criterion_scorer_or_artifact_shape',
        'measurable_repair_hypothesis_before_retry',
        'target_metric',
        'expected_gain',
        'usage_receipt_or_unavailable_reason',
      ];
    case 'inspect_scorer':
      return [
        'current_evaluation_or_scorer_inspection',
        'score_sensitivity_or_impossibility_metadata',
        'measurable_repair_hypothesis_before_retry',
        'usage_receipt_or_unavailable_reason',
      ];
    case 'continue':
      return [
        'measurable_repair_hypothesis',
        'target_metric',
        'expected_gain',
        'next_evaluation_envelope',
        'usage_receipt_or_unavailable_reason',
      ];
  }
}

function budgetWarningForAttempt(attempt: EvolutionAnalysisResult['currentAttempt'], action: EvolutionAnalysisRecommendationAction): string | null {
  const tokens = attempt.usage?.totalTokens ?? null;
  if (tokens === null) return null;
  const actualDelta = attempt.repairHypothesis?.actualDelta ?? null;
  if ((action === 'redesign' || action === 'inspect_scorer') && actualDelta === 0) {
    return `Last recorded attempt spent ${formatInteger(tokens)} token(s) for actual delta 0; do not spend another retry without new measurable control evidence.`;
  }
  if (action === 'continue') return `Record whether the next attempt beats the current ${formatInteger(tokens)} token cost for the target metric.`;
  return null;
}

function handoffChecklistForAction(action: EvolutionAnalysisRecommendationAction, remainingFailures: EvolutionNextActionPacket['acceptance']['remainingFailures']): string[] {
  const remaining = remainingFailures.length > 0 ? `Carry forward remaining failing criteria: ${remainingFailures.map((criterion) => criterion.id).join(', ')}.` : 'No current failing criteria are recorded.';
  switch (action) {
    case 'stop':
      return [
        'Stop retrying this loop unless a human rejects closeout evidence.',
        'Route to human approval/closeout; frontier score is not acceptance approval.',
        remaining,
      ];
    case 'redesign':
      return [
        'Do not record another blind retry against the same criterion/scorer/artifact shape.',
        'Create or amend the next slice around the redesign before spending another attempt.',
        remaining,
      ];
    case 'inspect_scorer':
      return [
        'Inspect scorer/evaluation coverage before recording another attempt.',
        'Add explicit score-sensitivity, stale, skipped, probe-only, or impossible metadata where evidence supports it.',
        remaining,
      ];
    case 'continue':
      return [
        'Run at most one bounded next attempt unless fresh evidence changes the stop condition.',
        'Record repair hypothesis, target metric, expected gain, actual delta, and usage receipt.',
        remaining,
      ];
  }
}

function buildNextActionPacket(
  root: string,
  loop: EvolutionAnalysisResult['loop'],
  plateau: EvolutionAnalysisResult['plateau'],
  currentAttempt: EvolutionAnalysisResult['currentAttempt'],
  frontierAttempt: EvolutionAnalysisResult['frontierAttempt'],
  acceptanceSummary: EvolutionAnalysisResult['acceptanceSummary'],
  criteria: EvolutionAnalysisCriterion[],
  recommendation: EvolutionAnalysisResult['recommendation'],
): EvolutionNextActionPacket {
  const remainingFailures = criteria
    .filter((criterion) => criterion.currentStatus !== 'pass')
    .map((criterion) => ({
      id: criterion.id,
      text: criterion.text,
      status: criterion.currentStatus ?? 'missing_current',
      sensitivity: criterion.sensitivity,
      impossible: criterion.impossible,
      alwaysFailing: criterion.alwaysFailing,
      reasons: criterion.reasons,
      evidence: criterion.evidence,
    }));
  // 165: on a zero-sensitivity plateau (recommendation carries the
  // question_the_requirement reason), name each always-failing criterion with
  // explicit requirement-questioning language so the coordinator questions the
  // requirement itself, not only the scorer.
  const requirementQuestions = recommendation.reasons.includes('question_the_requirement')
    ? remainingFailures
        .filter((criterion) => criterion.alwaysFailing)
        .map((criterion) => `${criterion.id} failed in every attempt with no observed delta — the requirement itself may be unsatisfiable; question whether "${criterion.text}" is the right requirement and redesign or drop it before another retry.`)
    : [];
  const evidenceRefs = uniqueRefs([
    currentAttempt.evaluation,
    ...remainingFailures.flatMap((criterion) => criterion.evidence),
  ].flatMap((ref) => {
    if (!ref || !ref.trim()) return [];
    const safe = safeAnalysisOutputRef(root, ref);
    return safe ? [safe] : [];
  }));
  return {
    schema: EVOLUTION_NEXT_ACTION_PACKET_SCHEMA,
    loop: {
      loopDir: loop.loopDir,
      loopId: loop.loopId,
      objective: loop.objective,
    },
    recommendedAction: recommendation.action,
    summary: recommendation.summary,
    reasons: recommendation.reasons,
    resumeFrom: {
      currentAttemptId: currentAttempt.attemptId,
      currentRunId: currentAttempt.runId,
      currentEvaluation: currentAttempt.evaluation,
      frontierAttemptId: frontierAttempt.attemptId,
      frontierRunId: frontierAttempt.runId,
    },
    plateau: {
      status: plateau.status,
      noImprovementCount: plateau.noImprovementCount,
      currentScore: plateau.currentScore,
      bestScore: plateau.bestScore,
    },
    acceptance: {
      currentPass: acceptanceSummary.currentPass,
      currentTotal: acceptanceSummary.currentTotal,
      remainingFailures,
    },
    currentAttemptControl: {
      repairHypothesis: currentAttempt.repairHypothesis,
      usage: currentAttempt.usage,
      budgetWarning: budgetWarningForAttempt(currentAttempt, recommendation.action),
    },
    requiredNextFields: requiredNextFieldsForAction(recommendation.action),
    handoffChecklist: handoffChecklistForAction(recommendation.action, remainingFailures),
    requirementQuestions,
    evidenceRefs,
    boundaryNotes: [
      'This packet is handoff/decision support only; it does not spawn runtimes or execute the next attempt.',
      'It is not benchmark support, model ranking, correctness certification, or acceptance approval.',
    ],
  };
}

export function analyzeEvolutionLoop(loopDir: string, options: EvolutionAnalyzeOptions = {}, root = process.cwd()): EvolutionAnalysisResult {
  const absoluteLoopDir = isAbsolute(loopDir) ? loopDir : resolve(root, loopDir);
  const analysisRoot = findScaffoldRoot(absoluteLoopDir) ?? inferScaffoldRootFromLoopDir(absoluteLoopDir) ?? root;
  const loopPath = join(absoluteLoopDir, 'loop.json');
  const attemptsPath = join(absoluteLoopDir, 'attempts.jsonl');
  const frontierPath = join(absoluteLoopDir, 'frontier.json');
  const loop = readJson(loopPath);
  if (!isRecord(loop) || loop.schema !== EVOLUTION_LOOP_SCHEMA) {
    throw new Error(`Evolution loop must declare schema: ${EVOLUTION_LOOP_SCHEMA}`);
  }
  const frontier = readJson(frontierPath);
  if (!isRecord(frontier) || frontier.schema !== EVOLUTION_FRONTIER_SCHEMA) {
    throw new Error(`Evolution frontier must declare schema: ${EVOLUTION_FRONTIER_SCHEMA}`);
  }
  const attempts = normalizeCompareAttempts(attemptsPath);
  const strategy = isRecord(loop.strategy) ? asString(loop.strategy.name) : null;
  const loopInfo = {
    loopDir: basename(absoluteLoopDir),
    loopId: asString(loop.loop_id),
    objective: asString(loop.objective),
    strategy,
    attemptCount: attempts.length,
  };
  const currentAttempt = attempts.at(-1) ?? null;
  const previousAttempt = attempts.length > 1 ? attempts[attempts.length - 2] : null;
  const frontierIds = frontierAttemptIds(frontier);
  const frontierAttempt = frontierIds.current ? attempts.find((attempt) => attempt.attemptId === frontierIds.current) ?? null : null;
  const criteriaByAttempt = new Map<string, Map<string, EvolutionAnalysisCriterionSnapshot>>();
  const textById = new Map<string, string>();
  for (const attempt of attempts) {
    const snapshots = readEvaluationCriteriaForAnalysis(analysisRoot, attempt.evaluation);
    const mapped = snapshotById(snapshots);
    criteriaByAttempt.set(attempt.attemptId, mapped);
    for (const snapshot of snapshots) {
      if (!textById.has(snapshot.id) || snapshot.text !== snapshot.id) textById.set(snapshot.id, snapshot.text);
    }
  }
  const currentMap = currentAttempt ? criteriaByAttempt.get(currentAttempt.attemptId) ?? new Map() : new Map<string, EvolutionAnalysisCriterionSnapshot>();
  const previousMap = previousAttempt ? criteriaByAttempt.get(previousAttempt.attemptId) ?? new Map() : new Map<string, EvolutionAnalysisCriterionSnapshot>();
  const frontierMap = frontierAttempt ? criteriaByAttempt.get(frontierAttempt.attemptId) ?? new Map() : new Map<string, EvolutionAnalysisCriterionSnapshot>();
  const ids = [...new Set([...textById.keys(), ...currentMap.keys(), ...previousMap.keys(), ...frontierMap.keys()])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  // 165: per-attempt AC fingerprints (attempt order) feed plateau detection so a
  // frozen pass/fail pattern reports a plateau even without score telemetry.
  const fingerprints = attempts.map((attempt) => attemptAcFingerprint(criteriaByAttempt.get(attempt.attemptId)));
  const plateau = analyzePlateau(attempts, Math.max(1, options.plateauThreshold ?? 2), fingerprints);
  const alwaysFailingIds = alwaysFailingCriterionIds(ids, criteriaByAttempt);
  const criteria = ids.map((id) => {
    const current = currentMap.get(id);
    const previous = previousMap.get(id);
    const frontierSnapshot = frontierMap.get(id);
    const currentMetadataSources = current ? [current] : [];
    const impossible = current?.impossible ?? false;
    const reasons = uniqueRefs(currentMetadataSources.flatMap((snapshot) => snapshot.reasons)).sort();
    const evidence = uniqueRefs(currentMetadataSources.flatMap((snapshot) => snapshot.evidence));
    const sensitivityOverride = current?.sensitivityOverride ?? null;
    const observed = inferObservedSensitivity(id, attempts, criteriaByAttempt);
    const sensitivity = sensitivityOverride ?? (impossible ? 'none' : observed ?? 'unknown');
    return {
      id,
      text: textById.get(id) ?? id,
      currentStatus: current?.status ?? null,
      previousStatus: previous?.status ?? null,
      frontierStatus: frontierSnapshot?.status ?? null,
      sensitivity,
      impossible,
      // 165: zero-sensitivity signal — failed in every attempt and never showed a
      // positive delta, so the requirement itself is a candidate to question.
      alwaysFailing: alwaysFailingIds.has(id) && sensitivity !== 'observed_positive',
      reasons,
      evidence,
    };
  });
  const currentCounts = countPassing([...currentMap.values()]);
  const frontierCounts = countPassing([...frontierMap.values()]);
  const acceptanceSummary = {
    currentPass: currentCounts.pass,
    currentTotal: currentCounts.total,
    frontierPass: frontierCounts.pass,
    frontierTotal: frontierCounts.total,
    remainingFailures: currentCounts.remainingFailures,
  };
  const currentAttemptResult = attemptSummary(analysisRoot, currentAttempt);
  const previousAttemptResult = attemptSummary(analysisRoot, previousAttempt);
  const frontierAttemptResult = attemptSummary(analysisRoot, frontierAttempt);
  const recommendation = recommendAnalysis(plateau, criteria, currentCounts.total, currentAttemptResult);
  const nextActionPacket = buildNextActionPacket(analysisRoot, loopInfo, plateau, currentAttemptResult, frontierAttemptResult, acceptanceSummary, criteria, recommendation);
  return {
    kind: 'analysis',
    loop: loopInfo,
    plateau,
    currentAttempt: currentAttemptResult,
    previousAttempt: previousAttemptResult,
    frontierAttempt: frontierAttemptResult,
    acceptanceSummary,
    criteria,
    currentVsPrevious: {
      present: Boolean(currentAttempt && previousAttempt),
      previousAttemptId: previousAttempt?.attemptId ?? null,
      currentAttemptId: currentAttempt?.attemptId ?? null,
      rows: buildCurrentPreviousRows(ids, textById, previousMap, currentMap),
    },
    currentVsFrontier: {
      present: Boolean(currentAttempt && frontierAttempt),
      frontierAttemptId: frontierAttempt?.attemptId ?? null,
      currentAttemptId: currentAttempt?.attemptId ?? null,
      rows: buildCurrentFrontierRows(ids, textById, frontierMap, currentMap),
    },
    recommendation,
    nextActionPacket,
    notes: [
      'This analysis is read-only and does not spawn runtimes, rerun benchmarks, mutate loop state, rank models, or approve work.',
      'Score-frontier promotion is not acceptance approval; use human/maintainer review for closeout decisions.',
    ],
  };
}

function impossibleLabel(criterion: EvolutionAnalysisCriterion): string {
  if (!criterion.impossible) return '—';
  if (criterion.reasons.length === 0) return 'yes';
  const priority = ['probe_only', 'hardcoded_non_pass', 'skipped', 'stale', 'artifact_type_mismatch', 'impossible'];
  const ordered = [
    ...priority.filter((reason) => criterion.reasons.includes(reason)),
    ...criterion.reasons.filter((reason) => !priority.includes(reason)),
  ];
  return ordered.join(',');
}

function bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function roundRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(6));
}

function usageCompleteness(usage: EvolutionAttemptUsageSummary | null): EvolutionControllerSignal['usageReceipt']['completeness'] {
  const missing: string[] = [];
  if (usage?.totalTokens === null || usage?.totalTokens === undefined) missing.push('total_tokens');
  if (usage?.estimatedUsd === null || usage?.estimatedUsd === undefined) missing.push('estimated_usd');
  if (!meaningfulString(usage?.source) && !meaningfulString(usage?.unavailableReason)) missing.push('source_or_unavailable_reason');
  const total = 3;
  const present = total - missing.length;
  return { present, total, missing, ratio: roundRatio(present / total) };
}

function evidenceBudgetWarning(packet: EvolutionNextActionPacket): string | null {
  const evidenceBytes = bytes(packet.evidenceRefs.join('\n'));
  if (packet.evidenceRefs.length > 5) return `Evidence packet carries ${packet.evidenceRefs.length} refs; compact before handoff if the next context is small.`;
  if (evidenceBytes > 512) return `Evidence refs use ${evidenceBytes} byte(s); pass refs/digests rather than raw evidence text.`;
  return null;
}

export function buildEvolutionControllerSignal(analysis: EvolutionAnalysisResult): EvolutionControllerSignal {
  const packet = analysis.nextActionPacket;
  const usage = packet.currentAttemptControl.usage;
  const warnings = [
    packet.currentAttemptControl.budgetWarning,
    evidenceBudgetWarning(packet),
    ...(usageCompleteness(usage).missing.length > 0 ? [`Usage receipt incomplete: missing ${usageCompleteness(usage).missing.join(', ')}.`] : []),
  ].filter((warning): warning is string => Boolean(warning));
  return {
    schema: EVOLUTION_CONTROLLER_SIGNAL_SCHEMA,
    action: packet.recommendedAction,
    summary: packet.summary,
    reasons: packet.reasons,
    resume: {
      currentAttemptId: packet.resumeFrom.currentAttemptId,
      frontierAttemptId: packet.resumeFrom.frontierAttemptId,
      currentEvaluation: packet.resumeFrom.currentEvaluation,
    },
    plateau: packet.plateau,
    acceptance: {
      currentPass: packet.acceptance.currentPass,
      currentTotal: packet.acceptance.currentTotal,
      remainingFailureIds: packet.acceptance.remainingFailures.map((criterion) => criterion.id),
      remainingFailures: packet.acceptance.remainingFailures,
    },
    requiredNextFields: packet.requiredNextFields,
    requirementQuestions: packet.requirementQuestions,
    usageReceipt: {
      totalTokens: usage?.totalTokens ?? null,
      estimatedUsd: usage?.estimatedUsd ?? null,
      source: usage?.source ?? null,
      unavailableReason: usage?.unavailableReason ?? null,
      completeness: usageCompleteness(usage),
    },
    warnings,
    evidenceRefs: packet.evidenceRefs,
    boundaryNotes: packet.boundaryNotes,
  };
}

export function buildEvolutionJudgmentCheckpoint(analysis: EvolutionAnalysisResult, judge?: EvolutionJudgeRuling | null): EvolutionJudgmentCheckpoint {
  const packet = buildEvolutionControllerSignal(analysis);
  const judgeAction = judge?.action ?? null;
  let retryAuthorized: EvolutionJudgmentCheckpoint['retryAuthorized'];
  if (judgeAction === 'stop_impossible' || judgeAction === 'stop_blocked') {
    retryAuthorized = {
      allow: false,
      mode: 'stop',
      reason: `judge_${judgeAction}`,
    };
  } else if (packet.action === 'stop') {
    retryAuthorized = {
      allow: false,
      mode: 'closeout_only',
      reason: 'all_current_criteria_pass_route_to_closeout',
    };
  } else if (packet.action === 'redesign') {
    retryAuthorized = {
      allow: false,
      mode: 'blocked_by_packet',
      reason: 'redesign_required_before_retry',
    };
  } else if (packet.action === 'inspect_scorer') {
    retryAuthorized = {
      allow: true,
      mode: 'proof_only',
      reason: 'retry_authorized_only_for_scorer_inspection_or_impossibility_proof',
    };
  } else {
    retryAuthorized = {
      allow: true,
      mode: 'normal',
      reason: 'continue_signal',
    };
  }
  return {
    schema: EVOLUTION_JUDGMENT_CHECKPOINT_SCHEMA,
    action: packet.action,
    retryAuthorized,
    packet,
    judge: {
      present: Boolean(judge),
      action: judgeAction,
      impossibleAcs: judge?.impossibleAcs ?? [],
      rationale: judge?.rationale ?? null,
    },
    requiredBeforeRetry: retryAuthorized.allow ? packet.requiredNextFields : packet.requiredNextFields,
    boundary: {
      judgment_checkpoint_only: true,
      does_not_execute_runtime: true,
      does_not_approve_work: true,
      human_owns_closeout_merge_publish_release: true,
    },
  };
}

export function renderEvolutionJudgmentCheckpoint(checkpoint: EvolutionJudgmentCheckpoint, format: EvolutionAnalysisFormat = 'terminal'): string {
  if (format === 'json') return `${JSON.stringify(checkpoint, null, 2)}\n`;
  if (format === 'markdown') {
    return [
      '# Evolution judgment checkpoint',
      '',
      `- Action: \`${checkpoint.action}\``,
      `- Retry authorized: \`${checkpoint.retryAuthorized.allow ? 'yes' : 'no'}\``,
      `- Mode: \`${checkpoint.retryAuthorized.mode}\``,
      `- Reason: ${checkpoint.retryAuthorized.reason}`,
      `- Judge: ${checkpoint.judge.present ? `${checkpoint.judge.action} — ${checkpoint.judge.rationale ?? '—'}` : 'not attached'}`,
      `- Required before retry: ${checkpoint.requiredBeforeRetry.map((field) => `\`${field}\``).join(', ') || '—'}`,
      '',
      '## Remaining failures',
      '',
      ...(checkpoint.packet.acceptance.remainingFailures.length
        ? checkpoint.packet.acceptance.remainingFailures.map((criterion) => `- \`${criterion.id}\`: ${criterion.status}; sensitivity ${criterion.sensitivity}; impossible ${criterion.impossible ? 'yes' : 'no'} — ${criterion.text}`)
        : ['- —']),
      ...(checkpoint.packet.requirementQuestions.length ? [
        '',
        '## Question The Requirement',
        '',
        ...checkpoint.packet.requirementQuestions.map((question) => `- ${question}`),
      ] : []),
      '',
      '## Boundary',
      '',
      '- This checkpoint is decision support only.',
      '- It does not execute a runtime or approve work.',
      '',
    ].join('\n');
  }
  return [
    'Evolution Judgment Checkpoint',
    `Action: ${checkpoint.action}`,
    `Retry authorized: ${checkpoint.retryAuthorized.allow ? 'yes' : 'no'}`,
    `Mode: ${checkpoint.retryAuthorized.mode}`,
    `Reason: ${checkpoint.retryAuthorized.reason}`,
    `Judge: ${checkpoint.judge.present ? `${checkpoint.judge.action} — ${checkpoint.judge.rationale ?? '—'}` : 'not attached'}`,
    `Required before retry: ${checkpoint.requiredBeforeRetry.join(', ') || '—'}`,
    `Remaining failures: ${checkpoint.packet.acceptance.remainingFailureIds.join(', ') || '—'}`,
    ...(checkpoint.packet.requirementQuestions.length ? checkpoint.packet.requirementQuestions.map((question) => `Question requirement: ${question}`) : []),
    'Boundary: checkpoint only; does not execute runtime, approve work, merge, publish, or release.',
    '',
  ].join('\n');
}

function renderCompactAnalysisTerminal(analysis: EvolutionAnalysisResult): string {
  const signal = buildEvolutionControllerSignal(analysis);
  const remaining = signal.acceptance.remainingFailures.length > 0
    ? signal.acceptance.remainingFailures.map((criterion) => `${criterion.id}:${criterion.status}${criterion.impossible ? ':impossible' : ''}:${criterion.sensitivity}`).join(', ')
    : '—';
  const lines = [
    `Evolution Control: ${analysis.loop.loopDir}`,
    `Action: ${signal.action}`,
    `Why: ${signal.reasons.join(', ') || '—'} — ${signal.summary}`,
    `Resume: current=${signal.resume.currentAttemptId ?? '—'} | frontier=${signal.resume.frontierAttemptId ?? '—'} | evaluation=${signal.resume.currentEvaluation ?? '—'}`,
    `Plateau: ${signal.plateau.status} | no-improve=${signal.plateau.noImprovementCount} | current=${formatScore(signal.plateau.currentScore)} | best=${formatScore(signal.plateau.bestScore)}`,
    `Acceptance: ${signal.acceptance.currentPass}/${signal.acceptance.currentTotal} pass | remaining=${remaining}`,
    `Required: ${signal.requiredNextFields.join(', ')}`,
    ...(signal.requirementQuestions.length > 0 ? signal.requirementQuestions.map((question) => `Question requirement: ${question}`) : []),
    `Usage: tokens=${formatInteger(signal.usageReceipt.totalTokens)} | usd=${formatUsd(signal.usageReceipt.estimatedUsd)} | source=${signal.usageReceipt.source ?? signal.usageReceipt.unavailableReason ?? '—'} | completeness=${signal.usageReceipt.completeness.present}/${signal.usageReceipt.completeness.total}`,
    ...(signal.warnings.length > 0 ? signal.warnings.map((warning) => `Warning: ${warning}`) : []),
    `Evidence refs: ${signal.evidenceRefs.join(', ') || '—'}`,
    `Boundary: ${signal.boundaryNotes.join(' ')}`,
  ];
  return `${lines.join('\n')}\n`;
}

function renderCompactAnalysisMarkdown(analysis: EvolutionAnalysisResult): string {
  const signal = buildEvolutionControllerSignal(analysis);
  const lines = [
    `# Evolution control: ${analysis.loop.loopDir}`,
    '',
    `- Action: \`${signal.action}\``,
    `- Why: ${signal.reasons.join(', ') || '—'} — ${signal.summary}`,
    `- Resume: current \`${signal.resume.currentAttemptId ?? '—'}\`; frontier \`${signal.resume.frontierAttemptId ?? '—'}\`; evaluation \`${signal.resume.currentEvaluation ?? '—'}\``,
    `- Plateau: \`${signal.plateau.status}\`; no-improve ${signal.plateau.noImprovementCount}; current ${formatScore(signal.plateau.currentScore)}; best ${formatScore(signal.plateau.bestScore)}`,
    `- Acceptance: ${signal.acceptance.currentPass}/${signal.acceptance.currentTotal} pass; remaining ${signal.acceptance.remainingFailureIds.map((id) => `\`${id}\``).join(', ') || '—'}`,
    `- Required next fields: ${signal.requiredNextFields.map((field) => `\`${field}\``).join(', ')}`,
    `- Usage receipt: tokens ${formatInteger(signal.usageReceipt.totalTokens)}; usd ${formatUsd(signal.usageReceipt.estimatedUsd)}; source ${signal.usageReceipt.source ?? signal.usageReceipt.unavailableReason ?? '—'}; completeness ${signal.usageReceipt.completeness.present}/${signal.usageReceipt.completeness.total}`,
    ...(signal.warnings.length > 0 ? signal.warnings.map((warning) => `- Warning: ${warning}`) : []),
    `- Evidence refs: ${signal.evidenceRefs.map((ref) => `\`${ref}\``).join(', ') || '—'}`,
    '',
    '## Remaining failures',
    '',
    ...(signal.acceptance.remainingFailures.length > 0 ? signal.acceptance.remainingFailures.map((criterion) => `- \`${criterion.id}\`: ${criterion.status}; sensitivity ${criterion.sensitivity}; impossible ${criterion.impossible ? 'yes' : 'no'} — ${criterion.text}`) : ['- —']),
    ...(signal.requirementQuestions.length > 0 ? [
      '',
      '## Question the requirement',
      '',
      ...signal.requirementQuestions.map((question) => `- ${question}`),
    ] : []),
    '',
    '## Boundaries',
    '',
    ...signal.boundaryNotes.map((note) => `- ${note}`),
  ];
  return `${lines.join('\n')}\n`;
}

function renderAnalysisTerminal(analysis: EvolutionAnalysisResult): string {
  const currentHypothesis = analysis.currentAttempt.repairHypothesis;
  const currentUsage = analysis.currentAttempt.usage;
  const packet = analysis.nextActionPacket;
  const lines = [
    `Evolution Analysis: ${analysis.loop.loopDir}`,
    `Objective: ${analysis.loop.objective ?? '—'}`,
    `Strategy: ${analysis.loop.strategy ?? '—'}`,
    `Attempts: ${analysis.loop.attemptCount} recorded`,
    '',
    `Plateau: ${analysis.plateau.status} — ${analysis.plateau.noImprovementCount} attempt(s) since last score improvement (current=${formatScore(analysis.plateau.currentScore)}, best=${formatScore(analysis.plateau.bestScore)})`,
    `Acceptance: current=${analysis.acceptanceSummary.currentPass}/${analysis.acceptanceSummary.currentTotal} pass | frontier=${analysis.acceptanceSummary.frontierPass}/${analysis.acceptanceSummary.frontierTotal} pass`,
    '',
    'Current attempt control',
    `  Hypothesis: ${currentHypothesis?.hypothesis ?? '—'}`,
    `  Target metric: ${currentHypothesis?.targetMetric ?? '—'}`,
    `  Expected gain: ${formatScore(currentHypothesis?.expectedGain ?? null)}`,
    `  Actual delta: ${formatScore(currentHypothesis?.actualDelta ?? null)}`,
    `  Token cost: ${formatInteger(currentUsage?.totalTokens ?? null)}`,
    `  Estimated USD: ${formatUsd(currentUsage?.estimatedUsd ?? null)}`,
    '',
    'Score sensitivity',
    ...(analysis.criteria.length > 0 ? analysis.criteria.map((criterion) => {
      const evidence = criterion.evidence.length > 0 ? ` | evidence=${criterion.evidence.join(', ')}` : '';
      return `  ${criterion.id}: ${criterion.currentStatus ?? '—'} | sensitivity=${criterion.sensitivity} | impossible=${impossibleLabel(criterion)} — ${criterion.text}${evidence}`;
    }) : ['  —']),
    '',
    'Current vs previous AC delta',
    ...(analysis.currentVsPrevious.rows.length > 0 ? analysis.currentVsPrevious.rows.map((row) => `  ${row.id}: previous=${formatPlainCriterionStatus(row.previousStatus ?? null)} | current=${formatPlainCriterionStatus(row.currentStatus)}${criterionDeltaMarker(row.previousStatus ?? null, row.currentStatus)} — ${row.text}`) : ['  —']),
    '',
    'Current vs frontier AC delta',
    ...(analysis.currentVsFrontier.rows.length > 0 ? analysis.currentVsFrontier.rows.map((row) => `  ${row.id}: frontier=${formatPlainCriterionStatus(row.frontierStatus ?? null)} | current=${formatPlainCriterionStatus(row.currentStatus)}${criterionDeltaMarker(row.frontierStatus ?? null, row.currentStatus)} — ${row.text}`) : ['  —']),
    '',
    `Recommendation: ${analysis.recommendation.action}`,
    `  ${analysis.recommendation.summary}`,
    '',
    'Next action packet',
    `  Action: ${packet.recommendedAction}`,
    `  Resume: current=${packet.resumeFrom.currentAttemptId ?? '—'} | frontier=${packet.resumeFrom.frontierAttemptId ?? '—'}`,
    `  Acceptance: ${packet.acceptance.currentPass}/${packet.acceptance.currentTotal} pass | remaining=${packet.acceptance.remainingFailures.map((criterion) => criterion.id).join(', ') || '—'}`,
    `  Required next fields: ${packet.requiredNextFields.join(', ')}`,
    ...(packet.requirementQuestions.length > 0 ? ['  Question the requirement:', ...packet.requirementQuestions.map((question) => `    - ${question}`)] : []),
    ...(packet.currentAttemptControl.budgetWarning ? [`  Budget: ${packet.currentAttemptControl.budgetWarning}`] : []),
    ...(packet.evidenceRefs.length > 0 ? [`  Evidence refs: ${packet.evidenceRefs.join(', ')}`] : []),
    `  Boundary: ${packet.boundaryNotes.join(' ')}`,
    '',
    'Notes',
    ...analysis.notes.map((note) => `  ${note}`),
    '',
    'Use --format markdown --out <path> to export this analysis for a PR or review thread.',
  ];
  return `${lines.join('\n')}\n`;
}

function renderAnalysisMarkdown(analysis: EvolutionAnalysisResult): string {
  const currentHypothesis = analysis.currentAttempt.repairHypothesis;
  const currentUsage = analysis.currentAttempt.usage;
  const packet = analysis.nextActionPacket;
  const lines = [
    `# Evolution analysis: ${analysis.loop.loopDir}`,
    '',
    `**Attempts:** ${analysis.loop.attemptCount} recorded`,
    `**Current attempt:** ${analysis.currentAttempt.attemptId ?? '—'}`,
    `**Frontier attempt:** ${analysis.frontierAttempt.attemptId ?? '—'}`,
    '',
    '## Plateau / stagnation',
    '',
    `- Status: \`${analysis.plateau.status}\``,
    `- Attempts since last score improvement: ${analysis.plateau.noImprovementCount}`,
    `- Current score: ${formatScore(analysis.plateau.currentScore)}`,
    `- Best score: ${formatScore(analysis.plateau.bestScore)}${analysis.plateau.bestAttemptId ? ` (\`${analysis.plateau.bestAttemptId}\`)` : ''}`,
    '',
    '## Current attempt control',
    '',
    `- Hypothesis: ${currentHypothesis?.hypothesis ?? '—'}`,
    `- Target metric: ${currentHypothesis?.targetMetric ?? '—'}`,
    `- Expected gain: ${formatScore(currentHypothesis?.expectedGain ?? null)}`,
    `- Actual delta: ${formatScore(currentHypothesis?.actualDelta ?? null)}`,
    `- Token cost: ${formatInteger(currentUsage?.totalTokens ?? null)}`,
    `- Estimated USD: ${formatUsd(currentUsage?.estimatedUsd ?? null)}`,
    '',
    '## Score sensitivity and impossible criteria',
    '',
    '| Criterion | Current | Sensitivity | Impossible / blocked evidence |',
    '|---|---|---|---|',
    ...(analysis.criteria.length > 0 ? analysis.criteria.map((criterion) => {
      const criterionLabel = `${criterion.id} — ${criterion.text}`;
      const impossible = criterion.impossible ? `${impossibleLabel(criterion)}${criterion.evidence.length > 0 ? ` (${criterion.evidence.map((ref) => `\`${ref}\``).join(', ')})` : ''}` : '—';
      return `| ${escapeMarkdownTableCell(criterionLabel)} | ${formatCriterionStatus(criterion.currentStatus)} | ${criterion.sensitivity} | ${escapeMarkdownTableCell(impossible)} |`;
    }) : ['| — | — | — | — |']),
    '',
    '## Current vs previous AC delta',
    '',
    '| Criterion | Previous | Current |',
    '|---|---|---|',
    ...(analysis.currentVsPrevious.rows.length > 0 ? analysis.currentVsPrevious.rows.map((row) => {
      const criterion = `${row.id} — ${row.text}`;
      return `| ${escapeMarkdownTableCell(criterion)} | ${formatCriterionStatus(row.previousStatus ?? null)} | ${formatCriterionStatus(row.currentStatus)}${criterionDeltaMarker(row.previousStatus ?? null, row.currentStatus)} |`;
    }) : ['| — | — | — |']),
    '',
    '## Current vs frontier AC delta',
    '',
    '| Criterion | Frontier | Current |',
    '|---|---|---|',
    ...(analysis.currentVsFrontier.rows.length > 0 ? analysis.currentVsFrontier.rows.map((row) => {
      const criterion = `${row.id} — ${row.text}`;
      return `| ${escapeMarkdownTableCell(criterion)} | ${formatCriterionStatus(row.frontierStatus ?? null)} | ${formatCriterionStatus(row.currentStatus)}${criterionDeltaMarker(row.frontierStatus ?? null, row.currentStatus)} |`;
    }) : ['| — | — | — |']),
    '',
    '## Recommendation',
    '',
    `\`${analysis.recommendation.action}\` — ${analysis.recommendation.summary}`,
    '',
    '## Next action packet',
    '',
    `- Schema: \`${packet.schema}\``,
    `- Action: \`${packet.recommendedAction}\``,
    `- Resume: current \`${packet.resumeFrom.currentAttemptId ?? '—'}\`; frontier \`${packet.resumeFrom.frontierAttemptId ?? '—'}\``,
    `- Acceptance: ${packet.acceptance.currentPass}/${packet.acceptance.currentTotal} pass; remaining ${packet.acceptance.remainingFailures.map((criterion) => `\`${criterion.id}\``).join(', ') || '—'}`,
    `- Required next fields: ${packet.requiredNextFields.map((field) => `\`${field}\``).join(', ')}`,
    ...(packet.currentAttemptControl.budgetWarning ? [`- Budget warning: ${packet.currentAttemptControl.budgetWarning}`] : []),
    '',
    '### Handoff checklist',
    '',
    ...packet.handoffChecklist.map((item) => `- ${item}`),
    ...(packet.requirementQuestions.length > 0 ? [
      '',
      '### Question the requirement',
      '',
      ...packet.requirementQuestions.map((question) => `- ${question}`),
    ] : []),
    '',
    '### Packet evidence refs',
    '',
    ...(packet.evidenceRefs.length > 0 ? packet.evidenceRefs.map((ref) => `- \`${ref}\``) : ['- —']),
    '',
    '### Packet boundaries',
    '',
    ...packet.boundaryNotes.map((note) => `- ${note}`),
    '',
    '## Boundaries',
    '',
    ...analysis.notes.map((note) => `- ${note}`),
  ];
  return `${lines.join('\n')}\n`;
}

export function renderEvolutionAnalysis(analysis: EvolutionAnalysisResult, format: EvolutionAnalysisFormat = 'terminal', options: EvolutionAnalysisRenderOptions = {}): string {
  if (options.compact) {
    if (format === 'json') return `${JSON.stringify(buildEvolutionControllerSignal(analysis), null, 2)}\n`;
    if (format === 'markdown') return renderCompactAnalysisMarkdown(analysis);
    return renderCompactAnalysisTerminal(analysis);
  }
  if (format === 'json') return `${JSON.stringify(analysis, null, 2)}\n`;
  if (format === 'markdown') return renderAnalysisMarkdown(analysis);
  return renderAnalysisTerminal(analysis);
}

function normalizeAttemptRepairHypothesis(input: EvolutionRepairHypothesis | undefined, decision: EvolutionDecision): Record<string, unknown> | null {
  if (!input) {
    if (decision === 'retry') throw new Error('Retry decisions require a repair hypothesis before continuing.');
    return null;
  }
  if (!meaningfulString(input.hypothesis)) {
    throw new Error('Repair hypothesis must be a non-empty concrete hypothesis.');
  }
  const targetMetric = input.targetMetric === undefined || input.targetMetric === null ? null : input.targetMetric.trim();
  if (targetMetric !== null && !meaningfulString(targetMetric)) {
    throw new Error('Repair hypothesis target metric must be meaningful when provided.');
  }
  return {
    hypothesis: input.hypothesis.trim(),
    target_metric: targetMetric,
    expected_gain: optionalFiniteNumber(input.expectedGain, 'Repair hypothesis expected gain'),
    actual_delta: optionalFiniteNumber(input.actualDelta, 'Repair hypothesis actual delta'),
  };
}

const AUTO_FILL_TARGET_METRIC = 'accepted_ac_count';

// 165: when an evaluation envelope is linked and the caller did not supply
// target-metric/actual-delta, store accepted_ac_count and the passCount delta
// versus the previous attempt's linked evaluation (first attempt: delta vs 0).
// Explicit caller flags always win, per-field.
function applyEvaluationAutoFill(
  normalized: Record<string, unknown> | null,
  caller: EvolutionRepairHypothesis | undefined,
  currentPassCount: number,
  previousPassCount: number | null,
): Record<string, unknown> | null {
  const callerSetTarget = caller?.targetMetric !== undefined && caller?.targetMetric !== null;
  const callerSetDelta = caller?.actualDelta !== undefined && caller?.actualDelta !== null;
  if (callerSetTarget && callerSetDelta) return normalized;
  const delta = currentPassCount - (previousPassCount ?? 0);
  if (!normalized) {
    return {
      hypothesis: `Auto-recorded from linked evaluation: ${AUTO_FILL_TARGET_METRIC} delta ${delta} versus previous attempt.`,
      target_metric: AUTO_FILL_TARGET_METRIC,
      expected_gain: null,
      actual_delta: delta,
    };
  }
  return {
    ...normalized,
    target_metric: callerSetTarget ? normalized.target_metric : AUTO_FILL_TARGET_METRIC,
    actual_delta: callerSetDelta ? normalized.actual_delta : delta,
  };
}

function normalizeAttemptUsage(input: EvolutionUsageSummary | undefined): Record<string, unknown> | null {
  if (!input) return null;
  const totalTokens = optionalNonNegativeInteger(input.totalTokens, 'Usage total tokens');
  const estimatedUsd = optionalNonNegativeNumber(input.estimatedUsd, 'Usage estimated USD');
  const source = input.source === undefined || input.source === null ? null : input.source.trim();
  const unavailableReason = input.unavailableReason === undefined || input.unavailableReason === null ? null : input.unavailableReason.trim();
  if (source !== null && !meaningfulString(source)) throw new Error('Usage source must be meaningful when provided.');
  if (unavailableReason !== null && !meaningfulString(unavailableReason)) throw new Error('Usage unavailable reason must be meaningful when provided.');
  if (totalTokens === null && estimatedUsd === null && source === null && unavailableReason === null) return null;
  return {
    total_tokens: totalTokens,
    estimated_usd: estimatedUsd,
    source,
    unavailable_reason: unavailableReason,
  };
}

export function recordEvolutionAttempt(loopDir: string, options: RecordEvolutionAttemptOptions, root = process.cwd()): RecordEvolutionAttemptResult {
  if (!EVOLUTION_DECISIONS.includes(options.decision)) {
    throw new Error(`Unsupported evolution decision: ${options.decision}`);
  }
  if (!meaningfulString(options.rationale)) {
    throw new Error('Promotion, rejection, retry, and block decisions require a rationale.');
  }
  if (options.score !== undefined && (!Number.isFinite(options.score) || options.score < 0 || options.score > 1)) {
    throw new Error('Evolution score must be a finite number between 0 and 1.');
  }
  const repairHypothesis = normalizeAttemptRepairHypothesis(options.repairHypothesis, options.decision);
  const usage = normalizeAttemptUsage(options.usage);
  const absoluteLoopDir = isAbsolute(loopDir) ? loopDir : resolve(root, loopDir);
  const loopPath = join(absoluteLoopDir, 'loop.json');
  const attemptsPath = join(absoluteLoopDir, 'attempts.jsonl');
  const frontierPath = join(absoluteLoopDir, 'frontier.json');
  const loop = readJson(loopPath);
  if (!isRecord(loop) || loop.schema !== EVOLUTION_LOOP_SCHEMA) {
    throw new Error(`Evolution loop must declare schema: ${EVOLUTION_LOOP_SCHEMA}`);
  }
  const runAbsolute = isAbsolute(options.runPath) ? options.runPath : resolve(root, options.runPath);
  const run = readRunSummary(runAbsolute, root);
  const evalSummary = options.evaluationPath ? readEvaluationSummary(isAbsolute(options.evaluationPath) ? options.evaluationPath : resolve(root, options.evaluationPath), root) : null;
  const runId = asString(run.runId);
  const evaluationRunId = evalSummary ? asString(evalSummary.runId) : null;
  if (runId && evaluationRunId && runId !== evaluationRunId) {
    throw new Error(`Evaluation run_id ${evaluationRunId} does not match run packet ${runId}.`);
  }
  const adapterReceipts = (options.receiptPaths ?? []).map((receiptPath) => readDispatchReceiptSummary(isAbsolute(receiptPath) ? receiptPath : resolve(root, receiptPath), root, runId));
  const adapterReceiptRefs = adapterReceipts.map((receipt) => asString(receipt.receiptPath)).filter((value): value is string => Boolean(value));
  const adapterEvidenceRefs = (options.evidencePaths ?? []).map((evidencePath) => adapterRefRelativeToRoot(root, isAbsolute(evidencePath) ? evidencePath : resolve(root, evidencePath), 'Adapter evidence'));
  const attemptId = runId ?? `attempt-${shortDigest([asString(run.runPacket) ?? options.runPath])}`;
  const attempts = readAttempts(attemptsPath);
  if (attempts.some((attempt) => attempt.attempt_id === attemptId)) {
    throw new Error(`Evolution attempt already recorded: ${attemptId}`);
  }
  // 165: auto-fill accepted_ac_count target metric and passCount delta from the
  // linked evaluation when the caller did not provide them explicitly.
  const effectiveRepairHypothesis = evalSummary
    ? applyEvaluationAutoFill(repairHypothesis, options.repairHypothesis, (evalSummary.passCount as number) ?? 0, previousAttemptPassCount(attempts.at(-1), root))
    : repairHypothesis;
  const now = options.now ?? new Date();
  const evidenceRefs = uniqueRefs([
    ...(asStringArray(run.evidenceRefs)),
    ...(evalSummary ? [asString(evalSummary.evaluationPath)].filter((value): value is string => Boolean(value)) : []),
    ...adapterReceiptRefs,
    ...adapterEvidenceRefs,
  ]);
  const attempt = {
    schema: EVOLUTION_ATTEMPT_SCHEMA,
    attempt_id: attemptId,
    recorded_at: now.toISOString(),
    run_id: runId,
    task_id: asString(run.taskId),
    run_packet: asString(run.runPacket),
    evaluation_id: evalSummary ? asString(evalSummary.evaluationId) : null,
    evaluation: evalSummary ? asString(evalSummary.evaluationPath) : null,
    evaluation_decision: evalSummary ? asString(evalSummary.decisionStatus) : null,
    decision: options.decision,
    score: options.score ?? null,
    rationale: options.rationale,
    evidence_refs: evidenceRefs,
    adapter_receipts: adapterReceiptRefs,
    ...(effectiveRepairHypothesis ? { repair_hypothesis: effectiveRepairHypothesis } : {}),
    ...(usage ? { usage } : {}),
    boundary: boundary(),
  };
  let frontier: Record<string, unknown> | null = null;
  if (options.decision === 'promote') {
    try {
      const parsedFrontier = readJson(frontierPath);
      if (!isRecord(parsedFrontier) || parsedFrontier.schema !== EVOLUTION_FRONTIER_SCHEMA) {
        throw new Error(`Evolution frontier must declare schema: ${EVOLUTION_FRONTIER_SCHEMA}`);
      }
      frontier = parsedFrontier;
    } catch (error) {
      throw new Error(`Invalid evolution frontier: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  appendFileSync(attemptsPath, `${JSON.stringify(attempt)}\n`, 'utf8');
  let frontierUpdated = false;
  if (frontier) {
    const previous = frontier.current ?? null;
    frontier.updated_at = now.toISOString();
    frontier.current = {
      attempt_id: attemptId,
      run_id: runId,
      evaluation_id: evalSummary ? asString(evalSummary.evaluationId) : null,
      score: options.score ?? null,
      rationale: options.rationale,
      promoted_at: now.toISOString(),
      evidence_refs: evidenceRefs,
    };
    const history = Array.isArray(frontier.history) ? frontier.history : [];
    frontier.history = previous ? [...history, previous] : history;
    writeFileSync(frontierPath, `${JSON.stringify(frontier, null, 2)}\n`, 'utf8');
    frontierUpdated = true;
  }
  return { attempt, frontierUpdated, attemptsPath, frontierPath };
}

function validateBoundary(value: unknown, failures: ValidationIssue[], path: string, prefix: string): void {
  if (!isRecord(value)) {
    failures.push(issue('fail', `${prefix}.boundary.missing`, 'Boundary object is required.', path));
    return;
  }
  for (const field of UNSUPPORTED_BOUNDARY_TRUE_FIELDS) {
    if (value[field] === true) {
      failures.push(issue('fail', 'evolution.boundary.unsupported_true', `Boundary field must not be true in core evolution artifacts: ${field}`, path));
    }
  }
}

function validateRef(ref: unknown, failures: ValidationIssue[], warnings: ValidationIssue[], root: string, path: string, codePrefix: string): void {
  if (!meaningfulString(ref)) {
    failures.push(issue('fail', `${codePrefix}.missing_ref`, 'Reference must be a non-empty string.', path));
    return;
  }
  if (isPrivatePath(ref)) {
    failures.push(issue('fail', `${codePrefix}.private_path`, `Reference points at private/internal workspace state: ${ref}`, path));
    return;
  }
  if (!/^[a-z]+:\/\//i.test(ref) && !repoRelativePathExists(root, ref)) {
    warnings.push(issue('warn', `${codePrefix}.missing_path`, `Local reference does not exist: ${ref}`, path));
  }
}

function validateRepairHypothesis(value: unknown, decision: string | null, failures: ValidationIssue[], path: string, attemptLabel: string): void {
  if (!isRecord(value)) {
    if (decision === 'retry') {
      failures.push(issue('fail', 'evolution.attempt.missing_repair_hypothesis', `Retry attempt ${attemptLabel} must record a repair hypothesis before continuing.`, path));
    }
    return;
  }
  if (!meaningfulString(value.hypothesis)) {
    failures.push(issue('fail', 'evolution.attempt.invalid_repair_hypothesis', `Attempt ${attemptLabel} repair_hypothesis.hypothesis must be meaningful.`, path));
  }
  if (value.target_metric !== undefined && value.target_metric !== null && !meaningfulString(value.target_metric)) {
    failures.push(issue('fail', 'evolution.attempt.invalid_repair_hypothesis', `Attempt ${attemptLabel} repair_hypothesis.target_metric must be meaningful when present.`, path));
  }
  for (const field of ['expected_gain', 'actual_delta']) {
    const current = value[field];
    if (current !== undefined && current !== null && (typeof current !== 'number' || !Number.isFinite(current))) {
      failures.push(issue('fail', 'evolution.attempt.invalid_repair_hypothesis', `Attempt ${attemptLabel} repair_hypothesis.${field} must be a finite number or null.`, path));
    }
  }
}

function validateAttemptUsage(value: unknown, failures: ValidationIssue[], path: string, attemptLabel: string): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    failures.push(issue('fail', 'evolution.attempt.invalid_usage', `Attempt ${attemptLabel} usage must be an object when present.`, path));
    return;
  }
  const totalTokens = value.total_tokens;
  if (totalTokens !== undefined && totalTokens !== null && (typeof totalTokens !== 'number' || !Number.isInteger(totalTokens) || totalTokens < 0)) {
    failures.push(issue('fail', 'evolution.attempt.invalid_usage', `Attempt ${attemptLabel} usage.total_tokens must be a non-negative integer or null.`, path));
  }
  const estimatedUsd = value.estimated_usd;
  if (estimatedUsd !== undefined && estimatedUsd !== null && (typeof estimatedUsd !== 'number' || !Number.isFinite(estimatedUsd) || estimatedUsd < 0)) {
    failures.push(issue('fail', 'evolution.attempt.invalid_usage', `Attempt ${attemptLabel} usage.estimated_usd must be a non-negative number or null.`, path));
  }
  for (const field of ['source', 'unavailable_reason']) {
    const current = value[field];
    if (current !== undefined && current !== null && !meaningfulString(current)) {
      failures.push(issue('fail', 'evolution.attempt.invalid_usage', `Attempt ${attemptLabel} usage.${field} must be meaningful when present.`, path));
    }
  }
}

export function validateEvolutionLoopDir(loopDir: string, root = process.cwd()): ValidationResult {
  const failures: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const absoluteLoopDir = isAbsolute(loopDir) ? loopDir : resolve(root, loopDir);
  const loopPath = join(absoluteLoopDir, 'loop.json');
  const attemptsPath = join(absoluteLoopDir, 'attempts.jsonl');
  const frontierPath = join(absoluteLoopDir, 'frontier.json');

  let loop: Record<string, unknown> | null = null;
  try {
    if (!existsSync(loopPath) || !statSync(loopPath).isFile()) throw new Error('missing loop.json');
    const parsed = readJson(loopPath);
    if (!isRecord(parsed)) throw new Error('loop.json must be an object');
    loop = parsed;
  } catch (error) {
    failures.push(issue('fail', 'evolution.loop.invalid', error instanceof Error ? error.message : 'Invalid loop.json.', loopPath));
  }

  if (loop) {
    if (loop.schema !== EVOLUTION_LOOP_SCHEMA) failures.push(issue('fail', 'evolution.loop.schema', `loop.json must declare schema: ${EVOLUTION_LOOP_SCHEMA}`, loopPath));
    const strategy = isRecord(loop.strategy) ? loop.strategy : null;
    const strategyName = strategy ? asString(strategy.name) : null;
    if (!strategyName || !(EVOLUTION_STRATEGIES as readonly string[]).includes(strategyName)) failures.push(issue('fail', 'evolution.strategy.invalid', 'Evolution loop strategy is invalid.', loopPath));
    if (strategy?.executes_in_core === true) failures.push(issue('fail', 'evolution.strategy.executes_in_core', 'Core evolution strategies must be metadata only.', loopPath));
    validateBoundary(loop.boundary, failures, loopPath, 'evolution');
    const refs = Array.isArray(loop.source_refs) ? loop.source_refs : [];
    if (refs.length === 0) failures.push(issue('fail', 'evolution.source_ref.missing', 'Evolution loop must include source_refs.', loopPath));
    for (const ref of refs) validateRef(ref, failures, warnings, root, loopPath, 'evolution.source_ref');
  }

  const seenAttempts = new Set<string>();
  const attemptIds: string[] = [];
  try {
    if (!existsSync(attemptsPath) || !statSync(attemptsPath).isFile()) throw new Error('missing attempts.jsonl');
    const lines = readFileSync(attemptsPath, 'utf8').split('\n').map((line) => line.trim()).filter(Boolean);
    for (const [index, line] of lines.entries()) {
      let attempt: Record<string, unknown>;
      try {
        const parsed = JSON.parse(line) as unknown;
        if (!isRecord(parsed)) throw new Error('attempt line must be an object');
        attempt = parsed;
      } catch (error) {
        failures.push(issue('fail', 'evolution.attempt.invalid_json', error instanceof Error ? error.message : 'Invalid attempt JSON.', attemptsPath));
        continue;
      }
      if (attempt.schema !== EVOLUTION_ATTEMPT_SCHEMA) failures.push(issue('fail', 'evolution.attempt.schema', `Attempt line ${index + 1} must declare schema: ${EVOLUTION_ATTEMPT_SCHEMA}`, attemptsPath));
      const attemptId = asString(attempt.attempt_id);
      if (!meaningfulString(attemptId)) failures.push(issue('fail', 'evolution.attempt.missing_id', `Attempt line ${index + 1} is missing attempt_id.`, attemptsPath));
      else if (seenAttempts.has(attemptId)) failures.push(issue('fail', 'evolution.attempt.duplicate_id', `Duplicate evolution attempt id: ${attemptId}`, attemptsPath));
      else {
        seenAttempts.add(attemptId);
        attemptIds.push(attemptId);
      }
      const decision = asString(attempt.decision);
      if (!decision || !(EVOLUTION_DECISIONS as readonly string[]).includes(decision)) failures.push(issue('fail', 'evolution.attempt.invalid_decision', `Attempt ${attemptId ?? index + 1} has invalid decision.`, attemptsPath));
      if (!meaningfulString(attempt.rationale)) failures.push(issue('fail', 'evolution.attempt.missing_rationale', `Attempt ${attemptId ?? index + 1} must record a rationale.`, attemptsPath));
      validateRepairHypothesis(attempt.repair_hypothesis, decision, failures, attemptsPath, attemptId ?? String(index + 1));
      validateAttemptUsage(attempt.usage, failures, attemptsPath, attemptId ?? String(index + 1));
      validateBoundary(attempt.boundary, failures, attemptsPath, 'evolution.attempt');
      validateRef(attempt.run_packet, failures, warnings, root, attemptsPath, 'evolution.attempt.run_packet');
      if (attempt.evaluation) validateRef(attempt.evaluation, failures, warnings, root, attemptsPath, 'evolution.attempt.evaluation');
      for (const ref of Array.isArray(attempt.adapter_receipts) ? attempt.adapter_receipts : []) validateRef(ref, failures, warnings, root, attemptsPath, 'evolution.attempt.adapter_receipt');
      for (const ref of Array.isArray(attempt.evidence_refs) ? attempt.evidence_refs : []) validateRef(ref, failures, warnings, root, attemptsPath, 'evolution.attempt.evidence_ref');
    }
  } catch (error) {
    failures.push(issue('fail', 'evolution.attempts.invalid', error instanceof Error ? error.message : 'Invalid attempts.jsonl.', attemptsPath));
  }

  try {
    if (!existsSync(frontierPath) || !statSync(frontierPath).isFile()) throw new Error('missing frontier.json');
    const frontier = readJson(frontierPath);
    if (!isRecord(frontier)) throw new Error('frontier.json must be an object');
    if (frontier.schema !== EVOLUTION_FRONTIER_SCHEMA) failures.push(issue('fail', 'evolution.frontier.schema', `frontier.json must declare schema: ${EVOLUTION_FRONTIER_SCHEMA}`, frontierPath));
    validateBoundary(frontier.boundary, failures, frontierPath, 'evolution.frontier');
    if (isRecord(frontier.current)) {
      const currentAttempt = asString(frontier.current.attempt_id);
      if (currentAttempt && !attemptIds.includes(currentAttempt)) {
        failures.push(issue('fail', 'evolution.frontier.unknown_attempt', `Frontier references unknown attempt: ${currentAttempt}`, frontierPath));
      }
      for (const ref of Array.isArray(frontier.current.evidence_refs) ? frontier.current.evidence_refs : []) validateRef(ref, failures, warnings, root, frontierPath, 'evolution.frontier.evidence_ref');
    } else if (frontier.current !== null) {
      failures.push(issue('fail', 'evolution.frontier.invalid_current', 'frontier.current must be null or an object.', frontierPath));
    }
  } catch (error) {
    failures.push(issue('fail', 'evolution.frontier.invalid', error instanceof Error ? error.message : 'Invalid frontier.json.', frontierPath));
  }

  return { ok: failures.length === 0, failures, warnings };
}
