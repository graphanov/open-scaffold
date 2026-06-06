import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findScaffoldRoot, parseChecklist, parsePlanFile } from './scaffold.js';
import { findEvidenceNote } from './evidence.js';
import { computePrSummary, evidenceApprovalStatus, renderPrSummaryMarkdown, type PrSummaryReport } from './pr-summary.js';

export const PR_CHECK_SCHEMA = 'open-scaffold.pr_check.v1';
export const STRUCTURAL_ONLY_WARNING = 'Structural-only warning: this checks plan/evidence/run/PR record shape. It does not prove semantic correctness, compliance, production readiness, approval, or that the implementation is good.';

export interface PrCheckFinding {
  code: 'missing_plan' | 'missing_evidence' | 'evidence_skeleton' | 'missing_run' | 'missing_close_decision' | 'plan_validation_error' | 'github_unverified' | 'github_unavailable' | 'github_verified';
  severity: 'info' | 'warn' | 'error';
  message: string;
}

export interface PrCheckReport {
  schemaVersion: typeof PR_CHECK_SCHEMA;
  slug: string;
  structural_only_warning: string;
  summary: PrSummaryReport;
  findings: PrCheckFinding[];
  ok: boolean;
}

function rootFrom(start: string): string {
  const root = findScaffoldRoot(start);
  if (!root) throw new Error(`No Open Scaffold root found from ${start}.`);
  return root;
}

function readEvidence(root: string, slug: string): string | null {
  const evidencePath = findEvidenceNote(root, slug);
  if (!evidencePath || !existsSync(evidencePath)) return null;
  return readFileSync(evidencePath, 'utf8');
}

function hasRunReference(text: string): boolean {
  return /\.osc\/runs\/[^\s`),;]+\/run\.json|\b\d{8}T\d{6}Z-[a-z0-9-]+\b/.test(text);
}

function hasCloseDecision(text: string): boolean {
  const status = evidenceApprovalStatus(text);
  return status !== 'unknown' && /rationale\s*:/i.test(text);
}

function onlineGithubFinding(ref: string): PrCheckFinding {
  return {
    code: 'github_unavailable',
    severity: 'warn',
    message: `${ref} was requested for online GitHub verification, but this local structural check stays no-spawn/no-network. Verify it externally or through the fork-safe workflow and record that result as evidence.`,
  };
}

function githubFindings(text: string, online: boolean): PrCheckFinding[] {
  const refs = Array.from(new Set(Array.from(text.matchAll(/https:\/\/github\.com\/[^\s)]+\/pull\/\d+|\b(?:PR|Pull Request)\s*:?\s*#\d+\b/g), (m) => m[0])));
  if (refs.length === 0) return [];
  if (!online) return refs.map((ref) => ({ code: 'github_unverified', severity: 'info', message: `${ref} recognized but not checked online.` }));
  return refs.map((ref) => onlineGithubFinding(ref));
}

export function computePrCheck(slug: string, options: { root?: string; onlineGithub?: boolean } = {}): PrCheckReport {
  const root = rootFrom(options.root ?? process.cwd());
  const summary = computePrSummary(slug, { root });
  const findings: PrCheckFinding[] = [];
  if (!summary.plan_found) {
    findings.push({ code: 'missing_plan', severity: 'error', message: 'No matching plan was found in .osc/plans.' });
    return { schemaVersion: PR_CHECK_SCHEMA, slug, structural_only_warning: STRUCTURAL_ONLY_WARNING, summary, findings, ok: false };
  }
  if (summary.validation.error_count > 0) {
    findings.push({ code: 'plan_validation_error', severity: 'error', message: `${summary.validation.error_count} plan validation error(s) must be fixed.` });
  }
  if (!summary.evidence.present) findings.push({ code: 'missing_evidence', severity: 'warn', message: 'No matching evidence note found in .osc/releases.' });
  if (summary.evidence.is_skeleton) findings.push({ code: 'evidence_skeleton', severity: 'warn', message: 'Evidence note still contains TODO placeholders.' });

  const planText = summary.plan_path ? readFileSync(join(root, summary.plan_path), 'utf8') : '';
  const evidenceText = readEvidence(root, summary.slug) ?? '';
  const combined = `${planText}\n${evidenceText}`;
  if (!hasRunReference(combined)) findings.push({ code: 'missing_run', severity: 'info', message: 'No run packet reference found; this may be fine for docs-only/manual slices.' });
  if (!evidenceText || !hasCloseDecision(evidenceText)) findings.push({ code: 'missing_close_decision', severity: 'warn', message: 'Evidence note lacks approval.status plus rationale close-decision fields.' });
  findings.push(...githubFindings(combined, Boolean(options.onlineGithub)));
  const ok = !findings.some((finding) => finding.severity === 'error');
  return { schemaVersion: PR_CHECK_SCHEMA, slug: summary.slug, structural_only_warning: STRUCTURAL_ONLY_WARNING, summary, findings, ok };
}

export function renderPrCheckMarkdown(report: PrCheckReport): string {
  const lines = [
    `# Open Scaffold PR check — ${report.slug}`,
    '',
    `> ${report.structural_only_warning}`,
    '',
    `Result: ${report.ok ? 'pass' : 'needs attention'}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`);
  lines.push('', '## Plan summary', '', renderPrSummaryMarkdown(report.summary).replace(/^<!-- osc-pr-summary -->\n/, ''), '');
  return lines.join('\n');
}
