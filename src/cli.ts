#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { renderAuditManifest, validateAuditManifestFile, writeAuditManifest, type AuditArtifactInput } from './audit.js';
import { createRunArtifacts, previewRunArtifacts, type ArtifactMode, type ExecutorLane, type OperatorSurface, type RunArtifactOptions, type RuntimePreset, type RuntimeWorkflow } from './artifacts.js';
import { collectEvidence } from './evidence.js';
import { loadEvaluationSource, renderEvaluationEnvelope, validateEvaluationEnvelopeFile, writeEvaluationEnvelope } from './evaluation.js';
import { initializeScaffold, scaffoldTiers, type ScaffoldTier } from './init.js';
import { loadRuntimeProfiles, resolveRuntimeProfile } from './runtimes.js';
import { closePlan, createEvidenceNoteSkeleton, createPlanAmendment, createPlanSkeleton, inspectScaffold, listPlanTemplates, movePlan, parsePlanFile, planToJson, PLAN_CREATION_STAGES, type PlanCreationStage } from './scaffold.js';
import { validateScaffold } from './validation.js';
import { formatPlanValidationIssues, hasBlockingIssues, resolvePlanValidationPath, validatePlanFile } from './plan-validate.js';
import { askInteractiveAnswers, assertWizardReady, createWizardPlan, loadAnswersFile, type PlanWizardAnswers } from './wizard.js';

function printHelp(): void {
  console.log(`osc — Open Scaffold CLI

Usage:
  osc init --tier <min|standard|max> --target <dir> [--force]
  osc init --from-existing --tier min --target <dir> [--force]
  osc init --min|--standard|--max --target <dir> [--force]
  osc status [--json]
  osc plan <plan-path>
  osc plan new <slug> --stage <active|backlog|blocked> [--from-template <name>]
  osc plan new --from-template list
  osc plan validate <slug-or-path> [--json] [--strict]
  osc plan wizard <slug> [--stage <active|backlog|blocked>] [--non-interactive --answers <answers.json>]
  osc plan move <slug> --to <active|backlog|blocked>
  osc amend <plan-slug> [--message <text>]
  osc evidence new <slug>
  osc evidence collect <slug> [--ci] [--dry-run] [--verbose]
  osc close <plan-slug> [--message <text>]
  osc delegate <plan-path> [run binding options]
  osc run <plan-path> [--dry-run] [--json] [run binding options]
  osc review <plan-path> [run binding options]
  osc ultrareview <plan-path> [run binding options]
  osc eval init <run-or-plan> [--out <path>]
  osc eval check <evaluation-path>
  osc audit init <run-or-plan> [--artifact <role> <path>]... [--out <path>]
  osc audit check <audit-manifest-path>
  osc verify
  osc doctor
  osc runtimes list
  osc runtimes show <id>

Run binding options:
  --task-id <id>              Canonical task/card/issue id for this work item
  --source-ref <ref>          Additional source ref; repeatable
  --runtime <preset>          omc | omx | plain | human | custom
  --workflow <workflow>       interview | plan | team | loop | execute | goal | custom
  --executor <lane>           omc-claude | omx-codex | plain-agent | human | custom
  --harness-skill <skill>     e.g. /ralplan, $ralplan, /ralph, $ultrawork
  --repo <path>               Repository path for execution
  --worktree <path>           Worktree path for isolated execution
  --branch <name>             Branch expected for the run
  --operator-surface <name>   discord | slack | telegram | github | cli | none | custom
  --operator-thread <id>      Optional chat/thread/comment binding id
  --issue <id-or-url>         Optional GitHub issue binding
  --pr <id-or-url>            Optional PR binding
  --commit-policy <text>      Commit/push approval rule

Generic open-scaffold generates prompts/artifacts only. External coordinators/agents and runtime harnesses perform autonomous spawning.`);
}

function requireArg(args: string[], name: string): string {
  const value = args[0];
  if (!value) {
    console.error(`Missing required argument: ${name}`);
    process.exit(2);
  }
  return value;
}

const EXECUTOR_LANES = ['omc-claude', 'omx-codex', 'plain-agent', 'human', 'custom'] as const;
const OPERATOR_SURFACES = ['discord', 'slack', 'telegram', 'github', 'cli', 'none', 'custom'] as const;
const RUNTIME_WORKFLOWS = ['interview', 'plan', 'team', 'loop', 'execute', 'goal', 'custom'] as const;

function parseChoice<T extends readonly string[]>(value: string, choices: T, flag: string): T[number] {
  if ((choices as readonly string[]).includes(value)) return value as T[number];
  console.error(`Invalid value for ${flag}: ${value}. Expected one of: ${choices.join(', ')}`);
  process.exit(2);
}

