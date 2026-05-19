import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { findScaffoldRoot, PLAN_STAGES, REQUIRED_PLAN_SECTIONS, splitSections, type PlanStage } from './scaffold.js';

export type PlanIssueSeverity = 'error' | 'warning' | 'note';

export interface PlanValidationIssue {
  severity: PlanIssueSeverity;
  line: number;
  rule: string;
  message: string;
  suggestion: string;
}

export interface PlanValidationResult {
  path: string;
  issues: PlanValidationIssue[];
}

export interface PlanValidationOptions {
  strict?: boolean;
}

function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

function normalizeHeading(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function lineNumberForHeading(lines: string[], heading: string): number {
  const index = lines.findIndex((line) => normalizeHeading(line.replace(/^##\s+/, '')) === heading && /^##\s+/.test(line));
  return index >= 0 ? index + 1 : 1;
}

function firstContentLine(lines: string[], sectionLine: number): number {
  for (let i = sectionLine; i < lines.length; i += 1) {
    const trimmed = lines[i]?.trim() ?? '';
    if (!trimmed) continue;
    if (trimmed.startsWith('## ')) return sectionLine;
    return i + 1;
  }
  return sectionLine;
}

function issue(severity: PlanIssueSeverity, line: number, rule: string, message: string, suggestion: string): PlanValidationIssue {
  return { severity, line, rule, message, suggestion };
}

function planStageFromPath(path: string): PlanStage | null {
  const normalized = path.replace(/\\/g, '/');
  for (const stage of PLAN_STAGES) {
    if (normalized.includes(`/.osc/plans/${stage}/`)) return stage;
  }
  return null;
}

export function resolvePlanValidationPath(input: string, start = process.cwd()): string {
  const direct = resolve(start, input);
  if ((input.includes('/') || input.endsWith('.md')) && existsSync(direct)) return direct;
  if (existsSync(direct) && statSync(direct).isFile()) return direct;

  const root = findScaffoldRoot(start);
  if (!root) throw new Error(`No Open Scaffold root found from ${resolve(start)}. Run this inside a repo with .osc/plans and .osc/releases.`);
  const slug = input.endsWith('.md') ? input.slice(0, -3) : input;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug) || slug.includes('..')) {
    throw new Error(`Unsafe plan reference: ${input}. Use a plan path or slug such as 001-my-task.`);
  }
  for (const stage of PLAN_STAGES) {
    const candidate = join(root, '.osc', 'plans', stage, `${slug}.md`);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Plan not found: ${slug}.md in .osc/plans/{active,backlog,blocked,done}.`);
}

function sectionBodyIsEmpty(body: string): boolean {
  const stripped = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
  return stripped.length === 0;
}

function bulletItems(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\[[ xX]\]\s*/, '').trim())
    .filter(Boolean);
}

function firstParagraph(body: string): string {
  return body.split(/\n\s*\n/).map((part) => part.trim()).find(Boolean) ?? '';
}

function isVagueGoal(goal: string): boolean {
  const cleaned = goal.replace(/[`.]/g, '').trim().toLowerCase();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  if (words.length < 5) return true;
  return /^(improve|fix|update|change|make better|refactor)(\s+the\s+)?(system|thing|stuff|code|docs?)?$/.test(cleaned);
}

function findLineContaining(lines: string[], needle: string, fallback = 1): number {
  const index = lines.findIndex((line) => line.includes(needle));
  return index >= 0 ? index + 1 : fallback;
}

function lineContainsTodoPlaceholder(line: string): boolean {
  const withoutInlineCode = line.replace(/`[^`]*`/g, '');
  return /(^|[\s>*-])TODO:\s*\S/i.test(withoutInlineCode);
}

function shouldBeBlockingQuestion(item: string): boolean {
  const trimmed = item.trim();
  if (/^none\.?$/i.test(trimmed)) return false;
  if (/^BLOCKING:/i.test(trimmed)) return false;
  return /\b(block|blocked|blocking|blocker|must decide|decision gate|owner approval|human input|external input|unknown dependency)\b/i.test(trimmed);
}

function statusMatchesStage(status: string, stage: PlanStage): boolean {
  const normalized = status.trim().toLowerCase();
  if (normalized === stage) return true;
  if (!normalized.startsWith(stage)) return false;
  const next = normalized[stage.length];
  return next === undefined || /[\s:—–-]/.test(next);
}

export function validatePlanFile(path: string, _options: PlanValidationOptions = {}): PlanValidationResult {
  const markdown = readText(path);
  const lines = markdown.split(/\r?\n/);
  const sections = splitSections(markdown);
  const issues: PlanValidationIssue[] = [];

  for (const required of REQUIRED_PLAN_SECTIONS) {
    if (!sections.has(required)) {
      issues.push(issue('error', 1, 'required-sections', `Missing required section: ## ${required}`, `Add the missing ## ${required} section using the standard plan schema.`));
    }
  }

  const observedRequiredHeadings = lines
    .map((line) => line.match(/^##\s+(.+)$/)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(normalizeHeading)
    .filter((heading) => (REQUIRED_PLAN_SECTIONS as readonly string[]).includes(heading));
  const expectedObservedOrder = [...observedRequiredHeadings].sort((a, b) => REQUIRED_PLAN_SECTIONS.indexOf(a as typeof REQUIRED_PLAN_SECTIONS[number]) - REQUIRED_PLAN_SECTIONS.indexOf(b as typeof REQUIRED_PLAN_SECTIONS[number]));
  if (observedRequiredHeadings.join('\u0000') !== expectedObservedOrder.join('\u0000')) {
    issues.push(issue('warning', 1, 'heading-order', 'Plan headings are not in the canonical order.', `Use heading order: ${REQUIRED_PLAN_SECTIONS.map((heading) => `## ${heading}`).join(' → ')}.`));
  }

  lines.forEach((line, index) => {
    if (lineContainsTodoPlaceholder(line)) {
      issues.push(issue('error', index + 1, 'no-todos', 'Plan contains a TODO marker.', 'Replace TODO markers with concrete plan content before implementation.'));
    }
  });

  const stage = planStageFromPath(path);
  const status = firstParagraph(sections.get('Status') ?? '');
  if (stage && status && !statusMatchesStage(status, stage)) {
    issues.push(issue('error', lineNumberForHeading(lines, 'Status'), 'status-stage-consistency', `Plan is in ${stage}/ but ## Status says "${status}".`, `Move the plan to the matching folder or start ## Status with ${stage}.`));
  }

  for (const section of REQUIRED_PLAN_SECTIONS) {
    if (section === 'Open questions' || !sections.has(section)) continue;
    const body = sections.get(section) ?? '';
    if (sectionBodyIsEmpty(body)) {
      issues.push(issue('warning', lineNumberForHeading(lines, section), 'no-empty-sections', `Section ## ${section} is empty.`, `Fill ## ${section} with concrete, reviewable content.`));
    }
  }

  const acBody = sections.get('Acceptance criteria') ?? '';
  const acItems = bulletItems(acBody);
  if (sections.has('Acceptance criteria') && acItems.length === 0) {
    issues.push(issue('warning', lineNumberForHeading(lines, 'Acceptance criteria'), 'non-empty-ac', 'Acceptance criteria section has no checklist or bullet items.', 'Add at least one testable acceptance criterion.'));
  }

  const goal = firstParagraph(sections.get('Goal') ?? '');
  if (sections.has('Goal') && isVagueGoal(goal)) {
    issues.push(issue('warning', firstContentLine(lines, lineNumberForHeading(lines, 'Goal')), 'no-vague-goal', `Goal is too vague: "${goal || '(empty)'}".`, 'State one observable outcome with enough specifics to verify.'));
  }

  const questions = bulletItems(sections.get('Open questions') ?? '');
  for (const question of questions) {
    if (shouldBeBlockingQuestion(question)) {
      issues.push(issue('warning', findLineContaining(lines, question, lineNumberForHeading(lines, 'Open questions')), 'blocking-questions-tagged', `Open question may block execution but is not tagged BLOCKING: ${question}`, 'Prefix genuinely blocking questions with BLOCKING: or resolve the question before implementation.'));
    }
  }

  return { path, issues };
}

export function hasBlockingIssues(issues: PlanValidationIssue[], strict = false): boolean {
  return issues.some((item) => item.severity === 'error' || (strict && item.severity === 'warning'));
}

export function formatPlanValidationIssues(issues: PlanValidationIssue[]): string {
  if (issues.length === 0) return '0 issues found';
  return issues
    .map((item) => `${item.severity} ${item.rule} line ${item.line}: ${item.message}\n  suggestion: ${item.suggestion}`)
    .join('\n');
}
