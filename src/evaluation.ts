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
