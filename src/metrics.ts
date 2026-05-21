import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, join, relative } from 'node:path';
import { findScaffoldRoot, PLAN_STAGES, type PlanStage } from './scaffold.js';

const DAY_MS = 86_400_000;
const DEFAULT_LOOKBACK_WEEKS = 12;
const STALE_DAYS = 30;
const APPROVAL_STATUSES = ['approved', 'weak_approved', 'rejected', 'blocked'] as const;

type ApprovalStatus = typeof APPROVAL_STATUSES[number] | 'unknown';

export interface MetricsOptions {
  root?: string;
  now?: Date;
  since?: Date;
  lookbackWeeks?: number;
  verbose?: boolean;
}

export interface PlanMetricDetail {
  slug: string;
  path: string;
  stage: PlanStage;
  created_at: string | null;
  closed_at: string | null;
  age_days: number | null;
  stale: boolean;
  evidence_note: string | null;
  has_evidence: boolean;
  approval_status: ApprovalStatus;
}

export interface ScaffoldMetrics {
  root: string;
  generated_at: string;
  since: string | null;
  summary: {
    total_plans: number;
    by_stage: Record<PlanStage, number>;
  };
  cycle_time: {
    mean_days: number | null;
    median_days: number | null;
    p90_days: number | null;
    p99_days: number | null;
    sample_size: number;
    insufficient_data_count: number;
  };
  stale: {
    threshold_days: number;
    count: number;
    plans: Array<Pick<PlanMetricDetail, 'slug' | 'path' | 'age_days'>>;
  };
  velocity: {
    lookback_weeks: number;
    window_start: string;
    closed_count: number;
    plans_per_week: number;
  };
  evidence: {
    done_plan_count: number;
    with_evidence_count: number;
    missing_evidence_count: number;
    completeness_percentage: number;
    plans: Array<Pick<PlanMetricDetail, 'slug' | 'path' | 'evidence_note' | 'has_evidence'>>;
  };
  approval: {
    distribution: Record<ApprovalStatus, number>;
  };
  plans: PlanMetricDetail[];
  warnings: string[];
}

interface EvidenceNote {
  path: string;
  relativePath: string;
  text: string;
  date: Date | null;
}

interface PlanRecord {
  slug: string;
  path: string;
  absolutePath: string;
  stage: PlanStage;
  statMtime: Date;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseIsoDateOnly(raw: string): Date | null {
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Invalid ISO date: ${raw}`);
  }
  return date;
}

function parseIsoDatePrefix(raw: string): Date | null {
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  return parseIsoDateOnly(match[1]);
}

export function parseSinceDate(value: string, now = new Date()): Date {
  const raw = value.trim();
  if (!raw) throw new Error('Missing date value for --since');

  const isoDateOnly = parseIsoDateOnly(raw);
  if (isoDateOnly) return isoDateOnly;

  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid ISO 8601 date for --since: ${raw}`);
    return parsed;
  }

  const daysAgo = raw.match(/^(\d+)\s+days?\s+ago$/i);
  if (daysAgo) {
    return new Date(startOfUtcDay(now).getTime() - Number(daysAgo[1]) * DAY_MS);
  }

  const weeksAgo = raw.match(/^(\d+)\s+weeks?\s+ago$/i);
  if (weeksAgo) {
    return new Date(startOfUtcDay(now).getTime() - Number(weeksAgo[1]) * 7 * DAY_MS);
  }

  if (/^last\s+month$/i.test(raw)) {
    const day = startOfUtcDay(now);
    return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() - 1, day.getUTCDate()));
  }

  if (raw.includes('/') || /^[A-Za-z]/.test(raw) || !/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    throw new Error(`Ambiguous date for --since: ${raw}. Use ISO 8601 (YYYY-MM-DD) or a supported relative date such as "30 days ago".`);
  }

  throw new Error(`Invalid date for --since: ${raw}`);
}

function resolveRoot(root?: string): string {
  const start = root ?? process.cwd();
  const scaffoldRoot = findScaffoldRoot(start);
  if (!scaffoldRoot) throw new Error(`No Open Scaffold root found from ${start}. Run this inside a repo with .osc/plans and .osc/releases.`);
  return scaffoldRoot;
}

