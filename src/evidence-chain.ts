import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { inspectScaffold, PLAN_STAGES, splitSections, type PlanStage } from './scaffold.js';

export type EvidenceChainStatus = 'intact' | 'broken' | 'missing' | 'unverifiable';

export type EvidenceChainLinkType =
  | 'plan_file'
  | 'acceptance_criterion'
  | 'evidence_reference'
  | 'evidence_note'
  | 'run_packet'
  | 'pr_reference'
  | 'close_decision';

export interface EvidenceChainLink {
  type: EvidenceChainLinkType;
  reference: string;
  status: EvidenceChainStatus;
  detail: string;
}

export interface EvidenceChainPlanFinding {
  plan_slug: string;
  plan_path: string;
  stage: PlanStage;
  links: EvidenceChainLink[];
}

export interface EvidenceChainSummary {
  plansChecked: number;
  linksFound: number;
  intact: number;
  broken: number;
  missing: number;
  unverifiable: number;
}

export interface EvidenceChainReport {
  root: string;
  summary: EvidenceChainSummary;
  plans: EvidenceChainPlanFinding[];
}

export interface EvidenceChainOptions {
  plan?: string;
}

export interface EvidenceChainFormatOptions {
  strict?: boolean;
}

const PRIVATE_PREFIXES = ['.osc-dev/', '.osc/state/', '.osc/research/', '.git/', '.hermes/', 'node_modules/'];
const APPROVAL_STATUSES = ['approved', 'weak_approved', 'rejected', 'blocked'];
const RUN_ID_PATTERN = /\b\d{8}T\d{6}Z-[a-z0-9-]+\b/g;
const GITHUB_PR_URL_PATTERN = /https:\/\/github\.com\/[^\s)]+\/pull\/\d+/g;
const PR_REF_PATTERN = /\b(?:PR|Pull Request)\s*:?\s*#\d+\b|(?<![\w/])#\d+\b/g;

type PlanCandidate = {
  slug: string;
  path: string;
  stage: PlanStage;
};

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertSafePlanArg(value: string): string {
  const trimmed = value.trim();
  const withoutExt = trimmed.endsWith('.md') ? trimmed.slice(0, -3) : trimmed;
  if (!withoutExt || withoutExt.includes('/') || withoutExt.includes('\\') || withoutExt.includes('..') || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(withoutExt)) {
    throw new Error(`Unsafe plan slug: ${value}. Use a slug such as 071-evidence-chain-verifier.`);
  }
  return withoutExt;
}

function findPlan(root: string, slugArg: string): PlanCandidate {
  const slug = assertSafePlanArg(slugArg);
  const donePath = join(root, '.osc', 'plans', 'done', `${slug}.md`);
  if (existsSync(donePath) && statSync(donePath).isFile()) {
    return { slug, path: relative(root, donePath), stage: 'done' };
  }
  const nonDoneMatch = PLAN_STAGES
    .filter((stage) => stage !== 'done')
    .map((stage) => join(root, '.osc', 'plans', stage, `${slug}.md`))
    .find((path) => existsSync(path) && statSync(path).isFile());
  if (nonDoneMatch) {
    throw new Error(`Plan is not closed: ${slug}.md is outside .osc/plans/done/. Evidence-chain verification only accepts done plans.`);
  }
  throw new Error(`Plan not found in .osc/plans/done/: ${slug}`);
}

function listDonePlans(root: string): PlanCandidate[] {
  return inspectScaffold(root).plans.done.map((plan) => ({ slug: plan.slug, path: plan.path, stage: plan.stage }));
}

function countSummary(plans: EvidenceChainPlanFinding[]): EvidenceChainSummary {
  const summary: EvidenceChainSummary = { plansChecked: plans.length, linksFound: 0, intact: 0, broken: 0, missing: 0, unverifiable: 0 };
  for (const plan of plans) {
    for (const link of plan.links) {
      summary.linksFound += 1;
      summary[link.status] += 1;
    }
  }
  return summary;
}

