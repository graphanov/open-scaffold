import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

export const OSC_NAMESPACE = '.osc';
export const PLAN_STAGES = ['active', 'backlog', 'blocked', 'done'] as const;
export type PlanStage = typeof PLAN_STAGES[number];
export const PLAN_CREATION_STAGES = ['active', 'backlog', 'blocked'] as const;
export type PlanCreationStage = typeof PLAN_CREATION_STAGES[number];
export const REQUIRED_PLAN_SECTIONS = [
  'Status',
  'Context',
  'Goal',
  'Constraints / Out of scope',
  'Files to touch',
  'Acceptance criteria',
  'Verification steps',
  'Open questions',
] as const;

export interface MissionState {
  path: string;
  defined: boolean;
  reason?: string;
}

export interface PlanSummary {
  slug: string;
  path: string;
  stage: PlanStage;
}

export interface ScaffoldState {
  root: string;
  namespace: '.osc';
  mission: MissionState;
  plans: Record<PlanStage, PlanSummary[]>;
}

export interface CreatedScaffoldFile {
  root: string;
  path: string;
  relativePath: string;
  slug: string;
}

export interface CreatedPlanSkeleton extends CreatedScaffoldFile {
  stage: PlanCreationStage;
  templateName?: string;
}

export interface PlanTemplateSummary {
  name: string;
  path: string;
}

export interface CreatedPlanAmendment extends CreatedScaffoldFile {
  parentPath: string;
  amendmentNumber: number;
  changelogStamped: boolean;
}

export interface ClosedPlanResult {
  root: string;
  slug: string;
  fromStage: PlanStage | 'root';
  movedFiles: string[];
  changelogStamped: boolean;
  alreadyDone: boolean;
}

export interface MovedPlanResult {
  root: string;
  slug: string;
  fromStage: PlanStage | 'root';
  toStage: PlanCreationStage;
  movedFiles: string[];
  alreadyInStage: boolean;
}

export interface ExecutionGroup {
  name: string;
  rationale: string;
  tasks: string;
  dependsOnPrevious: boolean;
}

export interface ExecutionStrategy {
  groups: ExecutionGroup[];
  dependencies: string[];
  delegationNotes: string[];
}

export interface ParsedPlan {
  path: string;
  slug: string;
  status: string;
  goal: string;
  sections: Map<string, string>;
  filesToTouch: string[];
  acceptanceCriteria: string[];
  verificationSteps: string[];
  openQuestions: string[];
  executionStrategy?: ExecutionStrategy;
}

function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

export function inspectMission(root: string): MissionState {
  const path = join(root, 'MISSION.md');
  if (!existsSync(path)) return { path, defined: false, reason: 'MISSION.md not found' };
  const text = readText(path);
  if (text.includes('mission:unset') || text.includes('TODO: define mission')) {
    return { path, defined: false, reason: 'mission unset marker present' };
  }
  return { path, defined: true };
}

export function inspectScaffold(root = process.cwd()): ScaffoldState {
  const plans: Record<PlanStage, PlanSummary[]> = {
    active: [],
    backlog: [],
    blocked: [],
    done: [],
  };
  for (const stage of PLAN_STAGES) {
    const dir = join(root, OSC_NAMESPACE, 'plans', stage);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).sort()) {
      if (!file.endsWith('.md')) continue;
      if (file === 'README.md' || file === 'WORKFLOW.md' || file === 'handoff-template.md') continue;
      const full = join(dir, file);
      if (!statSync(full).isFile()) continue;
      plans[stage].push({ slug: basename(file, '.md'), path: relative(root, full), stage });
    }
  }
  return { root, namespace: OSC_NAMESPACE, mission: inspectMission(root), plans };
}