function applyRuntimeSelection(options: RunArtifactOptions, root: string): void {
  if (!options.runtime) return;
  let resolved: ReturnType<typeof resolveRuntimeProfile>;
  let available: string[] = [];
  try {
    const profiles = loadRuntimeProfiles(root);
    available = profiles.map((entry) => entry.profile.id);
    resolved = profiles.find((entry) => entry.profile.id === options.runtime) ?? null;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  if (!resolved) {
    console.error(`Unknown runtime profile: ${options.runtime}. Available runtimes: ${available.join(', ') || '(none)'}`);
    process.exit(2);
  }

  const { profile, source } = resolved;
  if (options.executor && options.executor !== profile.lane) {
    console.error(`--runtime ${options.runtime} maps to executor ${profile.lane}, but --executor ${options.executor} was also provided`);
    process.exit(2);
  }
  options.executor = profile.lane;
  options.runtimeProfileId = profile.id;
  options.runtimeProfileSource = source;

  if (!options.workflow && profile.defaults?.workflow) {
    options.workflow = profile.defaults.workflow;
  }
  if (!options.operatorSurface && profile.defaults?.operatorSurface) {
    if (!(OPERATOR_SURFACES as readonly string[]).includes(profile.defaults.operatorSurface)) {
      console.error(`Runtime profile ${profile.id} has unsupported defaults.operatorSurface: ${profile.defaults.operatorSurface}`);
      process.exit(1);
    }
    options.operatorSurface = profile.defaults.operatorSurface as OperatorSurface;
  }

  if (options.workflow) {
    const hasWorkflowMapping = Boolean(profile.workflows && Object.prototype.hasOwnProperty.call(profile.workflows, options.workflow));
    const expectedHarnessSkill = hasWorkflowMapping ? profile.workflows?.[options.workflow] : undefined;
    if (typeof expectedHarnessSkill === 'string') {
      if (options.harnessSkill && options.harnessSkill !== expectedHarnessSkill) {
        console.error(`--runtime ${options.runtime} with --workflow ${options.workflow} requires --harness-skill ${expectedHarnessSkill}, got ${options.harnessSkill}`);
        process.exit(2);
      }
      options.harnessSkill = expectedHarnessSkill;
    } else if (hasWorkflowMapping) {
      // Explicit null mapping means the workflow is supported but has no inferred harness skill.
    } else if (profile.defaults?.harnessSkill && options.workflow === profile.defaults.workflow && !options.harnessSkill) {
      options.harnessSkill = profile.defaults.harnessSkill;
    } else if (profile.defaults?.harnessSkill && !options.harnessSkill) {
      console.error(`--runtime ${options.runtime} does not define workflow ${options.workflow}; provide --harness-skill explicitly or choose a supported workflow`);
      process.exit(2);
    }
  } else if (profile.defaults?.harnessSkill && !options.harnessSkill) {
    options.harnessSkill = profile.defaults.harnessSkill;
  }
}

function parseRunOptions(args: string[]): { planPathArg: string; options: RunArtifactOptions; dryRun: boolean; json: boolean } {
  const planPathArg = requireArg(args, 'plan-path');
  const rest = args.slice(1);
  const options: RunArtifactOptions = {};
  let dryRun = false;
  let json = false;

  function takeValue(index: number, flag: string): string {
    const value = rest[index + 1];
    if (!value || value.startsWith('--')) {
      console.error(`Missing value for ${flag}`);
      process.exit(2);
    }
    return value;
  }

  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    switch (flag) {
      case '--task-id':
        options.taskId = takeValue(i, flag);
        i += 1;
        break;
      case '--source-ref':
        options.sourceRef = [...(options.sourceRef ?? []), takeValue(i, flag)];
        i += 1;
        break;
      case '--runtime':
        options.runtime = takeValue(i, flag) as RuntimePreset;
        i += 1;
        break;
      case '--workflow':
        options.workflow = parseChoice(takeValue(i, flag), RUNTIME_WORKFLOWS, flag) as RuntimeWorkflow;
        i += 1;
        break;
      case '--executor':
        options.executor = parseChoice(takeValue(i, flag), EXECUTOR_LANES, flag) as ExecutorLane;
        i += 1;
        break;
      case '--harness-skill':
        options.harnessSkill = takeValue(i, flag);
        i += 1;
        break;
      case '--repo':
        options.repo = takeValue(i, flag);
        i += 1;
        break;
      case '--worktree':
        options.worktree = takeValue(i, flag);
        i += 1;
        break;
      case '--branch':
        options.branch = takeValue(i, flag);
        i += 1;
        break;
      case '--operator-surface':
        options.operatorSurface = parseChoice(takeValue(i, flag), OPERATOR_SURFACES, flag) as OperatorSurface;
        i += 1;
        break;
      case '--operator-thread':
        options.operatorThread = takeValue(i, flag);
        i += 1;
        break;
      case '--issue':
        options.issue = takeValue(i, flag);
        i += 1;
        break;
      case '--pr':
        options.pr = takeValue(i, flag);
        i += 1;
        break;
      case '--commit-policy':
        options.commitPolicy = takeValue(i, flag);
        i += 1;
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--json':
        json = true;
        break;
      default:
        console.error(`Unknown option for run artifacts: ${flag}`);
        printHelp();
        process.exit(2);
    }
  }

  return { planPathArg, options, dryRun, json };
}

