import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, isAbsolute, relative, resolve } from 'node:path';
import { parsePlanFile } from './scaffold.js';
import type { ValidationIssue, ValidationResult } from './validation.js';

export const EVALUATION_SCHEMA = 'open-scaffold.evaluation.v1';
const RUN_SCHEMA = 'open-scaffold.run.v1';

const CRITERION_STATUSES = new Set(['pass', 'partial', 'fail', 'blocked', 'not_evaluated']);
const EVALUATOR_KINDS = new Set(['human', 'maintainer', 'reviewer', 'ci', 'automated-check', 'adapter', 'domain-tool', 'domain-oracle', 'external-evaluator', 'external-review']);
const DECISION_STATUSES = new Set(['approved', 'weak_approved', 'rejected', 'blocked']);
const IMPROVEMENT_ROUTES = new Set(['close', 'retry_run', 'amend_plan', 'create_next_slice', 'open_issue', 'update_roadmap', 'block']);
const NON_PASS_ROUTES = new Set(['retry_run', 'amend_plan', 'create_next_slice', 'open_issue', 'update_roadmap', 'block']);
const EVIDENCE_KINDS = new Set(['path', 'url', 'command', 'pr', 'issue', 'ci', 'screenshot', 'manual-review', 'comment', 'other']);

export interface EvaluationSource {
  kind: 'plan' | 'run';
  sourcePath: string;
  planPath: string;
  planSlug: string;
  taskId: string | null;
  runId: string | null;
  runPacketPath: string | null;
  acceptanceCriteria: string[];
  evidencePaths: string[];
}

export interface RenderEvaluationOptions {
  now?: Date;
}

export type ExternalScorerAdapter = '2000m-v1';

export const EXTERNAL_SCORER_ADAPTERS: ExternalScorerAdapter[] = ['2000m-v1'];

export interface RenderImportedEvaluationOptions extends RenderEvaluationOptions {
  adapter?: ExternalScorerAdapter;
}

interface CriterionIdentity {
  id: string;
  idSource: 'explicit' | 'fallback';
  text: string;
  sourceIndex: number;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
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

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'y', 'pass', 'passed', 'ok', 'success'].includes(normalized)) return true;
    if (['false', 'no', 'n', 'fail', 'failed', 'error', 'blocked'].includes(normalized)) return false;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function valueFor(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  }
  return undefined;
}

function requiredNumber(record: Record<string, unknown>, keys: string[], label: string): number {
  const value = asNumber(valueFor(record, keys));
  if (value === null) throw new Error(`External scorer output is missing numeric ${label}.`);
  return value;
}

function sanitizeScorerText(value: unknown, fallback = ''): string {
  const raw = typeof value === 'string' ? value : fallback;
  return raw
    .replace(/\b[A-Za-z]:\\[^\s,;)\]]+/g, '[local-path omitted]')
    .replace(/(^|[\s("'`=:])\/(?!\/)(?:[A-Za-z0-9._-]+\/)+[^\s,;)\]}'"]+/g, '$1[local-path omitted]')
    .replace(/\/(?:Users|home|tmp|private|var|Volumes)\/[^\s,;)\]]+/g, '[local-path omitted]')
    .trim()
    .slice(0, 1000);
}

function sanitizeScorerKey(key: string): string {
  const sanitized = sanitizeScorerText(key)
    .replace(/\[local-path omitted\]/g, 'local_path_omitted')
    .replace(/[^A-Za-z0-9._:-]/g, '_')
    .slice(0, 120);
  return sanitized || 'omitted';
}

function sanitizeScorerId(value: unknown, index: number): string {
  const raw = asString(value);
  if (!meaningfulString(raw)) throw new Error(`External scorer AC ${index + 1} is missing id.`);
  const sanitized = sanitizeScorerText(raw)
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._:-]/g, '_')
    .slice(0, 80);
  if (!meaningfulString(sanitized) || sanitized.includes('local-path') || sanitized.includes('local_path_omitted')) {
    throw new Error(`External scorer AC ${index + 1} has an unsafe id.`);
  }
  const normalizedAcId = sanitized.match(/^AC[-_]?(\d+)$/i);
  if (normalizedAcId) return `AC${normalizedAcId[1]}`;
  return sanitized;
}

function sanitizeScorerJsonValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return sanitizeScorerText(value);
  if (depth > 4) return '[nested scorer data omitted]';
  if (Array.isArray(value)) {
    const items = value.slice(0, 50).map((item) => sanitizeScorerJsonValue(item, depth + 1));
    if (value.length > 50) items.push(`[${value.length - 50} scorer item(s) omitted]`);
    return items;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value).slice(0, 50).map(([key, nested]) => [sanitizeScorerKey(key), sanitizeScorerJsonValue(nested, depth + 1)]);
    if (Object.keys(value).length > 50) entries.push(['omitted_keys', `${Object.keys(value).length - 50} scorer key(s) omitted`]);
    return Object.fromEntries(entries);
  }
  return value;
}

function scorerInputEvidence(root: string, scorerPath: string) {
  const absoluteScorer = isAbsolute(scorerPath) ? scorerPath : resolve(root, scorerPath);
  const comparableRoot = existsSync(root) ? realpathSync(root) : resolve(root);
  const comparableScorer = existsSync(absoluteScorer) ? realpathSync(absoluteScorer) : absoluteScorer;
  const rel = relative(comparableRoot, comparableScorer);
  if (rel && !rel.startsWith('..') && !isAbsolute(rel)) {
    return { kind: 'path', ref: rel, summary: 'External scorer JSON imported into this evaluation envelope.' };
  }
  return { kind: 'other', ref: 'external-scorer:2000m-v1:input', summary: 'External scorer JSON imported without embedding a local absolute path.' };
}

function pathRelativeToRoot(root: string, path: string): string {
  const absolute = isAbsolute(path) ? path : resolve(root, path);
  const comparableRoot = existsSync(root) ? realpathSync(root) : resolve(root);
  const comparablePath = existsSync(absolute) ? realpathSync(absolute) : absolute;
  const rel = relative(comparableRoot, comparablePath);
  if (!rel || rel.startsWith('..')) return path;
  return rel;
}