function isPlanMarkdown(file: string): boolean {
  return file.endsWith('.md') && !/-amendment-\d+\.md$/.test(file) && file !== 'README.md' && file !== 'WORKFLOW.md' && file !== 'handoff-template.md';
}

function listPlans(root: string): PlanRecord[] {
  const plans: PlanRecord[] = [];
  for (const stage of PLAN_STAGES) {
    const dir = join(root, '.osc', 'plans', stage);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).sort()) {
      if (!isPlanMarkdown(file)) continue;
      const absolutePath = join(dir, file);
      const stat = statSync(absolutePath);
      if (!stat.isFile()) continue;
      plans.push({
        slug: basename(file, '.md'),
        path: relative(root, absolutePath),
        absolutePath,
        stage,
        statMtime: stat.mtime,
      });
    }
  }
  return plans;
}

function gitAvailable(root: string): boolean {
  const result = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  return result.status === 0 && result.stdout.trim() === 'true';
}

function gitLogDates(root: string, path: string): Date[] {
  const result = spawnSync('git', ['log', '--follow', '--format=%cI', '--', path], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) return [];
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => new Date(line))
    .filter((date) => !Number.isNaN(date.getTime()));
}

function earliestGitDate(root: string, path: string): Date | null {
  const dates = gitLogDates(root, path);
  return dates.length > 0 ? dates.at(-1) ?? null : null;
}

function latestGitDate(root: string, path: string): Date | null {
  const dates = gitLogDates(root, path);
  return dates.length > 0 ? dates[0] : null;
}