function printRunArtifactsUsage(mode: ArtifactMode): void {
  const dryRunOptions = mode === 'run' ? ' [--dry-run] [--json]' : '';
  console.log(`Usage: osc ${mode} <plan-path>${dryRunOptions} [run binding options]

Run binding options:
  --task-id <id>              Canonical task/card/issue id for this work item
  --source-ref <ref>          Additional source ref; repeatable
  --runtime <preset>          omc | omx | plain | human | custom
  --workflow <workflow>       interview | plan | team | loop | execute | goal | custom
  --executor <lane>           omc-claude | omx-codex | plain-agent | human | custom
  --harness-skill <skill>     e.g. /ralplan, $ralplan, /ralph, $ultrawork
  --repo <path>               Repository path for execution
  --worktree <path>           Worktree path for isolated execution
  --branch <name>             Branch expected for the run
  --operator-surface <name>   discord | slack | telegram | github | cli | none | custom
  --operator-thread <id>      Optional chat/thread/comment binding id
  --issue <id-or-url>         Optional GitHub issue binding
  --pr <id-or-url>            Optional PR binding
  --commit-policy <text>      Commit/push approval rule${mode === 'run' ? '\n\nDry-run options:\n  --dry-run                   Preview run artifacts without writing .osc/runs files\n  --json                      With --dry-run, print only machine-readable JSON' : ''}`);
}

function parseInitOptions(args: string[]): { tier: ScaffoldTier; target: string; force: boolean; fromExisting: boolean } {
  let tier: ScaffoldTier | undefined;
  let target: string | undefined;
  let force = false;
  let fromExisting = false;

  function takeValue(index: number, flag: string): string {
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      console.error(`Missing value for ${flag}`);
      process.exit(2);
    }
    return value;
  }

  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    switch (flag) {
      case '--tier':
        tier = parseChoice(takeValue(i, flag), scaffoldTiers, flag) as ScaffoldTier;
        i += 1;
        break;
      case '--min':
        tier = 'min';
        break;
      case '--standard':
        tier = 'standard';
        break;
      case '--max':
        tier = 'max';
        break;
      case '--target':
        target = takeValue(i, flag);
        i += 1;
        break;
      case '--force':
        force = true;
        break;
      case '--from-existing':
        fromExisting = true;
        break;
      default:
        console.error(`Unknown option for init: ${flag}`);
        printHelp();
        process.exit(2);
    }
  }

  if (!tier) {
    console.error('Missing required option: --tier <min|standard|max>');
    process.exit(2);
  }
  if (!target) {
    console.error('Missing required option: --target <dir>');
    process.exit(2);
  }
  return { tier, target, force, fromExisting };
}

function init(args: string[]): void {
  const options = parseInitOptions(args);
  try {
    const result = initializeScaffold(options);
    console.log(result.summary);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function status(json: boolean): void {
  const state = inspectScaffold(process.cwd());
  if (json) {
    console.log(JSON.stringify(state, null, 2));
    return;
  }
  console.log('Open Scaffold status');
  console.log(`Namespace: ${state.namespace}`);
  console.log(`Mission: ${state.mission.defined ? 'defined' : `not defined (${state.mission.reason})`}`);
  for (const stage of ['active', 'backlog', 'blocked', 'done'] as const) {
    const plans = state.plans[stage];
    console.log(`${stage}: ${plans.length}`);
    for (const plan of plans) console.log(`  - ${plan.slug}`);
  }
}

function exitForScaffoldHelperError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  if (message.startsWith('Unsafe slug') || message.startsWith('Invalid plan stage')) process.exit(2);
  process.exit(1);
}

interface PlanNewOptions {
  slug?: string;
  stage: PlanCreationStage;
  templateName?: string;
  listTemplates: boolean;
}

function printPlanUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage(`Usage: osc plan <plan-path>
  osc plan new <slug> --stage <active|backlog|blocked> [--from-template <name>]
  osc plan new --from-template list
  osc plan validate <slug-or-path> [--json] [--strict]
  osc plan wizard <slug> [--stage <active|backlog|blocked>] [--non-interactive --answers <answers.json>]
  osc plan move <slug> --to <active|backlog|blocked>`, stream);
}

function printPlanNewUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc plan new <slug> --stage <active|backlog|blocked> [--from-template <name>] | osc plan new --from-template list', stream);
}

function printPlanValidateUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc plan validate <slug-or-path> [--json] [--strict]', stream);
}

function printPlanMoveUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc plan move <slug> --to <active|backlog|blocked>', stream);
}

function parsePlanNewOptions(args: string[]): PlanNewOptions {
  if (args[0] === '--from-template' && args[1] === 'list' && args.length === 2) {
    return { stage: 'active', templateName: 'list', listTemplates: true };
  }
  const slug = requireArg(args, 'slug');
  const rest = args.slice(1);
  let stage: PlanCreationStage | undefined;
  let templateName: string | undefined;
  let listTemplates = false;
  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    if (flag === '--stage') {
      const value = rest[i + 1];
      if (!value || value.startsWith('--')) {
        console.error('Missing value for --stage');
        process.exit(2);
      }
      if (!(PLAN_CREATION_STAGES as readonly string[]).includes(value)) {
        console.error(`Invalid value for --stage: ${value}. Expected one of: ${PLAN_CREATION_STAGES.join(', ')}`);
        process.exit(2);
      }
      stage = value as PlanCreationStage;
      i += 1;
    } else if (flag === '--from-template') {
      const value = rest[i + 1];
      if (!value || value.startsWith('--')) {
        console.error('Missing value for --from-template');
        process.exit(2);
      }
      templateName = value;
      listTemplates = value === 'list';
      i += 1;
    } else {
      console.error(`Unknown option for plan new: ${flag}`);
      printPlanNewUsage();
      process.exit(2);
    }
  }
  if (listTemplates) return { slug, stage: stage ?? 'active', templateName, listTemplates };
  if (!stage) {
    console.error('Missing required option: --stage <active|backlog|blocked>');
    process.exit(2);
  }
  return { slug, stage, templateName, listTemplates };
}

