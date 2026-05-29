import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { findScaffoldRoot } from './scaffold.js';
import { computeMetrics } from './metrics.js';

export const STUDY_SCHEMA = 'open-scaffold.study.v1';

export const SIGNAL_SOURCES = ['git', 'osc-artifact', 'metrics', 'unavailable'] as const;
export type SignalSource = typeof SIGNAL_SOURCES[number];

export const HYPOTHESIS_OBSERVABILITY = ['observable', 'descriptive', 'unavailable'] as const;
export type HypothesisObservability = typeof HYPOTHESIS_OBSERVABILITY[number];

export interface StudySignal {
  id: string;
  label: string;
  hypothesis: string;
  value: number | null;
  unit: string | null;
  source: SignalSource;
  note: string;
}

export interface StudyHypothesis {
  id: string;
  faq_question: string;
  claim: string;
  observability: HypothesisObservability;
  signal_ids: string[];
}

export interface CommitRange {
  from: string | null;
  to: string | null;
  commit_count: number | null;
  source: 'git' | 'unavailable';
}

export interface StudyReport {
  schemaVersion: typeof STUDY_SCHEMA;
  computed_at: string;
  repo_root: string;
  since: string | null;
  commit_range: CommitRange;
  hypotheses: StudyHypothesis[];
  signals: StudySignal[];
  caveats: string[];
}

export interface StudyOptions {
  root?: string;
  now?: Date;
  since?: Date;
}

const CAVEATS = [
  'No causation: every signal is observational. A correlation between a scaffold artifact and an outcome does not show the scaffold caused the outcome — there is no counterfactual in committed history.',
  'Snapshot, not time-series: signals are computed from the current working tree and committed history at one moment, not from an event log of how the repo evolved.',
  'Indirect proxies: amendment counts, evidence completeness, and plan-referencing commits are proxies for the underlying claims, not direct measurements of them.',
  'Under-counting: plan-referencing commits only match when a commit subject names a known plan slug; commits that omit the slug are missed, so the figure is a floor, not a total.',
  'Unclean baseline: the methodology has no unscaffolded control in this repo, so "with scaffold" cannot be compared against "without scaffold" here. That comparison is the job of the A/B protocol, which is not run.',
  'Unavailable is not zero: a signal with source "unavailable" means the tool cannot compute it from committed artifacts (for example, it needs the optional usage ledger from plan 114), not that the underlying value is zero.',
];

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveRoot(root?: string): string {
  const start = root ?? process.cwd();
  const scaffoldRoot = findScaffoldRoot(start);
  if (!scaffoldRoot) {
    throw new Error(`No Open Scaffold root found from ${resolve(start)}. Run this inside a repo with .osc/plans and .osc/releases.`);
  }
  return scaffoldRoot;
}

function gitAvailable(root: string): boolean {
  const result = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  return result.status === 0 && result.stdout.trim() === 'true';
}

function gitOutput(root: string, args: string[]): string | null {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) return null;
  return result.stdout;
}

function shortSha(sha: string): string {
  return sha.slice(0, 12);
}

function computeCommitRange(root: string, hasGit: boolean, since?: Date): CommitRange {
  if (!hasGit) return { from: null, to: null, commit_count: null, source: 'unavailable' };
  const sinceArgs = since ? [`--since=${since.toISOString()}`] : [];
  const log = gitOutput(root, ['log', '--format=%H', ...sinceArgs]);
  if (log === null) return { from: null, to: null, commit_count: null, source: 'unavailable' };
  const shas = log.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return {
    from: shas.length > 0 ? shortSha(shas[shas.length - 1]) : null,
    to: shas.length > 0 ? shortSha(shas[0]) : null,
    commit_count: shas.length,
    source: 'git',
  };
}

function listInScopePlanSlugs(planDetails: Array<{ slug: string; path: string }>): string[] {
  // Restrict to the exact plan set the metrics layer kept in scope (including --since).
  // If no plans match the filter, no historical slug should leak back in from disk.
  return planDetails.map((plan) => plan.slug);
}

