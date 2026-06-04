import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ParsedPlan } from './scaffold.js';

export type ArtifactMode = 'delegate' | 'run' | 'review' | 'ultrareview';
export type ExecutorLane = 'omc-claude' | 'omx-codex' | 'plain-agent' | 'human' | 'custom';
export type OperatorSurface = 'discord' | 'slack' | 'telegram' | 'github' | 'cli' | 'none' | 'custom';
export type RuntimePreset = string;
export type RuntimeWorkflow = 'interview' | 'plan' | 'team' | 'loop' | 'execute' | 'goal' | 'custom';

export interface RunArtifactOptions {
  taskId?: string;
  sourceRef?: string[];
  executor?: ExecutorLane;
  harnessSkill?: string;
  runtime?: RuntimePreset;
  workflow?: RuntimeWorkflow;
  runtimeProfileId?: string;
  runtimeProfileSource?: string;
  repo?: string;
  worktree?: string;
  branch?: string;
  operatorSurface?: OperatorSurface;
  operatorThread?: string;
  issue?: string;
  pr?: string;
  commitPolicy?: string;
  /** Internal root used for mission/package-quality checks when artifacts are written elsewhere. */
  scaffoldRoot?: string;
}

export interface RunArtifacts {
  runId: string;
  runDir: string;
  manifestPath: string;
  promptPaths: string[];
}

export interface PackageQuality {
  executable: boolean;
  blockers: string[];
  requiredAction: string | null;
}

export interface RunManifest {
  schemaVersion: 'open-scaffold.run.v1';
  runId: string;
  taskId: string | null;
  mode: ArtifactMode;
  status: 'created';
  lifecycleStates: string[];
  createdAt: string;
  updatedAt: string;
  namespace: '.osc';
  sourceRefs: string[];
  plan: {
    slug: string;
    path: string;
    goal: string;
    filesToTouch: string[];
    acceptanceCriteria: string[];
    verificationSteps: string[];
    openQuestions: string[];
  };
  packageQuality: PackageQuality;
  runtimeSelection: {
    runtime: string | null;
    workflow: RuntimeWorkflow | null;
    profileId: string | null;
    profileSource: string | null;
    note: string;
  };
  executor: {
    lane: ExecutorLane | null;
    harnessSkill: string | null;
    spawning: false;
    note: string;
  };
  runtime: {
    repoPath: string | null;
    worktreePath: string | null;
    branch: string | null;
    tmuxSession: null;
    processId: null;
  };
  bindings: {
    operatorSurface: OperatorSurface;
    operatorThreadId: string | null;
    githubIssue: string | null;
    githubPr: string | null;
  };
  artifacts: {
    runDir: string;
    manifest: string;
    prompts: string[];
    logs: string[];
    outputs: string[];
    evidence: string[];
  };
  questions: string[];
  commitPolicy: string;
  note: string;
}

export interface PromptPreview {
  relativePath: string;
  absolutePath: string;
  content: string;
}

export interface RunArtifactsPreview {
  runId: string;
  runDir: string;
  manifestPath: string;
  promptFiles: PromptPreview[];
  manifest: RunManifest;
  packageMarkdown: string;
  filesToTouch: string[];
}

function timestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'prompt';
}

function isNoOpenQuestions(value: string): boolean {
  return /^(none|n\/a|no open questions|no blocking questions)\.?$/i.test(value.trim());
}

function isBlockingOpenQuestion(value: string): boolean {
  const normalized = value.trim();
  if (isNoOpenQuestions(normalized)) return false;
  return /^\[?blocking\]?[:\s-]/i.test(normalized) || /^blocking[:\s-]/i.test(normalized);
}

function blockingOpenQuestions(plan: ParsedPlan): string[] {
  return plan.openQuestions.filter(isBlockingOpenQuestion);
}