function parsePlanMoveDestination(args: string[]): PlanCreationStage {
  let toStage: PlanCreationStage | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    if (flag === '--to') {
      const value = args[i + 1];
      if (!value || value.startsWith('--')) {
        console.error('Missing value for --to');
        process.exit(2);
      }
      if (value === 'done') {
        console.error('Use osc close <plan-slug> [--message <text>] to move a plan to done.');
        process.exit(2);
      }
      if (!(PLAN_CREATION_STAGES as readonly string[]).includes(value)) {
        console.error(`Invalid value for --to: ${value}. Expected one of: ${PLAN_CREATION_STAGES.join(', ')}`);
        process.exit(2);
      }
      toStage = value as PlanCreationStage;
      i += 1;
    } else {
      console.error(`Unknown option for plan move: ${flag}`);
      console.error('Usage: osc plan move <slug> --to <active|backlog|blocked>');
      process.exit(2);
    }
  }
  if (!toStage) {
    console.error('Missing required option: --to <active|backlog|blocked>');
    process.exit(2);
  }
  return toStage;
}

function printPlanWizardUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc plan wizard <slug> [--stage <active|backlog|blocked>] [--non-interactive --answers <answers.json>]', stream);
}

function parsePlanWizardOptions(args: string[]): { slug: string; stage: PlanCreationStage; nonInteractive: boolean; answersPath?: string } {
  const slug = requireArg(args, 'slug');
  const rest = args.slice(1);
  let stage: PlanCreationStage = 'active';
  let nonInteractive = false;
  let answersPath: string | undefined;
  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    switch (flag) {
      case '--stage': {
        const value = rest[i + 1];
        if (!value || value.startsWith('--')) {
          console.error('Missing value for --stage');
          process.exit(2);
        }
        if (!(PLAN_CREATION_STAGES as readonly string[]).includes(value)) {
          console.error(`Invalid value for --stage: ${value}. Expected one of: ${PLAN_CREATION_STAGES.join(', ')}`);
          process.exit(2);
        }
        stage = value as PlanCreationStage;
        i += 1;
        break;
      }
      case '--non-interactive':
        nonInteractive = true;
        break;
      case '--answers': {
        const value = rest[i + 1];
        if (!value || value.startsWith('--')) {
          console.error('Missing value for --answers');
          process.exit(2);
        }
        answersPath = value;
        i += 1;
        break;
      }
      default:
        console.error(`Unknown option for plan wizard: ${flag}`);
        printPlanWizardUsage();
        process.exit(2);
    }
  }
  if (nonInteractive && !answersPath) {
    console.error('Missing required option for --non-interactive: --answers <answers.json>');
    process.exit(2);
  }
  if (answersPath && !nonInteractive) {
    console.error('--answers is only supported with --non-interactive');
    process.exit(2);
  }
  return { slug, stage, nonInteractive, answersPath };
}

