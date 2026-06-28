import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { findScaffoldRoot } from './scaffold.js';
import { initializeScaffold, ScaffoldConflictError } from './init.js';
import { validatePlanFile } from './plan-validate.js';

export interface FirstRunOptions {
  slug: string;
  mission: string;
  goal: string;
  nonInteractive?: boolean;
  root?: string;
}

export interface FirstRunResult {
  root: string;
  slug: string;
  missionPath: string;
  planPath: string;
  evidencePath: string;
  validationIssueCount: number;
  nextCommands: string[];
}

function isSafeSlug(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) && !value.includes('..');
}

function requireOrCreateRoot(start: string): string {
  const existing = findScaffoldRoot(start);
  if (existing) return existing;
  try {
    initializeScaffold({ tier: 'min', target: start, fromExisting: true });
  } catch (error) {
    if (error instanceof ScaffoldConflictError) {
      throw new Error(formatFirstRunConflictMessage(error));
    }
    throw error;
  }
  const created = findScaffoldRoot(start);
  if (!created) throw new Error(`No Open Scaffold root found from ${start}. Run \`osc init\` first.`);
  return created;
}

function formatFirstRunConflictMessage(error: ScaffoldConflictError): string {
  return [
    'Open Scaffold first-run stopped before writing files.',
    '',
    'first-run creates starter guidance and .osc work-record files in the current target directory.',
    `Target directory: ${error.target}`,
    'Conflicting files:',
    ...error.conflicts.map((file) => `- ${file}`),
    '',
    'For a new project, create and enter a fresh folder, then run first-run there:',
    'mkdir -p ./my-project',
    'cd ./my-project',
    'npx open-scaffold@latest first-run',
    '',
    'For an existing project, preserve, move, or rename the listed conflicting files first, then initialize brownfield scaffolding:',
    `npx open-scaffold@latest init --from-existing --tier min --target ${error.target}`,
  ].join('\n');
}

function missionIsUnset(text: string): boolean {
  return text.includes('mission:unset') || /TODO:\s*define mission/i.test(text);
}

function writeMissionIfNeeded(root: string, mission: string): string {
  const path = join(root, 'MISSION.md');
  const trimmed = mission.trim();
  if (!trimmed) throw new Error('Missing mission text for first-run.');
  if (existsSync(path) && !missionIsUnset(readFileSync(path, 'utf8'))) return path;
  writeFileSync(path, [
    '# Mission',
    '',
    trimmed,
    '',
    '## Goals',
    '',
    '- Complete one reviewed Open Scaffold work-record path.',
    '',
    '## Non-Goals',
    '',
    '- Do not run runtimes, deploy, publish, or grant external side effects during first-run setup.',
    '',
    '## Changelog',
    '',
    '<!-- append YYYY-MM-DD entries below this line -->',
    `- ${new Date().toISOString().slice(0, 10)}: defined mission through osc first-run.`,
    '',
  ].join('\n'));
  return path;
}

function planMarkdown(slug: string, goal: string, evidencePath: string): string {
  return [
    `# Plan: ${slug}`,
    '',
    '## Status',
    '',
    'active',
    '',
    '## Context',
    '',
    'This plan was created by `osc first-run` to prove one small, valid work-record chain before larger AI-assisted work begins.',
    '',
    '## Goal',
    '',
    goal.trim(),
    '',
    '## Constraints / Out of scope',
    '',
    '- Keep this first-run slice local and structural.',
    '- Do not spawn runtimes, call provider APIs, deploy, publish, merge, or claim semantic correctness.',
    '',
    '## Files to touch',
    '',
    '- `MISSION.md` — mission source of truth.',
    `- \`${evidencePath}\` — first evidence skeleton.`,
    '',
    '## Acceptance criteria',
    '',
    '- [ ] Mission is defined without the `mission:unset` marker.',
    '- [ ] This plan validates with `osc plan validate`.',
    '- [ ] Evidence skeleton exists and is ready for real command results.',
    '',
    '## Verification steps',
    '',
    `1. Run \`osc plan validate ${slug} --strict\`.`,
    `2. Run \`osc trace ${slug}\` to inspect the local work-record chain.`,
    `3. After real evidence is added and the plan closes, run \`osc verify --evidence-chain --plan ${slug} --strict\`.`,
    '4. Read `https://github.com/graphanov/open-scaffold/blob/main/docs/PROOF_HARNESS.md` and `https://github.com/graphanov/open-scaffold/blob/main/docs/STABILITY.md` before treating this skeleton as broader proof or readiness evidence.',
    '',
    '## Open questions',
    '',
    '- None.',
    '',
  ].join('\n');
}

