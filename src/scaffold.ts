import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

export const OSC_NAMESPACE = '.osc';
export const PLAN_STAGES = ['active', 'backlog', 'blocked', 'done'] as const;
export type PlanStage = typeof PLAN_STAGES[number];
export const PLAN_CREATION_STAGES = ['active', 'backlog', 'blocked'] as const;
export type PlanCreationStage = typeof PLAN_CREATION_STAGES[number];

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

function formatLocalDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createPlanSkeleton(slug: string, stage: PlanCreationStage, start = process.cwd()): CreatedPlanSkeleton {
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
  writeFileSync(path, renderPlanSkeleton(safeSlug, stage), 'utf8');
  return { root, path, relativePath, slug: safeSlug, stage };
}

export function createEvidenceNoteSkeleton(slug: string, start = process.cwd(), date = new Date()): CreatedScaffoldFile {
  const safeSlug = assertSafeSlug(slug);
  const root = requireScaffoldRoot(start);
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
