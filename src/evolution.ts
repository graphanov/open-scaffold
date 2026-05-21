import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { parsePlanFile } from './scaffold.js';
import type { ValidationIssue, ValidationResult } from './validation.js';

export const EVOLUTION_LOOP_SCHEMA = 'open-scaffold.evolution-loop.v1';
export const EVOLUTION_ATTEMPT_SCHEMA = 'open-scaffold.evolution-attempt.v1';
export const EVOLUTION_FRONTIER_SCHEMA = 'open-scaffold.evolution-frontier.v1';
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
  now?: Date;
}

export interface RecordEvolutionAttemptResult {
  attempt: Record<string, unknown>;
  frontierUpdated: boolean;
  attemptsPath: string;
  frontierPath: string;
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

function meaningfulString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !/^(todo|tbd|n\/a|none)$/i.test(value.trim());
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
  };
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
