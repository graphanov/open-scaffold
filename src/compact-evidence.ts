import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, win32 } from 'node:path';
import { findScaffoldRoot } from './scaffold.js';

export const COMPACT_EVIDENCE_SCHEMA = 'open-scaffold.compact-evidence.v1';
const RUN_SCHEMA = 'open-scaffold.run.v1';
const EVALUATION_SCHEMA = 'open-scaffold.evaluation.v1';
const EVOLUTION_LOOP_SCHEMA = 'open-scaffold.evolution-loop.v1';
const EVOLUTION_FRONTIER_SCHEMA = 'open-scaffold.evolution-frontier.v1';

const RAW_EXTENSIONS = new Set(['.log', '.jsonl', '.ndjson', '.stdout', '.stderr', '.trace', '.transcript', '.har']);
const PRIVATE_PREFIXES = ['.git/', '.osc/state/', '.osc/research/', '.osc-dev/', '.hermes/', 'node_modules/'];
const CANONICAL_EVIDENCE_ROLES = new Set(['attempt_journal', 'loop_state', 'frontier_state', 'run_packet', 'evaluation_envelope']);

export interface CompactEvidenceOptions {
  evaluationPath?: string;
  candidateNotes?: string[];
  now?: Date;
}

export interface CompactEvidenceFiles {
  manifestPath: string;
  summaryPath: string;
  manifest: CompactEvidenceManifest;
  markdown: string;
}

export interface CompactEvidenceRef {
  label: string;
  ref: string;
  role: string;
  digest_sha256: string | null;
  size_bytes: number | null;
  copied_payload: false;
  note?: string;
}

interface CriterionFailure {
  id: string;
  text: string;
  status: string;
  rationale: string | null;
}

interface EvaluationSummary {
  present: boolean;
  path: string | null;
  evaluation_id: string | null;
  decision: string | null;
  decision_rationale: string | null;
  improvement_route: string | null;
  next_recommendation: string;
  status_counts: Record<string, number>;
  failed_criteria: CriterionFailure[];
  evaluator_refs: string[];
  evidence_refs: string[];
}