function listEvidenceNotes(root: string): EvidenceNote[] {
  const releasesDir = join(root, '.osc', 'releases');
  if (!existsSync(releasesDir)) return [];
  return readdirSync(releasesDir)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .sort()
    .map((file) => {
      const path = join(releasesDir, file);
      return {
        path,
        relativePath: relative(root, path),
        text: readFileSync(path, 'utf8'),
        date: parseIsoDatePrefix(file),
      };
    });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function evidenceForPlan(notes: EvidenceNote[], slug: string): EvidenceNote | null {
  const slugPattern = new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(slug)}([^A-Za-z0-9]|$)`);
  const matches = notes.filter((note) => note.relativePath.includes(slug) || slugPattern.test(note.text));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0)).at(-1) ?? null;
}

function approvalFromEvidence(note: EvidenceNote | null): ApprovalStatus {
  if (!note || !note.text.trim()) return 'unknown';
  const text = note.text;
  const explicit = text.match(/approval\.status\s*[:=]\s*(approved|weak_approved|rejected|blocked)\b/i);
  if (explicit) return explicit[1].toLowerCase() as ApprovalStatus;
  const ownerDecision = text.match(/owner decision\s*:\s*(approved|weak_approved|rejected|blocked)\b/i);
  if (ownerDecision) return ownerDecision[1].toLowerCase() as ApprovalStatus;
  const decision = text.match(/decision(?:\s+for\s+this\s+slice)?\s*:\s*(approved|weak_approved|rejected|blocked)\b/i);
  if (decision) return decision[1].toLowerCase() as ApprovalStatus;
  if (/\bweak approval\b|\bweak_approved\b/i.test(text)) return 'weak_approved';
  return 'unknown';
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return round(sorted[index]);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return round(sorted[mid]);
  return round((sorted[mid - 1] + sorted[mid]) / 2);
}

function isoOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function daysBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / DAY_MS;
}

function planCreatedDate(root: string, plan: PlanRecord, hasGit: boolean): Date {
  if (hasGit) {
    const gitDate = earliestGitDate(root, plan.path);
    if (gitDate) return gitDate;
  }
  return plan.statMtime;
}

function planClosedDate(root: string, plan: PlanRecord, evidence: EvidenceNote | null, hasGit: boolean): { date: Date | null; source: 'git' | 'evidence' | 'mtime' | 'none' } {
  if (plan.stage !== 'done') return { date: null, source: 'none' };
  if (hasGit) {
    const gitDate = latestGitDate(root, plan.path);
    if (gitDate) return { date: gitDate, source: 'git' };
  }
  if (evidence?.date) return { date: evidence.date, source: 'evidence' };
  return { date: plan.statMtime, source: 'mtime' };
}

export function computeMetrics(options: MetricsOptions = {}): ScaffoldMetrics {
  const root = resolveRoot(options.root);
  const now = options.now ?? new Date();
  const lookbackWeeks = options.lookbackWeeks ?? DEFAULT_LOOKBACK_WEEKS;
  if (!Number.isFinite(lookbackWeeks) || lookbackWeeks <= 0) throw new Error('--lookback must be a positive number of weeks');

  const warnings: string[] = [];
  const hasGit = gitAvailable(root);
  if (!hasGit) warnings.push('git not available — using file modification times for cycle time calculation');

  const notes = listEvidenceNotes(root);
  const details: PlanMetricDetail[] = [];
  const cycleDurations: number[] = [];
  let insufficientCycleData = 0;
  let closedInWindow = 0;
  const since = options.since ?? null;
  const windowStart = new Date(now.getTime() - lookbackWeeks * 7 * DAY_MS);

  for (const plan of listPlans(root)) {
    const evidence = plan.stage === 'done' ? evidenceForPlan(notes, plan.slug) : null;
    const createdAt = planCreatedDate(root, plan, hasGit);
    if (since && createdAt < since) continue;

    const close = planClosedDate(root, plan, evidence, hasGit);
    const ageDays = round(Math.max(0, daysBetween(plan.statMtime, now)), 1);
    const stale = plan.stage === 'active' && ageDays > STALE_DAYS;
    const hasEvidence = Boolean(evidence && evidence.text.trim().length > 0);
    const approval = approvalFromEvidence(evidence);

    if (plan.stage === 'done') {
      if (close.date && close.date >= windowStart && close.date <= now) closedInWindow += 1;
      if (close.date && close.source !== 'mtime' && close.date >= createdAt) {
        cycleDurations.push(daysBetween(createdAt, close.date));
      } else {
        insufficientCycleData += 1;
      }
    }

    details.push({
      slug: plan.slug,
      path: plan.path,
      stage: plan.stage,
      created_at: isoOrNull(createdAt),
      closed_at: isoOrNull(close.date),
      age_days: ageDays,
      stale,
      evidence_note: evidence ? evidence.relativePath : null,
      has_evidence: hasEvidence,
      approval_status: approval,
    });
  }

  const byStage = Object.fromEntries(PLAN_STAGES.map((stage) => [stage, 0])) as Record<PlanStage, number>;
  for (const detail of details) byStage[detail.stage] += 1;

  const donePlans = details.filter((plan) => plan.stage === 'done');
  const evidencePlans = donePlans.map((plan) => ({ slug: plan.slug, path: plan.path, evidence_note: plan.evidence_note, has_evidence: plan.has_evidence }));
  const withEvidenceCount = evidencePlans.filter((plan) => plan.has_evidence).length;
  const approvalDistribution = { approved: 0, weak_approved: 0, rejected: 0, blocked: 0, unknown: 0 } satisfies Record<ApprovalStatus, number>;
  for (const plan of donePlans) approvalDistribution[plan.approval_status] += 1;

  const stalePlans = details
    .filter((plan) => plan.stale)
    .map((plan) => ({ slug: plan.slug, path: plan.path, age_days: plan.age_days }));

  return {
    root,
    generated_at: now.toISOString(),
    since: isoOrNull(since),
    summary: {
      total_plans: details.length,
      by_stage: byStage,
    },
    cycle_time: {
      mean_days: cycleDurations.length > 0 ? round(cycleDurations.reduce((sum, value) => sum + value, 0) / cycleDurations.length) : null,
      median_days: median(cycleDurations),
      p90_days: percentile(cycleDurations, 90),
      p99_days: percentile(cycleDurations, 99),
      sample_size: cycleDurations.length,
      insufficient_data_count: insufficientCycleData,
    },
    stale: {
      threshold_days: STALE_DAYS,
      count: stalePlans.length,
      plans: stalePlans,
    },
    velocity: {
      lookback_weeks: lookbackWeeks,
      window_start: windowStart.toISOString(),
      closed_count: closedInWindow,
      plans_per_week: round(closedInWindow / lookbackWeeks),
    },
    evidence: {
      done_plan_count: donePlans.length,
      with_evidence_count: withEvidenceCount,
      missing_evidence_count: donePlans.length - withEvidenceCount,
      completeness_percentage: donePlans.length > 0 ? round((withEvidenceCount / donePlans.length) * 100, 1) : 0,
      plans: evidencePlans,
    },
    approval: {
      distribution: approvalDistribution,
    },
    plans: details.sort((a, b) => a.path.localeCompare(b.path)),
    warnings,
  };
}

function formatNumber(value: number | null, suffix = ''): string {
  return value === null ? 'insufficient data' : `${value}${suffix}`;
}

function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toString()}%`;
}