function countPlanReferencingCommits(root: string, slugs: string[], since?: Date): number | null {
  const sinceArgs = since ? [`--since=${since.toISOString()}`] : [];
  const log = gitOutput(root, ['log', '--format=%s', ...sinceArgs]);
  if (log === null) return null;
  if (slugs.length === 0) return 0;
  const subjects = log.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const pattern = new RegExp(`(^|[^A-Za-z0-9-])(${slugs.map(escapeRegex).join('|')})([^A-Za-z0-9-]|$)`);
  let count = 0;
  for (const subject of subjects) {
    if (pattern.test(subject)) count += 1;
  }
  return count;
}

function amendmentCounts(root: string, planDetails: Array<{ slug: string; path: string }>): { total: number; plansWith: number } {
  let total = 0;
  let plansWith = 0;
  for (const plan of planDetails) {
    const dir = dirname(resolve(root, plan.path));
    if (!existsSync(dir)) continue;
    const pattern = new RegExp(`^${escapeRegex(plan.slug)}-amendment-\\d+\\.md$`);
    let count = 0;
    for (const file of readdirSync(dir)) {
      if (pattern.test(file)) count += 1;
    }
    total += count;
    if (count > 0) plansWith += 1;
  }
  return { total, plansWith };
}

function signal(
  id: string,
  label: string,
  hypothesis: string,
  value: number | null,
  unit: string | null,
  source: SignalSource,
  note: string,
): StudySignal {
  return { id, label, hypothesis, value, unit, source, note };
}

