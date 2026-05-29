import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { inspectScaffold, normalizeSectionHeading, parseMarkdownSections, PLAN_STAGES } from './scaffold.js';

export type ValidationLevel = 'fail' | 'warn';

export interface ValidationIssue {
  level: ValidationLevel;
  code: string;
  message: string;
  path?: string;
}

export interface ValidationOptions {
  staleDays?: number;
}

export interface ValidationResult {
  ok: boolean;
  failures: ValidationIssue[];
  warnings: ValidationIssue[];
}

const DEFAULT_STALE_DAYS = 30;

function markdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => join(dir, file))
    .filter((path) => statSync(path).isFile());
}

function isSupportPlanFile(path: string): boolean {
  return /(?:README|WORKFLOW|handoff-template)\.md$/.test(path);
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function headingPrefixMatches(candidate: string, expected: string): boolean {
  if (candidate === expected) return true;
  if (!candidate.startsWith(expected)) return false;
  const next = candidate[expected.length];
  return next === undefined || /[\s:—–-]/.test(next);
}

function hasHeading(headings: readonly string[], heading: string): boolean {
  const expected = normalizeSectionHeading(heading);
  return expected.length > 0 && headings.some((candidate) => headingPrefixMatches(candidate, expected));
}

function releaseNotes(root: string): string[] {
  return markdownFiles(join(root, '.osc', 'releases')).filter((path) => !path.endsWith('/README.md'));
}

const PLACEHOLDER_BODY = /^(?:todo\b|tbd\b|n\/a\b|none\b|\.\.\.|—|-)$/i;

function isEmptyOrPlaceholder(body: string): boolean {
  const cleaned = body.replace(/```/g, '').trim();
  if (!cleaned) return true;
  const meaningful = cleaned
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
  if (meaningful.length === 0) return true;
  return meaningful.every((line) => PLACEHOLDER_BODY.test(line));
}

function evidenceReceiptFiles(root: string): string[] {
  const out: string[] = [];
  const evidenceDir = join(root, 'docs', 'evidence');
  if (existsSync(evidenceDir)) {
    for (const path of markdownFiles(evidenceDir)) {
      if (!path.endsWith('/README.md')) out.push(path);
    }
  }
  const runsDir = join(root, '.osc', 'runs');
  if (existsSync(runsDir)) {
    for (const entry of readdirSync(runsDir)) {
      const runDir = join(runsDir, entry);
      if (!statSync(runDir).isDirectory()) continue;
      for (const name of ['evidence.md', 'postflight.md']) {
        const candidate = join(runDir, name);
        if (existsSync(candidate) && statSync(candidate).isFile()) out.push(candidate);
      }
    }
  }
  return out;
}

const APPROVAL_VALUES = new Set(['approved', 'weak_approved', 'rejected', 'blocked']);

export function validateScaffold(root = process.cwd(), options: ValidationOptions = {}): ValidationResult {
  const state = inspectScaffold(root);
  const failures: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const staleDays = options.staleDays ?? DEFAULT_STALE_DAYS;

  if (!state.mission.defined) {
    failures.push({ level: 'fail', code: 'mission.undefined', message: state.mission.reason ?? 'MISSION.md is not defined', path: relative(root, state.mission.path) });
  }

  const planCount = Object.values(state.plans).flat().length;
  if (planCount === 0) {
    failures.push({ level: 'fail', code: 'plans.missing', message: 'No plan files found under .osc/plans/' });
  }

  const releasesDir = join(root, '.osc', 'releases');
  const releasesReadme = join(releasesDir, 'README.md');
  if (!existsSync(releasesDir)) {
    failures.push({ level: 'fail', code: 'releases.dir_missing', message: '.osc/releases/ directory is missing' });
  } else if (!existsSync(releasesReadme)) {
    warnings.push({ level: 'warn', code: 'releases.readme_missing', message: '.osc/releases/README.md is missing', path: relative(root, releasesReadme) });
  }

  const now = Date.now();
  for (const plan of state.plans.active) {
    const full = join(root, plan.path);
    if (!existsSync(full) || isSupportPlanFile(full)) continue;
    const text = read(full);
    const ageDays = Math.floor((now - statSync(full).mtimeMs) / 86_400_000);
    if (ageDays > staleDays) {
      warnings.push({ level: 'warn', code: 'active_plan.stale', message: `Active plan ${plan.slug} has not changed for ${ageDays} days (threshold ${staleDays})`, path: plan.path });
    }
    if (/PR\s+#\d+\s+(?:merged|closed)|merged\s+PR\s+#\d+|issue\s+#\d+\s+closed/i.test(text)) {
      warnings.push({ level: 'warn', code: 'active_plan.completed_evidence', message: `Active plan ${plan.slug} appears to mention merged/closed evidence; consider moving it to done/ or backlog`, path: plan.path });
    }
  }

  for (const notePath of releaseNotes(root)) {
    const text = read(notePath);
    const rel = relative(root, notePath);
    const parsedSections = parseMarkdownSections(text);
    const sectionHeadings = parsedSections.map((section) => section.heading);
    const sections = new Map(parsedSections.map((section) => [section.heading, section.body]));
    for (const heading of ['Summary', 'Traceability', 'Verification', 'Outcome']) {
      if (!hasHeading(sectionHeadings, heading)) {
        warnings.push({ level: 'warn', code: 'release_note.missing_section', message: `Release note is missing ## ${heading}`, path: rel });
      }
    }

    // Compatibility shim: historical release notes used `## Traceability chain`.
    // `hasHeading` remains a prefix presence-probe, while body reads keep this explicit fallback.
    const traceability = sections.get('Traceability') ?? sections.get('Traceability chain') ?? '';
    if (traceability && !/\.osc\/plans\//.test(traceability)) {
      warnings.push({ level: 'warn', code: 'release_note.traceability_missing_plan', message: 'Release note Traceability section does not cite a .osc/plans/ path', path: rel });
    }
    if (traceability && !/(?:\.osc\/plans\/|\bissue\b|\btask\b|\broadmap\b)/i.test(traceability)) {
      warnings.push({ level: 'warn', code: 'release_note.traceability_missing_work_item', message: 'Release note Traceability section does not cite a plan, issue, task, or roadmap item', path: rel });
    }
    if (traceability && !/(?:\bPR\s*:?\s*#\d+\b|Pull request|Pull Request|https:\/\/github\.com\/[^\s)]+\/pull\/\d+|GitHub Release|\bTag:\s*|\bBranch:\s*|pending owner review|pending Daniel review|no PR|not generated|not applicable)/i.test(text)) {
      warnings.push({ level: 'warn', code: 'release_note.traceability_missing_publication', message: 'Release note does not cite a PR, branch, tag, release, or explicit publication rationale', path: rel });
    }

    const outcome = sections.get('Outcome') ?? '';
    if (hasHeading(sectionHeadings, 'Outcome') && isEmptyOrPlaceholder(outcome)) {
      warnings.push({ level: 'warn', code: 'release_note.empty_outcome', message: 'Release note Outcome section is empty or a placeholder', path: rel });
    }

    const verification = sections.get('Verification') ?? '';
    if (hasHeading(sectionHeadings, 'Verification') && isEmptyOrPlaceholder(verification)) {
      warnings.push({ level: 'warn', code: 'release_note.empty_verification', message: 'Release note Verification section is empty or a placeholder', path: rel });
    }

    if (/pending/i.test(text) && /(?:PR\s+#\d+\s+merged|issue\s+#\d+\s+closed|Tag:\s+v\d|GitHub Release:\s+https?:\/\/)/i.test(text)) {
      warnings.push({ level: 'warn', code: 'release_note.pending_after_close', message: 'Release note still says pending while also citing merged/closed/released evidence', path: rel });
    }
    const runIds = text.match(/\b\d{8}T\d{6}Z-[a-z0-9-]+\b/g) ?? [];
    if (runIds.length > 0 && !/(PR\s+#\d+|Pull Request|https:\/\/github\.com\/.*\/pull\/\d+)/i.test(text)) {
      warnings.push({ level: 'warn', code: 'release_note.run_without_pr', message: 'Release note cites run ID but no PR reference', path: rel });
    }
  }

  const releaseSlugs = releaseNotes(root).map((path) => basename(path, '.md'));
  const releaseTextsByPath = releaseNotes(root).map((path) => ({ path, text: read(path) }));
  const doneSlugs = new Set(state.plans.done.map((plan) => plan.slug));
  for (const active of state.plans.active) {
    if (doneSlugs.has(active.slug)) {
      warnings.push({ level: 'warn', code: 'active_plan.duplicated_in_done', message: `Active plan ${active.slug} also exists in done/ — stage drift`, path: active.path });
    }
    if (releaseSlugs.some((name) => name === active.slug || name.endsWith(`-${active.slug}`))) {
      warnings.push({ level: 'warn', code: 'active_plan.has_release_note', message: `Active plan ${active.slug} already has a matching release note; consider closing it`, path: active.path });
    }
    const activePlanCitation = `.osc/plans/active/${active.slug}.md`;
    const citingRelease = releaseTextsByPath.find((note) => note.text.includes(activePlanCitation));
    if (citingRelease) {
      warnings.push({ level: 'warn', code: 'active_plan.cited_by_release_note', message: `Active plan ${active.slug} is cited by a release note; consider closing it`, path: active.path });
    }
  }

  for (const receiptPath of evidenceReceiptFiles(root)) {
    const text = read(receiptPath);
    const rel = relative(root, receiptPath);
    if (!/(^|\n)\s*schema:\s*open-scaffold\.evidence\.v1\b/.test(text)) {
      warnings.push({ level: 'warn', code: 'evidence_receipt.missing_schema', message: 'Evidence receipt does not declare schema: open-scaffold.evidence.v1', path: rel });
    }
    const approvalMatch = text.match(/approval:[\s\S]*?status:\s*([a-z_]+)/i);
    if (!approvalMatch || !APPROVAL_VALUES.has(approvalMatch[1].toLowerCase())) {
      warnings.push({ level: 'warn', code: 'evidence_receipt.missing_approval', message: 'Evidence receipt is missing an approval.status (approved | weak_approved | rejected | blocked)', path: rel });
    }
  }

  // Local best-effort: if a run id is cited in roadmap/plans but not summarized in any release note, warn.
  const publicFiles: string[] = [];
  for (const file of ['ROADMAP.md', 'MISSION.md']) {
    const path = join(root, file);
    if (existsSync(path)) publicFiles.push(path);
  }
  for (const stage of PLAN_STAGES) {
    for (const file of markdownFiles(join(root, '.osc', 'plans', stage))) {
      if (!isSupportPlanFile(file)) publicFiles.push(file);
    }
  }
  const releaseTexts = releaseNotes(root).map(read).join('\n');
  const seen = new Set<string>();
  for (const file of publicFiles) {
    const text = read(file);
    for (const runId of text.match(/\b\d{8}T\d{6}Z-[a-z0-9-]+\b/g) ?? []) {
      if (!seen.has(runId) && !releaseTexts.includes(runId)) {
        seen.add(runId);
        warnings.push({ level: 'warn', code: 'run_id.no_release_summary', message: `Run ID ${runId} is cited but not summarized in .osc/releases/`, path: relative(root, file) });
      }
    }
  }

  return { ok: failures.length === 0, failures, warnings };
}