function timestampId(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function digest(parts: string[]): string {
  return createHash('sha256').update(parts.join('\n'), 'utf8').digest('hex').slice(0, 16);
}

function stripExplicitId(text: string): { id: string | null; text: string } {
  const patterns = [
    /^\s*`?(AC[-_]?\d+)`?\s*[:—-]\s*(.+)$/i,
    /^\s*\[(AC[-_]?\d+)\]\s*(.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return { id: match[1].replace(/[-_]/g, '').toUpperCase(), text: match[2].trim() };
  }
  return { id: null, text };
}

function criterionIdentities(criteria: string[]): CriterionIdentity[] {
  const used = new Set<string>();
  return criteria.map((raw, index) => {
    const parsed = stripExplicitId(raw);
    let id = parsed.id ?? `AC${index + 1}`;
    if (used.has(id)) {
      let candidate = 1;
      do {
        id = `AC${candidate}`;
        candidate += 1;
      } while (used.has(id));
    }
    used.add(id);
    return {
      id,
      idSource: parsed.id ? 'explicit' : 'fallback',
      text: parsed.text,
      sourceIndex: index + 1,
    };
  });
}

function sourceFromRunPacket(sourcePath: string, root: string): EvaluationSource {
  const packet = readJson(sourcePath);
  if (!isRecord(packet) || packet.schemaVersion !== RUN_SCHEMA) {
    throw new Error(`Run packet must declare schemaVersion: ${RUN_SCHEMA}`);
  }
  const plan = isRecord(packet.plan) ? packet.plan : {};
  const artifacts = isRecord(packet.artifacts) ? packet.artifacts : {};
  const planPath = asString(plan.path) ?? '(unknown plan)';
  return {
    kind: 'run',
    sourcePath: pathRelativeToRoot(root, sourcePath),
    planPath,
    planSlug: asString(plan.slug) ?? basename(planPath, extname(planPath)),
    taskId: asString(packet.taskId),
    runId: asString(packet.runId),
    runPacketPath: pathRelativeToRoot(root, sourcePath),
    acceptanceCriteria: asStringArray(plan.acceptanceCriteria),
    evidencePaths: asStringArray(artifacts.evidence),
  };
}

function sourceFromPlan(sourcePath: string, root: string): EvaluationSource {
  const plan = parsePlanFile(sourcePath);
  return {
    kind: 'plan',
    sourcePath: pathRelativeToRoot(root, sourcePath),
    planPath: pathRelativeToRoot(root, sourcePath),
    planSlug: plan.slug,
    taskId: null,
    runId: null,
    runPacketPath: null,
    acceptanceCriteria: plan.acceptanceCriteria,
    evidencePaths: [],
  };
}

export function loadEvaluationSource(sourcePath: string, root = process.cwd()): EvaluationSource {
  const absolute = isAbsolute(sourcePath) ? sourcePath : resolve(root, sourcePath);
  if (!existsSync(absolute)) throw new Error(`Evaluation source not found: ${sourcePath}`);
  if (extname(absolute).toLowerCase() === '.json') return sourceFromRunPacket(absolute, root);
  return sourceFromPlan(absolute, root);
}

export function renderEvaluationEnvelope(source: EvaluationSource, options: RenderEvaluationOptions = {}): string {
  const now = options.now ?? new Date();
  const createdAt = now.toISOString();
  const stamp = timestampId(now);
  const criteria = criterionIdentities(source.acceptanceCriteria);
  const envelope = {
    schema: EVALUATION_SCHEMA,
    evaluation_id: `${stamp}-${source.runId ?? source.planSlug}-eval`,
    idempotency_key: `eval:${source.kind}:${source.runId ?? source.planSlug}:${digest(source.acceptanceCriteria)}`,
    created_at: createdAt,
    evaluated_at: null,
    subject: {
      source: source.kind,
      plan: source.planPath,
      plan_slug: source.planSlug,
      task_id: source.taskId,
      run_id: source.runId,
      run_packet: source.runPacketPath,
    },
    correlation: {
      task_id: source.taskId,
      run_id: source.runId,
      evidence_receipt_ids: [],
      feedback_ids: [],
    },
    inputs: {
      run_packet: source.runPacketPath,
      evidence: source.evidencePaths.map((ref) => ({ kind: 'path', ref, summary: 'Evidence from run packet.' })),
      feedback: [],
    },
    acceptance_criteria: criteria.map((criterion) => ({
      id: criterion.id,
      id_source: criterion.idSource,
      source_index: criterion.sourceIndex,
      text: criterion.text,
      status: 'not_evaluated',
      evaluator: {
        kind: 'unspecified',
        name: null,
        ref: null,
      },
      evidence: [],
      rationale: '',
      confidence: 'low',
      gaps: [],
      feedback_refs: [],
      correction: {
        route: null,
        target: null,
        rationale: '',
      },
    })),
    verification: [],
    decision: {
      status: null,
      approver: null,
      rationale: '',
    },
    improvement: {
      route: null,
      target: null,
      carried_forward: [],
      do_not_assume: ['This envelope does not certify correctness, compliance, production readiness, or model quality.'],
    },
    notes: [
      'This envelope records acceptance-criteria-to-evidence coverage and routing. It does not certify correctness, compliance, production readiness, or model quality.',
    ],
  };
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

function determinismVerdict(value: unknown): { pass: boolean | null; label: string | null } {
  if (isRecord(value)) {
    const pass = asBoolean(valueFor(value, ['pass', 'passed', 'ok', 'deterministic']));
    const label = asString(valueFor(value, ['verdict', 'status', 'label', 'detail'])) ?? (pass === null ? null : pass ? 'PASS' : 'FAIL');
    return { pass, label: sanitizeScorerText(label ?? '') || null };
  }
  const pass = asBoolean(value);
  const label = typeof value === 'string' ? sanitizeScorerText(value) : pass === null ? null : pass ? 'PASS' : 'FAIL';
  return { pass, label };
}

function normalizeScorerCriterion(raw: unknown, index: number) {
  if (!isRecord(raw)) throw new Error(`External scorer AC ${index + 1} must be an object.`);
  const id = sanitizeScorerId(valueFor(raw, ['id', 'ac', 'criterionId', 'criterion_id']), index);
  const name = asString(valueFor(raw, ['name', 'text', 'title', 'criterion']));
  if (!meaningfulString(name)) throw new Error(`External scorer AC ${id} is missing name/text.`);
  const pass = asBoolean(valueFor(raw, ['pass', 'passed', 'ok', 'status']));
  const skipped = asBoolean(valueFor(raw, ['skipped', 'skip', 'isSkipped'])) ?? (asString(valueFor(raw, ['status']))?.toLowerCase() === 'skipped');
  if (pass === null && !skipped) throw new Error(`External scorer AC ${id} is missing pass/skipped state.`);
  const detail = sanitizeScorerText(valueFor(raw, ['detail', 'details', 'message', 'summary', 'rationale']));
  const quality = sanitizeScorerJsonValue(valueFor(raw, ['quality', 'qualityScore', 'quality_score']));
  const breakdown = sanitizeScorerJsonValue(valueFor(raw, ['breakdown', 'scoreBreakdown', 'score_breakdown']));
  const explicitSensitivity = asString(valueFor(raw, ['score_sensitivity', 'scoreSensitivity', 'sensitivity']));
  const probeOnly = asBoolean(valueFor(raw, ['probe_only', 'probeOnly'])) === true;
  return {
    id,
    name: sanitizeScorerText(name),
    pass: pass === true,
    skipped,
    detail,
    quality,
    breakdown,
    scoreSensitivity: explicitSensitivity ? sanitizeScorerText(explicitSensitivity) : skipped ? 'none' : 'unknown',
    probeOnly,
  };
}

function load2000mV1Scorer(path: string) {
  const parsed = readJson(path);
  if (!isRecord(parsed)) throw new Error('External scorer output must be a JSON object.');
  const acsRaw = valueFor(parsed, ['acs', 'acceptance_criteria', 'acceptanceCriteria', 'criteria']);
  if (!Array.isArray(acsRaw) || acsRaw.length === 0) {
    throw new Error('2000m-v1 scorer output must include a non-empty acs array.');
  }
  const passCount = requiredNumber(parsed, ['passCount', 'pass_count', 'passedAcs', 'passed_acs'], 'passCount');
  const totalAcs = requiredNumber(parsed, ['totalAcs', 'total_acs', 'totalACs'], 'totalAcs');
  const acs = acsRaw.map((item, index) => normalizeScorerCriterion(item, index));
  const computedPassCount = acs.filter((criterion) => criterion.pass).length;
  if (totalAcs !== acs.length) {
    throw new Error(`2000m-v1 scorer totalAcs (${totalAcs}) does not match acs length (${acs.length}).`);
  }
  if (passCount !== computedPassCount) {
    throw new Error(`2000m-v1 scorer passCount (${passCount}) does not match passed AC count (${computedPassCount}).`);
  }
  const determinism = determinismVerdict(valueFor(parsed, ['determinism', 'determinismPass', 'determinism_pass', 'deterministic']));
  const compositeScore = asNumber(valueFor(parsed, ['composite', 'compositeScore', 'composite_score', 'score']));
  return {
    passCount,
    totalAcs,
    acs,
    determinism,
    compositeScore,
  };
}

function validateScorerCoverage(source: EvaluationSource, scorer: ReturnType<typeof load2000mV1Scorer>): void {
  const expectedCriteria = criterionIdentities(source.acceptanceCriteria);
  const expected = expectedCriteria.map((criterion) => criterion.id);
  if (expected.length === 0) {
    throw new Error('External scorer import requires source acceptance criteria to compare coverage.');
  }
  const actual = scorer.acs.map((criterion) => criterion.id);
  const missing = expected.filter((id) => !actual.includes(id));
  const extra = actual.filter((id) => !expected.includes(id));
  if (actual.length !== expected.length || missing.length > 0 || extra.length > 0) {
    const details = [
      missing.length > 0 ? `missing ${missing.join(', ')}` : null,
      extra.length > 0 ? `extra ${extra.join(', ')}` : null,
    ].filter(Boolean).join('; ');
    throw new Error(`External scorer AC coverage does not match source acceptance criteria${details ? ` (${details})` : ''}.`);
  }
  const normalized = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
  const expectedTextById = new Map(expectedCriteria.map((criterion) => [criterion.id, normalized(criterion.text)]));
  const mismatched = scorer.acs
    .filter((criterion) => expectedTextById.get(criterion.id) !== normalized(criterion.name))
    .map((criterion) => criterion.id);
  if (mismatched.length > 0) {
    throw new Error(`External scorer AC text does not match source acceptance criteria (${mismatched.join(', ')}).`);
  }
}

function importedCriterionStatus(criterion: ReturnType<typeof normalizeScorerCriterion>): 'pass' | 'fail' | 'not_evaluated' {
  if (criterion.skipped || criterion.probeOnly) return 'not_evaluated';
  if (criterion.pass) return 'pass';
  return 'fail';
}

function correctionForImportedCriterion(criterion: ReturnType<typeof normalizeScorerCriterion>) {
  if (criterion.skipped || criterion.probeOnly) {
    return { route: 'block', target: null, rationale: 'External scorer did not evaluate or cannot mechanically pass this criterion; inspect the scorer, criterion, or artifact shape.' };
  }
  if (criterion.pass) return { route: null, target: null, rationale: '' };
  return { route: 'retry_run', target: null, rationale: 'External scorer reported this criterion as not passed; retry or revise the run before approval.' };
}

export function renderImportedEvaluationEnvelope(source: EvaluationSource, scorerPath: string, root = process.cwd(), options: RenderImportedEvaluationOptions = {}): string {
  const adapter = options.adapter ?? '2000m-v1';
  if (adapter !== '2000m-v1') throw new Error(`Unsupported external scorer adapter: ${adapter}`);
  const absoluteScorerPath = isAbsolute(scorerPath) ? scorerPath : resolve(root, scorerPath);
  const scorer = load2000mV1Scorer(absoluteScorerPath);
  validateScorerCoverage(source, scorer);
  const now = options.now ?? new Date();
  const createdAt = now.toISOString();
  const stamp = timestampId(now);
  const hasSkipped = scorer.acs.some((criterion) => criterion.skipped || criterion.probeOnly);
  const hasFailed = scorer.acs.some((criterion) => !criterion.pass && !criterion.skipped && !criterion.probeOnly);
  const allPass = scorer.acs.every((criterion) => criterion.pass && !criterion.skipped && !criterion.probeOnly);
  const determinismFailed = scorer.determinism.pass === false;
  const decisionStatus = allPass && !determinismFailed ? 'approved' : hasSkipped || determinismFailed ? 'blocked' : 'rejected';
  const improvementRoute = decisionStatus === 'approved' ? 'close' : decisionStatus === 'blocked' ? 'block' : 'retry_run';
  const scoreSummary = scorer.compositeScore === null ? 'composite score unavailable' : `composite ${scorer.compositeScore}`;
  const determinismSummary = scorer.determinism.label ?? 'not reported';
  const envelope = {
    schema: EVALUATION_SCHEMA,
    evaluation_id: `${stamp}-${source.runId ?? source.planSlug}-2000m-v1-eval`,
    idempotency_key: `eval:import:${adapter}:${source.runId ?? source.planSlug}:${digest([JSON.stringify(scorer.acs), String(scorer.passCount), String(scorer.totalAcs), String(scorer.compositeScore ?? ''), String(scorer.determinism.pass ?? ''), scorer.determinism.label ?? ''])}`,
    created_at: createdAt,
    evaluated_at: createdAt,
    subject: {
      source: source.kind,
      plan: source.planPath,
      plan_slug: source.planSlug,
      task_id: source.taskId,
      run_id: source.runId,
      run_packet: source.runPacketPath,
    },
    correlation: {
      task_id: source.taskId,
      run_id: source.runId,
      evidence_receipt_ids: [],
      feedback_ids: [],
    },
    inputs: {
      run_packet: source.runPacketPath,
      evidence: [scorerInputEvidence(root, scorerPath)],
      feedback: [],
    },
    acceptance_criteria: scorer.acs.map((criterion, index) => {
      const status = importedCriterionStatus(criterion);
      const reason = criterion.skipped ? 'skipped' : criterion.probeOnly ? 'probe_only' : status === 'pass' ? 'passed' : 'failed';
      return {
        id: criterion.id,
        id_source: 'external-scorer',
        source_index: index + 1,
        text: criterion.name,
        status,
        evaluator: {
          kind: 'domain-tool',
          name: '2000m-v1 scorer',
          ref: 'external-scorer:2000m-v1',
        },
        evidence: [{ kind: 'other', ref: `external-scorer:2000m-v1:${criterion.id}`, summary: `Scorer result: ${reason}; ${scoreSummary}.` }],
        rationale: criterion.detail || `External scorer reported ${criterion.id} as ${reason}.`,
        confidence: 'medium',
        gaps: status === 'pass' ? [] : [`External scorer reported ${criterion.id} as ${reason}.`],
        feedback_refs: [],
        correction: correctionForImportedCriterion(criterion),
        analysis: {
          source: 'external-scorer',
          adapter,
          pass: criterion.pass,
          skipped: criterion.skipped,
          probe_only: criterion.probeOnly,
          quality: criterion.quality ?? null,
          detail: criterion.detail || null,
          breakdown: criterion.breakdown ?? null,
          score_sensitivity: criterion.scoreSensitivity,
          reasons: [
            ...(criterion.skipped ? ['skipped'] : []),
            ...(criterion.probeOnly ? ['probe_only'] : []),
          ],
          scorer_summary: {
            pass_count: scorer.passCount,
            total_acs: scorer.totalAcs,
            composite_score: scorer.compositeScore,
            determinism: determinismSummary,
          },
        },
      };
    }),
    verification: [
      {
        id: 'external-scorer-2000m-v1-summary',
        kind: 'external-scorer',
        status: allPass ? 'pass' : 'fail',
        summary: `2000m-v1 scorer reported ${scorer.passCount}/${scorer.totalAcs} ACs passed; ${scoreSummary}.`,
        evidence: [{ kind: 'other', ref: 'external-scorer:2000m-v1:summary', summary: 'Structured scorer output was imported; raw scorer output is not embedded.' }],
      },
      {
        id: 'external-scorer-2000m-v1-determinism',
        kind: 'external-scorer',
        status: scorer.determinism.pass === true ? 'pass' : scorer.determinism.pass === false ? 'fail' : 'not_evaluated',
        summary: `Determinism verdict: ${determinismSummary}.`,
        evidence: [{ kind: 'other', ref: 'external-scorer:2000m-v1:determinism', summary: 'Determinism is scorer metadata, not acceptance approval.' }],
      },
    ],
    decision: {
      status: decisionStatus,
      approver: 'external-scorer-import',
      rationale: decisionStatus === 'approved'
        ? 'All imported mechanical criteria passed. This does not certify domain correctness beyond the external scorer output.'
        : `Imported scorer evidence has non-pass criteria${determinismFailed ? ' or failed determinism metadata' : ''}; do not approve this evaluation.`,
    },
    improvement: {
      route: improvementRoute,
      target: null,
      carried_forward: [
        ...(hasFailed ? ['External scorer reported at least one failed criterion.'] : []),
        ...(hasSkipped ? ['External scorer skipped or marked at least one criterion as probe-only/non-mechanical.'] : []),
        ...(determinismFailed ? ['External scorer determinism metadata failed.'] : []),
      ],
      do_not_assume: [
        'This imported envelope records external scorer evidence only; Open Scaffold does not become the scorer.',
        'Do not treat composite score or determinism metadata as acceptance approval.',
      ],
    },
    notes: [
      'Imported from 2000m-v1 external scorer JSON. Open Scaffold maps scorer evidence into an evaluation envelope; it does not certify correctness, compliance, production readiness, or model quality.',
    ],
  };
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

export function writeImportedEvaluationEnvelope(sourcePath: string, scorerPath: string, outPath: string, root = process.cwd(), options: RenderImportedEvaluationOptions = {}): { path: string } {
  const source = loadEvaluationSource(sourcePath, root);
  const absoluteOut = isAbsolute(outPath) ? outPath : resolve(root, outPath);
  writeFileSync(absoluteOut, renderImportedEvaluationEnvelope(source, scorerPath, root, options), { encoding: 'utf8', flag: 'wx' });
  return { path: absoluteOut };
}

export function writeEvaluationEnvelope(sourcePath: string, outPath: string, root = process.cwd(), options: RenderEvaluationOptions = {}): { path: string } {
  const source = loadEvaluationSource(sourcePath, root);
  const absoluteOut = isAbsolute(outPath) ? outPath : resolve(root, outPath);
  writeFileSync(absoluteOut, renderEvaluationEnvelope(source, options), { encoding: 'utf8', flag: 'wx' });
  return { path: absoluteOut };
}

function issue(level: 'fail' | 'warn', code: string, message: string, path?: string): ValidationIssue {
  return { level, code, message, path };
}

function meaningfulString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const cleaned = value.trim();
  if (!cleaned) return false;
  if (/^(todo|tbd|n\/a|none|path\/or\/link|approved \| weak_approved \| rejected \| blocked)$/i.test(cleaned)) return false;
  return true;
}

function hasEvidence(criteria: Record<string, unknown>): boolean {
  if (!Array.isArray(criteria.evidence)) return false;
  return criteria.evidence.some((item) => {
    if (!isRecord(item)) return false;
    const kind = asString(item.kind) ?? 'path';
    return EVIDENCE_KINDS.has(kind) && meaningfulString(item.ref);
  });
}

function routeOf(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return asString(value.route);
}

function isInsideRoot(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function validateEvidencePaths(criteria: Record<string, unknown>, failures: ValidationIssue[], warnings: ValidationIssue[], envelopePath: string | undefined, root: string): void {
  const evidence = Array.isArray(criteria.evidence) ? criteria.evidence : [];
  const rootReal = existsSync(root) ? realpathSync(root) : resolve(root);
  for (const item of evidence) {
    if (!isRecord(item)) {
      failures.push(issue('fail', 'evaluation.evidence.invalid', 'Evidence entries must be objects.', envelopePath));
      continue;
    }
    const kind = asString(item.kind) ?? 'path';
    const ref = asString(item.ref);
    if (!EVIDENCE_KINDS.has(kind)) {
      failures.push(issue('fail', 'evaluation.evidence.invalid_kind', `Unsupported evidence kind: ${kind}`, envelopePath));
      continue;
    }
    if (!meaningfulString(ref)) {
      failures.push(issue('fail', 'evaluation.evidence.missing_ref', 'Evidence entry is missing a ref.', envelopePath));
      continue;
    }
    if (kind === 'path') {
      const evidencePath = isAbsolute(ref) ? ref : resolve(rootReal, ref);
      if (!isInsideRoot(rootReal, evidencePath)) {
        failures.push(issue('fail', 'evaluation.evidence.path_outside_root', `Local evidence path escapes the repo root: ${ref}`, envelopePath));
        continue;
      }
      if (!existsSync(evidencePath)) {
        failures.push(issue('fail', 'evaluation.evidence.path_missing', `Local evidence path does not exist: ${ref}`, envelopePath));
        continue;
      }
      const evidenceReal = realpathSync(evidencePath);
      if (!isInsideRoot(rootReal, evidenceReal)) {
        failures.push(issue('fail', 'evaluation.evidence.path_outside_root', `Local evidence path escapes the repo root: ${ref}`, envelopePath));
      }
    } else if (['url', 'pr', 'issue', 'ci'].includes(kind)) {
      warnings.push(issue('warn', 'evaluation.evidence.external_unverified', `External evidence ref was not fetched: ${ref}`, envelopePath));
    }
  }
}

export function validateEvaluationEnvelopeText(text: string, path?: string, root = process.cwd()): ValidationResult {
  const failures: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    failures.push(issue('fail', 'evaluation.json.invalid', error instanceof Error ? error.message : 'Invalid JSON.', path));
    return { ok: false, failures, warnings };
  }

  if (!isRecord(parsed)) {
    failures.push(issue('fail', 'evaluation.schema.invalid', 'Evaluation envelope must be a JSON object.', path));
    return { ok: false, failures, warnings };
  }

  const schema = asString(parsed.schema) ?? asString(parsed.schemaVersion);
  if (schema !== EVALUATION_SCHEMA) {
    failures.push(issue('fail', 'evaluation.schema.missing', `Evaluation envelope must declare schema: ${EVALUATION_SCHEMA}.`, path));
  }

  const criteria = Array.isArray(parsed.acceptance_criteria) ? parsed.acceptance_criteria : null;
  if (!criteria || criteria.length === 0) {
    failures.push(issue('fail', 'evaluation.criteria.missing', 'Evaluation envelope must include acceptance_criteria.', path));
  }

  const criterionIds = new Set<string>();
  let hasNonPass = false;
  if (criteria) {
    for (let index = 0; index < criteria.length; index += 1) {
      const rawCriterion = criteria[index];
      if (!isRecord(rawCriterion)) {
        failures.push(issue('fail', 'evaluation.criteria.invalid', `Criterion ${index + 1} must be an object.`, path));
        continue;
      }
      const id = asString(rawCriterion.id);
      if (!meaningfulString(id)) {
        failures.push(issue('fail', 'evaluation.criteria.missing_id', `Criterion ${index + 1} is missing id.`, path));
      } else if (criterionIds.has(id)) {
        failures.push(issue('fail', 'evaluation.criteria.duplicate_id', `Duplicate criterion id: ${id}`, path));
      } else {
        criterionIds.add(id);
      }

      const status = asString(rawCriterion.status);
      if (!meaningfulString(status)) {
        failures.push(issue('fail', 'evaluation.criteria.missing_status', `Criterion ${id ?? index + 1} is missing status.`, path));
      } else if (!CRITERION_STATUSES.has(status)) {
        failures.push(issue('fail', 'evaluation.criteria.invalid_status', `Criterion ${id ?? index + 1} has invalid status: ${status}`, path));
      } else if (status !== 'pass') {
        hasNonPass = true;
      }

      const evaluator = isRecord(rawCriterion.evaluator) ? rawCriterion.evaluator : null;
      const evaluatorKind = evaluator ? asString(evaluator.kind) : null;
      if (!evaluatorKind || evaluatorKind === 'unspecified' || !EVALUATOR_KINDS.has(evaluatorKind)) {
        failures.push(issue('fail', 'evaluation.criteria.missing_evaluator', `Criterion ${id ?? index + 1} must record a valid evaluator source.`, path));
      }

      const rationale = rawCriterion.rationale;
      const hasRationale = meaningfulString(rationale);
      const criterionHasEvidence = hasEvidence(rawCriterion);
      if (!criterionHasEvidence && !hasRationale) {
        failures.push(issue('fail', 'evaluation.criteria.missing_evidence_or_rationale', `Criterion ${id ?? index + 1} must include evidence or rationale.`, path));
      }
      if (status === 'pass' && !criterionHasEvidence) {
        failures.push(issue('fail', 'evaluation.criteria.pass_missing_evidence', `Criterion ${id ?? index + 1} has status pass but no evidence.`, path));
      }
      validateEvidencePaths(rawCriterion, failures, warnings, path, root);

      if (status && status !== 'pass') {
        const route = routeOf(rawCriterion.correction);
        if (!route || !NON_PASS_ROUTES.has(route)) {
          failures.push(issue('fail', 'evaluation.criteria.missing_correction_route', `Criterion ${id ?? index + 1} must route non-pass outcomes to retry, amendment, next slice, issue, roadmap, or block.`, path));
        }
      }
    }
  }

  const feedback = isRecord(parsed.inputs) && Array.isArray(parsed.inputs.feedback) ? parsed.inputs.feedback : [];
  const feedbackIds = new Set<string>();
  for (const item of feedback) {
    if (!isRecord(item)) continue;
    const id = asString(item.id) ?? asString(item.idempotency_key);
    if (id) {
      if (feedbackIds.has(id)) failures.push(issue('fail', 'evaluation.feedback.duplicate_id', `Duplicate feedback id: ${id}`, path));
      feedbackIds.add(id);
    }
    const target = asString(item.target);
    if (target && !criterionIds.has(target)) {
      failures.push(issue('fail', 'evaluation.feedback.unknown_target', `Feedback target does not match a criterion id: ${target}`, path));
    }
  }

  const decision = isRecord(parsed.decision) ? parsed.decision : null;
  const decisionStatus = decision ? asString(decision.status) : null;
  if (!decisionStatus || !DECISION_STATUSES.has(decisionStatus)) {
    failures.push(issue('fail', 'evaluation.decision.invalid_status', 'Decision status must be approved, weak_approved, rejected, or blocked.', path));
  }
  if (decisionStatus === 'approved' && hasNonPass) {
    failures.push(issue('fail', 'evaluation.decision.approved_with_non_pass', 'Decision cannot be approved while any criterion is partial, fail, blocked, or not_evaluated.', path));
  }
  const improvement = isRecord(parsed.improvement) ? parsed.improvement : null;
  const improvementRoute = improvement ? asString(improvement.route) : null;
  if (!improvementRoute || !IMPROVEMENT_ROUTES.has(improvementRoute)) {
    failures.push(issue('fail', 'evaluation.improvement.missing_route', 'Improvement route must be close, retry_run, amend_plan, create_next_slice, open_issue, update_roadmap, or block.', path));
  }
  if (hasNonPass && (!improvementRoute || !NON_PASS_ROUTES.has(improvementRoute))) {
    failures.push(issue('fail', 'evaluation.improvement.non_pass_close', 'Non-pass criteria require a non-close improvement route.', path));
  }
  if (decisionStatus === 'weak_approved') {
    warnings.push(issue('warn', 'evaluation.decision.weak_approval', 'Weak approval is explicit and must be carried forward as caution.', path));
    const carriedForward = improvement && Array.isArray(improvement.carried_forward) ? improvement.carried_forward : [];
    const doNotAssume = improvement && Array.isArray(improvement.do_not_assume) ? improvement.do_not_assume : [];
    if (carriedForward.length === 0 && doNotAssume.length === 0) {
      failures.push(issue('fail', 'evaluation.decision.weak_approval_missing_caution', 'Weak approval must carry forward a caution or do_not_assume note.', path));
    }
  }

  return { ok: failures.length === 0, failures, warnings };
}

export function validateEvaluationEnvelopeFile(path: string, root = process.cwd()): ValidationResult {
  if (!existsSync(path)) {
    return { ok: false, failures: [issue('fail', 'evaluation.file_missing', `Evaluation envelope not found: ${path}`, path)], warnings: [] };
  }
  try {
    if (!statSync(path).isFile()) {
      return { ok: false, failures: [issue('fail', 'evaluation.file_not_file', `Evaluation envelope path is not a file: ${path}`, path)], warnings: [] };
    }
    return validateEvaluationEnvelopeText(readFileSync(path, 'utf8'), path, root);
  } catch (error) {
    return {
      ok: false,
      failures: [issue('fail', 'evaluation.file_unreadable', error instanceof Error ? error.message : `Could not read evaluation envelope: ${path}`, path)],
      warnings: [],
    };
  }
}