async function planCommand(args: string[]): Promise<void> {
  const [subcommand, ...rest] = args;
  if (subcommand === undefined || isHelpArg(subcommand)) {
    printPlanUsage('stdout');
    return;
  }

  if (subcommand === 'new') {
    if (isHelpArg(rest[0])) {
      printPlanNewUsage('stdout');
      return;
    }
    const options = parsePlanNewOptions(rest);
    if (options.listTemplates) {
      try {
        const templates = listPlanTemplates(process.cwd());
        for (const template of templates) console.log(`${template.name}\t${template.path}`);
        return;
      } catch (error) {
        exitForScaffoldHelperError(error);
      }
    }
    const slug = options.slug as string;
    try {
      const result = createPlanSkeleton(slug, options.stage, process.cwd(), { templateName: options.templateName });
      console.log(`Created plan: ${result.relativePath}`);
      if (result.templateName) {
        console.log(`Template: ${result.templateName}`);
        console.log('Next: review the template placeholders and replace angle-bracket prompts before implementation.');
      } else {
        console.log('Next: fill the TODO prompts before implementation; do not treat the skeleton as acceptance criteria.');
      }
      return;
    } catch (error) {
      exitForScaffoldHelperError(error);
    }
  }

  if (subcommand === 'validate') {
    if (isHelpArg(rest[0])) {
      printPlanValidateUsage('stdout');
      return;
    }
    const target = requireArg(rest, 'slug-or-path');
    const validateArgs = rest.slice(1);
    let json = false;
    let strict = false;
    for (const flag of validateArgs) {
      if (flag === '--json') json = true;
      else if (flag === '--strict') strict = true;
      else {
        console.error(`Unknown option for plan validate: ${flag}`);
        printPlanValidateUsage();
        process.exit(2);
      }
    }
    try {
      const planPath = resolvePlanValidationPath(target, process.cwd());
      const result = validatePlanFile(planPath, { strict });
      if (json) {
        console.log(JSON.stringify(result.issues, null, 2));
      } else {
        console.log(formatPlanValidationIssues(result.issues));
      }
      if (hasBlockingIssues(result.issues, strict)) process.exit(1);
      return;
    } catch (error) {
      exitForScaffoldHelperError(error);
    }
  }

  if (subcommand === 'wizard') {
    if (isHelpArg(rest[0])) {
      printPlanWizardUsage('stdout');
      return;
    }
    const options = parsePlanWizardOptions(rest);
    try {
      assertWizardReady(process.cwd());
      let answers: PlanWizardAnswers;
      if (options.nonInteractive) {
        answers = loadAnswersFile(resolve(options.answersPath as string));
      } else {
        answers = await askInteractiveAnswers();
      }
      const result = createWizardPlan(options.slug, options.stage, answers, process.cwd());
      console.log(`Created plan: ${result.relativePath}`);
      console.log('Next: review the generated plan, adjust any _not specified_ sections, then verify before implementation.');
      return;
    } catch (error) {
      exitForScaffoldHelperError(error);
    }
  }

  if (subcommand === 'move') {
    if (isHelpArg(rest[0])) {
      printPlanMoveUsage('stdout');
      return;
    }
    const slug = requireArg(rest, 'slug');
    const toStage = parsePlanMoveDestination(rest.slice(1));
    try {
      const result = movePlan(slug, toStage, process.cwd());
      if (result.alreadyInStage) {
        console.log(`Plan ${result.slug}.md is already in ${result.toStage}/; status aligned.`);
        return;
      }
      console.log(`Moved plan: ${result.slug}`);
      console.log(`From: ${result.fromStage}`);
      console.log(`To: ${result.toStage}`);
      console.log(`Moved files: ${result.movedFiles.join(', ')}`);
      return;
    } catch (error) {
      exitForScaffoldHelperError(error);
    }
  }

  const planPath = resolve(requireArg(args, 'plan-path'));
  console.log(JSON.stringify(planToJson(parsePlanFile(planPath)), null, 2));
}

function isHelpArg(arg: string | undefined): boolean {
  return arg === '-h' || arg === '--help' || arg === 'help';
}

function printUsage(message: string, stream: 'stdout' | 'stderr' = 'stderr'): void {
  if (stream === 'stdout') console.log(message);
  else console.error(message);
}

function printEvidenceUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc evidence new <slug> | osc evidence collect <slug> [--ci] [--dry-run] [--verbose]', stream);
}

function printEvidenceNewUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc evidence new <slug>', stream);
}

function printEvidenceCollectUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc evidence collect <slug> [--ci] [--dry-run] [--verbose]', stream);
}

function evidenceCommand(args: string[]): void {
  const [subcommand, ...rest] = args;
  if (isHelpArg(subcommand) || subcommand === undefined) {
    printEvidenceUsage('stdout');
    return;
  }

  if (subcommand === 'new') {
    if (isHelpArg(rest[0])) {
      printEvidenceNewUsage('stdout');
      return;
    }
    const slug = requireArg(rest, 'slug');
    if (rest.length > 1) {
      console.error(`Unknown option for evidence new: ${rest[1]}`);
      printEvidenceNewUsage();
      process.exit(2);
    }
    try {
      const result = createEvidenceNoteSkeleton(slug, process.cwd());
      console.log(`Created evidence note: ${result.relativePath}`);
      console.log('Next: replace every TODO with verified evidence before closing the plan.');
      return;
    } catch (error) {
      exitForScaffoldHelperError(error);
    }
  }

  if (subcommand === 'collect') {
    if (isHelpArg(rest[0])) {
      printEvidenceCollectUsage('stdout');
      return;
    }
    const slug = requireArg(rest, 'slug');
    let ci = false;
    let dryRun = false;
    let verbose = false;
    for (const flag of rest.slice(1)) {
      if (flag === '--ci') ci = true;
      else if (flag === '--dry-run') dryRun = true;
      else if (flag === '--verbose') verbose = true;
      else {
        console.error(`Unknown option for evidence collect: ${flag}`);
        printEvidenceCollectUsage();
        process.exit(2);
      }
    }
    try {
      const result = collectEvidence(slug, process.cwd(), { ci, dryRun, verbose });
      if (dryRun) {
        console.log(result.block);
        console.log('No files were written. Re-run without --dry-run to append this block.');
      } else {
        console.log(`Collected evidence: ${result.relativePath}`);
        console.log(`Appended timestamped block for ${result.slug}.`);
        if (verbose) console.log(result.block);
      }
      return;
    } catch (error) {
      exitForScaffoldHelperError(error);
    }
  }

  printEvidenceUsage();
  process.exit(2);
}

function printLifecycleUsage(command: 'amend' | 'close', stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage(`Usage: osc ${command} <plan-slug> [--message <text>]`, stream);
}

