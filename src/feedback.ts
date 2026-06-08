import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { appendJsonLineUnder, isInside, readJsonlUnder, toPosix, writeJsonUnder, writeFileUnder } from './path-safety.js';

export const FEEDBACK_SCHEMA = 'osc.feedback.v1';
export const FEEDBACK_ANALYSIS_SCHEMA = 'osc.feedback-analysis.v1';

export type FeedbackSource = 'human' | 'tests' | 'reviewer' | 'benchmark' | 'runtime' | 'codex' | 'hermes';
export type FeedbackVerdict = 'pass' | 'retry' | 'reject' | 'block' | 'improve';
export type FeedbackScope = 'run' | 'plan' | 'command' | 'docs' | 'benchmark' | 'runtime';

const SOURCES = new Set<FeedbackSource>(['human', 'tests', 'reviewer', 'benchmark', 'runtime', 'codex', 'hermes']);
const VERDICTS = new Set<FeedbackVerdict>(['pass', 'retry', 'reject', 'block', 'improve']);
const SCOPES = new Set<FeedbackScope>(['run', 'plan', 'command', 'docs', 'benchmark', 'runtime']);

export interface FeedbackInput {
  repoRoot?: string;
  runId: string;
  source: FeedbackSource;
  verdict: FeedbackVerdict;
  scope: FeedbackScope;
  whatHappened: string;
  whyItMatters: string;
  repairHypothesis?: string;
  evidencePaths?: string[];
  nextAction: string;
}

export interface FeedbackRecord {
  schema: typeof FEEDBACK_SCHEMA;
  id: string;
  runId: string;
  recordedAt: string;
  source: FeedbackSource;
  verdict: FeedbackVerdict;
  scope: FeedbackScope;
  whatHappened: string;
  whyItMatters: string;
  repairHypothesis: string | null;
  evidencePaths: string[];
  nextAction: string;
  boundary: {
    feedback_is_not_approval: true;
    human_feedback_is_task_input_or_learning_signal_only: true;
    requires_owner_gate_for_merge_publish_release: true;
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string, fallback = 'item'): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return slug || fallback;
}

function safeRunId(runId: string): string {
  if (!/^[a-zA-Z0-9_.-]+$/.test(runId)) throw new Error(`runId must be a safe id: ${runId}`);
  return runId;
}

function safeRef(ref: string): string {
  if (!ref || typeof ref !== 'string') throw new Error('evidence path must be a non-empty string');
  if (/^[a-z]+:\/\//i.test(ref)) {
    if (!/^https?:\/\//i.test(ref)) throw new Error(`evidence URL must be http(s), not a local/private scheme: ${ref}`);
    return ref;
  }
  if (isAbsolute(ref)) throw new Error(`evidence path must be repo-relative or URL: ${ref}`);
  const normalized = toPosix(ref).replace(/^\.\//, '');
  if (normalized === '..' || normalized.split('/').includes('..')) throw new Error(`evidence path must not contain ..: ${ref}`);
  if (normalized.startsWith('.git/') || normalized === '.git' || normalized.startsWith('node_modules/') || normalized === 'node_modules') {
    throw new Error(`evidence path points at private/internal state: ${ref}`);
  }
  return normalized;
}

function compactText(value: string, max = 2000): string {
  return String(value ?? '')
    .replace(/\/(?:Users|home|tmp|private|var|Volumes)\/[^\s,;)\]]+/g, '[local-path omitted]')
    .replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{16,}|Bearer\s+[A-Za-z0-9._-]{20,})\b/g, '[secret omitted]')
    .trim()
    .slice(0, max);
}

function feedbackPath(runId: string): string {
  return `.osc/runs/${safeRunId(runId)}/feedback.jsonl`;
}

export function recordFeedback(input: FeedbackInput) {
  const repoRoot = input.repoRoot ?? process.cwd();
  if (!SOURCES.has(input.source)) throw new Error(`source must be one of: ${[...SOURCES].join(', ')}`);
  if (!VERDICTS.has(input.verdict)) throw new Error(`verdict must be one of: ${[...VERDICTS].join(', ')}`);
  if (!SCOPES.has(input.scope)) throw new Error(`scope must be one of: ${[...SCOPES].join(', ')}`);
  const whatHappened = compactText(input.whatHappened);
  const whyItMatters = compactText(input.whyItMatters);
  if (!whatHappened) throw new Error('what happened is required');
  if (!whyItMatters) throw new Error('why it matters is required');
  const evidencePaths = (input.evidencePaths ?? []).map(safeRef);
  const basis = `${input.runId}\n${input.source}\n${input.verdict}\n${whatHappened}\n${Date.now()}`;
  const id = `feedback-${slugify(basis).slice(0, 32)}`;
  const record: FeedbackRecord = {
    schema: FEEDBACK_SCHEMA,
    id,
    runId: safeRunId(input.runId),
    recordedAt: nowIso(),
    source: input.source,
    verdict: input.verdict,
    scope: input.scope,
    whatHappened,
    whyItMatters,
    repairHypothesis: input.repairHypothesis ? compactText(input.repairHypothesis) : null,
    evidencePaths,
    nextAction: compactText(input.nextAction, 500) || 'review',
    boundary: {
      feedback_is_not_approval: true,
      human_feedback_is_task_input_or_learning_signal_only: true,
      requires_owner_gate_for_merge_publish_release: true,
    },
  };
  appendJsonLineUnder(repoRoot, feedbackPath(input.runId), record, 'feedback path');
  return { status: 'recorded' as const, path: feedbackPath(input.runId), record };
}

