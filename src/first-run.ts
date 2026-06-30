import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { env, stdin as input, stdout as output } from 'node:process';
import { findScaffoldRoot } from './scaffold.js';
import { initializeScaffold, previewScaffoldInitialization, ScaffoldConflictError, type ExistingProjectDetection, type ScaffoldInitializationPreview } from './init.js';
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

export interface FirstRunRenderMode {
  style: 'polished' | 'plain';
}

export interface FirstRunTargetPreview {
  root: string;
  target: string;
  scaffoldPresent: boolean;
  willInitializeScaffold: boolean;
  scaffoldFiles: string[];
  project?: ExistingProjectDetection;
}

export interface FirstRunPreview extends FirstRunTargetPreview {
  slug: string;
  missionPath: string;
  missionAction: 'write' | 'replace-unset' | 'preserve';
  planPath: string;
  evidencePath: string;
  nextVerificationCommands: string[];
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

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function formatProjectDetection(project?: ExistingProjectDetection): string {
  if (!project) return 'No existing project marker detected.';
  if (!project.marker && project.label === 'existing project') return 'No existing project marker detected; treating this as a new or generic local project.';
  return `Detected existing ${project.label}${project.marker ? ` via ${project.marker}` : ''}${project.packageManager ? ` (${project.packageManager})` : ''}.`;
}

function formatFirstRunConflictMessage(error: Pick<ScaffoldConflictError, 'target' | 'conflicts'>): string {
  return [
    'Open Scaffold first-run stopped before writing files.',
    '',
    'first-run creates starter guidance and .osc work-record files in the current target directory, but it will not overwrite existing scaffold-owned files.',
    `Target directory: ${error.target}`,
    'Conflicting files:',
    ...error.conflicts.map((file) => `- ${file}`),
    '',
    'No mission, active plan, or evidence skeleton was created.',
    '',
    'For a new project, create and enter a fresh folder, then run first-run there:',
    'mkdir -p ./my-project',
    'cd ./my-project',
    'npx open-scaffold@latest first-run',
    '',
    'For an existing project, preserve, move, or rename the listed conflicting files first, then initialize brownfield scaffolding:',
    `npx open-scaffold@latest init --from-existing --tier min --target ${shellQuote(error.target)}\n\nAfter brownfield scaffolding is initialized, rerun first-run in that target to create the mission, active plan, and evidence skeleton:\ncd ${shellQuote(error.target)}\nnpx open-scaffold@latest first-run`,
  ].join('\n');
}

function assertNoInitConflicts(preview: ScaffoldInitializationPreview): void {
  if (preview.conflicts.length > 0) {
    throw new Error(formatFirstRunConflictMessage({ target: preview.target, conflicts: preview.conflicts }));
  }
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

function missionAction(root: string): FirstRunPreview['missionAction'] {
  const path = join(root, 'MISSION.md');
  if (!existsSync(path)) return 'write';
  return missionIsUnset(readFileSync(path, 'utf8')) ? 'replace-unset' : 'preserve';
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

export function resolveFirstRunRenderMode(options: { nonInteractive?: boolean; env?: NodeJS.ProcessEnv; inputIsTTY?: boolean; outputIsTTY?: boolean } = {}): FirstRunRenderMode {
  const environment = options.env ?? env;
  const interactiveTerminal = options.inputIsTTY ?? Boolean(input.isTTY);
  const outputTerminal = options.outputIsTTY ?? Boolean(output.isTTY);
  const simplified = options.nonInteractive || environment.CI || Object.prototype.hasOwnProperty.call(environment, 'NO_COLOR') || !interactiveTerminal || !outputTerminal;
  return { style: simplified ? 'plain' : 'polished' };
}

export function previewFirstRunTarget(start = process.cwd()): FirstRunTargetPreview {
  const existing = findScaffoldRoot(start);
  if (existing) {
    return {
      root: existing,
      target: existing,
      scaffoldPresent: true,
      willInitializeScaffold: false,
      scaffoldFiles: [],
    };
  }

  const preview = previewScaffoldInitialization({ tier: 'min', target: start, fromExisting: true });
  assertNoInitConflicts(preview);
  return {
    root: preview.target,
    target: preview.target,
    scaffoldPresent: false,
    willInitializeScaffold: true,
    scaffoldFiles: preview.filesToCreate,
    project: preview.project,
  };
}

export function previewFirstRun(options: FirstRunOptions, start = process.cwd(), targetPreview = previewFirstRunTarget(start)): FirstRunPreview {
  const slug = options.slug.trim();
  if (!isSafeSlug(slug)) throw new Error(`Unsafe first-run slug: ${options.slug}`);
  const date = new Date().toISOString().slice(0, 10);
  const planPath = join(targetPreview.root, '.osc', 'plans', 'active', `${slug}.md`);
  const evidencePath = join(targetPreview.root, '.osc', 'releases', `${date}-${slug}.md`);
  return {
    ...targetPreview,
    slug,
    missionPath: relative(targetPreview.root, join(targetPreview.root, 'MISSION.md')).replace(/\\/g, '/'),
    missionAction: missionAction(targetPreview.root),
    planPath: relative(targetPreview.root, planPath).replace(/\\/g, '/'),
    evidencePath: relative(targetPreview.root, evidencePath).replace(/\\/g, '/'),
    nextVerificationCommands: [
      `osc plan validate ${slug} --strict`,
      `osc trace ${slug}`,
      `osc verify --evidence-chain --plan ${slug} --strict`,
    ],
  };
}

export function formatFirstRunIntro(mode = resolveFirstRunRenderMode()): string {
  if (mode.style === 'polished') {
    return [
      'Open Scaffold',
      'First-run onboarding',
      '',
      '[1/4] Inspect the target directory',
      '[2/4] Show the local files that will be written',
      '[3/4] Create mission, plan, and evidence skeletons',
      '[4/4] Print verification commands',
      '',
      'Boundary: this setup is local and structural. It will not run agents, tests, deployment, publish, or provider APIs.',
      '',
    ].join('\n');
  }
  return [
    'Open Scaffold first-run',
    'Local structural setup only. No agents, tests, deployment, publish, or provider APIs will run.',
    '',
  ].join('\n');
}

function missionActionText(action: FirstRunPreview['missionAction']): string {
  if (action === 'preserve') return 'preserve existing defined mission';
  if (action === 'replace-unset') return 'replace unset scaffold mission';
  return 'write project mission';
}

export function formatFirstRunPrewrite(preview: FirstRunPreview, mode = resolveFirstRunRenderMode()): string {
  const lines = mode.style === 'polished'
    ? ['[2/4] Planned local writes', '']
    : ['Open Scaffold first-run preview', ''];

  lines.push(`Target: ${preview.target}`);
  if (preview.scaffoldPresent) {
    lines.push('Open Scaffold root: already present; first-run will not rewrite scaffold guidance.');
  } else {
    lines.push('Open Scaffold root: will initialize the minimum local scaffold here.');
    lines.push(formatProjectDetection(preview.project));
    lines.push('Existing non-scaffold project files are preserved.');
  }

  lines.push(
    '',
    'Before writing, first-run plans these local files:',
  );

  if (preview.willInitializeScaffold) {
    lines.push(
      '- AGENTS.md and CLAUDE.md: local agent guidance',
      '- .osc/: work-record directories, templates, rules, and release-note area',
    );
  } else {
    lines.push('- Existing AGENTS.md / CLAUDE.md / .osc/ scaffold files: preserved');
  }

  lines.push(
    `- ${preview.missionPath}: ${missionActionText(preview.missionAction)}`,
    `- ${preview.planPath}: active plan for ${preview.slug}`,
    `- ${preview.evidencePath}: structural evidence skeleton`,
    '',
    'Next verification commands after setup:',
    ...preview.nextVerificationCommands.map((command) => `- ${command}`),
    '',
    'Proof boundary: planned writes do not mean agents ran, tests passed, deployment happened, or production readiness was proven.',
    '',
  );

  return lines.join('\n');
}

export async function askInteractiveFirstRun(targetPreview?: FirstRunTargetPreview, mode = resolveFirstRunRenderMode()): Promise<FirstRunOptions> {
  if (!input.isTTY) {
    const lines = readFileSync(0, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const [slug = 'first-work-record', mission = '', goal = 'Complete one reviewed local change.'] = lines;
    return { slug, mission, goal, nonInteractive: false };
  }
  const rl = createInterface({ input, output });
  try {
    if (targetPreview) {
      output.write([
        mode.style === 'polished' ? '[1/4] Target context' : 'Target context:',
        `Target: ${targetPreview.target}`,
        targetPreview.scaffoldPresent ? 'Open Scaffold root already exists.' : formatProjectDetection(targetPreview.project),
        targetPreview.scaffoldPresent ? 'first-run will preserve existing scaffold files.' : 'Existing non-scaffold project files will be preserved.',
        '',
      ].join('\n'));
    }
    const slug = (await rl.question('Plan slug [first-work-record]: ')).trim() || 'first-work-record';
    const mission = (await rl.question('Mission: ')).trim();
    const goal = (await rl.question('First work goal: ')).trim() || 'Complete one reviewed local change.';
    return { slug, mission, goal, nonInteractive: false };
  } finally {
    rl.close();
  }
}

export function formatFirstRunResult(result: FirstRunResult, mode = resolveFirstRunRenderMode()): string {
  return [
    mode.style === 'polished' ? '[4/4] Open Scaffold first-run complete' : 'Open Scaffold first-run complete',
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