type LifecycleOptions = {
  slug: string;
  message: string;
};

function parseLifecycleOptions(args: string[], command: 'amend' | 'close'): LifecycleOptions {
  const slug = requireArg(args, 'plan-slug');
  let message = '';
  const rest = args.slice(1);
  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    if (flag === '--message') {
      const value = rest[i + 1];
      if (!value || value.startsWith('--')) {
        console.error(`Missing value for --message`);
        process.exit(2);
      }
      message = value;
      i += 1;
      continue;
    }
    console.error(`Unknown option for ${command}: ${flag}`);
    printLifecycleUsage(command);
    process.exit(2);
  }
  return { slug, message };
}

function amendCommand(args: string[]): void {
  if (isHelpArg(args[0])) {
    printLifecycleUsage('amend', 'stdout');
    return;
  }
  const { slug, message } = parseLifecycleOptions(args, 'amend');
  try {
    const result = createPlanAmendment(slug, process.cwd(), message);
    console.log(`Created amendment: ${result.relativePath}`);
    if (result.changelogStamped) console.log('Stamped: MISSION.md changelog');
    console.log('Next: fill in the TODO sections in the amendment, then verify and commit.');
  } catch (error) {
    exitForScaffoldHelperError(error);
  }
}

function closeCommand(args: string[]): void {
  if (isHelpArg(args[0])) {
    printLifecycleUsage('close', 'stdout');
    return;
  }
  const { slug, message } = parseLifecycleOptions(args, 'close');
  try {
    const result = closePlan(slug, process.cwd(), message);
    if (result.alreadyDone) {
      console.log(`Plan ${result.slug}.md is already in done/.`);
      return;
    }
    console.log(`Closed: ${result.slug}`);
    console.log(`Moved to done/: ${result.movedFiles.join(', ')}`);
    if (result.changelogStamped) console.log('Stamped: MISSION.md changelog');
  } catch (error) {
    exitForScaffoldHelperError(error);
  }
}

function createArtifacts(args: string[], mode: ArtifactMode): void {
  if (args[0] === '-h' || args[0] === '--help' || args[0] === 'help') {
    printRunArtifactsUsage(mode);
    return;
  }
  const { planPathArg, options, dryRun, json } = parseRunOptions(args);
  const absolutePlanPath = resolve(planPathArg);
  if (!existsSync(absolutePlanPath)) {
    console.error(`Plan not found: ${absolutePlanPath}`);
    process.exit(1);
  }
  const planPath = realpathSync(absolutePlanPath);
  const scaffoldRoot = findScaffoldRoot(dirname(planPath)) ?? findScaffoldRoot(process.cwd()) ?? process.cwd();
  applyRuntimeSelection(options, options.repo ? resolve(options.repo) : scaffoldRoot);
  const artifactRoot = process.cwd();
  const artifactOptions: RunArtifactOptions = { ...options, scaffoldRoot };
  const plan = parsePlanFile(planPath);

  if (dryRun) {
    if (mode !== 'run') {
      console.error('--dry-run is only supported for osc run');
      process.exit(2);
    }
    const preview = previewRunArtifacts(artifactRoot, plan, mode, artifactOptions);
    const payload = {
      run: preview.manifest,
      packageMarkdown: preview.packageMarkdown,
      filesToTouch: preview.filesToTouch,
    };
    if (json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      const executor = preview.manifest.executor.lane ?? 'unspecified';
      const workflow = preview.manifest.runtimeSelection.workflow ?? 'unspecified';
      const harnessSkill = preview.manifest.executor.harnessSkill ?? 'none';
      console.log('Dry-run run.json:');
      console.log(JSON.stringify(preview.manifest, null, 2));
      console.log('');
      console.log('Dry-run package.md:');
      console.log(preview.packageMarkdown);
      console.log('Dry-run summary:');
      console.log(`Would create run ${preview.runId} in ${preview.manifest.artifacts.runDir} with executor ${executor}, workflow ${workflow}, harness skill ${harnessSkill}.`);
      if (preview.filesToTouch.length) {
        console.log('Files to touch:');
        for (const file of preview.filesToTouch) console.log(`  - ${file}`);
      } else {
        console.log('Files to touch: none listed.');
      }
      if (!preview.manifest.packageQuality.executable) {
        console.log('Blockers:');
        for (const blocker of preview.manifest.packageQuality.blockers) console.log(`  - ${blocker}`);
      }
      console.log('No files were written. Re-run without --dry-run to create .osc/runs artifacts.');
    }
    if (!preview.manifest.packageQuality.executable) process.exit(1);
    return;
  }

  if (json) {
    console.error('--json is only supported with --dry-run for osc run');
    process.exit(2);
  }

  const run = createRunArtifacts(artifactRoot, plan, mode, artifactOptions);
  console.log(`Created ${mode} artifacts:`);
  console.log(`  Run: ${run.runDir}`);
  console.log(`  Manifest: ${run.manifestPath}`);
  for (const prompt of run.promptPaths) console.log(`  Prompt: ${prompt}`);
  console.log('  Note: generic open-scaffold did not spawn a runtime; dispatch via your coordinator or harness adapter.');
}