export interface CompactEvidenceManifest {
  schema: typeof COMPACT_EVIDENCE_SCHEMA;
  generated_at: string;
  subject: {
    kind: 'run' | 'evolution_loop';
    source: string;
    plan_slug: string | null;
    objective: string | null;
    run_id: string | null;
    loop_id: string | null;
    task_id: string | null;
  };
  summary: {
    attempt_count: number | null;
    attempt_ids: string[];
    current_attempt_id: string | null;
    frontier_attempt_id: string | null;
    score: number | null;
    decision: string | null;
    next_recommendation: string;
  };
  verification_commands: string[];
  evaluation: EvaluationSummary;
  promoted_evidence: CompactEvidenceRef[];
  raw_local_evidence: CompactEvidenceRef[];
  candidate_notes: Array<CompactEvidenceRef & { canonical: false }>;
  warnings: string[];
  boundary: {
    raw_payloads_embedded: false;
    raw_payloads_deleted: false;
    external_anchoring: false;
    canonical_attempt_state_mutated: false;
    candidate_notes_are_canonical: false;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function toPosix(value: string): string {
  return value.split('\\').join('/');
}

function sanitizeText(value: string | null | undefined, fallback: string | null = ''): string {
  return (value ?? fallback ?? '')
    .replace(/\b[A-Za-z]:[\\/][^\s,;)\]]+/g, '[local-path omitted]')
    .replace(/(^|[\s("'`=:])\/(?!\/)(?:[A-Za-z0-9._-]+\/)+[^\s,;)\]}'"]+/g, '$1[local-path omitted]')
    .replace(/\/(?:Users|home|tmp|private|var|Volumes)\/[^\s,;)\]]+/g, '[local-path omitted]')
    .replace(/(^|[\s("'`=:])(?:\.\/)?(?:\.git|\.osc\/state|\.osc\/research|\.osc-dev|\.hermes|node_modules)(?:\/[^\s,;)\]}'"]+)?(?=$|[\s,.;:)\]}'"])/g, '$1[private-ref omitted]')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 1000);
}

function scaffoldRootFor(inputPath: string, root: string): string {
  const absolute = isAbsolute(inputPath) ? inputPath : resolve(root, inputPath);
  const start = existsSync(absolute) && statSync(absolute).isFile() ? dirname(absolute) : absolute;
  return findScaffoldRoot(start) ?? findScaffoldRoot(root) ?? root;
}

function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function isForeignWindowsAbsolutePath(ref: string): boolean {
  return win32.isAbsolute(ref) && !isAbsolute(ref);
}

function safeRef(root: string, ref: string): string {
  if (/^[a-z]+:\/\//i.test(ref)) return ref;
  if (isForeignWindowsAbsolutePath(ref)) return sanitizeText(ref, '[local-path omitted]') || '[local-path omitted]';
  const realRoot = existsSync(root) ? resolve(root) : root;
  const absolute = isAbsolute(ref) || win32.isAbsolute(ref) ? resolve(ref) : resolve(realRoot, ref);
  if (isInside(realRoot, absolute)) {
    const relativeRef = toPosix(relative(realRoot, absolute)) || '.';
    if (isPrivateRef(relativeRef)) return '[private-ref omitted]';
    return relativeRef;
  }
  return sanitizeText(ref, '[local-path omitted]') || '[local-path omitted]';
}

function refAbsolute(root: string, ref: string): string | null {
  if (/^[a-z]+:\/\//i.test(ref)) return null;
  if (isForeignWindowsAbsolutePath(ref)) return null;
  const absolute = isAbsolute(ref) || win32.isAbsolute(ref) ? resolve(ref) : resolve(root, ref);
  if (!isInside(resolve(root), absolute)) return null;
  return absolute;
}

function digestRef(root: string, ref: string): { digest: string | null; size: number | null } {
  if (isOmittedRef(safeRef(root, ref))) return { digest: null, size: null };
  const absolute = refAbsolute(root, ref);
  if (!absolute || !existsSync(absolute) || !statSync(absolute).isFile()) return { digest: null, size: null };
  const bytes = readFileSync(absolute);
  return { digest: createHash('sha256').update(bytes).digest('hex'), size: bytes.length };
}

function isPrivateRef(ref: string): boolean {
  const normalized = toPosix(ref).replace(/^\.\//, '');
  return PRIVATE_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix));
}

function isOmittedRef(ref: string): boolean {
  return ref.includes('[local-path omitted]') || ref.includes('[private-ref omitted]');
}

function isRawLocalRef(root: string, ref: string, role: string): boolean {
  if (CANONICAL_EVIDENCE_ROLES.has(role)) return false;
  const safe = safeRef(root, ref);
  if (isOmittedRef(safe)) return true;
  const normalized = toPosix(ref).replace(/^\.\//, '');
  const lower = normalized.toLowerCase();
  const ext = extname(lower);
  if (normalized === '[local-path omitted]') return true;
  if (RAW_EXTENSIONS.has(ext)) return true;
  if (lower.includes('/raw/') || lower.includes('/logs/') || lower.includes('transcript') || lower.includes('codex-events')) return true;
  if (lower.startsWith('.osc/runs/') && !lower.endsWith('/run.json') && !lower.endsWith('evaluation.json') && !lower.endsWith('dispatch-receipt.json')) return true;
  return isPrivateRef(normalized);
}

function compactRef(root: string, ref: string, role: string, note?: string): CompactEvidenceRef {
  const safe = safeRef(root, ref);
  const { digest, size } = digestRef(root, ref);
  return {
    label: basename(safe) || safe,
    ref: safe,
    role,
    digest_sha256: digest,
    size_bytes: size,
    copied_payload: false,
    ...(note ? { note } : {}),
  };
}

function addEvidenceRef(root: string, target: { promoted: CompactEvidenceRef[]; raw: CompactEvidenceRef[] }, ref: string, role: string): void {
  if (!ref.trim()) return;
  const rawLocal = isRawLocalRef(root, ref, role);
  const entry = compactRef(root, ref, role, rawLocal ? 'Payload omitted; digest identifies the local file if present.' : undefined);
  const collection = rawLocal ? target.raw : target.promoted;
  if (!collection.some((existing) => existing.ref === entry.ref && existing.role === entry.role)) collection.push(entry);
}

function statusCounts(criteria: Record<string, unknown>[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const criterion of criteria) {
    const status = asString(criterion.status) ?? 'unknown';
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

function summarizeEvaluation(root: string, evaluationRef: string | null | undefined): EvaluationSummary {
  if (!evaluationRef) {
    return {
      present: false,
      path: null,
      evaluation_id: null,
      decision: null,
      decision_rationale: null,
      improvement_route: null,
      next_recommendation: 'inspect_evaluation',
      status_counts: {},
      failed_criteria: [],
      evaluator_refs: [],
      evidence_refs: [],
    };
  }
  const evaluationPath = refAbsolute(root, evaluationRef) ?? resolve(root, evaluationRef);
  const parsed = readJson(evaluationPath);
  if (!isRecord(parsed) || parsed.schema !== EVALUATION_SCHEMA) throw new Error(`Evaluation must declare schema: ${EVALUATION_SCHEMA}`);
  const criteria = Array.isArray(parsed.acceptance_criteria) ? parsed.acceptance_criteria.filter(isRecord) : [];
  const failedCriteria = criteria
    .filter((criterion) => (asString(criterion.status) ?? 'unknown') !== 'pass')
    .map((criterion, index) => ({
      id: sanitizeText(asString(criterion.id), `AC${index + 1}`),
      text: sanitizeText(asString(criterion.text), sanitizeText(asString(criterion.id), `AC${index + 1}`)),
      status: sanitizeText(asString(criterion.status), 'unknown'),
      rationale: asString(criterion.rationale) ? sanitizeText(asString(criterion.rationale)) : null,
    }));
  const evaluatorRefs = [...new Set(criteria.map((criterion) => {
    const evaluator = isRecord(criterion.evaluator) ? criterion.evaluator : {};
    const kind = sanitizeText(asString(evaluator.kind), 'unknown');
    const name = sanitizeText(asString(evaluator.name), 'unknown');
    return `${kind}:${name}`;
  }))];
  const evidenceRefs = criteria.flatMap((criterion) => {
    const evidence = Array.isArray(criterion.evidence) ? criterion.evidence.filter(isRecord) : [];
    return evidence.map((item) => asString(item.ref)).filter((item): item is string => Boolean(item));
  });
  const decision = isRecord(parsed.decision) ? parsed.decision : {};
  const improvement = isRecord(parsed.improvement) ? parsed.improvement : {};
  const route = asString(improvement.route);
  const decisionStatus = asString(decision.status);
  return {
    present: true,
    path: safeRef(root, evaluationRef),
    evaluation_id: sanitizeText(asString(parsed.evaluation_id), null) || null,
    decision: sanitizeText(decisionStatus, null) || null,
    decision_rationale: asString(decision.rationale) ? sanitizeText(asString(decision.rationale)) : null,
    improvement_route: sanitizeText(route, null) || null,
    next_recommendation: sanitizeText(route ?? decisionStatus ?? 'inspect_evaluation'),
    status_counts: statusCounts(criteria),
    failed_criteria: failedCriteria,
    evaluator_refs: evaluatorRefs,
    evidence_refs: [...new Set(evidenceRefs.map((ref) => safeRef(root, ref)))],
  };
}

function runPacketVerificationSteps(packet: Record<string, unknown>): string[] {
  const plan = isRecord(packet.plan) ? packet.plan : {};
  return asStringArray(plan.verificationSteps).map((step) => sanitizeText(step)).filter(Boolean);
}

function runPacketInfo(root: string, runPath: string): { packet: Record<string, unknown>; refs: string[]; verification: string[] } {
  const parsed = readJson(runPath);
  if (!isRecord(parsed) || parsed.schemaVersion !== RUN_SCHEMA) throw new Error(`Run packet must declare schemaVersion: ${RUN_SCHEMA}`);
  const artifacts = isRecord(parsed.artifacts) ? parsed.artifacts : {};
  const refs = ['manifest', 'prompts', 'logs', 'outputs', 'evidence']
    .flatMap((key) => {
      const value = artifacts[key];
      return Array.isArray(value) ? value : (typeof value === 'string' ? [value] : []);
    })
    .filter((item): item is string => typeof item === 'string');
  return { packet: parsed, refs, verification: runPacketVerificationSteps(parsed) };
}

function latestAttempt(attempts: Record<string, unknown>[]): Record<string, unknown> | null {
  return attempts.length ? attempts[attempts.length - 1] : null;
}

function attemptById(attempts: Record<string, unknown>[], attemptId: string | null): Record<string, unknown> | null {
  if (!attemptId) return null;
  return attempts.find((attempt) => asString(attempt.attempt_id) === attemptId) ?? null;
}

function readAttempts(path: string): Record<string, unknown>[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown)
    .filter(isRecord);
}

function frontierCurrentAttemptId(frontier: Record<string, unknown>): string | null {
  return isRecord(frontier.current) ? asString(frontier.current.attempt_id) : null;
}

function recommendationFor(evaluation: EvaluationSummary, decision: string | null): string {
  if (evaluation.next_recommendation && evaluation.next_recommendation !== 'inspect_evaluation') return evaluation.next_recommendation;
  if (decision) return decision;
  if (evaluation.failed_criteria.length > 0) return 'retry_or_redesign';
  if (evaluation.present) return 'close_or_continue';
  return 'inspect_evaluation';
}

function buildRunCompact(inputPath: string, root: string, options: CompactEvidenceOptions): CompactEvidenceManifest {
  const absoluteInput = isAbsolute(inputPath) ? inputPath : resolve(root, inputPath);
  const { packet, refs, verification } = runPacketInfo(root, absoluteInput);
  const plan = isRecord(packet.plan) ? packet.plan : {};
  const runId = asString(packet.runId);
  const evaluation = summarizeEvaluation(root, options.evaluationPath ?? null);
  const evidence = { promoted: [] as CompactEvidenceRef[], raw: [] as CompactEvidenceRef[] };
  addEvidenceRef(root, evidence, safeRef(root, absoluteInput), 'run_packet');
  if (options.evaluationPath) addEvidenceRef(root, evidence, options.evaluationPath, 'evaluation_envelope');
  refs.forEach((ref) => addEvidenceRef(root, evidence, ref, 'run_artifact_ref'));
  evaluation.evidence_refs.forEach((ref) => addEvidenceRef(root, evidence, ref, 'evaluation_evidence_ref'));
  const candidateNotes = candidateNoteRefs(root, options.candidateNotes ?? []);
  return baseManifest(root, options, {
    subject: {
      kind: 'run',
      source: safeRef(root, absoluteInput),
      plan_slug: sanitizeText(asString(plan.slug), null) || null,
      objective: sanitizeText(asString(plan.goal), null) || null,
      run_id: sanitizeText(runId, null) || null,
      loop_id: null,
      task_id: sanitizeText(asString(packet.taskId), null) || null,
    },
    summary: {
      attempt_count: null,
      attempt_ids: [],
      current_attempt_id: null,
      frontier_attempt_id: null,
      score: null,
      decision: evaluation.decision,
      next_recommendation: recommendationFor(evaluation, evaluation.decision),
    },
    verification,
    evaluation,
    promoted: evidence.promoted,
    raw: evidence.raw,
    candidateNotes,
  });
}

function buildLoopCompact(inputPath: string, root: string, options: CompactEvidenceOptions): CompactEvidenceManifest {
  const absoluteLoopDir = isAbsolute(inputPath) ? inputPath : resolve(root, inputPath);
  const loopPath = join(absoluteLoopDir, 'loop.json');
  const attemptsPath = join(absoluteLoopDir, 'attempts.jsonl');
  const frontierPath = join(absoluteLoopDir, 'frontier.json');
  const loop = readJson(loopPath);
  if (!isRecord(loop) || loop.schema !== EVOLUTION_LOOP_SCHEMA) throw new Error(`Evolution loop must declare schema: ${EVOLUTION_LOOP_SCHEMA}`);
  const frontier = readJson(frontierPath);
  if (!isRecord(frontier) || frontier.schema !== EVOLUTION_FRONTIER_SCHEMA) throw new Error(`Evolution frontier must declare schema: ${EVOLUTION_FRONTIER_SCHEMA}`);
  const attempts = readAttempts(attemptsPath);
  const frontierAttemptId = frontierCurrentAttemptId(frontier);
  const current = attemptById(attempts, frontierAttemptId) ?? latestAttempt(attempts);
  const evaluationRef = options.evaluationPath ?? asString(current?.evaluation) ?? null;
  const evaluation = summarizeEvaluation(root, evaluationRef);
  const evidence = { promoted: [] as CompactEvidenceRef[], raw: [] as CompactEvidenceRef[] };
  addEvidenceRef(root, evidence, safeRef(root, loopPath), 'loop_state');
  addEvidenceRef(root, evidence, safeRef(root, attemptsPath), 'attempt_journal');
  addEvidenceRef(root, evidence, safeRef(root, frontierPath), 'frontier_state');
  if (evaluationRef) addEvidenceRef(root, evidence, evaluationRef, 'evaluation_envelope');
  if (current) {
    asStringArray(current.evidence_refs).forEach((ref) => addEvidenceRef(root, evidence, ref, 'attempt_evidence_ref'));
    asStringArray(current.adapter_receipts).forEach((ref) => addEvidenceRef(root, evidence, ref, 'adapter_receipt'));
    const runPacket = asString(current.run_packet);
    if (runPacket) addEvidenceRef(root, evidence, runPacket, 'run_packet');
  }
  evaluation.evidence_refs.forEach((ref) => addEvidenceRef(root, evidence, ref, 'evaluation_evidence_ref'));
  const currentRunPacket = asString(current?.run_packet);
  let verification: string[] = [];
  if (currentRunPacket) {
    try {
      verification = runPacketInfo(root, resolve(root, currentRunPacket)).verification;
    } catch {
      verification = [];
    }
  }
  const candidateNotes = candidateNoteRefs(root, options.candidateNotes ?? []);
  return baseManifest(root, options, {
    subject: {
      kind: 'evolution_loop',
      source: safeRef(root, absoluteLoopDir),
      plan_slug: sanitizeText(asString(isRecord(loop.subject) ? loop.subject.plan_slug : undefined), null) || null,
      objective: sanitizeText(asString(loop.objective), null) || null,
      run_id: sanitizeText(asString(current?.run_id), null) || null,
      loop_id: sanitizeText(asString(loop.loop_id), null) || null,
      task_id: sanitizeText(asString(isRecord(loop.subject) ? loop.subject.task_id : undefined), null) || null,
    },
    summary: {
      attempt_count: attempts.length,
      attempt_ids: attempts.map((attempt, index) => sanitizeText(asString(attempt.attempt_id), `attempt-${index + 1}`)),
      current_attempt_id: sanitizeText(asString(current?.attempt_id), null) || null,
      frontier_attempt_id: sanitizeText(frontierAttemptId, null) || null,
      score: asNumber(current?.score),
      decision: sanitizeText(asString(current?.decision), null) || evaluation.decision,
      next_recommendation: recommendationFor(evaluation, asString(current?.decision)),
    },
    verification,
    evaluation,
    promoted: evidence.promoted,
    raw: evidence.raw,
    candidateNotes,
  });
}

function candidateNoteRefs(root: string, refs: string[]): Array<CompactEvidenceRef & { canonical: false }> {
  return refs.map((ref) => ({ ...compactRef(root, ref, 'candidate_note', 'Candidate note payload omitted; not canonical attempt/frontier state.'), canonical: false as const }));
}

function baseManifest(root: string, options: CompactEvidenceOptions, parts: {
  subject: CompactEvidenceManifest['subject'];
  summary: CompactEvidenceManifest['summary'];
  verification: string[];
  evaluation: EvaluationSummary;
  promoted: CompactEvidenceRef[];
  raw: CompactEvidenceRef[];
  candidateNotes: Array<CompactEvidenceRef & { canonical: false }>;
}): CompactEvidenceManifest {
  const warnings: string[] = [];
  if (!parts.evaluation.present) warnings.push('No evaluation envelope was supplied or found; inspect acceptance status before closing work.');
  if (parts.evaluation.failed_criteria.length > 0) warnings.push('Failed or non-passing criteria remain visible in compact evidence.');
  if (parts.raw.length > 0) warnings.push('Raw/local evidence payloads are omitted; use digests and local refs for forensic lookup.');
  return {
    schema: COMPACT_EVIDENCE_SCHEMA,
    generated_at: (options.now ?? new Date()).toISOString(),
    subject: parts.subject,
    summary: parts.summary,
    verification_commands: parts.verification,
    evaluation: parts.evaluation,
    promoted_evidence: parts.promoted,
    raw_local_evidence: parts.raw,
    candidate_notes: parts.candidateNotes,
    warnings,
    boundary: {
      raw_payloads_embedded: false,
      raw_payloads_deleted: false,
      external_anchoring: false,
      canonical_attempt_state_mutated: false,
      candidate_notes_are_canonical: false,
    },
  };
}

export function buildCompactEvidence(inputPath: string, root = process.cwd(), options: CompactEvidenceOptions = {}): CompactEvidenceManifest {
  const scaffoldRoot = scaffoldRootFor(inputPath, root);
  const absolute = isAbsolute(inputPath) ? inputPath : resolve(root, inputPath);
  if (!existsSync(absolute)) throw new Error(`Compact evidence source not found: ${inputPath}`);
  if (statSync(absolute).isDirectory()) return buildLoopCompact(absolute, scaffoldRoot, options);
  if (extname(absolute).toLowerCase() === '.json') return buildRunCompact(absolute, scaffoldRoot, options);
  throw new Error('Compact evidence source must be a run packet JSON or an evolution loop directory.');
}

function countsLine(counts: Record<string, number>): string {
  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  return entries.length ? entries.map(([status, count]) => `${status}: ${count}`).join(', ') : 'not supplied';
}

function evidenceLine(ref: CompactEvidenceRef): string {
  const digest = ref.digest_sha256 ? ` sha256=${ref.digest_sha256.slice(0, 12)}…` : '';
  const size = ref.size_bytes !== null ? ` size=${ref.size_bytes}` : '';
  return `- ${ref.role}: \`${ref.ref}\`${digest}${size}`;
}

export function renderCompactEvidenceMarkdown(manifest: CompactEvidenceManifest): string {
  const lines = [
    `# Compact evidence: ${manifest.subject.plan_slug ?? manifest.subject.run_id ?? manifest.subject.loop_id ?? manifest.subject.source}`,
    '',
    '> Compact evidence is a repo-hygiene summary. It omits raw payloads by default, preserves failed criteria, and is not external tamper-proof anchoring.',
    '',
    '## Subject',
    '',
    `- Kind: ${manifest.subject.kind}`,
    `- Source: \`${manifest.subject.source}\``,
    `- Objective: ${manifest.subject.objective ?? 'not supplied'}`,
    `- Run ID: ${manifest.subject.run_id ?? 'n/a'}`,
    `- Loop ID: ${manifest.subject.loop_id ?? 'n/a'}`,
    `- Task ID: ${manifest.subject.task_id ?? 'n/a'}`,
    '',
    '## Attempts / decision',
    '',
    `- Attempt count: ${manifest.summary.attempt_count ?? 'n/a'}`,
    `- Attempt IDs: ${manifest.summary.attempt_ids.length ? manifest.summary.attempt_ids.join(', ') : 'n/a'}`,
    `- Current attempt: ${manifest.summary.current_attempt_id ?? 'n/a'}`,
    `- Frontier attempt: ${manifest.summary.frontier_attempt_id ?? 'n/a'}`,
    `- Score: ${manifest.summary.score ?? 'n/a'}`,
    `- Decision: ${manifest.summary.decision ?? 'inspect'}`,
    `- Next recommendation: ${manifest.summary.next_recommendation}`,
    '',
    '## Evaluation',
    '',
    `- Evaluation: ${manifest.evaluation.present ? `\`${manifest.evaluation.path}\`` : 'not supplied'}`,
    `- Evaluation ID: ${manifest.evaluation.evaluation_id ?? 'n/a'}`,
    `- Status counts: ${countsLine(manifest.evaluation.status_counts)}`,
    `- Evaluators/scorers: ${manifest.evaluation.evaluator_refs.length ? manifest.evaluation.evaluator_refs.join(', ') : 'not supplied'}`,
    `- Decision rationale: ${manifest.evaluation.decision_rationale ?? 'not supplied'}`,
    `- Improvement route: ${manifest.evaluation.improvement_route ?? 'not supplied'}`,
    '',
    '### Failed / non-passing criteria',
    '',
    ...(manifest.evaluation.failed_criteria.length ? manifest.evaluation.failed_criteria.map((criterion) => `- \`${criterion.id}\` ${criterion.status}: ${criterion.text}${criterion.rationale ? ` — ${criterion.rationale}` : ''}`) : ['- None recorded.']),
    '',
    '## Verification commands',
    '',
    ...(manifest.verification_commands.length ? manifest.verification_commands.map((command, index) => `${index + 1}. ${command}`) : ['1. No verification commands supplied in the source run packet.']),
    '',
    '## Evidence manifest',
    '',
    '### Promoted evidence',
    '',
    ...(manifest.promoted_evidence.length ? manifest.promoted_evidence.map(evidenceLine) : ['- None.']),
    '',
    '### Raw/local evidence omitted from public payload',
    '',
    ...(manifest.raw_local_evidence.length ? manifest.raw_local_evidence.map(evidenceLine) : ['- None.']),
    '',
    '### Candidate notes',
    '',
    ...(manifest.candidate_notes.length ? manifest.candidate_notes.map((note) => `${evidenceLine(note)} canonical=false`) : ['- None.']),
    '',
    '## Boundary',
    '',
    `- Raw payloads embedded: ${manifest.boundary.raw_payloads_embedded}`,
    `- Raw payloads deleted: ${manifest.boundary.raw_payloads_deleted}`,
    `- External anchoring: ${manifest.boundary.external_anchoring}`,
    `- Canonical attempt state mutated: ${manifest.boundary.canonical_attempt_state_mutated}`,
    `- Candidate notes are canonical: ${manifest.boundary.candidate_notes_are_canonical}`,
    '',
    '## Warnings',
    '',
    ...(manifest.warnings.length ? manifest.warnings.map((warning) => `- ${warning}`) : ['- None.']),
    '',
  ];
  return lines.join('\n');
}

export function writeCompactEvidence(inputPath: string, outDir: string, root = process.cwd(), options: CompactEvidenceOptions = {}): CompactEvidenceFiles {
  const manifest = buildCompactEvidence(inputPath, root, options);
  const markdown = renderCompactEvidenceMarkdown(manifest);
  const absoluteOutDir = isAbsolute(outDir) ? outDir : resolve(root, outDir);
  mkdirSync(absoluteOutDir, { recursive: true });
  const manifestPath = join(absoluteOutDir, 'compact-evidence.json');
  const summaryPath = join(absoluteOutDir, 'compact-evidence.md');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  writeFileSync(summaryPath, markdown, 'utf8');
  return { manifestPath, summaryPath, manifest, markdown };
}