export function formatMetrics(metrics: ScaffoldMetrics, options: { verbose?: boolean } = {}): string {
  if (metrics.summary.total_plans === 0) {
    return [
      'Open Scaffold metrics',
      '',
      'No plans found in scaffold — run `osc plan new` to create your first plan.',
      '',
      'Plan distribution',
      '- active: 0',
      '- backlog: 0',
      '- blocked: 0',
      '- done: 0',
    ].join('\n');
  }

  const lines = [
    'Open Scaffold metrics',
    '',
    'Plan distribution',
    `- total: ${metrics.summary.total_plans}`,
    `- active: ${metrics.summary.by_stage.active}`,
    `- backlog: ${metrics.summary.by_stage.backlog}`,
    `- blocked: ${metrics.summary.by_stage.blocked}`,
    `- done: ${metrics.summary.by_stage.done}`,
    '',
    'Cycle time',
    `- mean: ${formatNumber(metrics.cycle_time.mean_days, ' days')}`,
    `- median: ${formatNumber(metrics.cycle_time.median_days, ' days')}`,
    `- p90: ${formatNumber(metrics.cycle_time.p90_days, ' days')}`,
    `- p99: ${formatNumber(metrics.cycle_time.p99_days, ' days')}`,
    `- sample size: ${metrics.cycle_time.sample_size}; insufficient data: ${metrics.cycle_time.insufficient_data_count}`,
    '',
    'Stale active plans',
    `- threshold: >${metrics.stale.threshold_days} days since last modification`,
    `- count: ${metrics.stale.count}`,
    ...(metrics.stale.count > 0 ? metrics.stale.plans.map((plan) => `  - ${plan.slug} (${plan.age_days} days)`) : []),
    '',
    'Close velocity',
    `- ${metrics.velocity.closed_count} closed plan(s) in the last ${metrics.velocity.lookback_weeks} week(s)`,
    `- ${metrics.velocity.plans_per_week} plans/week`,
    '',
    'Evidence completeness',
    `- ${metrics.evidence.done_plan_count} plans closed but only ${metrics.evidence.with_evidence_count} have evidence notes (${formatPercent(metrics.evidence.completeness_percentage)})`,
    '',
    'Approval distribution',
    `- approved: ${metrics.approval.distribution.approved}`,
    `- weak_approved: ${metrics.approval.distribution.weak_approved}`,
    `- rejected: ${metrics.approval.distribution.rejected}`,
    `- blocked: ${metrics.approval.distribution.blocked}`,
    `- unknown: ${metrics.approval.distribution.unknown}`,
  ];

  if (metrics.warnings.length > 0) {
    lines.push('', 'Warnings', ...metrics.warnings.map((warning) => `- ${warning}`));
  }

  if (options.verbose) {
    lines.push('', 'Per-plan breakdown');
    for (const plan of metrics.plans) {
      lines.push(`- ${plan.slug}\t${plan.stage}\tage=${plan.age_days ?? 'unknown'}d\tevidence=${plan.has_evidence ? 'yes' : 'no'}\tapproval=${plan.approval_status}`);
    }
  }

  return lines.join('\n');
}