export function computeStudy(options: StudyOptions = {}): StudyReport {
  const root = resolveRoot(options.root);
  const now = options.now ?? new Date();
  const since = options.since ?? null;
  const hasGit = gitAvailable(root);

  const metrics = computeMetrics({ root, now, since: since ?? undefined });
  const planDetails = metrics.plans.map((plan) => ({ slug: plan.slug, path: plan.path }));
  const amendments = amendmentCounts(root, planDetails);
  const commitRange = computeCommitRange(root, hasGit, since ?? undefined);
  const slugs = listInScopePlanSlugs(planDetails);
  const planRefCommits = commitRange.source === 'git' ? countPlanReferencingCommits(root, slugs, since ?? undefined) : null;
  const gitSource: SignalSource = commitRange.source === 'git' ? 'git' : 'unavailable';

  const doneCount = metrics.summary.by_stage.done;
  const totalPlans = metrics.summary.total_plans;

  const signals: StudySignal[] = [
    signal('total_plans', 'Plans in scope', 'D-activity', totalPlans, 'count', 'metrics',
      'Committed plan files in scope; the denominator the other ratios are read against.'),
    signal('done_plans', 'Plans reaching done', 'D-activity', doneCount, 'count', 'metrics',
      'Plans that have moved into done/.'),
    signal('commits_in_range', 'Commits in range', 'D-activity', commitRange.commit_count, 'count', gitSource,
      'Commits in the studied range; activity context, not a value claim.'),
    signal('cycle_time_median_days', 'Median cycle time', 'D-activity', metrics.cycle_time.median_days, 'days', 'metrics',
      'Median days from plan creation to close; null when no plans are done yet. Descriptive only — the FAQ makes no cycle-time promise.'),
    signal('cycle_time_mean_days', 'Mean cycle time', 'D-activity', metrics.cycle_time.mean_days, 'days', 'metrics',
      'Mean days from plan creation to close; null when no plans are done yet.'),

    signal('amendment_total', 'Amendment files (total)', 'H-scope-drift', amendments.total, 'count', 'osc-artifact',
      'Count of -amendment-N.md files across in-scope plans. Scope changes captured as amendments rather than as silent edits; a count alone cannot tell whether low numbers mean little drift or uncaptured drift.'),
    signal('plans_with_amendments', 'Plans with >=1 amendment', 'H-scope-drift', amendments.plansWith, 'count', 'osc-artifact',
      'Distinct in-scope plans carrying at least one amendment.'),
    signal('amendments_per_plan', 'Amendments per plan', 'H-scope-drift', totalPlans > 0 ? round(amendments.total / totalPlans, 2) : null, 'ratio', 'osc-artifact',
      'amendment_total / total_plans; null when no plans are in scope.'),

    signal('evidence_completeness_pct', 'Evidence completeness', 'H-reviewer-reconstruction', doneCount > 0 ? metrics.evidence.completeness_percentage : null, 'percent', 'metrics',
      'Share of done plans that have an evidence/release note; null when no plans are done yet.'),
    signal('plans_with_evidence', 'Done plans with evidence notes', 'H-reviewer-reconstruction', metrics.evidence.with_evidence_count, 'count', 'metrics',
      'Done plans with at least one evidence/release note a reviewer could read.'),
    signal('plan_referencing_commits', 'Commits naming a plan slug', 'H-reviewer-reconstruction', planRefCommits, 'count', gitSource,
      'Commits whose subject names a known plan slug. A floor on plan-to-commit traceability: commits that omit the slug are not counted.'),

    signal('approval_approved', 'Done plans: approved', 'H-protocol-adherence', metrics.approval.distribution.approved, 'count', 'metrics',
      'Done plans whose evidence note records an explicit approved decision.'),
    signal('approval_weak_approved', 'Done plans: weak approval', 'H-protocol-adherence', metrics.approval.distribution.weak_approved, 'count', 'metrics',
      'Done plans whose evidence note records a weak approval.'),
    signal('approval_rejected', 'Done plans: rejected', 'H-protocol-adherence', metrics.approval.distribution.rejected, 'count', 'metrics',
      'Done plans whose evidence note records a rejected decision.'),
    signal('approval_blocked', 'Done plans: blocked', 'H-protocol-adherence', metrics.approval.distribution.blocked, 'count', 'metrics',
      'Done plans whose evidence note records a blocked decision.'),
    signal('approval_unknown', 'Done plans: approval not recorded', 'H-protocol-adherence', metrics.approval.distribution.unknown, 'count', 'metrics',
      'Done plans with no machine-readable approval decision in their note. An honesty gap, not evidence of adherence.'),

    signal('session_resume_seconds', 'Wall-clock session resume time', 'H-resume-time', null, 'seconds', 'unavailable',
      'Resume wall-clock is not observable from committed artifacts. Measure it directly under the A/B protocol; do not impute it from commit gaps.'),
    signal('context_reexplanation_tokens', 'Human-typed context to resume', 'H-context-reexplanation', null, 'tokens', 'unavailable',
      'Requires the optional usage ledger (plan 114), which is not present in this repo.'),
    signal('token_cost_usd', 'Token / cost per work unit', 'H-cost', null, 'usd', 'unavailable',
      'Requires the optional usage ledger (plan 114), which is not present in this repo.'),
  ];

  const hypotheses: StudyHypothesis[] = [
    {
      id: 'D-activity',
      faq_question: '(no FAQ value claim — descriptive baseline)',
      claim: 'Repository activity baseline that gives the value signals context. These are descriptive facts, not evidence for any FAQ claim.',
      observability: 'descriptive',
      signal_ids: ['total_plans', 'done_plans', 'commits_in_range', 'cycle_time_median_days', 'cycle_time_mean_days'],
    },
    {
      id: 'H-scope-drift',
      faq_question: 'How much time does this actually save me vs. just winging it?',
      claim: 'Adopting the scaffold yields "fewer \'wait, I thought we decided X\' moments" — less silent scope drift.',
      observability: 'observable',
      signal_ids: ['amendment_total', 'plans_with_amendments', 'amendments_per_plan'],
    },
    {
      id: 'H-reviewer-reconstruction',
      faq_question: 'Is this useful for consulting, client delivery, or compliance/audit work?',
      claim: 'A reader can answer "what did you actually do, why, and how do you know it worked?" months later without reconstructing a chat log.',
      observability: 'observable',
      signal_ids: ['evidence_completeness_pct', 'plans_with_evidence', 'plan_referencing_commits'],
    },
    {
      id: 'H-protocol-adherence',
      faq_question: 'Will my agent actually follow the protocol, or will it just ignore the files?',
      claim: 'Work is actually carried through the protocol to an evidenced, decision-stamped close rather than abandoned mid-loop.',
      observability: 'observable',
      signal_ids: ['approval_approved', 'approval_weak_approved', 'approval_rejected', 'approval_blocked', 'approval_unknown'],
    },
    {
      id: 'H-resume-time',
      faq_question: 'How much time does this actually save me vs. just winging it?',
      claim: 'Sessions "resume in under a minute instead of fifteen."',
      observability: 'unavailable',
      signal_ids: ['session_resume_seconds'],
    },
    {
      id: 'H-context-reexplanation',
      faq_question: 'Is this just going to slow me down? I\'m used to vibing.',
      claim: 'Session two does not start with "OK so where were we..." — lower re-explanation cost.',
      observability: 'unavailable',
      signal_ids: ['context_reexplanation_tokens'],
    },
    {
      id: 'H-cost',
      faq_question: 'Does this reduce token usage / cost?',
      claim: 'Often, indirectly — but this is not benchmarked yet.',
      observability: 'unavailable',
      signal_ids: ['token_cost_usd'],
    },
  ];

  return {
    schemaVersion: STUDY_SCHEMA,
    computed_at: now.toISOString(),
    repo_root: root,
    since: since ? since.toISOString() : null,
    commit_range: commitRange,
    hypotheses,
    signals,
    caveats: CAVEATS,
  };
}

