import { isAbsolute, join, relative } from 'node:path';
import { previewRunArtifacts, type RunArtifactOptions, type RunManifest } from './artifacts.js';
import type { ParsedPlan } from './scaffold.js';

export interface WorkDryRunPreview {
  schemaVersion: 'open-scaffold.work-dry-run.v1';
  intent: string;
  root: string;
  runtime: string;
  candidatePlan: {
    slug: string;
    path: string;
    markdown: string;
    goal: string;
    filesToTouch: string[];
    acceptanceCriteria: string[];
    verificationSteps: string[];
  };
  run: {
    runId: string;
    manifestPath: string;
    manifest: RunManifest;
    packageMarkdown: string;
  };
  dispatch: {
    adapterId: string | null;
    command: string;
    note: string;
  };
  scopeConfirmationRequired: true;
  nextCommands: string[];
  noFilesWritten: true;
  noRuntimeSpawned: true;
}

function slugifyIntent(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`'"“”‘’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '') || 'task';
}

function cleanSentence(value: string): string {
  const trimmed = value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'Complete the requested work.';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function toDisplayPath(root: string, cwd: string, path: string): string {
  const absolute = isAbsolute(path) ? path : join(root, path);
  const display = relative(cwd, absolute).split('\\').join('/');
  return display || '.';
}

function defaultAdapterId(runtime: string): string | null {
  if (runtime === 'codex' || runtime === 'omx') return 'runtime-omx';
  return null;
}

function candidatePlanMarkdown(plan: ParsedPlan): string {
  const files = plan.filesToTouch.map((item) => `- ${item}`).join('\n');
  const criteria = plan.acceptanceCriteria.map((item) => `- [ ] ${item}`).join('\n');
  const verification = plan.verificationSteps.map((item, index) => `${index + 1}. ${item}`).join('\n');
  const openQuestions = plan.openQuestions.map((item) => `- ${item}`).join('\n');
  return `# Plan: ${plan.slug}

## Status

active

## Context

Drafted from operator intent. This preview is not written to disk until the operator confirms scope.

## Goal

${plan.goal}

## Constraints / Out of scope

- Confirm scope, files, acceptance criteria, and verification before execution.
- Do not spawn runtimes, call provider APIs, commit, push, open PRs, merge, publish, or deploy from the dry run.

## Files to touch

${files}

## Acceptance criteria

${criteria}

## Verification steps

${verification}

## Open questions

${openQuestions}
`;
}

function buildCandidatePlan(root: string, intent: string): ParsedPlan {
  const goal = cleanSentence(intent);
  const slug = `draft-${slugifyIntent(intent)}`;
  const filesToTouch = [
    'TODO: confirm implementation files with the operator before execution.',
    'TODO: confirm test/evidence files with the operator before execution.',
  ];
  const acceptanceCriteria = [
    `The implementation satisfies the operator intent: ${goal}`,
    'The operator has confirmed scope, files to touch, acceptance criteria, and risk before execution.',
    'Verification commands are selected and recorded before dispatch.',
    'No commit, push, PR, merge, publish, or deployment occurs without explicit operator approval.',
  ];
  const verificationSteps = [
    'Confirm the candidate plan with the operator before creating artifacts.',
    'Run the project-specific tests selected during scope confirmation.',
    'Run the scaffold verification gate after implementation.',
  ];
  const openQuestions = [
    'Confirm exact files to touch, final acceptance criteria, verification commands, and approval gates before execution.',
  ];
  const sections = new Map<string, string>([
    ['Context', 'Drafted from operator intent. This preview is not written to disk until the operator confirms scope.'],
    ['Goal', goal],
    ['Constraints / Out of scope', '- Confirm scope, files, acceptance criteria, and verification before execution.\n- Do not spawn runtimes, call provider APIs, commit, push, open PRs, merge, publish, or deploy from the dry run.'],
    ['Files to touch', filesToTouch.map((item) => `- ${item}`).join('\n')],
    ['Acceptance criteria', acceptanceCriteria.map((item) => `- [ ] ${item}`).join('\n')],
    ['Verification steps', verificationSteps.map((item, index) => `${index + 1}. ${item}`).join('\n')],
    ['Open questions', openQuestions.map((item) => `- ${item}`).join('\n')],
  ]);
  return {
    path: join(root, '.osc', 'plans', 'active', `${slug}.md`),
    slug,
    status: 'active',
    goal,
    sections,
    filesToTouch,
    acceptanceCriteria,
    verificationSteps,
    openQuestions,
    executionStrategy: {
      groups: [
        {
          name: 'Scope confirmation and implementation',
          rationale: 'The first dry-run version keeps work bounded until the operator approves a real plan/run packet.',
          tasks: `Confirm scope for: ${goal}\nThen implement only after the operator approves the real plan and run packet.`,
          dependsOnPrevious: false,
        },
      ],
      dependencies: ['Operator confirmation is required before creating artifacts or dispatching a runtime adapter.'],
      delegationNotes: ['This work preview is no-spawn and preview-only.'],
    },
  };
}

export function buildWorkDryRunPreview(root: string, intent: string, options: RunArtifactOptions, adapterId?: string, cwd = root): WorkDryRunPreview {
  const runtime = options.runtime ?? 'plain';
  const plan = buildCandidatePlan(root, intent);
  const artifactRoot = cwd;
  const runPreview = previewRunArtifacts(artifactRoot, plan, 'run', { ...options, scaffoldRoot: root });
  const selectedAdapter = adapterId ?? defaultAdapterId(runtime);
  const workflowFlag = options.workflow ? ` --workflow ${options.workflow}` : '';
  const manifestPath = toDisplayPath(root, cwd, runPreview.manifestPath);
  const dispatchCommand = selectedAdapter
    ? `osc dispatch ${manifestPath} --adapter ${selectedAdapter}`
    : `osc dispatch ${manifestPath} --adapter <adapter-id>`;
  const dispatchNextCommand = selectedAdapter
    ? `osc dispatch <manifest-path-from-osc-run-output> --adapter ${selectedAdapter}`
    : 'osc dispatch <manifest-path-from-osc-run-output> --adapter <adapter-id>';
  const planPath = toDisplayPath(root, cwd, plan.path);
  return {
    schemaVersion: 'open-scaffold.work-dry-run.v1',
    intent: intent.trim(),
    root,
    runtime,
    candidatePlan: {
      slug: plan.slug,
      path: planPath,
      markdown: candidatePlanMarkdown(plan),
      goal: plan.goal,
      filesToTouch: plan.filesToTouch,
      acceptanceCriteria: plan.acceptanceCriteria,
      verificationSteps: plan.verificationSteps,
    },
    run: {
      runId: runPreview.runId,
      manifestPath,
      manifest: runPreview.manifest,
      packageMarkdown: runPreview.packageMarkdown,
    },
    dispatch: {
      adapterId: selectedAdapter,
      command: dispatchCommand,
      note: selectedAdapter
        ? 'Dispatch is a preview only. Use the manifest path printed by a real osc run command and a reviewed project-local adapter config before execution.'
        : 'Choose a reviewed project-local adapter config and the manifest path printed by a real osc run command before dispatching this run packet.',
    },
    scopeConfirmationRequired: true,
    nextCommands: [
      `Review and materialize the candidate plan at ${planPath} only after confirming scope.`,
      `osc run ${planPath} --runtime ${runtime}${workflowFlag} --dry-run`,
      `osc run ${planPath} --runtime ${runtime}${workflowFlag}`,
      dispatchNextCommand,
    ],
    noFilesWritten: true,
    noRuntimeSpawned: true,
  };
}

function formatDisplayString(value: string): string {
  return JSON.stringify(value.trim());
}

export function formatWorkDryRunPreview(preview: WorkDryRunPreview): string {
  const executor = preview.run.manifest.executor.lane ?? 'unspecified';
  const workflow = preview.run.manifest.runtimeSelection.workflow ?? 'unspecified';
  const harnessSkill = preview.run.manifest.executor.harnessSkill ?? 'none';
  const files = preview.candidatePlan.filesToTouch.map((item) => `  - ${item}`).join('\n');
  const criteria = preview.candidatePlan.acceptanceCriteria.map((item) => `  - ${item}`).join('\n');
  const verification = preview.candidatePlan.verificationSteps.map((item) => `  - ${item}`).join('\n');
  const next = preview.nextCommands.map((item) => `  - ${item}`).join('\n');
  return `Open Scaffold work dry-run

Intent (quoted):
${formatDisplayString(preview.intent)}

Candidate plan preview (not written): ${preview.candidatePlan.path}
Goal: ${preview.candidatePlan.goal}

Files to confirm:
${files}

Acceptance criteria draft:
${criteria}

Verification draft:
${verification}

Run packet preview (not written): ${preview.run.manifestPath}
Run ID: ${preview.run.runId}
Runtime: ${preview.runtime}
Executor: ${executor}
Workflow: ${workflow}
Harness skill: ${harnessSkill}
Package quality: ${preview.run.manifest.packageQuality.executable ? 'executable after operator confirmation' : 'needs clarification'}

Dispatch preview (not executed):
  ${preview.dispatch.command}
  ${preview.dispatch.note}

Scope confirmation required before execution:
  - Review the candidate goal, files, acceptance criteria, verification commands, and risk.
  - Materialize a real plan only after the operator approves the scope.
  - Create a run packet and dispatch only after the plan is real and reviewed.
  - Stop before commit, push, PR, merge, publish, deployment, secrets, or provider-runtime side effects unless explicitly approved.

Next staged commands:
${next}

No files were written. No runtime was spawned. No provider API was called.
`;
}
