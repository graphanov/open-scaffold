import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, type Dirent } from 'node:fs';
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { findScaffoldRoot, parsePlanFile, PLAN_STAGES, splitSections, type PlanStage } from './scaffold.js';

export type TraceLinkStatus = 'local' | 'external' | 'missing' | 'unverified';
export type TraceLinkType =
  | 'plan_file'
  | 'acceptance_criterion'
  | 'run_packet'
  | 'release_note'
  | 'evidence_reference'
  | 'pr_reference'
  | 'issue_reference'
  | 'generic_reference';

export interface TraceAcceptanceCriterion {
  id: `AC${number}`;
  text: string;
  checked: boolean;
}

export interface TraceLink {
  type: TraceLinkType;
  status: TraceLinkStatus;
  reference: string;
  detail: string;
  source_path?: string;
  target_path?: string;
  run_id?: string;
  title?: string;
}

export interface TraceWarning {
  code: string;
  message: string;
  path?: string;
}

export interface TraceReport {
  schema: 'open-scaffold.trace.v1';
  root: string;
  query: {
    plan_slug: string;
    include_unverified: boolean;
  };
  plan: {
    slug: string;
    stage: PlanStage;
    status: string;
    path: string;
    goal: string;
    acceptance_criteria: TraceAcceptanceCriterion[];
  };
  links: TraceLink[];
  warnings: TraceWarning[];
  summary: {
    local: number;
    external: number;
    missing: number;
    unverified: number;
    runs: number;
    release_notes: number;
    external_refs: number;
  };
}

export interface TraceOptions {
  includeUnverified?: boolean;
}

export class TraceUsageError extends Error {}

const LINK_ORDER: TraceLinkType[] = [
  'plan_file',
  'acceptance_criterion',
  'run_packet',
  'release_note',
  'evidence_reference',
  'pr_reference',
  'issue_reference',
  'generic_reference',
];

function normalizePlanSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed || trimmed.endsWith('.md') || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..') || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(trimmed)) {
    throw new TraceUsageError(`Unsafe plan slug: ${slug}`);
  }
  return trimmed;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsExactToken(text: string, token: string): boolean {
  const escaped = escapeRegex(token);
  return new RegExp(`(^|[^A-Za-z0-9._-])${escaped}(?=$|[^A-Za-z0-9._-])`).test(text);
}

