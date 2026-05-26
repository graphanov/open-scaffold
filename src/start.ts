import { realpathSync } from 'node:fs';
import { relative } from 'node:path';
import { findScaffoldRoot, parsePlanFile, PLAN_STAGES, type ParsedPlan } from './scaffold.js';
import { resolvePlanValidationPath } from './plan-validate.js';

export const START_RUNTIMES = ['codex', 'omx', 'plain', 'human', 'custom'] as const;
export type StartRuntime = typeof START_RUNTIMES[number];

export interface StartPromptResult {
  root: string;
  planPath: string;
  relativePlanPath: string;
  runtime: StartRuntime;
  prompt: string;
}

function list(items: string[], fallback: string): string {
  const values = items.length > 0 ? items : [fallback];
  return values.map((item) => `- ${item}`).join('\n');
}

function commandList(items: string[]): string {
  const values = items.length > 0 ? items : ['Run the verification commands listed in the plan or ask the operator before inventing new gates.'];
  return values.map((item) => `- ${item}`).join('\n');
}

function firstSectionParagraph(plan: ParsedPlan, section: string, fallback: string): string {
  const body = plan.sections.get(section) ?? '';
  return body.split(/\n\s*\n/).map((part) => part.trim()).find(Boolean) ?? fallback;
}

function runtimeLabel(runtime: StartRuntime): string {
  switch (runtime) {
    case 'codex':
      return 'codex (Codex / OMX handoff)';
    case 'omx':
      return 'omx (OMX / oh-my-codex handoff)';
    case 'plain':
      return 'plain (Runtime-neutral manual handoff)';
    case 'human':
      return 'human (Human/manual handoff)';
    case 'custom':
      return 'custom (Custom adapter handoff)';
  }
}

function workerInstruction(runtime: StartRuntime): string {
  switch (runtime) {
    case 'codex':
      return 'You are a Codex or OMX / oh-my-codex worker receiving an Open Scaffold plan. Follow the plan exactly and return evidence; do not assume you may execute privileged side effects.';
    case 'omx':
      return 'You are an OMX / oh-my-codex worker receiving an Open Scaffold plan. Use the appropriate OMX skill only if the operator runs it; this prompt itself is not a launch command.';
    case 'plain':
      return 'You are an agent, runtime, or human collaborator receiving an Open Scaffold plan. Follow the plan exactly and return evidence.';
    case 'human':
      return 'You are a human/manual executor receiving an Open Scaffold plan. Follow the plan exactly and record evidence for later review.';
    case 'custom':
      return 'You are a custom runtime adapter or worker receiving an Open Scaffold plan. Preserve the Open Scaffold evidence and approval boundaries.';
  }
}

export function renderStartPrompt(planReference: string, options: { runtime: StartRuntime; cwd?: string }): StartPromptResult {
  const cwd = options.cwd ?? process.cwd();
  const planPath = realpathSync(resolvePlanValidationPath(planReference, cwd));
  const root = findScaffoldRoot(planPath) ?? findScaffoldRoot(cwd);
  if (!root) throw new Error(`No Open Scaffold root found from ${cwd}. Run this inside a repo with .osc/plans and .osc/releases.`);
  const relativePlanPath = relative(root, planPath).replace(/\\/g, '/');
  const allowedPlanPath = PLAN_STAGES.some((stage) => relativePlanPath.startsWith(`.osc/plans/${stage}/`));
  if (!allowedPlanPath) {
    throw new Error(`Plan path must be under .osc/plans/{active,backlog,blocked,done}: ${relativePlanPath}`);
  }
  const plan = parsePlanFile(planPath);
  const context = firstSectionParagraph(plan, 'Context', 'Use the plan context as the source of truth.');
  const constraints = plan.sections.get('Constraints / Out of scope')?.trim() || 'Respect all plan constraints and stop before out-of-scope work.';

  const prompt = `Open Scaffold no-spawn agent handoff
Runtime: ${runtimeLabel(options.runtime)}
Plan path: ${relativePlanPath}
Goal: ${plan.goal || 'See plan file.'}

No process was started by Open Scaffold.
Paste the prompt below into your selected agent/runtime.

--- BEGIN AGENT PROMPT ---
${workerInstruction(options.runtime)}

Project root:
${root}

Plan path:
${relativePlanPath}

Goal:
${plan.goal || 'See plan file.'}

Context:
${context}

Constraints / out of scope:
${constraints}

Files to touch:
${list(plan.filesToTouch, 'Only touch files required by the plan. If the plan is unclear, stop and ask the operator.')}

Acceptance criteria:
${list(plan.acceptanceCriteria, 'No explicit acceptance criteria were parsed; stop and ask the operator to clarify before implementation.')}

Verification commands:
${commandList(plan.verificationSteps)}

Evidence expectations:
- Report changed files and why each changed.
- Report every verification command run, with pass/fail result.
- Report any skipped verification with the reason.
- Return enough evidence for a reviewer to update .osc/releases, PR body, and postflight notes.
- Do not rewrite committed plan history; use an amendment if scope changes.

Authority boundaries:
- Do not commit, push, open a PR, merge, publish, create a release, or deploy without explicit operator approval.
- Do not spawn additional autonomous runtimes, install dependencies, or use network access unless the operator explicitly allows it.
- Do not access secrets or credentials; stop and ask if a secret is required.
- If acceptance criteria conflict with constraints, stop and ask before changing scope.

Post-work instructions:
- Summarize outcome against each acceptance criterion.
- Provide exact verification output or concise excerpts.
- List follow-up risks, blockers, and unresolved questions.
- Stop at the operator approval gate for any live side effect.
--- END AGENT PROMPT ---
`;

  return { root, planPath, relativePlanPath, runtime: options.runtime, prompt };
}

export function parseStartRuntime(value: string): StartRuntime | null {
  return (START_RUNTIMES as readonly string[]).includes(value) ? value as StartRuntime : null;
}