function evidenceMarkdown(slug: string, planPath: string): string {
  return [
    `# Evidence Note: ${slug}`,
    '',
    '## Summary',
    '',
    'Structural-only first-run skeleton created by `osc first-run`.',
    '',
    '## Traceability',
    '',
    `- Plan: \`${planPath}\``,
    '',
    '## Verification commands and results',
    '',
    '- Pending: replace this line with real command output before closing the plan.',
    '- Guidance: Evidence-chain checks are structural; they do not prove semantic correctness or production readiness. Read `https://github.com/graphanov/open-scaffold/blob/main/docs/PROOF_HARNESS.md` and `https://github.com/graphanov/open-scaffold/blob/main/docs/STABILITY.md` before turning this skeleton into a broader proof claim.',
    '',
    '## Outcome',
    '',
    'approval.status: blocked',
    'approval.rationale: First-run skeleton exists, but real work evidence has not been added yet.',
    '',
    '## Follow-up',
    '',
    '- Add real verification output, then close the plan when the first slice is complete.',
    '',
    '## Boundary statement',
    '',
    'Structural-only first-run skeleton. This does not prove semantic correctness, compliance, deployment readiness, production readiness, or runtime execution. Evidence-chain verification proves file linkage only; proof/adoption claims need separate receipts.',
    '',
  ].join('\n');
}

export function runFirstRun(options: FirstRunOptions, start = process.cwd()): FirstRunResult {
  const root = options.root ?? requireOrCreateRoot(start);
  const slug = options.slug.trim();
  if (!isSafeSlug(slug)) throw new Error(`Unsafe first-run slug: ${options.slug}`);
  const goal = options.goal.trim();
  if (!goal) throw new Error('Missing first-run goal.');

  const missionPath = writeMissionIfNeeded(root, options.mission);
  mkdirSync(join(root, '.osc', 'plans', 'active'), { recursive: true });
  mkdirSync(join(root, '.osc', 'releases'), { recursive: true });
  const planPath = join(root, '.osc', 'plans', 'active', `${slug}.md`);
  const date = new Date().toISOString().slice(0, 10);
  const evidencePath = join(root, '.osc', 'releases', `${date}-${slug}.md`);
  if (!existsSync(planPath)) writeFileSync(planPath, planMarkdown(slug, goal, relative(root, evidencePath).replace(/\\/g, '/')), 'utf8');
  if (!existsSync(evidencePath)) writeFileSync(evidencePath, evidenceMarkdown(slug, relative(root, planPath).replace(/\\/g, '/')), 'utf8');
  const validation = validatePlanFile(planPath);
  const nextCommands = [
    `osc plan validate ${slug} --strict`,
    `osc trace ${slug}`,
    `edit ${relative(root, evidencePath).replace(/\\/g, '/')}`,
    `osc close ${slug} --message "verified first work-record path"`,
    `osc verify --evidence-chain --plan ${slug} --strict`,
  ];
  return {
    root,
    slug,
    missionPath: relative(root, missionPath).replace(/\\/g, '/'),
    planPath: relative(root, planPath).replace(/\\/g, '/'),
    evidencePath: relative(root, evidencePath).replace(/\\/g, '/'),
    validationIssueCount: validation.issues.length,
    nextCommands,
  };
}

export async function askInteractiveFirstRun(): Promise<FirstRunOptions> {
  if (!input.isTTY) {
    const lines = readFileSync(0, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const [slug = 'first-work-record', mission = '', goal = 'Complete one reviewed local change.'] = lines;
    return { slug, mission, goal, nonInteractive: false };
  }
  const rl = createInterface({ input, output });
  try {
    const slug = (await rl.question('Plan slug [first-work-record]: ')).trim() || 'first-work-record';
    const mission = (await rl.question('Mission: ')).trim();
    const goal = (await rl.question('First work goal: ')).trim() || 'Complete one reviewed local change.';
    return { slug, mission, goal, nonInteractive: false };
  } finally {
    rl.close();
  }
}

export function formatFirstRunResult(result: FirstRunResult): string {
  return [
    'Open Scaffold first-run complete',
    `Mission: ${result.missionPath}`,
    `Plan: ${result.planPath}`,
    `Evidence skeleton: ${result.evidencePath}`,
    `Plan validation issues: ${result.validationIssueCount}`,
    '',
    'Next commands:',
    ...result.nextCommands.map((command) => `- ${command}`),
    '',
    'Readiness guidance:',
    '- Evidence-chain checks are structural; they do not prove semantic correctness or production readiness.',
    '- Before treating a slice as proof, replace the evidence skeleton with real command output and read https://github.com/graphanov/open-scaffold/blob/main/docs/PROOF_HARNESS.md plus https://github.com/graphanov/open-scaffold/blob/main/docs/STABILITY.md.',
    '',
    'Boundary: first-run is local and structural. It does not spawn runtimes, call provider APIs, deploy, publish, or prove semantic correctness.',
    '',
  ].join('\n');
}