const DEFERRED_VERIFICATION_RE = /\b(external runner|run externally|runs externally|will be run externally|after (?:the )?(?:model )?turn|after your turn|later by|operator will run|someone else will run|later operator)\b/i;
const REJECTS_DEFERRED_VERIFICATION_RE = /\b(do not|don't|does not|doesn't|must not|cannot|can't|not|never)\b.{0,120}\b(external runner|run externally|runs externally|after (?:the )?(?:model )?turn|after your turn|later operator|operator will run|someone else will run)\b|\b(external runner|run externally|runs externally|after (?:the )?(?:model )?turn|after your turn|later operator|operator will run|someone else will run)\b.{0,120}\b(does not count|doesn't count|do not count|not verification|is not verification|cannot count|can't count|must not count|fail closed|fails closed)\b/i;

function defersVerificationOutsideRun(step: string): boolean {
  if (!DEFERRED_VERIFICATION_RE.test(step)) return false;
  return !REJECTS_DEFERRED_VERIFICATION_RE.test(step);
}

function looksLikeExecutableVerification(step: string): boolean {
  const trimmed = step.trim();
  return /^(?:run|execute|verify|validate|check|test)\b/i.test(trimmed)
    || /(?:^|[`\s])(?:npm|pnpm|yarn|npx|node|tsx|python3?|pytest|cargo|make|bash|sh|git|gh|osc|\.\/)[^`\s]*/i.test(trimmed);
}

function verificationBlockers(plan: ParsedPlan): string[] {
  if (plan.verificationSteps.length === 0) return ['missing verification steps'];
  const blockers: string[] = [];
  if (plan.verificationSteps.some(defersVerificationOutsideRun)) {
    blockers.push('verification steps defer execution outside the run packet');
  }
  if (!plan.verificationSteps.some(looksLikeExecutableVerification)) {
    blockers.push('missing executable verification command');
  }
  return blockers;
}

function missionBlocker(root: string): string | null {
  const missionPath = join(root, 'MISSION.md');
  if (!existsSync(missionPath)) return 'undefined mission';
  const text = readFileSync(missionPath, 'utf8');
  if (/mission:unset/i.test(text) || /TODO:\s*define mission/i.test(text)) return 'undefined mission';
  return null;
}

function contextQuality(root: string, plan: ParsedPlan): PackageQuality {
  const blockers: string[] = [];
  const mission = missionBlocker(root);
  if (mission) blockers.push(mission);
  if (!plan.goal.trim()) blockers.push('missing goal');
  if (plan.acceptanceCriteria.length === 0) blockers.push('missing acceptance criteria');
  blockers.push(...verificationBlockers(plan));
  const openQuestions = blockingOpenQuestions(plan);
  if (openQuestions.length) blockers.push('blocking open questions present');
  return {
    executable: blockers.length === 0,
    blockers,
    requiredAction: blockers.length ? 'clarify-or-deep-interview-before-dispatch' : null,
  };
}

function promptForGroup(plan: ParsedPlan, groupName: string, tasks: string, runId: string, options: RunArtifactOptions): string {
  const ac = plan.acceptanceCriteria.map((item) => `- ${item}`).join('\n') || '- No acceptance criteria listed.';
  const verification = plan.verificationSteps.map((item, index) => `${index + 1}. ${item}`).join('\n') || '1. No verification steps listed.';
  const openQuestions = blockingOpenQuestions(plan).map((item) => `- ${item}`).join('\n') || '- None blocking.';
  return [
    `# Open Scaffold Prompt: ${groupName}`,
    '',
    `Run ID: ${runId}`,
    `Task ID: ${options.taskId ?? '(none supplied)'}`,
    `Plan: ${plan.slug}`,
    `Goal: ${plan.goal || '(not specified)'}`,
    '',
    '## Assignment',
    tasks,
    '',
    '## Execution lane',
    `- Executor: ${options.executor ?? 'unspecified'}`,
    `- Harness skill: ${options.harnessSkill ?? 'none'}`,
    `- Repository: ${options.repo ?? 'current repository'}`,
    `- Operator surface: ${options.operatorSurface ?? 'none'}`,
    '',
    '## Rules',
    '- Follow the plan and its amendments; do not silently expand scope.',
    '- If scope changes, propose an amendment instead of editing the original plan.',
    '- Produce evidence tied to acceptance criteria, not vibes.',
    '- Run the verification steps before final handoff. If a step cannot run, record the exact command, exit status, and stderr; do not treat an external runner or later operator step as verification.',
    '- This generic prompt does not spawn agents; paste it into your selected runtime.',
    '- Treat chat threads as operator-surface bindings, not canonical task/run identity.',
    '- If blocking open questions exist, stop and clarify before implementation.',
    '',
    '## Acceptance criteria',
    ac,
    '',
    '## Verification steps',
    verification,
    '',
    '## Blocking open questions',
    openQuestions,
    '',
  ].join('\n');
}

function packageMarkdownFor(promptFiles: PromptPreview[]): string {
  const sections = promptFiles.flatMap((prompt) => [
    `## ${prompt.relativePath}`,
    '',
    '```markdown',
    prompt.content.trimEnd(),
    '```',
    '',
  ]);
  return ['# Open Scaffold Run Package', '', ...sections].join('\n');
}

function buildRunArtifacts(root: string, plan: ParsedPlan, mode: ArtifactMode, options: RunArtifactOptions): RunArtifactsPreview {
  const baseRunId = `${timestamp()}-${slugify(plan.slug)}-${mode}`;
  let runId = baseRunId;
  let runDir = join(root, '.osc', 'runs', runId);
  for (let collision = 2; existsSync(runDir); collision += 1) {
    runId = `${baseRunId}-${collision}`;
    runDir = join(root, '.osc', 'runs', runId);
  }
  const promptDir = join(runDir, 'prompts');

  const groups = plan.executionStrategy?.groups?.length
    ? plan.executionStrategy.groups.map((g) => ({ name: g.name, tasks: g.tasks }))
    : [{ name: 'Single Session', tasks: `Execute plan ${plan.slug}.` }];

  const promptFiles = groups.map((group) => {
    const absolutePath = join(promptDir, `${slugify(group.name)}.md`);
    return {
      absolutePath,
      relativePath: relative(root, absolutePath),
      content: promptForGroup(plan, group.name, group.tasks, runId, options),
    };
  });

  const quality = contextQuality(options.scaffoldRoot ?? root, plan);
  const createdAt = new Date().toISOString();
  const relativeOrNull = (value?: string) => value ?? null;
  const sourceRefs = [
    ...(options.sourceRef ?? []),
    options.taskId ? `task:${options.taskId}` : null,
    options.issue ? `issue:${options.issue}` : null,
    options.operatorThread ? `operator-thread:${options.operatorThread}` : null,
  ].filter((value): value is string => Boolean(value));

  const manifestPath = join(runDir, 'run.json');
  const manifest: RunManifest = {
    schemaVersion: 'open-scaffold.run.v1',
    runId,
    taskId: options.taskId ?? null,
    mode,
    status: 'created',
    lifecycleStates: ['created', 'packaged', 'dispatched', 'running', 'waiting_on_operator', 'completed', 'failed', 'blocked', 'cancelled', 'postflighted'],
    createdAt,
    updatedAt: createdAt,
    namespace: '.osc',
    sourceRefs,
    plan: {
      slug: plan.slug,
      path: relative(root, plan.path),
      goal: plan.goal,
      filesToTouch: plan.filesToTouch,
      acceptanceCriteria: plan.acceptanceCriteria,
      verificationSteps: plan.verificationSteps,
      openQuestions: plan.openQuestions,
    },
    packageQuality: quality,
    runtimeSelection: {
      runtime: options.runtime ?? null,
      workflow: options.workflow ?? null,
      profileId: options.runtimeProfileId ?? options.runtime ?? null,
      profileSource: options.runtimeProfileSource ?? null,
      note: 'Runtime selection records the intended adapter lane. Open Scaffold core still does not spawn the runtime.',
    },
    executor: {
      lane: options.executor ?? null,
      harnessSkill: options.harnessSkill ?? null,
      spawning: false,
      note: 'Generic open-scaffold creates prompt/artifact bundles only. Coordinators or runtime adapters perform autonomous spawning.',
    },
    runtime: {
      repoPath: relativeOrNull(options.repo),
      worktreePath: relativeOrNull(options.worktree),
      branch: relativeOrNull(options.branch),
      tmuxSession: null,
      processId: null,
    },
    bindings: {
      operatorSurface: options.operatorSurface ?? 'none',
      operatorThreadId: options.operatorThread ?? null,
      githubIssue: options.issue ?? null,
      githubPr: options.pr ?? null,
    },
    artifacts: {
      runDir: relative(root, runDir),
      manifest: relative(root, manifestPath),
      prompts: promptFiles.map((prompt) => prompt.relativePath),
      logs: [],
      outputs: [],
      evidence: [],
    },
    questions: [],
    commitPolicy: options.commitPolicy ?? 'no commit/push unless explicitly approved by the operator',
    note: 'Canonical lifecycle belongs to the task/run record. Chat threads mirror/control via bindings; they are not canonical task identity.',
  };

  return {
    runId,
    runDir,
    manifestPath,
    promptFiles,
    manifest,
    packageMarkdown: packageMarkdownFor(promptFiles),
    filesToTouch: plan.filesToTouch,
  };
}

export function previewRunArtifacts(root: string, plan: ParsedPlan, mode: ArtifactMode = 'run', options: RunArtifactOptions = {}): RunArtifactsPreview {
  return buildRunArtifacts(root, plan, mode, options);
}

export function createRunArtifacts(root: string, plan: ParsedPlan, mode: ArtifactMode = 'run', options: RunArtifactOptions = {}): RunArtifacts {
  const preview = buildRunArtifacts(root, plan, mode, options);
  if (!preview.manifest.packageQuality.executable) {
    throw new Error(`Run package is not executable: ${preview.manifest.packageQuality.blockers.join('; ')}`);
  }
  mkdirSync(join(preview.runDir, 'prompts'), { recursive: true });

  const promptPaths: string[] = [];
  for (const prompt of preview.promptFiles) {
    writeFileSync(prompt.absolutePath, prompt.content, 'utf8');
    promptPaths.push(prompt.absolutePath);
  }

  writeFileSync(preview.manifestPath, JSON.stringify(preview.manifest, null, 2) + '\n', 'utf8');

  return { runId: preview.runId, runDir: preview.runDir, manifestPath: preview.manifestPath, promptPaths };
}