export interface StudyValidationResult {
  ok: boolean;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateStudyReport(report: unknown): StudyValidationResult {
  const errors: string[] = [];
  if (!isRecord(report)) {
    return { ok: false, errors: ['Study report must be an object.'] };
  }
  if (report.schemaVersion !== STUDY_SCHEMA) {
    errors.push(`Study report must declare schemaVersion: ${STUDY_SCHEMA}.`);
  }
  if (typeof report.computed_at !== 'string' || Number.isNaN(Date.parse(report.computed_at))) {
    errors.push('Study report must include a valid computed_at ISO timestamp.');
  }
  const range = report.commit_range;
  if (!isRecord(range) || (range.source !== 'git' && range.source !== 'unavailable')) {
    errors.push('Study report must include a commit_range with source git or unavailable.');
  } else if (range.source === 'unavailable' && (range.from !== null || range.to !== null || range.commit_count !== null)) {
    errors.push('commit_range marked unavailable must leave from, to, and commit_count null (no imputed range).');
  }

  const signals = report.signals;
  if (!Array.isArray(signals) || signals.length === 0) {
    errors.push('Study report must include a non-empty signals array.');
    return { ok: errors.length === 0, errors };
  }

  const seen = new Set<string>();
  for (let index = 0; index < signals.length; index += 1) {
    const entry = signals[index];
    const label = isRecord(entry) && typeof entry.id === 'string' ? entry.id : `#${index + 1}`;
    if (!isRecord(entry)) {
      errors.push(`Signal ${label} must be an object.`);
      continue;
    }
    if (typeof entry.id !== 'string' || !entry.id.trim()) {
      errors.push(`Signal ${label} is missing an id.`);
    } else if (seen.has(entry.id)) {
      errors.push(`Duplicate signal id: ${entry.id}.`);
    } else {
      seen.add(entry.id);
    }
    // A figure can never be emitted without a source label.
    if (typeof entry.source !== 'string' || !(SIGNAL_SOURCES as readonly string[]).includes(entry.source)) {
      errors.push(`Signal ${label} must carry a source label, one of: ${SIGNAL_SOURCES.join(', ')}.`);
    }
    const value = entry.value;
    if (value !== null && typeof value !== 'number') {
      errors.push(`Signal ${label} value must be a number or null (no estimated strings).`);
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      errors.push(`Signal ${label} value must be a finite number.`);
    }
    // Imputation guard: an unavailable signal cannot carry a number.
    if (entry.source === 'unavailable' && value !== null) {
      errors.push(`Signal ${label} is sourced "unavailable" but carries a value; unavailable signals must be null, never imputed.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function formatValue(signal: StudySignal): string {
  if (signal.value === null) return signal.source === 'unavailable' ? 'unavailable' : 'null';
  return signal.unit ? `${signal.value} ${signal.unit}` : `${signal.value}`;
}

// Derived purely from the computed signals — no new numbers, no imputation.
// Guarantees the self-study surfaces at least one explicit null/negative observation.
function computeHeadlines(report: StudyReport): string[] {
  const headlines: string[] = [];
  const valueHypotheses = report.hypotheses.filter((h) => h.observability !== 'descriptive');
  const unavailable = valueHypotheses.filter((h) => h.observability === 'unavailable');
  if (valueHypotheses.length > 0) {
    headlines.push(
      `Coverage (null observation): ${valueHypotheses.length - unavailable.length} of ${valueHypotheses.length} value hypotheses have an observable proxy in committed artifacts; ${unavailable.length} are unavailable (${unavailable.map((h) => h.id).join(', ') || 'none'}) and are reported as null rather than estimated.`,
    );
  }
  const find = (id: string) => report.signals.find((s) => s.id === id);
  const unknown = find('approval_unknown')?.value;
  const done = find('done_plans')?.value;
  if (typeof unknown === 'number' && typeof done === 'number' && done > 0 && unknown > 0) {
    headlines.push(
      `Negative finding: ${unknown} of ${done} done plans carry no machine-readable approval decision in their evidence note — an honesty gap in this repository's own records, not evidence of protocol adherence.`,
    );
  }
  const refCommits = find('plan_referencing_commits');
  if (refCommits && typeof refCommits.value === 'number') {
    headlines.push(
      `Traceability floor: only ${refCommits.value} commit subject(s) name a known plan slug. This is a floor, not a total — commits that omit the slug are uncounted, so the figure understates real plan-to-commit traceability.`,
    );
  }
  return headlines;
}

export function renderStudyMarkdown(report: StudyReport): string {
  const range = report.commit_range;
  const rangeText = range.source === 'git'
    ? range.commit_count === 0
      ? '0 commits (empty selected git range)'
      : range.from && range.to
        ? `${range.from} through HEAD (${range.commit_count ?? 0} commit${range.commit_count === 1 ? '' : 's'}, inclusive)`
        : 'unavailable (git range missing endpoints)'
    : 'unavailable (no git history read)';
  const lines: string[] = [
    '# Open Scaffold methodology evidence — self-study',
    '',
    `Computed at: ${report.computed_at}`,
    `Commit range: ${rangeText}`,
    `Since filter: ${report.since ?? 'none (full history)'}`,
    `Schema: ${report.schemaVersion}`,
    '',
    'This file is regenerated by `osc study`; do not hand-edit. It reports source-labeled,',
    'observational signals derived from this repository\'s own committed git history and `.osc/`',
    'artifacts. See `docs/EVIDENCE_METHODOLOGY.md` for the protocol and `docs/AB_COMPARISON_PROTOCOL.md`',
    'for the controlled comparison that this observational study deliberately does not run.',
    '',
    'How to read the source labels: `metrics` = composed from `osc metrics`; `osc-artifact` = read',
    'directly from `.osc/` files; `git` = derived from commit history; `unavailable` = the tool cannot',
    'compute this from committed artifacts (it is not zero). `null` means the computation ran but had no',
    'data (for example, no plans are done yet).',
    '',
  ];

  const headlines = computeHeadlines(report);
  if (headlines.length > 0) {
    lines.push('## Headline observations');
    lines.push('');
    for (const headline of headlines) lines.push(`- ${headline}`);
    lines.push('');
  }

  for (const hypothesis of report.hypotheses) {
    lines.push(`## ${hypothesis.id} — ${hypothesis.observability}`);
    lines.push('');
    if (hypothesis.faq_question) lines.push(`FAQ: "${hypothesis.faq_question}"`);
    lines.push('');
    lines.push(`Claim: ${hypothesis.claim}`);
    lines.push('');
    lines.push('| Signal | Value | Source |');
    lines.push('|---|---|---|');
    for (const id of hypothesis.signal_ids) {
      const sig = report.signals.find((entry) => entry.id === id);
      if (!sig) continue;
      lines.push(`| ${sig.label} | ${formatValue(sig)} | ${sig.source} |`);
    }
    lines.push('');
    const notable = hypothesis.signal_ids
      .map((id) => report.signals.find((entry) => entry.id === id))
      .filter((entry): entry is StudySignal => Boolean(entry));
    for (const sig of notable) {
      lines.push(`- ${sig.label}: ${sig.note}`);
    }
    lines.push('');
  }

  lines.push('## What this cannot prove');
  lines.push('');
  for (const caveat of report.caveats) {
    lines.push(`- ${caveat}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function writeStudyOutput(report: StudyReport, outPath: string, format: 'markdown' | 'json', root = process.cwd()): { path: string } {
  const absolute = isAbsolute(outPath) ? outPath : resolve(root, outPath);
  const body = format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : renderStudyMarkdown(report);
  writeFileSync(absolute, body, 'utf8');
  return { path: relative(root, absolute) || absolute };
}