function printAuditUsage(): void {
  console.error('Usage: osc audit init <run-or-plan> [--artifact <role> <path>]... [--out <path>] | osc audit check <audit-manifest-path>');
}

function takeAuditValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${flag}`);
    process.exit(2);
  }
  return value;
}

function auditRootFor(manifestPath: string): string {
  return findScaffoldRoot(dirname(manifestPath)) ?? findScaffoldRoot(process.cwd()) ?? process.cwd();
}

function auditRootForSource(sourcePath: string): string {
  const resolvedSource = resolve(sourcePath);
  return findScaffoldRoot(dirname(resolvedSource)) ?? findScaffoldRoot(process.cwd()) ?? process.cwd();
}

function auditCommand(args: string[]): void {
  const [subcommand, sourceOrPath, ...rest] = args;
  if (subcommand === 'init') {
    if (!sourceOrPath) {
      printAuditUsage();
      process.exit(2);
    }
    let outPath: string | null = null;
    let force = false;
    const artifacts: AuditArtifactInput[] = [];
    for (let i = 0; i < rest.length; i += 1) {
      const flag = rest[i];
      switch (flag) {
        case '--artifact': {
          const role = takeAuditValue(rest, i, flag);
          const path = rest[i + 2];
          if (!path || path.startsWith('--')) {
            console.error('Missing path for --artifact <role> <path>');
            process.exit(2);
          }
          artifacts.push({ role, path });
          i += 2;
          break;
        }
        case '--out':
        case '--output':
          outPath = takeAuditValue(rest, i, flag);
          i += 1;
          break;
        case '--force':
          force = true;
          break;
        default:
          console.error(`Unknown option for audit init: ${flag}`);
          printAuditUsage();
          process.exit(2);
      }
    }
    const auditRoot = auditRootForSource(sourceOrPath);
    const auditSource = resolve(sourceOrPath);
    try {
      if (!outPath) {
        process.stdout.write(renderAuditManifest(auditSource, artifacts, auditRoot));
        return;
      }
      const absoluteOut = resolve(outPath);
      if (existsSync(absoluteOut) && !force) {
        console.error(`Refusing to overwrite existing audit manifest: ${absoluteOut}`);
        process.exit(1);
      }
      if (force && existsSync(absoluteOut)) {
        writeFileSync(absoluteOut, renderAuditManifest(auditSource, artifacts, auditRoot), 'utf8');
      } else {
        writeAuditManifest(auditSource, artifacts, absoluteOut, auditRoot);
      }
      console.log(`Created audit manifest: ${absoluteOut}`);
      console.log('Note: this is a local digest-integrity manifest only; it does not certify correctness, compliance, approval, runtime execution, model quality, or external anchoring.');
      return;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  if (subcommand === 'check') {
    if (!sourceOrPath) {
      printAuditUsage();
      process.exit(2);
    }
    if (rest.length > 0) {
      console.error(`Unknown option for audit check: ${rest[0]}`);
      printAuditUsage();
      process.exit(2);
    }
    const manifestPath = resolve(sourceOrPath);
    const result = validateAuditManifestFile(manifestPath, auditRootFor(manifestPath));
    for (const failure of result.failures) {
      console.error(`FAIL ${failure.code}: ${failure.message}${failure.path ? ` (${failure.path})` : ''}`);
    }
    for (const warning of result.warnings) {
      console.warn(`WARN ${warning.code}: ${warning.message}${warning.path ? ` (${warning.path})` : ''}`);
    }
    if (!result.ok) process.exit(1);
    let artifactCount = 0;
    try {
      const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as { artifacts?: unknown[] };
      artifactCount = Array.isArray(parsed.artifacts) ? parsed.artifacts.length : 0;
    } catch {
      artifactCount = 0;
    }
    console.log(`PASS audit manifest structure/digests valid; ${artifactCount} artifact(s); ${result.warnings.length} warning(s)`);
    console.log('Note: this check validates local artifact presence and sha256 digest consistency only; it does not judge correctness, compliance, approval, runtime execution, model quality, or external anchoring.');
    return;
  }

  printAuditUsage();
  process.exit(2);
}

function printEvalUsage(): void {
  console.error('Usage: osc eval init <run-or-plan> [--out <path>] | osc eval check <evaluation-path>');
}

function findScaffoldRoot(start: string): string | null {
  let current = resolve(start);
  while (true) {
    if (existsSync(join(current, '.osc')) || existsSync(join(current, '.git'))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function evaluationRootFor(envelopePath: string): string {
  return findScaffoldRoot(dirname(envelopePath)) ?? findScaffoldRoot(process.cwd()) ?? process.cwd();
}

function takeEvalValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${flag}`);
    process.exit(2);
  }
  return value;
}