function evidenceNotePath(root: string, slug: string): string | null {
  const releases = join(root, '.osc', 'releases');
  if (!existsSync(releases)) return null;
  const pattern = new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${escapeRegex(slug)}\\.md$`);
  const matches = readdirSync(releases)
    .filter((file) => pattern.test(file))
    .sort();
  const latest = matches.at(-1);
  return latest ? join(releases, latest) : null;
}

function stripRef(value: string): string {
  const cleaned = value
    .trim()
    .replace(/^<|>$/g, '')
    .replace(/^['"`(]+|['"`),.;:]+$/g, '');
  if (/^(?:#\d+|(?:PR|Pull Request)\s*:?\s*#\d+)$/i.test(cleaned)) return cleaned;
  return cleaned.replace(/#.*$/, '');
}

function isExternalReference(ref: string): boolean {
  return /^https?:\/\//.test(ref) || /^#\d+$/.test(ref) || /^(?:PR|Pull Request)\s*:?\s*#\d+$/i.test(ref);
}

function isPrivateReference(ref: string): boolean {
  const normalized = ref.replace(/\\/g, '/').replace(/^\.\//, '');
  return PRIVATE_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix));
}

function localPathStatus(root: string, ref: string): EvidenceChainLink {
  const stripped = stripRef(ref);
  if (!stripped) {
    return { type: 'evidence_reference', reference: ref, status: 'missing', detail: 'empty evidence reference' };
  }
  if (isExternalReference(stripped)) {
    return { type: 'evidence_reference', reference: stripped, status: 'unverifiable', detail: 'external reference recognized but not checked locally' };
  }
  if (/[<>*]/.test(stripped)) {
    return { type: 'evidence_reference', reference: stripped, status: 'unverifiable', detail: 'pattern or placeholder reference is not checked as a local file' };
  }
  if (isAbsolute(stripped) || stripped.includes('..') || isPrivateReference(stripped)) {
    return { type: 'evidence_reference', reference: stripped, status: 'broken', detail: 'local evidence reference is outside the public repo evidence boundary' };
  }
  const rootReal = realpathSync(root);
  const full = resolve(rootReal, stripped);
  if (!full.startsWith(`${rootReal}/`) && full !== rootReal) {
    return { type: 'evidence_reference', reference: stripped, status: 'broken', detail: 'local evidence reference escapes repo root' };
  }
  if (!existsSync(full)) {
    return { type: 'evidence_reference', reference: stripped, status: 'broken', detail: 'local evidence reference does not exist' };
  }
  const real = realpathSync(full);
  if (!real.startsWith(`${rootReal}/`) && real !== rootReal) {
    return { type: 'evidence_reference', reference: stripped, status: 'broken', detail: 'local evidence reference resolves outside repo root' };
  }
  return { type: 'evidence_reference', reference: stripped, status: 'intact', detail: 'local evidence reference exists' };
}

function extractMarkdownLinkTargets(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) out.push(match[1]);
  return out;
}

function isPathLikeReference(value: string): boolean {
  const ref = stripRef(value);
  if (!ref || /\s/.test(ref) || /^https?:\/\//.test(ref) || ref.startsWith('--')) return false;
  if (/^(?:\.\.?\/|\.osc\/|docs\/|src\/|tests\/|packages\/|examples\/|\.github\/)/.test(ref)) return true;
  return /^[A-Za-z0-9._-]+\.(?:md|txt|json|ya?ml|ts|tsx|js|mjs|cjs|sh|html|css)$/.test(ref);
}

function extractBacktickPaths(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/`([^`]+)`/g)) {
    if (isPathLikeReference(match[1])) out.push(match[1]);
  }
  return out;
}

function extractBarePathRefs(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/(?:^|[\s(:])((?:\.\.\/|\.\/|\.osc\/|docs\/|src\/|tests\/|packages\/|examples\/|\.github\/)[^\s`),;]+)/g)) {
    if (isPathLikeReference(match[1])) out.push(match[1]);
  }
  return out;
}

