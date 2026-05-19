import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { findScaffoldRoot, inspectMission, PLAN_CREATION_STAGES, type PlanCreationStage } from './scaffold.js';

export interface PlanWizardAnswers {
  goal?: string;
  context?: string;
  trigger?: string;
  constraints?: string | string[];
  filesToTouch?: string | string[];
  acceptanceCriteria?: string | string[];
  verificationSteps?: string | string[];
  openQuestions?: string | string[];
}

export interface CreatedWizardPlan {
  root: string;
  path: string;
  relativePath: string;
  slug: string;
  stage: PlanCreationStage;
}

type NormalizedAnswers = Required<Omit<PlanWizardAnswers, 'trigger' | 'constraints' | 'filesToTouch' | 'acceptanceCriteria' | 'verificationSteps' | 'openQuestions'>> & {
  constraints: string[];
  filesToTouch: string[];
  acceptanceCriteria: string[];
  verificationSteps: string[];
  openQuestions: string[];
};

function assertSafeWizardSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed || trimmed.endsWith('.md') || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(trimmed) || trimmed.includes('..')) {
    throw new Error(`Unsafe slug: ${slug}. Use letters, numbers, dots, underscores, and hyphens only; omit .md and path separators.`);
  }
  return trimmed;
}

function splitList(value: string | string[] | undefined, splitCommas = false): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  const separator = splitCommas ? /[\n,]+/ : /\n+/;
  return value.split(separator).map((entry) => entry.trim()).filter(Boolean);
}

function scalar(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateAnswers(raw: unknown): NormalizedAnswers {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Wizard answers must be a JSON object.');
  }
  const value = raw as PlanWizardAnswers;
  return {
    goal: scalar(value.goal),
    context: scalar(value.context) || scalar(value.trigger),
    constraints: splitList(value.constraints),
    filesToTouch: splitList(value.filesToTouch, true),
    acceptanceCriteria: splitList(value.acceptanceCriteria),
    verificationSteps: splitList(value.verificationSteps),
    openQuestions: splitList(value.openQuestions),
  };
}

function paragraph(value: string): string {
  return value.trim() || '_not specified_.';
}

function bullets(items: string[], fallback = '_not specified_.'): string {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  if (clean.length === 0) return `- ${fallback}`;
  return clean.map((item) => `- ${item}`).join('\n');
}

function fileBullets(items: string[]): string {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  if (clean.length === 0) return '- _not specified_.';
  return clean.map((item) => `- \`${item}\``).join('\n');
}

function acceptanceBullets(items: string[]): string {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  if (clean.length === 0) return '- [ ] _not specified_.';
  return clean.map((item) => `- [ ] ${item}`).join('\n');
}

function numbered(items: string[]): string {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  if (clean.length === 0) return '1. _not specified_.';
  return clean.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

export function mapAnswersToTemplate(slug: string, stage: PlanCreationStage, rawAnswers: PlanWizardAnswers): string {
  if (!(PLAN_CREATION_STAGES as readonly string[]).includes(stage)) {
    throw new Error(`Invalid plan stage: ${stage}. Expected one of: ${PLAN_CREATION_STAGES.join(', ')}`);
  }
  const safeSlug = assertSafeWizardSlug(slug);
  const answers = validateAnswers(rawAnswers);
  return `# Plan: ${safeSlug}

## Status

${stage}

## Context

${paragraph(answers.context)}

## Goal

${paragraph(answers.goal)}

## Constraints / Out of scope

${bullets(answers.constraints)}

## Files to touch

${fileBullets(answers.filesToTouch)}

## Acceptance criteria

${acceptanceBullets(answers.acceptanceCriteria)}

## Verification steps

${numbered(answers.verificationSteps)}

## Open questions

${bullets(answers.openQuestions)}
`;
}

export function loadAnswersFile(path: string): PlanWizardAnswers {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  return validateAnswers(parsed);
}

function answersFromLines(text: string): PlanWizardAnswers {
  const lines = text.split(/\r?\n/);
  const next = () => lines.shift() ?? '';
  const goal = next();
  const context = next();
  const constraints = next();
  const files = next();
  const acceptanceCriteria: string[] = [];
  while (lines.length > 0) {
    const answer = next();
    if (!answer.trim()) break;
    acceptanceCriteria.push(answer.trim());
  }
  const verification = next();
  const openQuestions = next();
  return {
    goal,
    context,
    constraints,
    filesToTouch: files,
    acceptanceCriteria,
    verificationSteps: verification,
    openQuestions,
  };
}

export async function askInteractiveAnswers(): Promise<PlanWizardAnswers> {
  if (!input.isTTY) {
    return answersFromLines(readFileSync(0, 'utf8'));
  }
  const rl = createInterface({ input, output });
  try {
    const goal = await rl.question('Goal / done outcome: ');
    const context = await rl.question('What triggered this work? ');
    const constraints = await rl.question('Constraints / what NOT to do: ');
    const files = await rl.question('Files likely to change (comma-separated): ');
    const acceptanceCriteria: string[] = [];
    while (true) {
      const answer = await rl.question('Acceptance criterion (blank to finish): ');
      if (!answer.trim()) break;
      acceptanceCriteria.push(answer.trim());
    }
    const verification = await rl.question('Verification command or method: ');
    const openQuestions = await rl.question('Open questions or dependencies: ');
    return {
      goal,
      context,
      constraints,
      filesToTouch: files,
      acceptanceCriteria,
      verificationSteps: verification,
      openQuestions,
    };
  } finally {
    rl.close();
  }
}

export function createWizardPlan(slug: string, stage: PlanCreationStage, answers: PlanWizardAnswers, start = process.cwd()): CreatedWizardPlan {
  const safeSlug = assertSafeWizardSlug(slug);
  const root = findScaffoldRoot(start);
  if (!root) throw new Error(`No Open Scaffold root found from ${start}. Run this inside a repo with .osc/plans and .osc/releases.`);
  const mission = inspectMission(root);
  if (!mission.defined) throw new Error('Mission is not yet defined. Run ./bootstrap.sh or edit MISSION.md first.');
  const stageDir = join(root, '.osc', 'plans', stage);
  if (!existsSync(stageDir)) throw new Error(`Open Scaffold stage folder missing: ${relative(root, stageDir)}`);
  const path = join(stageDir, `${safeSlug}.md`);
  const relativePath = relative(root, path);
  if (existsSync(path)) throw new Error(`Refusing to overwrite existing plan: ${relativePath}`);
  mkdirSync(stageDir, { recursive: true });
  writeFileSync(path, mapAnswersToTemplate(safeSlug, stage, answers), 'utf8');
  return { root, path, relativePath, slug: basename(path, '.md'), stage };
}