export function readFeedback({ repoRoot = process.cwd(), runId }: { repoRoot?: string; runId: string }): FeedbackRecord[] {
  return readJsonlUnder<FeedbackRecord>(repoRoot, feedbackPath(runId));
}

function inferRepairHypothesis(records: FeedbackRecord[]): string {
  const actionable = records.find((record) => ['retry', 'reject', 'block', 'improve'].includes(record.verdict) && record.repairHypothesis)
    ?? records.find((record) => ['retry', 'reject', 'block', 'improve'].includes(record.verdict))
    ?? records.at(-1);
  if (!actionable) return 'No feedback yet; keep the next run bounded and evidence-backed.';
  return actionable.repairHypothesis
    ?? `Repair the ${actionable.scope} issue from ${actionable.source}: ${actionable.whatHappened}. This matters because ${actionable.whyItMatters}.`;
}

export function analyzeFeedback({ repoRoot = process.cwd(), runId }: { repoRoot?: string; runId: string }) {
  const records = readFeedback({ repoRoot, runId });
  if (!records.length) throw new Error(`No feedback recorded for run ${runId}`);
  const repairHypothesis = inferRepairHypothesis(records);
  const nextAction = records.some((record) => record.verdict === 'block') ? 'block'
    : records.some((record) => record.verdict === 'retry' || record.verdict === 'reject') ? 'retry'
      : records.some((record) => record.verdict === 'improve') ? 'improve'
        : 'pass';
  const analysis = {
    schema: FEEDBACK_ANALYSIS_SCHEMA,
    runId: safeRunId(runId),
    generatedAt: nowIso(),
    feedbackCount: records.length,
    sources: [...new Set(records.map((record) => record.source))],
    verdicts: [...new Set(records.map((record) => record.verdict))],
    repairHypotheses: [{ hypothesis: repairHypothesis, evidenceIds: records.map((record) => record.id) }],
    nextAction,
    improvementCandidates: records
      .filter((record) => ['retry', 'reject', 'block', 'improve'].includes(record.verdict))
      .map((record) => ({ feedbackId: record.id, scope: record.scope, hypothesis: record.repairHypothesis ?? repairHypothesis, nextAction: record.nextAction })),
    boundary: {
      feedback_is_not_approval: true,
      analysis_is_not_patch: true,
      accepted_improvements_require_review: true,
    },
  };
  writeJsonUnder(repoRoot, `.osc/runs/${safeRunId(runId)}/improvement-candidates.json`, analysis, 'improvement candidates path');
  return analysis;
}

export function persistAcceptedImprovement({ repoRoot = process.cwd(), slug, title, lesson, evidencePaths = [] }: { repoRoot?: string; slug: string; title: string; lesson: string; evidencePaths?: string[] }) {
  const safeSlug = slugify(slug, 'improvement');
  const path = `.osc/improvements/applied/${safeSlug}.md`;
  const refs = evidencePaths.map(safeRef);
  const content = [
    `# ${compactText(title, 120) || safeSlug}`,
    '',
    `Status: accepted`,
    `Schema: osc.accepted-improvement.v1`,
    '',
    '## Lesson',
    '',
    compactText(lesson, 2000),
    '',
    '## Evidence paths',
    '',
    ...(refs.length ? refs.map((ref) => `- ${ref}`) : ['- Not linked.']),
    '',
    '## Boundary',
    '',
    '- This accepted lesson can be inherited by future runs.',
    '- It is not merge, publish, release, or runtime-spawn approval.',
    '',
  ].join('\n');
  writeFileUnder(repoRoot, path, content, 'accepted improvement path');
  return { status: 'applied' as const, slug: safeSlug, path };
}

export function loadAcceptedImprovements({ repoRoot = process.cwd(), query = '' }: { repoRoot?: string; query?: string } = {}) {
  const dir = join(repoRoot, '.osc/improvements/applied');
  if (!existsSync(dir)) return [];
  const root = realpathSync.native(repoRoot);
  const dirReal = realpathSync.native(dir);
  if (!isInside(root, dirReal)) throw new Error('accepted improvements directory must stay inside repo root');
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const path = `.osc/improvements/applied/${name}`;
      const absolute = resolve(repoRoot, path);
      if (lstatSync(absolute).isSymbolicLink()) throw new Error(`accepted improvement must not be a symlink: ${path}`);
      const real = realpathSync.native(absolute);
      if (!isInside(root, real) || !isInside(dirReal, real)) throw new Error(`accepted improvement must stay inside applied improvements: ${path}`);
      const content = readFileSync(real, 'utf8');
      const slug = name.replace(/\.md$/, '');
      return { slug, path, content };
    })
    .filter((item) => terms.length === 0 || terms.some((term) => item.content.toLowerCase().includes(term) || item.slug.includes(term)));
}