function extractUrls(text: string): string[] {
  return Array.from(text.matchAll(/https?:\/\/[^\s`)>,;]+/g), (match) => match[0]);
}

function extractPrRefs(text: string): string[] {
  return Array.from(text.matchAll(PR_REF_PATTERN), (match) => match[0]);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map(stripRef).filter(Boolean))).sort();
}

function evidenceReferencesFromCriterion(text: string): string[] {
  const refs = [
    ...extractMarkdownLinkTargets(text),
    ...extractBacktickPaths(text),
    ...extractBarePathRefs(text),
    ...extractUrls(text),
    ...extractPrRefs(text),
  ];
  return unique(refs);
}

function acceptanceCriterionLinks(root: string, acceptanceSection: string): EvidenceChainLink[] {
  const links: EvidenceChainLink[] = [];
  const criteria = acceptanceSection
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+\[[ xX]\]\s+/.test(line));

  if (criteria.length === 0) {
    return [{ type: 'acceptance_criterion', reference: '(none)', status: 'missing', detail: 'plan has no checkbox acceptance criteria' }];
  }

  for (let index = 0; index < criteria.length; index += 1) {
    const line = criteria[index];
    const checked = /^[-*]\s+\[[xX]\]\s+/.test(line);
    const body = line.replace(/^[-*]\s+\[[ xX]\]\s+/, '').trim();
    const label = `AC${index + 1}`;
    if (!checked) {
      links.push({ type: 'acceptance_criterion', reference: label, status: 'missing', detail: 'acceptance criterion is unchecked and has no passing evidence' });
      continue;
    }
    if (/\b(?:N\/A|not applicable)\s*:/i.test(body)) {
      links.push({ type: 'acceptance_criterion', reference: label, status: 'intact', detail: 'acceptance criterion is explicitly marked N/A' });
      continue;
    }
    const refs = evidenceReferencesFromCriterion(body);
    if (refs.length === 0) {
      links.push({ type: 'acceptance_criterion', reference: label, status: 'missing', detail: 'checked acceptance criterion has no local evidence reference or explicit N/A marker' });
      continue;
    }
    links.push({ type: 'acceptance_criterion', reference: label, status: 'intact', detail: 'acceptance criterion has evidence reference(s)' });
    for (const ref of refs) links.push(localPathStatus(root, ref));
  }
  return links;
}

function runPacketLinks(root: string, text: string): EvidenceChainLink[] {
  const runIds = unique(Array.from(text.matchAll(RUN_ID_PATTERN), (match) => match[0]));
  if (runIds.length === 0) {
    return [{ type: 'run_packet', reference: '(none)', status: 'intact', detail: 'no run reference' }];
  }
  return runIds.map((runId) => {
    const runDir = join(root, '.osc', 'runs', runId);
    const runJson = join(runDir, 'run.json');
    const exists = existsSync(runDir) || existsSync(runJson);
    return {
      type: 'run_packet',
      reference: `.osc/runs/${runId}`,
      status: exists ? 'intact' : 'broken',
      detail: exists ? 'run packet reference exists locally' : 'run packet reference is missing locally',
    } satisfies EvidenceChainLink;
  });
}

function prReferenceLinks(text: string): EvidenceChainLink[] {
  const refs = Array.from(new Set([
    ...Array.from(text.matchAll(GITHUB_PR_URL_PATTERN), (match) => match[0]),
    ...Array.from(text.matchAll(PR_REF_PATTERN), (match) => match[0]),
  ].map((value) => value.trim().replace(/^['"`(]+|['"`),.;:]+$/g, '')).filter(Boolean))).sort();
  return refs.map((ref) => ({
    type: 'pr_reference',
    reference: ref,
    status: 'unverifiable',
    detail: 'PR reference is syntactically recognized but not checked over the network',
  }));
}

function closeDecisionLink(text: string): EvidenceChainLink {
  const statusPattern = new RegExp(`status:\\s*(?:${APPROVAL_STATUSES.join('|')})\\b`, 'i');
  const closeDecisionPattern = new RegExp(`close decision[^\\n]*(?:${APPROVAL_STATUSES.join('|')})\\b`, 'i');
  const hasStatus = statusPattern.test(text) || closeDecisionPattern.test(text);
  const hasRationale = /rationale\s*:/i.test(text);
  const hasDecision = hasStatus && hasRationale;
  return {
    type: 'close_decision',
    reference: 'approval.status',
    status: hasDecision ? 'intact' : 'missing',
    detail: hasDecision ? 'close decision has an allowed status and rationale' : 'close decision is missing an allowed approval.status and rationale',
  };
}

function evidenceNoteLinks(root: string, slug: string, evidencePath: string | null): { links: EvidenceChainLink[]; text: string } {
  if (!evidencePath) {
    return {
      text: '',
      links: [{ type: 'evidence_note', reference: `.osc/releases/*-${slug}.md`, status: 'missing', detail: 'no matching evidence/release note found' }],
    };
  }
  const rel = relative(root, evidencePath);
  const text = read(evidencePath);
  const citesPlan = text.includes(`.osc/plans/done/${slug}.md`) || text.includes(`.osc/plans/active/${slug}.md`) || text.includes(`.osc/plans/backlog/${slug}.md`) || text.includes(`.osc/plans/blocked/${slug}.md`);
  return {
    text,
    links: [
      { type: 'evidence_note', reference: rel, status: 'intact', detail: 'matching evidence/release note found' },
      { type: 'evidence_reference', reference: rel, status: citesPlan ? 'intact' : 'broken', detail: citesPlan ? 'evidence note cites the concrete plan path' : 'evidence note does not cite the concrete plan path' },
    ],
  };
}

function verifyOnePlan(root: string, plan: PlanCandidate): EvidenceChainPlanFinding {
  const planPath = join(root, plan.path);
  const text = read(planPath);
  const sections = splitSections(text);
  const evidencePath = evidenceNotePath(root, plan.slug);
  const evidence = evidenceNoteLinks(root, plan.slug, evidencePath);
  const combinedText = `${text}\n${evidence.text}`;
  const links: EvidenceChainLink[] = [
    { type: 'plan_file', reference: plan.path, status: 'intact', detail: 'plan file exists' },
    ...acceptanceCriterionLinks(root, sections.get('Acceptance criteria') ?? ''),
    ...evidence.links,
    ...runPacketLinks(root, combinedText),
    ...prReferenceLinks(combinedText),
    closeDecisionLink(evidence.text),
  ];
  return { plan_slug: plan.slug, plan_path: plan.path, stage: plan.stage, links };
}

export function verifyEvidenceChain(root = process.cwd(), options: EvidenceChainOptions = {}): EvidenceChainReport {
  const resolvedRoot = resolve(root);
  const plans = options.plan ? [findPlan(resolvedRoot, options.plan)] : listDonePlans(resolvedRoot);
  const findings = plans.map((plan) => verifyOnePlan(resolvedRoot, plan));
  return { root: resolvedRoot, summary: countSummary(findings), plans: findings };
}

export function evidenceChainExitCode(report: EvidenceChainReport, options: EvidenceChainFormatOptions = {}): number {
  if (report.summary.broken > 0) return 1;
  if (options.strict && report.summary.missing > 0) return 1;
  return 0;
}

function statusLabel(status: EvidenceChainStatus): string {
  return status.toUpperCase();
}

export function formatEvidenceChainReport(report: EvidenceChainReport, options: EvidenceChainFormatOptions = {}): string {
  const strictResult = evidenceChainExitCode(report, options) === 0 ? 'pass' : 'fail';
  const lines = [
    `Evidence chain: plans checked=${report.summary.plansChecked} links found=${report.summary.linksFound} intact=${report.summary.intact} broken=${report.summary.broken} missing=${report.summary.missing} unverifiable=${report.summary.unverifiable} strict result=${strictResult}`,
  ];
  for (const plan of report.plans) {
    lines.push(`- ${plan.plan_slug} (${plan.plan_path})`);
    for (const link of plan.links) {
      lines.push(`  - ${statusLabel(link.status)} ${link.type}: ${link.reference} — ${link.detail}`);
    }
  }
  return `${lines.join('\n')}\n`;
}