export function findScaffoldRoot(start = process.cwd()): string | null {
  let current = resolve(start);
  while (true) {
    if (existsSync(join(current, OSC_NAMESPACE, 'plans')) && existsSync(join(current, OSC_NAMESPACE, 'releases'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function assertSafeSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed || trimmed.endsWith('.md') || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(trimmed) || trimmed.includes('..')) {
    throw new Error(`Unsafe slug: ${slug}. Use letters, numbers, dots, underscores, and hyphens only; omit .md and path separators.`);
  }
  return trimmed;
}

function normalizeLifecyclePlanSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error(`Unsafe slug: ${slug}. Use a plan slug such as 001-my-task, not a path.`);
  }
  const withoutExtension = trimmed.endsWith('.md') ? trimmed.slice(0, -3) : trimmed;
  const withoutAmendmentSuffix = withoutExtension.replace(/-amendment-\d+$/, '');
  return assertSafeSlug(withoutAmendmentSuffix);
}

function requireScaffoldRoot(start = process.cwd()): string {
  const root = findScaffoldRoot(start);
  if (!root) throw new Error(`No Open Scaffold root found from ${resolve(start)}. Run this inside a repo with .osc/plans and .osc/releases.`);
  return root;
}

function renderPlanSkeleton(slug: string, stage: PlanCreationStage): string {
  return `# Plan: ${slug}

## Status

${stage}

## Context

TODO: explain why this plan exists now.

## Goal

TODO: state one observable outcome that defines done.

## Constraints / Out of scope

- TODO: list what this plan will not do.

## Files to touch

- TODO: \`path/to/file.ext\` — why this file changes.

## Acceptance criteria

- [ ] TODO: replace with a testable acceptance criterion before implementation.

## Verification steps

1. TODO: command or check — expected pass signal.

## Open questions

- TODO: unresolved decision or assumption, or write \`None.\` after review.
`;
}

function templatesDir(root: string): string {
  return join(root, OSC_NAMESPACE, 'plans', 'templates');
}

function assertSafeTemplateName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.endsWith('.md') || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(trimmed) || trimmed.includes('..')) {
    throw new Error(`Unsafe template name: ${name}. Use a template id such as bug-fix or custom-team.`);
  }
  return trimmed;
}