function evalCommand(args: string[]): void {
  const [subcommand, sourceOrPath, ...rest] = args;
  if (subcommand === 'init') {
    if (!sourceOrPath) {
      printEvalUsage();
      process.exit(2);
    }
    let outPath: string | null = null;
    let force = false;
    for (let i = 0; i < rest.length; i += 1) {
      const flag = rest[i];
      switch (flag) {
        case '--out':
        case '--output':
          outPath = takeEvalValue(rest, i, flag);
          i += 1;
          break;
        case '--force':
          force = true;
          break;
        default:
          console.error(`Unknown option for eval init: ${flag}`);
          printEvalUsage();
          process.exit(2);
      }
    }
    try {
      if (!outPath) {
        const source = loadEvaluationSource(sourceOrPath, process.cwd());
        process.stdout.write(renderEvaluationEnvelope(source));
        return;
      }
      const absoluteOut = resolve(outPath);
      if (existsSync(absoluteOut) && !force) {
        console.error(`Refusing to overwrite existing evaluation envelope: ${absoluteOut}`);
        process.exit(1);
      }
      if (force && existsSync(absoluteOut)) {
        const source = loadEvaluationSource(sourceOrPath, process.cwd());
        writeFileSync(absoluteOut, renderEvaluationEnvelope(source), 'utf8');
      } else {
        writeEvaluationEnvelope(sourceOrPath, absoluteOut, process.cwd());
      }
      console.log(`Created evaluation envelope: ${absoluteOut}`);
      console.log('Note: this is a structure/coverage template only; fill evidence, evaluator, decision, and routing before check/close.');
      return;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  if (subcommand === 'check') {
    if (!sourceOrPath) {
      printEvalUsage();
      process.exit(2);
    }
    if (rest.length > 0) {
      console.error(`Unknown option for eval check: ${rest[0]}`);
      printEvalUsage();
      process.exit(2);
    }
    const envelopePath = resolve(sourceOrPath);
    const result = validateEvaluationEnvelopeFile(envelopePath, evaluationRootFor(envelopePath));
    for (const failure of result.failures) {
      console.error(`FAIL ${failure.code}: ${failure.message}${failure.path ? ` (${failure.path})` : ''}`);
    }
    for (const warning of result.warnings) {
      console.warn(`WARN ${warning.code}: ${warning.message}${warning.path ? ` (${warning.path})` : ''}`);
    }
    if (!result.ok) process.exit(1);
    let criterionCount = 0;
    try {
      const parsed = JSON.parse(readFileSync(envelopePath, 'utf8')) as { acceptance_criteria?: unknown[] };
      criterionCount = Array.isArray(parsed.acceptance_criteria) ? parsed.acceptance_criteria.length : 0;
    } catch {
      criterionCount = 0;
    }
    console.log(`PASS evaluation envelope structure valid; ${criterionCount} criterion evaluation(s); ${result.warnings.length} warning(s)`);
    console.log('Note: this check validates schema/coverage/routing only; it does not judge correctness, compliance, production readiness, or model quality.');
    return;
  }

  printEvalUsage();
  process.exit(2);
}

function runtimes(args: string[]): void {
  const [subcommand, id] = args;
  if (subcommand === 'list') {
    try {
      for (const entry of loadRuntimeProfiles(process.cwd())) {
        console.log(`${entry.profile.id}\t${entry.source}\t${entry.profile.lane}\t${entry.profile.status}\t${entry.profile.displayName}`);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }
  if (subcommand === 'show') {
    if (!id) {
      console.error('Missing required argument: runtime id');
      process.exit(2);
    }
    let resolved: ReturnType<typeof resolveRuntimeProfile>;
    try {
      resolved = resolveRuntimeProfile(process.cwd(), id);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    if (!resolved) {
      console.error(`Unknown runtime profile: ${id}`);
      process.exit(2);
    }
    console.log(JSON.stringify({ ...resolved.profile, source: resolved.source, path: resolved.path ?? null }, null, 2));
    return;
  }
  console.error('Usage: osc runtimes list | osc runtimes show <id>');
  process.exit(2);
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case undefined:
    case '-h':
    case '--help':
    case 'help':
      printHelp();
      return;
    case 'init':
      init(args);
      return;
    case 'status':
      status(args.includes('--json'));
      return;
    case 'plan':
      await planCommand(args);
      return;
    case 'amend':
      amendCommand(args);
      return;
    case 'delegate':
    case 'run':
    case 'review':
    case 'ultrareview':
      createArtifacts(args, command);
      return;
    case 'eval':
      evalCommand(args);
      return;
    case 'audit':
      auditCommand(args);
      return;
    case 'evidence':
      evidenceCommand(args);
      return;
    case 'close':
      closeCommand(args);
      return;
    case 'verify': {
      const result = validateScaffold(process.cwd());
      for (const failure of result.failures) {
        console.error(`FAIL ${failure.code}: ${failure.message}${failure.path ? ` (${failure.path})` : ''}`);
      }
      for (const warning of result.warnings) {
        console.warn(`WARN ${warning.code}: ${warning.message}${warning.path ? ` (${warning.path})` : ''}`);
      }
      if (!result.ok) process.exit(1);
      const state = inspectScaffold(process.cwd());
      const count = Object.values(state.plans).flat().length;
      console.log(`PASS mission defined and ${count} plan file(s) found; ${result.warnings.length} warning(s)`);
      return;
    }
    case 'doctor':
      status(false);
      console.log('Doctor: generic CLI is installed; adapters must be checked in their own repos.');
      return;
    case 'runtimes':
      runtimes(args);
      return;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(2);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