function safeText(value: string): string {
  return value
    .replace(/[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();
}

function repoRelative(root: string, path: string): string {
  return relative(root, path).split('\\').join('/');
}

function isContained(root: string, path: string): boolean {
  const rootReal = realpathSync(root);
  const pathReal = realpathSync(path);
  const rel = relative(rootReal, pathReal);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function readContainedText(root: string, path: string): string | null {
  try {
    if (!existsSync(path)) return null;
    const stat = lstatSync(path);
    if (!stat.isFile()) return null;
    if (!isContained(root, path)) return null;
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

function readContainedDirectory(root: string, dir: string, warningCode: string, warnings: TraceWarning[]): Dirent[] {
  const rel = repoRelative(root, dir);
  try {
    if (!existsSync(dir)) return [];
    const stat = lstatSync(dir);
    if (!stat.isDirectory() || stat.isSymbolicLink() || !isContained(root, dir)) {
      warnings.push({ code: warningCode, message: 'Trace directory is not a contained local directory; skipping.', path: rel });
      return [];
    }
    return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    warnings.push({ code: warningCode, message: 'Trace directory could not be safely read; skipping.', path: rel });
    return [];
  }
}

function findPlan(root: string, slug: string): { stage: PlanStage; path: string } {
  const matches: Array<{ stage: PlanStage; path: string }> = [];
  for (const stage of PLAN_STAGES) {
    const path = join(root, '.osc', 'plans', stage, `${slug}.md`);
    try {
      if (existsSync(path) && lstatSync(path).isFile() && isContained(root, path)) {
        matches.push({ stage, path });
      }
    } catch {
      // Ignore unreadable candidates and continue deterministic search.
    }
  }
  if (matches.length === 0) {
    throw new Error(`Plan not found in .osc/plans/{active,backlog,blocked,done}: ${slug}`);
  }
  if (matches.length > 1) {
    throw new Error(`Plan slug appears in multiple stages: ${matches.map((match) => repoRelative(root, match.path)).join(', ')}`);
  }
  return matches[0];
}

function parseAcceptanceCriteria(section: string): TraceAcceptanceCriterion[] {
  const criteria: TraceAcceptanceCriterion[] = [];
  for (const line of section.split(/\r?\n/)) {
    const match = line.trim().match(/^[-*]\s+(?:\[([ xX])\]\s*)?(.+)$/);
    if (!match) continue;
    const text = safeText(match[2]);
    if (!text) continue;
    criteria.push({ id: `AC${criteria.length + 1}` as `AC${number}`, text, checked: /^x$/i.test(match[1] ?? '') });
  }
  return criteria;
}

function releaseSlug(file: string): string | null {
  const match = file.match(/^\d{4}-\d{2}-\d{2}-(.+)\.md$/);
  return match ? match[1] : null;
}

function planPathsForSlug(slug: string): string[] {
  return PLAN_STAGES.map((stage) => `.osc/plans/${stage}/${slug}.md`);
}

function dedupeLinks(links: TraceLink[]): TraceLink[] {
  const seen = new Set<string>();
  const unique: TraceLink[] = [];
  for (const link of links) {
    const key = `${link.type}\0${link.status}\0${link.reference}\0${link.source_path ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(link);
  }
  return unique.sort((a, b) => {
    const typeDelta = LINK_ORDER.indexOf(a.type) - LINK_ORDER.indexOf(b.type);
    if (typeDelta !== 0) return typeDelta;
    const statusDelta = a.status.localeCompare(b.status);
    if (statusDelta !== 0) return statusDelta;
    return a.reference.localeCompare(b.reference);
  });
}

function planMatchesRun(planSlug: string, run: unknown): { matches: boolean; runId?: string } {
  if (!run || typeof run !== 'object') return { matches: false };
  const record = run as Record<string, unknown>;
  const rawPlan = record.plan;
  const runId = typeof record.runId === 'string' ? record.runId : undefined;
  if (typeof rawPlan === 'string') return { matches: rawPlan === planSlug, runId };
  if (rawPlan && typeof rawPlan === 'object') {
    const plan = rawPlan as Record<string, unknown>;
    if (plan.slug === planSlug) return { matches: true, runId };
    if (typeof plan.path === 'string' && basename(plan.path, extname(plan.path)) === planSlug) return { matches: true, runId };
  }
  return { matches: false, runId };
}

function collectRunLinks(root: string, planSlug: string, options: Required<TraceOptions>, warnings: TraceWarning[]): TraceLink[] {
  const links: TraceLink[] = [];
  const runsDir = join(root, '.osc', 'runs');
  for (const entry of readContainedDirectory(root, runsDir, 'unsafe_runs_dir', warnings)) {
    if (!entry.isDirectory()) continue;
    const runJson = join(runsDir, entry.name, 'run.json');
    const rel = repoRelative(root, runJson);
    const text = readContainedText(root, runJson);
    if (text === null) continue;
    try {
      const parsed = JSON.parse(text) as unknown;
      const match = planMatchesRun(planSlug, parsed);
      if (match.matches) {
        links.push({ type: 'run_packet', status: 'local', reference: rel, detail: 'Run packet references this plan.', run_id: match.runId ?? entry.name });
        links.push(...extractExternalRefs(text, rel));
      } else if (options.includeUnverified && containsExactToken(text, planSlug)) {
        links.push({ type: 'run_packet', status: 'unverified', reference: rel, detail: 'Run packet mentions the plan slug but does not expose a canonical plan slug/path.', run_id: match.runId ?? entry.name });
      }
    } catch {
      warnings.push({ code: 'unreadable_run_packet', message: 'Run packet is not valid JSON.', path: rel });
      if (options.includeUnverified && containsExactToken(text, planSlug)) {
        links.push({ type: 'run_packet', status: 'unverified', reference: rel, detail: 'Malformed run packet mentions the plan slug.' });
      }
    }
  }
  return links;
}

function extractExternalRefs(text: string, sourcePath: string): TraceLink[] {
  const links: TraceLink[] = [];
  const prUrls = text.match(/https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/\d+/g) ?? [];
  const issueUrls = text.match(/https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/\d+/g) ?? [];
  for (const reference of prUrls) {
    links.push({ type: 'pr_reference', status: 'external', reference, source_path: sourcePath, detail: 'Recognized PR reference in local note; not verified over the network.' });
  }
  for (const reference of issueUrls) {
    links.push({ type: 'issue_reference', status: 'external', reference, source_path: sourcePath, detail: 'Recognized issue reference in local note; not verified over the network.' });
  }
  return links;
}

function releaseReferencesPlan(text: string, file: string, planSlug: string): boolean {
  if (releaseSlug(file) === planSlug) return true;
  return planPathsForSlug(planSlug).some((path) => text.includes(path));
}

function collectReleaseLinks(root: string, planSlug: string, options: Required<TraceOptions>, warnings: TraceWarning[]): TraceLink[] {
  const links: TraceLink[] = [];
  const releasesDir = join(root, '.osc', 'releases');
  for (const entry of readContainedDirectory(root, releasesDir, 'unsafe_releases_dir', warnings)) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'README.md') continue;
    const path = join(releasesDir, entry.name);
    const rel = repoRelative(root, path);
    const text = readContainedText(root, path);
    if (text === null) continue;
    if (releaseReferencesPlan(text, entry.name, planSlug)) {
      links.push({ type: 'release_note', status: 'local', reference: rel, source_path: rel, detail: 'Release/evidence note cites this plan.' });
      links.push(...extractExternalRefs(text, rel));
    } else if (options.includeUnverified && containsExactToken(text, planSlug)) {
      links.push({ type: 'generic_reference', status: 'unverified', reference: rel, source_path: rel, detail: 'Local note mentions the plan slug but does not cite a canonical plan path.' });
    }
  }
  return links;
}

function addMissingLinks(links: TraceLink[], planSlug: string): TraceLink[] {
  const next = [...links];
  if (!next.some((link) => link.type === 'run_packet' && link.status === 'local')) {
    next.push({ type: 'run_packet', status: 'missing', reference: '.osc/runs/*/run.json', detail: `No local run packet found for ${planSlug}.` });
  }
  if (!next.some((link) => link.type === 'release_note' && link.status === 'local')) {
    next.push({ type: 'release_note', status: 'missing', reference: `.osc/releases/*-${planSlug}.md`, detail: `No local release/evidence note found for ${planSlug}.` });
  }
  return next;
}

function summarizeLinks(links: TraceLink[]): TraceReport['summary'] {
  return {
    local: links.filter((link) => link.status === 'local').length,
    external: links.filter((link) => link.status === 'external').length,
    missing: links.filter((link) => link.status === 'missing').length,
    unverified: links.filter((link) => link.status === 'unverified').length,
    runs: links.filter((link) => link.type === 'run_packet' && link.status === 'local').length,
    release_notes: links.filter((link) => link.type === 'release_note' && link.status === 'local').length,
    external_refs: links.filter((link) => (link.type === 'pr_reference' || link.type === 'issue_reference') && link.status === 'external').length,
  };
}

export function buildTrace(start: string, slug: string, options: TraceOptions = {}): TraceReport {
  const planSlug = normalizePlanSlug(slug);
  const includeUnverified = options.includeUnverified ?? false;
  const root = findScaffoldRoot(resolve(start)) ?? null;
  if (!root) throw new Error(`No Open Scaffold root found from ${resolve(start)}. Run this inside a repo with .osc/plans and .osc/releases.`);

  const foundPlan = findPlan(root, planSlug);
  const plan = parsePlanFile(foundPlan.path);
  const planText = readFileSync(foundPlan.path, 'utf8');
  const sections = splitSections(planText);
  const acceptanceCriteria = parseAcceptanceCriteria(sections.get('Acceptance criteria') ?? '');
  const warnings: TraceWarning[] = [];

  const links: TraceLink[] = [
    { type: 'plan_file', status: 'local', reference: repoRelative(root, foundPlan.path), target_path: repoRelative(root, foundPlan.path), detail: 'Plan file found in local scaffold stage.' },
    ...acceptanceCriteria.map((criterion): TraceLink => ({
      type: 'acceptance_criterion',
      status: 'local',
      reference: criterion.id,
      detail: criterion.checked ? criterion.text : `${criterion.text} (unchecked)`,
      source_path: repoRelative(root, foundPlan.path),
    })),
    ...collectRunLinks(root, planSlug, { includeUnverified }, warnings),
    ...collectReleaseLinks(root, planSlug, { includeUnverified }, warnings),
  ];

  const finalLinks = dedupeLinks(addMissingLinks(links, planSlug));
  return {
    schema: 'open-scaffold.trace.v1',
    root,
    query: { plan_slug: planSlug, include_unverified: includeUnverified },
    plan: {
      slug: planSlug,
      stage: foundPlan.stage,
      status: plan.status,
      path: repoRelative(root, foundPlan.path),
      goal: plan.goal,
      acceptance_criteria: acceptanceCriteria,
    },
    links: finalLinks,
    warnings,
    summary: summarizeLinks(finalLinks),
  };
}

export function formatTraceReport(report: TraceReport): string {
  const lines = [
    `Open Scaffold trace: ${safeText(report.plan.slug)}`,
    `Status: ${safeText(report.plan.status)}`,
    `Stage: ${safeText(report.plan.stage)}`,
    `Path: ${safeText(report.plan.path)}`,
    `Goal: ${safeText(report.plan.goal) || '(none)'}`,
    '',
    'Acceptance criteria:',
  ];
  if (report.plan.acceptance_criteria.length === 0) {
    lines.push('  (none listed)');
  } else {
    for (const criterion of report.plan.acceptance_criteria) {
      lines.push(`  - ${criterion.id} ${criterion.checked ? '[x]' : '[ ]'} ${safeText(criterion.text)}`);
    }
  }
  lines.push('', 'Links:');
  for (const link of report.links) {
    const detail = link.detail ? ` — ${safeText(link.detail)}` : '';
    lines.push(`  [${safeText(link.status)}] ${safeText(link.type)}: ${safeText(link.reference)}${detail}`);
  }
  if (report.warnings.length > 0) {
    lines.push('', 'Warnings:');
    for (const warning of report.warnings) {
      const path = warning.path ? ` (${safeText(warning.path)})` : '';
      lines.push(`  - ${safeText(warning.code)}: ${safeText(warning.message)}${path}`);
    }
  }
  lines.push('', `Summary: local=${report.summary.local}, external=${report.summary.external}, missing=${report.summary.missing}, unverified=${report.summary.unverified}`);
  return `${lines.join('\n')}\n`;
}