export function listPlanTemplates(start = process.cwd()): PlanTemplateSummary[] {
  const root = requireScaffoldRoot(start);
  const dir = templatesDir(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .sort()
    .map((file) => ({ name: basename(file, '.md'), path: relative(root, join(dir, file)) }));
}

function assertTemplateHasRequiredSections(templateText: string, templateName: string): void {
  const sections = splitSections(templateText);
  const missing = REQUIRED_PLAN_SECTIONS.filter((section) => !sections.has(section));
  if (missing.length > 0) {
    throw new Error(`Template ${templateName} is missing required sections: ${missing.map((section) => `## ${section}`).join(', ')}`);
  }
}

function renderPlanFromTemplate(slug: string, stage: PlanCreationStage, templateName: string, root: string): string {
  const safeTemplateName = assertSafeTemplateName(templateName);
  const path = join(templatesDir(root), `${safeTemplateName}.md`);
  if (!existsSync(path)) {
    throw new Error(`Template not found: ${safeTemplateName}. Expected .osc/plans/templates/${safeTemplateName}.md`);
  }
  let text = readText(path);
  assertTemplateHasRequiredSections(text, safeTemplateName);
  text = text.replace(/^# Plan:.+$/m, `# Plan: ${slug}`);
  text = updatePlanStatus(text, stage);
  text = text.replace(/\bREPLACE_ME:\s*/g, '');
  return text.endsWith('\n') ? text : `${text}\n`;
}

function renderEvidenceSkeleton(slug: string): string {
  return `# Release / Evidence Note: ${slug}

## Summary

TODO: summarize what changed in 1-3 sentences. Do not claim approval, merge, publication, or runtime execution until verified.

## Traceability

- Roadmap / issue / task: TODO: link or identifier, or \`N/A\` with reason.
- Plan: TODO: .osc/plans/done/<slug>.md
- Run ID / run packet: TODO: path or \`N/A\`.
- Branch / PR: TODO: branch and PR URL, or pending owner review.

## Verification

- TODO: command — result

## Outcome

TODO: state what shipped, what remains out of scope, and the approval/review state.

## Follow-up

- TODO: remaining work, owner gate, or \`N/A\`.
`;
}

function renderAmendmentSkeleton(slug: string, amendmentNumber: number, date: Date): string {
  return `# Amendment ${amendmentNumber}: ${slug}

## Parent

${slug}

## Date

${formatLocalDate(date)}

## Learning

TODO: what changed and why (the "I got smarter" moment)

## New direction

TODO: the revised goal or criteria, stated verbatim

## Impact on acceptance criteria

TODO: which acceptance criterion numbers change, and how
`;
}

function formatLocalDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type FoundPlan = {
  path: string;
  dir: string;
  stage: PlanStage | 'root';
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function planStageSearchDirs(root: string, stages: readonly (PlanStage | 'root')[]): Array<{ stage: PlanStage | 'root'; dir: string }> {
  const plansDir = join(root, OSC_NAMESPACE, 'plans');
  return stages.map((stage) => ({ stage, dir: stage === 'root' ? plansDir : join(plansDir, stage) }));
}

function findPlanBySlug(root: string, slug: string, stages: readonly (PlanStage | 'root')[]): FoundPlan | null {
  for (const { stage, dir } of planStageSearchDirs(root, stages)) {
    const path = join(dir, `${slug}.md`);
    if (existsSync(path)) return { path, dir, stage };
  }
  return null;
}

function assertMissionReady(root: string): void {
  const missionPath = join(root, 'MISSION.md');
  if (!existsSync(missionPath)) {
    throw new Error(`MISSION.md not found at ${missionPath}`);
  }
  const mission = readFileSync(missionPath, 'utf8');
  if (mission.includes('mission:unset') || mission.includes('TODO: define mission')) {
    throw new Error('Mission is not yet defined. Run ./bootstrap.sh or edit MISSION.md first.');
  }
}

function stampMissionChangelog(root: string, line: string, idempotencyToken?: string): boolean {
  assertMissionReady(root);
  const missionPath = join(root, 'MISSION.md');
  const mission = readFileSync(missionPath, 'utf8');
  if (idempotencyToken && mission.includes(idempotencyToken)) return false;

  const anchor = '<!-- append YYYY-MM-DD entries below this line -->';
  const entry = `- ${line}`;
  let nextMission: string;
  if (mission.includes(anchor)) {
    const lines = mission.split(/\r?\n/);
    const output: string[] = [];
    for (const existingLine of lines) {
      output.push(existingLine);
      if (existingLine.includes(anchor)) output.push(entry);
    }
    nextMission = output.join('\n');
  } else {
    nextMission = `${mission.replace(/\s*$/, '')}\n\n${entry}\n`;
  }
  writeFileSync(missionPath, nextMission, 'utf8');
  return true;
}

export function createPlanSkeleton(slug: string, stage: PlanCreationStage, start = process.cwd(), options: { templateName?: string } = {}): CreatedPlanSkeleton {
  if (!PLAN_CREATION_STAGES.includes(stage)) {
    throw new Error(`Invalid plan stage: ${stage}. Expected one of: ${PLAN_CREATION_STAGES.join(', ')}`);
  }
  const safeSlug = assertSafeSlug(slug);
  const root = requireScaffoldRoot(start);
  const stageDir = join(root, OSC_NAMESPACE, 'plans', stage);
  if (!existsSync(stageDir)) {
    throw new Error(`Open Scaffold stage folder missing: ${relative(root, stageDir)}`);
  }
  const path = join(stageDir, `${safeSlug}.md`);
  const relativePath = relative(root, path);
  if (existsSync(path)) {
    throw new Error(`Refusing to overwrite existing plan: ${relativePath}`);
  }
  mkdirSync(stageDir, { recursive: true });
  const content = options.templateName ? renderPlanFromTemplate(safeSlug, stage, options.templateName, root) : renderPlanSkeleton(safeSlug, stage);
  writeFileSync(path, content, 'utf8');
  return { root, path, relativePath, slug: safeSlug, stage, templateName: options.templateName };
}

export function createEvidenceNoteSkeleton(slug: string, start = process.cwd(), date = new Date()): CreatedScaffoldFile {
  const safeSlug = assertSafeSlug(slug);
  const root = requireScaffoldRoot(start);
  if (!findPlanBySlug(root, safeSlug, PLAN_STAGES)) {
    throw new Error(`Plan not found: ${safeSlug}.md in .osc/plans/{active,backlog,blocked,done}. Create or move the plan before creating evidence.`);
  }
  const releasesDir = join(root, OSC_NAMESPACE, 'releases');
  if (!existsSync(releasesDir)) {
    throw new Error(`Open Scaffold releases folder missing: ${relative(root, releasesDir)}`);
  }
  const isoDate = formatLocalDate(date);
  const path = join(releasesDir, `${isoDate}-${safeSlug}.md`);
  const relativePath = relative(root, path);
  if (existsSync(path)) {
    throw new Error(`Refusing to overwrite existing evidence note: ${relativePath}`);
  }
  mkdirSync(releasesDir, { recursive: true });
  writeFileSync(path, renderEvidenceSkeleton(safeSlug), 'utf8');
  return { root, path, relativePath, slug: safeSlug };
}

function updatePlanStatus(markdown: string, stage: PlanCreationStage): string {
  const statusPattern = /(^## Status[^\S\r\n]*\r?\n)(?:[^\S\r\n]*\r?\n)?([\s\S]*?)(?=\r?\n##\s+|$)/m;
  if (!statusPattern.test(markdown)) {
    throw new Error('Plan is missing a ## Status section. Refusing to move without a status to update.');
  }
  return markdown.replace(statusPattern, `$1\n${stage}\n`);
}

export function movePlan(slug: string, toStage: PlanCreationStage, start = process.cwd()): MovedPlanResult {
  if (!PLAN_CREATION_STAGES.includes(toStage)) {
    throw new Error(`Invalid plan stage: ${toStage}. Expected one of: ${PLAN_CREATION_STAGES.join(', ')}`);
  }
  const safeSlug = normalizeLifecyclePlanSlug(slug);
  const root = requireScaffoldRoot(start);
  const parent = findPlanBySlug(root, safeSlug, ['active', 'backlog', 'blocked', 'root']);
  if (!parent) {
    const donePlan = findPlanBySlug(root, safeSlug, ['done']);
    if (donePlan) {
      throw new Error(`Plan is already done: ${safeSlug}.md. Done plans are immutable; create a follow-up plan instead.`);
    }
    throw new Error(`Plan not found: ${safeSlug}.md in .osc/plans/{active,backlog,blocked}.`);
  }

  const parentPath = join(parent.dir, `${safeSlug}.md`);
  const updatedParentText = updatePlanStatus(readText(parentPath), toStage);
  if (parent.stage === toStage) {
    writeFileSync(parentPath, updatedParentText, 'utf8');
    return { root, slug: safeSlug, fromStage: parent.stage, toStage, movedFiles: [], alreadyInStage: true };
  }

  const targetDir = join(root, OSC_NAMESPACE, 'plans', toStage);
  mkdirSync(targetDir, { recursive: true });
  const amendmentPattern = new RegExp(`^${escapeRegex(safeSlug)}-amendment-\\d+\\.md$`);
  const filesToMove = [
    `${safeSlug}.md`,
    ...readdirSync(parent.dir).filter((file) => amendmentPattern.test(file)).sort(),
  ];
  for (const file of filesToMove) {
    const destination = join(targetDir, file);
    if (existsSync(destination)) {
      throw new Error(`Refusing to overwrite existing plan file: ${relative(root, destination)}`);
    }
  }
  for (const file of filesToMove) {
    renameSync(join(parent.dir, file), join(targetDir, file));
  }
  writeFileSync(join(targetDir, `${safeSlug}.md`), updatedParentText, 'utf8');
  return { root, slug: safeSlug, fromStage: parent.stage, toStage, movedFiles: filesToMove, alreadyInStage: false };
}

export function createPlanAmendment(slug: string, start = process.cwd(), message = '', date = new Date()): CreatedPlanAmendment {
  const safeSlug = normalizeLifecyclePlanSlug(slug);
  const root = requireScaffoldRoot(start);
  const parent = findPlanBySlug(root, safeSlug, ['active', 'backlog', 'blocked', 'done', 'root']);
  if (!parent) {
    throw new Error(`Parent plan not found: ${safeSlug}.md in .osc/plans/{active,backlog,blocked,done}.`);
  }

  let max = 0;
  const amendmentPattern = new RegExp(`^${escapeRegex(safeSlug)}-amendment-(\\d+)\\.md$`);
  for (const file of readdirSync(parent.dir)) {
    const match = file.match(amendmentPattern);
    if (!match) continue;
    const value = Number.parseInt(match[1], 10);
    if (value > max) max = value;
  }
  const amendmentNumber = max + 1;
  const filename = `${safeSlug}-amendment-${amendmentNumber}.md`;
  const path = join(parent.dir, filename);
  const relativePath = relative(root, path);
  if (existsSync(path)) {
    throw new Error(`Refusing to overwrite existing amendment: ${relativePath}`);
  }
  assertMissionReady(root);
  writeFileSync(path, renderAmendmentSkeleton(safeSlug, amendmentNumber, date), 'utf8');

  const dateText = formatLocalDate(date);
  const changelogLine = message.trim()
    ? `${dateText}: ${message.trim()} — see ${relativePath}`
    : `${dateText}: amendment ${amendmentNumber} to ${safeSlug} — see ${relativePath}`;
  const changelogStamped = stampMissionChangelog(root, changelogLine, filename);
  return { root, path, relativePath, slug: safeSlug, parentPath: parent.path, amendmentNumber, changelogStamped };
}

export function closePlan(slug: string, start = process.cwd(), message = '', date = new Date()): ClosedPlanResult {
  const safeSlug = normalizeLifecyclePlanSlug(slug);
  const root = requireScaffoldRoot(start);
  const parent = findPlanBySlug(root, safeSlug, ['active', 'backlog', 'blocked', 'root', 'done']);
  if (!parent) {
    throw new Error(`Plan not found: ${safeSlug}.md in .osc/plans/{active,backlog,blocked}.`);
  }
  if (parent.stage === 'done') {
    return { root, slug: safeSlug, fromStage: 'done', movedFiles: [], changelogStamped: false, alreadyDone: true };
  }

  const doneDir = join(root, OSC_NAMESPACE, 'plans', 'done');
  mkdirSync(doneDir, { recursive: true });
  const amendmentPattern = new RegExp(`^${escapeRegex(safeSlug)}-amendment-\\d+\\.md$`);
  const filesToMove = [
    `${safeSlug}.md`,
    ...readdirSync(parent.dir).filter((file) => amendmentPattern.test(file)).sort(),
  ];
  for (const file of filesToMove) {
    const destination = join(doneDir, file);
    if (existsSync(destination)) {
      throw new Error(`Refusing to overwrite existing done plan file: ${relative(root, destination)}`);
    }
  }
  assertMissionReady(root);
  for (const file of filesToMove) {
    renameSync(join(parent.dir, file), join(doneDir, file));
  }
  const dateText = formatLocalDate(date);
  const changelogLine = message.trim()
    ? `${dateText}: closed ${safeSlug} — ${message.trim()}`
    : `${dateText}: closed ${safeSlug}`;
  const changelogStamped = stampMissionChangelog(root, changelogLine);
  return { root, slug: safeSlug, fromStage: parent.stage, movedFiles: filesToMove, changelogStamped, alreadyDone: false };
}

function normalizeHeading(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function splitSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = markdown.split(/\r?\n/);
  let current: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (current) sections.set(current, buffer.join('\n').trim());
    buffer = [];
  };
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      flush();
      current = normalizeHeading(match[1]);
    } else if (current) {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

function firstParagraph(text: string): string {
  return text.split(/\n\s*\n/).map((s) => s.trim()).find(Boolean) ?? '';
}

function bulletItems(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\[[ xX]\]\s*/, '').trim())
    .filter(Boolean);
}

function numberedItems(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^\d+\.\s+/, '').trim())
    .filter(Boolean);
}

function parseExecutionStrategy(text: string): ExecutionStrategy | undefined {
  if (!text.trim()) return undefined;
  const groups: ExecutionGroup[] = [];
  const dependencies: string[] = [];
  const delegationNotes: string[] = [];
  let subsection = '';
  for (const line of text.split(/\r?\n/)) {
    const sub = line.match(/^###\s+(.+)$/);
    if (sub) {
      subsection = normalizeHeading(sub[1]).toLowerCase();
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (subsection === 'parallel groups' && trimmed.startsWith('- **Group')) {
      const match = trimmed.match(/^- \*\*(.+?)\*\*\s*(?:\((.*?)\))?:\s*(.+)$/);
      if (match) {
        const rationale = match[2] ?? '';
        groups.push({
          name: match[1].trim(),
          rationale: rationale.trim(),
          tasks: match[3].trim(),
          dependsOnPrevious: /depends on/i.test(trimmed),
        });
      }
    } else if (subsection === 'dependencies' && /^[-*]\s+/.test(trimmed)) {
      dependencies.push(trimmed.replace(/^[-*]\s+/, '').trim());
    } else if (subsection === 'delegation notes' && /^[-*]\s+/.test(trimmed)) {
      delegationNotes.push(trimmed.replace(/^[-*]\s+/, '').trim());
    }
  }
  return { groups, dependencies, delegationNotes };
}

export function parsePlanFile(path: string): ParsedPlan {
  const text = readText(path);
  const sections = splitSections(text);
  return {
    path,
    slug: basename(path, '.md'),
    status: firstParagraph(sections.get('Status') ?? ''),
    goal: firstParagraph(sections.get('Goal') ?? ''),
    sections,
    filesToTouch: bulletItems(sections.get('Files to touch') ?? ''),
    acceptanceCriteria: bulletItems(sections.get('Acceptance criteria') ?? ''),
    verificationSteps: numberedItems(sections.get('Verification steps') ?? ''),
    openQuestions: bulletItems(sections.get('Open questions') ?? ''),
    executionStrategy: parseExecutionStrategy(sections.get('Execution strategy') ?? ''),
  };
}

export function planToJson(plan: ParsedPlan): unknown {
  return {
    ...plan,
    sections: Object.fromEntries(plan.sections.entries()),
  };
}
