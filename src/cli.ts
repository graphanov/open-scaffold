#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { renderStartPrompt, parseStartRuntime, START_RUNTIMES } from './start.js';
import { renderAuditManifest, validateAuditManifestFile, writeAuditManifest, type AuditArtifactInput } from './audit.js';
import { createRunArtifacts, previewRunArtifacts, type ArtifactMode, type ExecutorLane, type OperatorSurface, type RunArtifactOptions, type RuntimePreset, type RuntimeWorkflow } from './artifacts.js';
import { COCKPIT_EVENT_TYPES, CockpitConfigError, CockpitUsageError, formatCockpitConfig, formatCockpitDispatchSummary, hasCockpitDispatchFailures, loadCockpitConfig, postCockpitEvent, type CockpitEventType, type CockpitPostOptions } from './cockpit.js';
import { compareBareAttempts, renderAttemptComparisonJson, renderAttemptComparisonMarkdown } from './compare.js';
import { runDashboard, type DashboardRunOptions } from './dashboard.js';
import { DispatchUsageError, formatDispatchSummary, runDispatch } from './dispatch.js';
import { doctorExitCode, formatDoctorReport, parseDoctorCheckName, runDoctor, type DoctorOptions, type DoctorSeverity } from './doctor.js';
import { openDashboardUrl, serveDashboard, writeWebDashboard } from './dashboard-web.js';
import { collectEvidence } from './evidence.js';
import { evidenceChainExitCode, formatEvidenceChainReport, verifyEvidenceChain } from './evidence-chain.js';
import { loadEvaluationSource, renderEvaluationEnvelope, validateEvaluationEnvelopeFile, writeEvaluationEnvelope } from './evaluation.js';
import { EVOLUTION_DECISIONS, EVOLUTION_STRATEGIES, compareEvolutionLoop, recordEvolutionAttempt, renderEvolutionComparison, validateEvolutionLoopDir, writeEvolutionLoop, type EvolutionCompareFormat, type EvolutionDecision, type EvolutionStrategy } from './evolution.js';
import { initializeScaffold, scaffoldTiers, type ScaffoldTier } from './init.js';
import { computeMetrics, formatMetrics, parseSinceDate } from './metrics.js';
import { computeStudy, renderStudyMarkdown, validateStudyReport, writeStudyOutput } from './study.js';
import { computePrSummary, renderPrSummaryMarkdown } from './pr-summary.js';
import { checkAbPacket, formatAbCheckReport } from './ab.js';
import { runMcpCommand } from './mcp-server.js';
import { loadRuntimeProfiles, resolveRuntimeProfile } from './runtimes.js';
import { closePlan, createEvidenceNoteSkeleton, createPlanAmendment, createPlanSkeleton, inspectScaffold, listPlanTemplates, movePlan, parsePlanFile, planToJson, PLAN_CREATION_STAGES, type PlanCreationStage } from './scaffold.js';
import { addTaskComment, createTask, formatTaskDetails, formatTaskSummary, formatTaskTable, getTaskDetails, getTaskSummary, linkTaskPlan, listTasks, taskToJson, transitionTask, TASK_PRIORITIES, TASK_STATUSES, TaskUsageError, type TaskStatus } from './tasks.js';
import { validateScaffold } from './validation.js';
import { formatPlanValidationIssues, hasBlockingIssues, resolvePlanValidationPath, validatePlanFile } from './plan-validate.js';
import { buildPlanGraph, normalizePlanReference, renderPlanGraphAscii, renderPlanGraphMermaid, type PlanGraphDirection, type PlanGraphFormat, type PlanGraphStageFilter } from './plan-graph.js';
import { computePlanStats, formatPlanStats } from './plan-stats.js';
import { askInteractiveAnswers, assertWizardReady, createWizardPlan, loadAnswersFile, type PlanWizardAnswers } from './wizard.js';
import { buildWorkDryRunPreview, formatWorkDryRunPreview } from './work.js';
import { buildTrace, formatTraceReport, TraceUsageError } from './trace.js';

function printHelp(): void {
  console.log(`osc — Open Scaffold CLI

Repo-native work record: MISSION.md → plan → run packet/amendment → evidence → verification → close.

Usage:
First-read demo:
  osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]

Stable core protocol:
  osc init --tier <min|standard|max> --target <dir> [--force]
  osc init --from-existing --tier min --target <dir> [--force]
  osc init --min|--standard|--max --target <dir> [--force]
  osc status [--json|--dashboard]
  osc plan <plan-path>
  osc plan new <slug> --stage <active|backlog|blocked> [--from-template <name>]
  osc plan new --from-template list
  osc plan validate <slug-or-path> [--json] [--strict]
  osc plan wizard <slug> [--stage <active|backlog|blocked>] [--non-interactive --answers <answers.json>]
  osc plan move <slug> --to <active|backlog|blocked>
  osc plan graph [--format <ascii|mermaid|json>] [--stage <active|backlog|all>] [--direction <downstream|upstream|both>] [--plan <slug>]
  osc plan stats [--json]
  osc amend <plan-slug> [--message <text>]
  osc evidence new <slug>
  osc evidence collect <slug> [--ci] [--dry-run] [--verbose]
  osc close <plan-slug> [--message <text>]
  osc trace <plan-slug> [--json] [--include-unverified]
  osc verify [--evidence-chain [--plan <slug>] [--json] [--strict]]

Handoff and run packages:
  osc start <plan-slug-or-path> --runtime <codex|omx|plain|human|custom>
  osc delegate <plan-path> [run binding options]
  osc run <plan-path> [--dry-run] [--json] [run binding options]
  osc dispatch <run-json> --adapter <adapter-id>
  osc review <plan-path> [run binding options]
  osc ultrareview <plan-path> [run binding options]

Lab and experimental:
  osc work <task-description> --runtime <preset> --dry-run [--json] [--adapter <adapter-id>]
  osc task new <title> [--priority <high|medium|low>] [--plan <slug>]
  osc task list [--status <status>] [--priority <priority>] [--plan <slug>] [--json]
  osc task show <task-id>
  osc task claim|start|complete|cancel <task-id>
  osc task block <task-id> --reason <text>
  osc task comment <task-id> <comment>
  osc task link <task-id> --plan <slug>
  osc eval init <run-or-plan> [--out <path>]
  osc eval check <evaluation-path>
  osc audit init <run-or-plan> [--artifact <role> <path>]... [--out <path>]
  osc audit check <audit-manifest-path>
  osc evolve init <run-or-plan> [--out <dir>] [--strategy <manual|greedy|tournament|novelty|map_elites|custom>]
  osc evolve record <loop-dir> --run <run-packet> [--evaluation <evaluation-json>] [--receipt <dispatch-receipt.json>] [--evidence <path>]... --decision <promote|reject|retry|block> [--score <0..1>] --rationale <text>
  osc evolve compare <loop-dir> [--a <attempt-id|run-id|frontier>] [--b <attempt-id|run-id|frontier>] [--format <terminal|markdown|json>] [--out <path>]
  osc evolve check <loop-dir>
  osc cockpit config
  osc cockpit test [--dry-run]
  osc cockpit post --event <event> [--message <text>] [--run-id <id>] [--plan <slug>] [--task-id <id>] [--pr <url>] [--evidence-path <path>] [--dry-run]
  osc dashboard [--watch] [--interval <seconds>]
  osc dashboard --web [--out <path>]
  osc dashboard --serve [--port <port>] [--open]

Diagnostics and advanced:
  osc mcp serve [--repo <path>] [--allow-write] [--validate]
  osc metrics [--json] [--since <date>] [--lookback <weeks>] [--table] [--verbose]
  osc study [--json] [--since <date>] [--out <path>]
  osc pr-summary <plan-slug> [--format <markdown|json>]
  osc ab check <path>
  osc doctor [--fix] [--dry-run] [--severity <info|warn|error>] [--check <name>]
  osc runtimes list [--json]
  osc runtimes show <id>

Run binding options:
  --task-id <id>              Canonical task/card/issue id for this work item
  --source-ref <ref>          Additional source ref; repeatable
  --runtime <preset>          omc | codex | omx | plain | human | custom
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

Generic open-scaffold generates prompts/artifacts only. External coordinators, agents, and runtime harnesses perform any execution outside core.`);
}

function packageVersion(): string {
  try {
    const parsed = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version?: unknown };
    return typeof parsed.version === 'string' && parsed.version.trim() ? parsed.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
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
  --runtime <preset>          omc | codex | omx | plain | human | custom
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

function printInitUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage(`Usage: osc init --tier <min|standard|max> --target <dir> [--force]
  osc init --from-existing --tier min --target <dir> [--force]
  osc init --min|--standard|--max --target <dir> [--force]`, stream);
}

function hasInitHelpRequest(args: string[]): boolean {
  let previousFlagNeedsValue = false;
  for (const arg of args) {
    if (previousFlagNeedsValue) {
      previousFlagNeedsValue = false;
      continue;
    }
    if (arg === '--tier' || arg === '--target') {
      previousFlagNeedsValue = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') return true;
  }
  return args.length === 1 && args[0] === 'help';
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
        printInitUsage();
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
  if (hasInitHelpRequest(args)) {
    printInitUsage('stdout');
    return;
  }
  const options = parseInitOptions(args);
  try {
    const result = initializeScaffold(options);
    console.log(result.summary);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function printDashboardUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc dashboard [--watch] [--interval <seconds>]', stream);
}

function parseDashboardOptions(args: string[]): DashboardRunOptions {
  const options: DashboardRunOptions = {};
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    switch (flag) {
      case '--watch':
        options.watch = true;
        break;
      case '--interval': {
        const value = args[i + 1];
        if (!value || value.startsWith('--')) {
          console.error('Missing value for --interval');
          process.exit(2);
        }
        const intervalSeconds = Number.parseInt(value, 10);
        if (!Number.isFinite(intervalSeconds) || intervalSeconds < 1) {
          console.error(`Invalid value for --interval: ${value}. Expected a positive number of seconds.`);
          process.exit(2);
        }
        options.intervalSeconds = intervalSeconds;
        i += 1;
        break;
      }
      default:
        console.error(`Unknown option for dashboard: ${flag}`);
        printDashboardUsage();
        process.exit(2);
    }
  }
  return options;
}

async function dashboardCommand(args: string[]): Promise<void> {
  if (isHelpArg(args[0])) {
    printDashboardUsage('stdout');
    return;
  }
  await runDashboard(parseDashboardOptions(args));
}

async function status(args: string[]): Promise<void> {
  if (args.includes('--dashboard')) {
    await dashboardCommand(args.filter((arg) => arg !== '--dashboard'));
    return;
  }
  const unknown = args.filter((arg) => arg !== '--json');
  if (unknown.length > 0) {
    console.error(`Unknown option for status: ${unknown[0]}`);
    printUsage('Usage: osc status [--json|--dashboard]');
    process.exit(2);
  }
  const json = args.includes('--json');
  const state = inspectScaffold(process.cwd());
  let taskSummary: ReturnType<typeof getTaskSummary> = null;
  try {
    taskSummary = getTaskSummary(process.cwd());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.startsWith('No Open Scaffold root found')) throw error;
  }
  if (json) {
    console.log(JSON.stringify({ ...state, tasks: taskSummary }, null, 2));
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
  if (taskSummary) console.log(formatTaskSummary(taskSummary));
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
  osc plan move <slug> --to <active|backlog|blocked>
  osc plan graph [--format <ascii|mermaid|json>] [--stage <active|backlog|all>] [--direction <downstream|upstream|both>] [--plan <slug>]
  osc plan stats [--json]`, stream);
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

function printPlanGraphUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc plan graph [--format <ascii|mermaid|json>] [--stage <active|backlog|all>] [--direction <downstream|upstream|both>] [--plan <slug>]', stream);
}

function printPlanStatsUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc plan stats [--json]', stream);
}

function parsePlanGraphOptions(args: string[]): { format: PlanGraphFormat; stage?: PlanGraphStageFilter; direction: PlanGraphDirection; plan?: string } {
  let format: PlanGraphFormat = 'ascii';
  let stage: PlanGraphStageFilter | undefined;
  let direction: PlanGraphDirection = 'both';
  let plan: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    switch (flag) {
      case '--format': {
        const value = args[i + 1];
        if (!value || value.startsWith('--') || !['ascii', 'mermaid', 'json'].includes(value)) {
          console.error('Missing or invalid value for --format. Expected ascii, mermaid, or json.');
          printPlanGraphUsage();
          process.exit(2);
        }
        format = value as PlanGraphFormat;
        i += 1;
        break;
      }
      case '--stage': {
        const value = args[i + 1];
        if (!value || value.startsWith('--') || !['active', 'backlog', 'all'].includes(value)) {
          console.error('Missing or invalid value for --stage. Expected active, backlog, or all.');
          printPlanGraphUsage();
          process.exit(2);
        }
        stage = value as PlanGraphStageFilter;
        i += 1;
        break;
      }
      case '--direction': {
        const value = args[i + 1];
        if (!value || value.startsWith('--') || !['downstream', 'upstream', 'both'].includes(value)) {
          console.error('Missing or invalid value for --direction. Expected downstream, upstream, or both.');
          printPlanGraphUsage();
          process.exit(2);
        }
        direction = value as PlanGraphDirection;
        i += 1;
        break;
      }
      case '--plan': {
        const value = args[i + 1];
        if (!value || value.startsWith('--')) {
          console.error('Missing value for --plan');
          printPlanGraphUsage();
          process.exit(2);
        }
        const normalized = normalizePlanReference(value);
        if (!normalized) {
          console.error(`Invalid value for --plan: ${value}`);
          printPlanGraphUsage();
          process.exit(2);
        }
        plan = normalized;
        i += 1;
        break;
      }
      default:
        console.error(`Unknown option for plan graph: ${flag}`);
        printPlanGraphUsage();
        process.exit(2);
    }
  }
  if (stage === 'all' && direction !== 'both' && !plan) {
    console.error('Invalid option combination: --stage all only supports --direction both unless --plan is provided. Use --plan for focused upstream/downstream views.');
    printPlanGraphUsage();
    process.exit(2);
  }
  return { format, stage, direction, plan };
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

  if (subcommand === 'graph') {
    if (isHelpArg(rest[0])) {
      printPlanGraphUsage('stdout');
      return;
    }
    const options = parsePlanGraphOptions(rest);
    try {
      const graph = buildPlanGraph({ root: process.cwd(), stage: options.stage, direction: options.direction, plan: options.plan });
      for (const warning of graph.warnings) console.error(`WARN ${warning}`);
      if (options.format === 'json') {
        console.log(JSON.stringify(graph, null, 2));
      } else if (options.format === 'mermaid') {
        process.stdout.write(renderPlanGraphMermaid(graph));
      } else {
        process.stdout.write(renderPlanGraphAscii(graph));
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

  if (subcommand === 'stats') {
    if (isHelpArg(rest[0])) {
      printPlanStatsUsage('stdout');
      return;
    }
    let json = false;
    for (const flag of rest) {
      if (flag === '--json') json = true;
      else {
        console.error(`Unknown option for plan stats: ${flag}`);
        printPlanStatsUsage();
        process.exit(2);
      }
    }
    try {
      const stats = computePlanStats(process.cwd());
      if (json) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log(formatPlanStats(stats));
      }
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

function printCompareUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]', stream);
}

function compareCommand(args: string[]): void {
  if (isHelpArg(args[0])) {
    printCompareUsage('stdout');
    return;
  }
  const attemptA = args[0];
  const attemptB = args[1];
  if (!attemptA || !attemptB) {
    printCompareUsage();
    process.exit(2);
  }
  let json = false;
  let outPath: string | undefined;
  const rest = args.slice(2);
  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    switch (flag) {
      case '--json':
        json = true;
        break;
      case '--output':
      case '--out': {
        const value = rest[i + 1];
        if (!value || value.startsWith('--')) {
          console.error(`Missing value for ${flag}`);
          printCompareUsage();
          process.exit(2);
        }
        outPath = value;
        i += 1;
        break;
      }
      default:
        console.error(`Unknown option for compare: ${flag}`);
        printCompareUsage();
        process.exit(2);
    }
  }

  try {
    const comparison = compareBareAttempts(attemptA, attemptB);
    const rendered = json ? renderAttemptComparisonJson(comparison) : renderAttemptComparisonMarkdown(comparison);
    if (outPath) {
      const resolvedOut = resolve(outPath);
      writeFileSync(resolvedOut, rendered, 'utf8');
      console.log(`Wrote attempt comparison: ${resolvedOut}`);
    } else {
      process.stdout.write(rendered.endsWith('\n') ? rendered : `${rendered}\n`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
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

function printTraceUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc trace <plan-slug> [--json] [--include-unverified]', stream);
}

interface TraceCommandOptions {
  slug: string;
  json: boolean;
  includeUnverified: boolean;
}

function parseTraceOptions(args: string[]): TraceCommandOptions {
  const slug = args[0];
  if (!slug || slug.startsWith('--')) {
    console.error('Missing required argument: plan-slug');
    printTraceUsage();
    process.exit(2);
  }
  const options: TraceCommandOptions = { slug, json: false, includeUnverified: false };
  for (let i = 1; i < args.length; i += 1) {
    const flag = args[i];
    switch (flag) {
      case '--json':
        options.json = true;
        break;
      case '--include-unverified':
        options.includeUnverified = true;
        break;
      default:
        console.error(`Unknown option for trace: ${flag}`);
        printTraceUsage();
        process.exit(2);
    }
  }
  return options;
}

function traceCommand(args: string[]): void {
  if (isHelpArg(args[0])) {
    printTraceUsage('stdout');
    return;
  }
  const options = parseTraceOptions(args);
  try {
    const report = buildTrace(process.cwd(), options.slug, { includeUnverified: options.includeUnverified });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      process.stdout.write(formatTraceReport(report));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(error instanceof TraceUsageError ? 2 : 1);
  }
}

function printVerifyUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc verify [--evidence-chain [--plan <slug>] [--json] [--strict]]', stream);
}

interface VerifyCommandOptions {
  evidenceChain: boolean;
  plan?: string;
  json: boolean;
  strict: boolean;
}

function parseVerifyOptions(args: string[]): VerifyCommandOptions {
  const options: VerifyCommandOptions = { evidenceChain: false, json: false, strict: false };
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    switch (flag) {
      case '--evidence-chain':
        options.evidenceChain = true;
        break;
      case '--plan': {
        const value = args[i + 1];
        if (!value || value.startsWith('--')) {
          console.error('Missing value for --plan');
          printVerifyUsage();
          process.exit(2);
        }
        options.plan = value;
        i += 1;
        break;
      }
      case '--json':
        options.json = true;
        break;
      case '--strict':
        options.strict = true;
        break;
      default:
        console.error(`Unknown option for verify: ${flag}`);
        printVerifyUsage();
        process.exit(2);
    }
  }
  if (!options.evidenceChain && options.json) {
    console.error('--json is only supported with --evidence-chain');
    printVerifyUsage();
    process.exit(2);
  }
  if (!options.evidenceChain && (options.plan || options.strict)) {
    console.error('--plan and --strict are only supported with --evidence-chain');
    printVerifyUsage();
    process.exit(2);
  }
  return options;
}

function verifyCommand(args: string[]): void {
  if (isHelpArg(args[0])) {
    printVerifyUsage('stdout');
    return;
  }
  const options = parseVerifyOptions(args);
  if (options.evidenceChain) {
    try {
      const report = verifyEvidenceChain(process.cwd(), { plan: options.plan });
      if (options.json) {
        console.log(JSON.stringify(report.plans, null, 2));
      } else {
        process.stdout.write(formatEvidenceChainReport(report, { strict: options.strict }));
      }
      const exitCode = evidenceChainExitCode(report, { strict: options.strict });
      if (exitCode !== 0) process.exit(exitCode);
      return;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

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
}

function printDoctorUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage(
    'Usage: osc doctor [--fix] [--dry-run] [--severity <info|warn|error>] [--check <status-alignment|changelog-gap|paired-view|stale-plan|release-readme>]',
    stream,
  );
}

function parseDoctorOptions(args: string[]): DoctorOptions {
  const options: DoctorOptions = {};
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    switch (flag) {
      case '--fix':
        options.fix = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--severity': {
        const value = args[i + 1];
        if (!value || value.startsWith('--') || !['info', 'warn', 'error'].includes(value)) {
          console.error('Missing or invalid value for --severity. Expected info, warn, or error.');
          printDoctorUsage();
          process.exit(2);
        }
        options.severity = value as DoctorSeverity;
        i += 1;
        break;
      }
      case '--check': {
        const value = args[i + 1];
        const check = value ? parseDoctorCheckName(value) : null;
        if (!value || value.startsWith('--') || !check) {
          console.error('Missing or invalid value for --check.');
          printDoctorUsage();
          process.exit(2);
        }
        options.check = check;
        i += 1;
        break;
      }
      default:
        console.error(`Unknown option for doctor: ${flag}`);
        printDoctorUsage();
        process.exit(2);
    }
  }
  return options;
}

function doctorCommand(args: string[]): void {
  if (isHelpArg(args[0])) {
    printDoctorUsage('stdout');
    return;
  }
  const options = parseDoctorOptions(args);
  try {
    const result = runDoctor(process.cwd(), options);
    process.stdout.write(formatDoctorReport(result, options));
    const exitCode = doctorExitCode(result, options);
    if (exitCode !== 0) process.exit(exitCode);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
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

function printStartUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage(`Usage: osc start <plan-slug-or-path> --runtime <${START_RUNTIMES.join('|')}>

Prints a paste-ready agent handoff prompt. It does not spawn a runtime, create .osc/runs artifacts, commit, push, or open a PR.`, stream);
}

function takeStartValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${flag}`);
    printStartUsage();
    process.exit(2);
  }
  return value;
}

function startCommand(args: string[]): void {
  if (isHelpArg(args[0])) {
    printStartUsage('stdout');
    return;
  }
  const planReference = requireArg(args, 'plan-slug-or-path');
  let runtime: ReturnType<typeof parseStartRuntime> = null;
  const rest = args.slice(1);
  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    switch (flag) {
      case '--runtime':
        runtime = parseStartRuntime(takeStartValue(rest, i, flag));
        if (!runtime) {
          console.error(`Invalid value for --runtime. Expected one of: ${START_RUNTIMES.join(', ')}`);
          process.exit(2);
        }
        i += 1;
        break;
      default:
        console.error(`Unknown option for start: ${flag}`);
        printStartUsage();
        process.exit(2);
    }
  }
  if (!runtime) {
    console.error(`Missing required option: --runtime <${START_RUNTIMES.join('|')}>`);
    printStartUsage();
    process.exit(2);
  }
  try {
    process.stdout.write(renderStartPrompt(planReference, { runtime, cwd: process.cwd() }).prompt);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function printDispatchUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage(`Usage: osc dispatch <run-json> --adapter <adapter-id>

Invokes an explicit trusted adapter for an existing run packet, captures adapter stdout/stderr logs, and prints receipt/evidence paths. Open Scaffold core does not auto-install adapters or grant commit/push/merge/publish authority.`, stream);
}

function takeDispatchValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${flag}`);
    printDispatchUsage();
    process.exit(2);
  }
  return value;
}

function dispatchCommand(args: string[]): void {
  if (isHelpArg(args[0])) {
    printDispatchUsage('stdout');
    return;
  }
  const runJson = requireArg(args, 'run-json');
  let adapterId: string | undefined;
  const rest = args.slice(1);
  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    switch (flag) {
      case '--adapter':
        adapterId = takeDispatchValue(rest, i, flag);
        i += 1;
        break;
      default:
        console.error(`Unknown option for dispatch: ${flag}`);
        printDispatchUsage();
        process.exit(2);
    }
  }
  if (!adapterId) {
    console.error('Missing required option: --adapter <adapter-id>');
    printDispatchUsage();
    process.exit(2);
  }
  try {
    const result = runDispatch(runJson, { adapterId }, process.cwd());
    const root = findScaffoldRoot(dirname(result.runPacketPath)) ?? process.cwd();
    process.stdout.write(formatDispatchSummary(result, root));
    if (result.exitStatus !== 0) process.exit(1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof DispatchUsageError) process.exit(2);
    process.exit(1);
  }
}

function printWorkUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage(`Usage: osc work <task-description> --runtime <preset> --dry-run [--json] [--adapter <adapter-id>]

Options:
  --runtime <preset>          Runtime preset to preview: codex | omx | omc | plain | human | custom | project profile
  --workflow <workflow>       Optional workflow override: interview | plan | team | loop | execute | goal | custom
  --adapter <adapter-id>      Optional dispatch adapter id for the preview command
  --dry-run                   Required: print plan/run/dispatch preview without writing files or launching runtimes
  --json                      Print machine-readable dry-run JSON`, stream);
}

function takeWorkValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${flag}`);
    printWorkUsage();
    process.exit(2);
  }
  return value;
}

function isSafeWorkAdapterId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) && !value.includes('..');
}

function formatUnsafeWorkValue(value: string): string {
  return JSON.stringify(value.trim());
}

function workCommand(args: string[]): void {
  if (isHelpArg(args[0])) {
    printWorkUsage('stdout');
    return;
  }
  const intentParts: string[] = [];
  const options: RunArtifactOptions = { commitPolicy: 'no commit/push/PR/merge/publish/deploy unless explicitly approved by the operator' };
  let adapterId: string | undefined;
  let dryRun = false;
  let json = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      switch (arg) {
        case '--runtime':
          options.runtime = takeWorkValue(args, i, arg) as RuntimePreset;
          i += 1;
          break;
        case '--workflow':
          options.workflow = parseChoice(takeWorkValue(args, i, arg), RUNTIME_WORKFLOWS, arg) as RuntimeWorkflow;
          i += 1;
          break;
        case '--adapter': {
          const value = takeWorkValue(args, i, arg);
          if (!isSafeWorkAdapterId(value)) {
            console.error(`Unsafe adapter id: ${formatUnsafeWorkValue(value)}`);
            process.exit(2);
          }
          adapterId = value;
          i += 1;
          break;
        }
        case '--dry-run':
          dryRun = true;
          break;
        case '--json':
          json = true;
          break;
        default:
          console.error(`Unknown option for work: ${arg}`);
          printWorkUsage();
          process.exit(2);
      }
    } else {
      intentParts.push(arg);
    }
  }

  const intent = intentParts.join(' ').trim();
  if (!intent) {
    console.error('Missing required argument: task-description');
    printWorkUsage();
    process.exit(2);
  }
  if (!options.runtime) {
    console.error('Missing required option: --runtime <preset>');
    printWorkUsage();
    process.exit(2);
  }
  if (!dryRun) {
    console.error('osc work is preview-only in this release; pass --dry-run to print the plan/run/dispatch preview.');
    process.exit(2);
  }

  const root = findScaffoldRoot(process.cwd()) ?? process.cwd();
  applyRuntimeSelection(options, root);
  const preview = buildWorkDryRunPreview(root, intent, options, adapterId, process.cwd());
  if (json) {
    console.log(JSON.stringify(preview, null, 2));
  } else {
    process.stdout.write(formatWorkDryRunPreview(preview));
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

function printEvolutionUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc evolve init <run-or-plan> [--out <dir>] [--strategy <manual|greedy|tournament|novelty|map_elites|custom>] | osc evolve record <loop-dir> --run <run-packet> [--evaluation <evaluation-json>] [--receipt <dispatch-receipt.json>] [--evidence <path>]... --decision <promote|reject|retry|block> [--score <0..1>] --rationale <text> | osc evolve compare <loop-dir> [--a <attempt-id|run-id|frontier>] [--b <attempt-id|run-id|frontier>] [--format <terminal|markdown|json>] [--out <path>] | osc evolve check <loop-dir>', stream);
}

function takeEvolutionValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${flag}`);
    process.exit(2);
  }
  return value;
}

function parseEvolutionStrategy(value: string): EvolutionStrategy {
  if ((EVOLUTION_STRATEGIES as readonly string[]).includes(value)) return value as EvolutionStrategy;
  console.error(`Invalid value for --strategy: ${value}. Expected one of: ${EVOLUTION_STRATEGIES.join(', ')}`);
  printEvolutionUsage();
  process.exit(2);
}

function parseEvolutionDecision(value: string): EvolutionDecision {
  if ((EVOLUTION_DECISIONS as readonly string[]).includes(value)) return value as EvolutionDecision;
  console.error(`Invalid value for --decision: ${value}. Expected one of: ${EVOLUTION_DECISIONS.join(', ')}`);
  printEvolutionUsage();
  process.exit(2);
}

function parseEvolutionCompareFormat(value: string): EvolutionCompareFormat {
  if (value === 'terminal' || value === 'markdown' || value === 'json') return value;
  console.error(`Invalid value for --format: ${value}. Expected one of: terminal, markdown, json`);
  printEvolutionUsage();
  process.exit(2);
}

function evolutionRootFor(path: string): string {
  return findScaffoldRoot(path) ?? findScaffoldRoot(process.cwd()) ?? process.cwd();
}

function evolutionCommand(args: string[]): void {
  const [subcommand, sourceOrPath, ...rest] = args;
  if (subcommand === undefined || isHelpArg(subcommand)) {
    printEvolutionUsage('stdout');
    return;
  }

  if (subcommand === 'init') {
    if (!sourceOrPath) {
      printEvolutionUsage();
      process.exit(2);
    }
    let outPath: string | null = null;
    let strategy: EvolutionStrategy = 'manual';
    for (let i = 0; i < rest.length; i += 1) {
      const flag = rest[i];
      switch (flag) {
        case '--out':
        case '--output':
          outPath = takeEvolutionValue(rest, i, flag);
          i += 1;
          break;
        case '--strategy':
          strategy = parseEvolutionStrategy(takeEvolutionValue(rest, i, flag));
          i += 1;
          break;
        default:
          console.error(`Unknown option for evolve init: ${flag}`);
          printEvolutionUsage();
          process.exit(2);
      }
    }
    try {
      const sourcePath = resolve(sourceOrPath);
      const root = evolutionRootFor(dirname(sourcePath));
      const outDir = outPath ? resolve(outPath) : '';
      const result = writeEvolutionLoop(sourcePath, outDir, root, { strategy });
      console.log(`Created evolution loop: ${result.loopDir}`);
      console.log(`  Loop: ${result.loopPath}`);
      console.log(`  Attempts: ${result.attemptsPath}`);
      console.log(`  Frontier: ${result.frontierPath}`);
      console.log('Note: this records loop state only; Open Scaffold core does not spawn runtimes, rank models, certify compliance, or approve release.');
      return;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  if (subcommand === 'record') {
    if (!sourceOrPath) {
      printEvolutionUsage();
      process.exit(2);
    }
    let runPath: string | null = null;
    let evaluationPath: string | undefined;
    const receiptPaths: string[] = [];
    const evidencePaths: string[] = [];
    let decision: EvolutionDecision | null = null;
    let score: number | undefined;
    let rationale = '';
    for (let i = 0; i < rest.length; i += 1) {
      const flag = rest[i];
      switch (flag) {
        case '--run':
          runPath = takeEvolutionValue(rest, i, flag);
          i += 1;
          break;
        case '--evaluation':
          evaluationPath = takeEvolutionValue(rest, i, flag);
          i += 1;
          break;
        case '--receipt':
          receiptPaths.push(takeEvolutionValue(rest, i, flag));
          i += 1;
          break;
        case '--evidence':
          evidencePaths.push(takeEvolutionValue(rest, i, flag));
          i += 1;
          break;
        case '--decision':
          decision = parseEvolutionDecision(takeEvolutionValue(rest, i, flag));
          i += 1;
          break;
        case '--score': {
          const raw = takeEvolutionValue(rest, i, flag);
          score = Number(raw);
          if (!Number.isFinite(score)) {
            console.error(`Invalid value for --score: ${raw}. Expected a number between 0 and 1.`);
            process.exit(2);
          }
          i += 1;
          break;
        }
        case '--rationale':
          rationale = takeEvolutionValue(rest, i, flag);
          i += 1;
          break;
        default:
          console.error(`Unknown option for evolve record: ${flag}`);
          printEvolutionUsage();
          process.exit(2);
      }
    }
    if (!runPath) {
      console.error('Missing required option for evolve record: --run <run-packet>');
      process.exit(2);
    }
    if (!decision) {
      console.error('Missing required option for evolve record: --decision <promote|reject|retry|block>');
      process.exit(2);
    }
    try {
      const loopDir = resolve(sourceOrPath);
      const root = evolutionRootFor(loopDir);
      const absoluteRunPath = resolve(runPath);
      const absoluteEvaluationPath = evaluationPath ? resolve(evaluationPath) : undefined;
      const absoluteReceiptPaths = receiptPaths.map((receiptPath) => resolve(receiptPath));
      const absoluteEvidencePaths = evidencePaths.map((evidencePath) => resolve(evidencePath));
      const result = recordEvolutionAttempt(loopDir, {
        runPath: absoluteRunPath,
        evaluationPath: absoluteEvaluationPath,
        receiptPaths: absoluteReceiptPaths,
        evidencePaths: absoluteEvidencePaths,
        decision,
        score,
        rationale,
      }, root);
      console.log(`Recorded evolution attempt: ${String(result.attempt.attempt_id)}`);
      if (result.frontierUpdated) console.log(`Updated frontier: ${String(result.attempt.attempt_id)}`);
      console.log('Note: this recorded an attempt decision only; scorer output is evidence, not automatic approval.');
      return;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  if (subcommand === 'compare') {
    if (!sourceOrPath) {
      printEvolutionUsage();
      process.exit(2);
    }
    let a: string | undefined;
    let b: string | undefined;
    let format: EvolutionCompareFormat = 'terminal';
    let outPath: string | undefined;
    for (let i = 0; i < rest.length; i += 1) {
      const flag = rest[i];
      switch (flag) {
        case '--a':
          a = takeEvolutionValue(rest, i, flag);
          i += 1;
          break;
        case '--b':
          b = takeEvolutionValue(rest, i, flag);
          i += 1;
          break;
        case '--format':
          format = parseEvolutionCompareFormat(takeEvolutionValue(rest, i, flag));
          i += 1;
          break;
        case '--out':
        case '--output':
          outPath = takeEvolutionValue(rest, i, flag);
          i += 1;
          break;
        default:
          console.error(`Unknown option for evolve compare: ${flag}`);
          printEvolutionUsage();
          process.exit(2);
      }
    }
    try {
      const loopDir = resolve(sourceOrPath);
      const root = evolutionRootFor(loopDir);
      const comparison = compareEvolutionLoop(loopDir, { a, b }, root);
      const rendered = renderEvolutionComparison(comparison, format);
      if (outPath) {
        const resolvedOut = resolve(outPath);
        writeFileSync(resolvedOut, rendered, 'utf8');
        console.log(`Wrote evolution comparison: ${resolvedOut}`);
      } else {
        process.stdout.write(rendered.endsWith('\n') ? rendered : `${rendered}\n`);
      }
      return;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  if (subcommand === 'check') {
    if (!sourceOrPath) {
      printEvolutionUsage();
      process.exit(2);
    }
    if (rest.length > 0) {
      console.error(`Unknown option for evolve check: ${rest[0]}`);
      printEvolutionUsage();
      process.exit(2);
    }
    const loopDir = resolve(sourceOrPath);
    const root = evolutionRootFor(loopDir);
    const result = validateEvolutionLoopDir(loopDir, root);
    for (const failure of result.failures) {
      console.error(`FAIL ${failure.code}: ${failure.message}${failure.path ? ` (${failure.path})` : ''}`);
    }
    for (const warning of result.warnings) {
      console.warn(`WARN ${warning.code}: ${warning.message}${warning.path ? ` (${warning.path})` : ''}`);
    }
    if (!result.ok) process.exit(1);
    console.log(`PASS evolution loop structure valid; ${result.warnings.length} warning(s)`);
    console.log('Note: this check validates curated loop state only; it does not execute attempts, rank models, certify compliance, or approve release.');
    return;
  }

  printEvolutionUsage();
  process.exit(2);
}

function printMetricsUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage(`Usage: osc metrics [--json] [--since <date>] [--lookback <weeks>] [--table] [--verbose]

Options:
  --json              Print a single machine-readable JSON object
  --since <date>      Include only plans created on or after the date; supports YYYY-MM-DD, ISO 8601, "30 days ago", and "last month"
  --lookback <weeks>  Close-velocity lookback window in weeks (default: 12)
  --table             Force human-readable output even when --json is present
  --verbose           Include per-plan slug, stage, age, evidence, and approval details`, stream);
}

function takeMetricsValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${flag}`);
    process.exit(2);
  }
  return value;
}

function metricsCommand(args: string[]): void {
  if (isHelpArg(args[0])) {
    printMetricsUsage('stdout');
    return;
  }

  let json = false;
  let table = false;
  let verbose = false;
  let since: Date | undefined;
  let lookbackWeeks: number | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    switch (flag) {
      case '--json':
        json = true;
        break;
      case '--table':
        table = true;
        break;
      case '--verbose':
        verbose = true;
        break;
      case '--since':
        try {
          since = parseSinceDate(takeMetricsValue(args, i, flag));
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
          process.exit(2);
        }
        i += 1;
        break;
      case '--lookback': {
        const raw = takeMetricsValue(args, i, flag);
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          console.error(`Invalid value for --lookback: ${raw}. Expected a positive number of weeks.`);
          process.exit(2);
        }
        lookbackWeeks = parsed;
        i += 1;
        break;
      }
      default:
        console.error(`Unknown option for metrics: ${flag}`);
        printMetricsUsage();
        process.exit(2);
    }
  }

  try {
    const metrics = computeMetrics({ root: process.cwd(), since, lookbackWeeks, verbose });
    if (json && !table) console.log(JSON.stringify(metrics, null, 2));
    else console.log(formatMetrics(metrics, { verbose }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function printStudyUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage(`Usage: osc study [--json] [--since <date>] [--out <path>]

Computes source-labeled, observational evidence signals for the methodology's value
hypotheses from this repository's own committed git history and .osc/ artifacts.
Read-only and offline: it makes no network calls and imputes no numbers. See
docs/EVIDENCE_METHODOLOGY.md for the protocol.

Options:
  --json            Print the machine-readable study report (open-scaffold.study.v1)
  --since <date>    Restrict plans/commits to on or after the date; supports YYYY-MM-DD, ISO 8601, "30 days ago", "last month"
  --out <path>      Write the report to a file (markdown by default, JSON when --json is set) instead of stdout`, stream);
}

function studyCommand(args: string[]): void {
  if (isHelpArg(args[0])) {
    printStudyUsage('stdout');
    return;
  }

  let json = false;
  let since: Date | undefined;
  let out: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    switch (flag) {
      case '--json':
        json = true;
        break;
      case '--since':
        try {
          since = parseSinceDate(takeMetricsValue(args, i, flag));
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
          process.exit(2);
        }
        i += 1;
        break;
      case '--out':
        out = takeMetricsValue(args, i, flag);
        i += 1;
        break;
      default:
        console.error(`Unknown option for study: ${flag}`);
        printStudyUsage();
        process.exit(2);
    }
  }

  try {
    const report = computeStudy({ root: process.cwd(), since });
    const validation = validateStudyReport(report);
    if (!validation.ok) {
      console.error('Study report failed its own honesty checks:');
      for (const error of validation.errors) console.error(`  - ${error}`);
      process.exit(1);
    }
    const format: 'markdown' | 'json' = json ? 'json' : 'markdown';
    if (out) {
      const written = writeStudyOutput(report, out, format, process.cwd());
      console.log(`Wrote ${format} study report to ${written.path}`);
      return;
    }
    if (json) console.log(JSON.stringify(report, null, 2));
    else console.log(renderStudyMarkdown(report));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function printPrSummaryUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage(`Usage: osc pr-summary <plan-slug> [--format <markdown|json>]

Renders a read-only, reviewer-ready summary of a plan — goal, acceptance-criteria
checklist state, evidence-note status, plan-validation result, and open questions —
for mirroring into a pull request. Reuses the plan/evidence readers and the same
checks as \`osc plan validate\`; it makes no network calls and is never a source of
truth. A missing or unsafe plan reference renders an explicit "no plan found"
summary and still exits 0 so it cannot break a PR check.

Options:
  --format <markdown|json>   Output format (default: markdown). JSON emits the open-scaffold.pr_summary.v1 report.`, stream);
}

function prSummaryCommand(args: string[]): void {
  if (isHelpArg(args[0])) {
    printPrSummaryUsage('stdout');
    return;
  }
  const slug = requireArg(args, 'plan-slug');

  let format: 'markdown' | 'json' = 'markdown';
  for (let i = 1; i < args.length; i += 1) {
    const flag = args[i];
    switch (flag) {
      case '--format':
        format = parseChoice(takeMetricsValue(args, i, flag), ['markdown', 'json'] as const, '--format');
        i += 1;
        break;
      default:
        console.error(`Unknown option for pr-summary: ${flag}`);
        printPrSummaryUsage();
        process.exit(2);
    }
  }

  try {
    const report = computePrSummary(slug, { root: process.cwd() });
    if (format === 'json') console.log(JSON.stringify(report, null, 2));
    else console.log(renderPrSummaryMarkdown(report));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function printAbUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage(`Usage: osc ab check <path>

Read-only structural validator for an A/B comparison pilot packet (see
docs/AB_COMPARISON_PILOT.md). Pass the packet directory (containing
pre-registration.md and a raw-data .csv), or a single .md or .csv file.

It confirms the pre-registration has its required sections and commit-before-data
attestation, and that every raw-data row has a valid arm (A/B) and a source-labeled,
source-consistent value. It never writes, scores, or interprets data. Exit 0 when
well-formed, 1 when malformed. A pass means the instrument is well-formed — not that
any experiment was run or that the scaffold improves any outcome.`, stream);
}

function abCommand(args: string[]): void {
  const [subcommand, ...rest] = args;
  if (isHelpArg(subcommand) || subcommand === undefined) {
    printAbUsage('stdout');
    return;
  }
  if (subcommand !== 'check') {
    console.error(`Unknown subcommand for ab: ${subcommand}`);
    printAbUsage();
    process.exit(2);
  }
  if (isHelpArg(rest[0])) {
    printAbUsage('stdout');
    return;
  }
  const target = requireArg(rest, 'path');
  if (rest.length > 1) {
    console.error(`Unknown option for ab check: ${rest[1]}`);
    printAbUsage();
    process.exit(2);
  }
  const report = checkAbPacket(target, process.cwd());
  if (report.ok) {
    console.log(formatAbCheckReport(report));
  } else {
    console.error(formatAbCheckReport(report));
    process.exit(1);
  }
}

function printTaskUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage(`Usage: osc task new <title> [--priority <${TASK_PRIORITIES.join('|')}>] [--plan <slug>]
  osc task list [--status <${TASK_STATUSES.join('|')}>] [--priority <${TASK_PRIORITIES.join('|')}>] [--plan <slug>] [--json]
  osc task show <task-id>
  osc task claim|start|complete|cancel <task-id>
  osc task block <task-id> --reason <text>
  osc task comment <task-id> <comment>
  osc task link <task-id> --plan <slug>`, stream);
}

function takeTaskValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${flag}`);
    process.exit(2);
  }
  return value;
}

function exitForTaskError(error: unknown): never {
  console.error(error instanceof Error ? error.message : String(error));
  if (error instanceof TaskUsageError) process.exit(2);
  process.exit(1);
}

function taskCommand(args: string[]): void {
  const [subcommand, ...rest] = args;
  if (subcommand === undefined || isHelpArg(subcommand)) {
    printTaskUsage('stdout');
    return;
  }

  try {
    if (subcommand === 'new') {
      const title = requireArg(rest, 'title');
      let priority: string | undefined;
      let plan: string | undefined;
      for (let i = 1; i < rest.length; i += 1) {
        const flag = rest[i];
        switch (flag) {
          case '--priority':
            priority = takeTaskValue(rest, i, flag);
            i += 1;
            break;
          case '--plan':
            plan = takeTaskValue(rest, i, flag);
            i += 1;
            break;
          default:
            console.error(`Unknown option for task new: ${flag}`);
            printTaskUsage();
            process.exit(2);
        }
      }
      const task = createTask(title, { priority, plan }, process.cwd());
      console.log(`Created task ${task.id}: ${task.title}`);
      return;
    }

    if (subcommand === 'list') {
      let json = false;
      let status: string | undefined;
      let priority: string | undefined;
      let plan: string | undefined;
      for (let i = 0; i < rest.length; i += 1) {
        const flag = rest[i];
        switch (flag) {
          case '--json':
            json = true;
            break;
          case '--status':
            status = takeTaskValue(rest, i, flag);
            i += 1;
            break;
          case '--priority':
            priority = takeTaskValue(rest, i, flag);
            i += 1;
            break;
          case '--plan':
            plan = takeTaskValue(rest, i, flag);
            i += 1;
            break;
          default:
            console.error(`Unknown option for task list: ${flag}`);
            printTaskUsage();
            process.exit(2);
        }
      }
      const tasks = listTasks({ status, priority, plan }, process.cwd());
      if (json) console.log(JSON.stringify(tasks.map(taskToJson), null, 2));
      else process.stdout.write(formatTaskTable(tasks));
      return;
    }

    if (subcommand === 'show') {
      const id = requireArg(rest, 'task-id');
      if (rest.length > 1) {
        console.error(`Unknown option for task show: ${rest[1]}`);
        printTaskUsage();
        process.exit(2);
      }
      process.stdout.write(formatTaskDetails(getTaskDetails(id, process.cwd())));
      return;
    }

    if (subcommand === 'claim' || subcommand === 'start' || subcommand === 'complete' || subcommand === 'cancel') {
      const id = requireArg(rest, 'task-id');
      if (rest.length > 1) {
        console.error(`Unknown option for task ${subcommand}: ${rest[1]}`);
        printTaskUsage();
        process.exit(2);
      }
      const nextStatus: TaskStatus = subcommand === 'complete' ? 'done' : subcommand === 'cancel' ? 'cancelled' : 'in-progress';
      const task = transitionTask(id, nextStatus, {}, process.cwd());
      console.log(`${task.id} is now ${task.status}`);
      return;
    }

    if (subcommand === 'block') {
      const id = requireArg(rest, 'task-id');
      let reason: string | undefined;
      for (let i = 1; i < rest.length; i += 1) {
        const flag = rest[i];
        if (flag === '--reason') {
          reason = takeTaskValue(rest, i, flag);
          i += 1;
        } else {
          console.error(`Unknown option for task block: ${flag}`);
          printTaskUsage();
          process.exit(2);
        }
      }
      if (!reason) {
        console.error('Missing required option: --reason <text>');
        process.exit(2);
      }
      const task = transitionTask(id, 'blocked', { reason }, process.cwd());
      console.log(`${task.id} is now ${task.status}`);
      return;
    }

    if (subcommand === 'comment') {
      const id = requireArg(rest, 'task-id');
      const body = rest.slice(1).join(' ').trim();
      if (!body) {
        console.error('Missing required argument: comment');
        process.exit(2);
      }
      addTaskComment(id, body, process.cwd());
      console.log(`Added comment to ${id.toUpperCase()}`);
      return;
    }

    if (subcommand === 'link') {
      const id = requireArg(rest, 'task-id');
      let plan: string | undefined;
      for (let i = 1; i < rest.length; i += 1) {
        const flag = rest[i];
        if (flag === '--plan') {
          plan = takeTaskValue(rest, i, flag);
          i += 1;
        } else {
          console.error(`Unknown option for task link: ${flag}`);
          printTaskUsage();
          process.exit(2);
        }
      }
      if (!plan) {
        console.error('Missing required option: --plan <slug>');
        process.exit(2);
      }
      const task = linkTaskPlan(id, plan, process.cwd());
      console.log(`Linked ${task.id} to plan ${task.plan}`);
      return;
    }
  } catch (error) {
    exitForTaskError(error);
  }

  console.error(`Unknown task subcommand: ${subcommand}`);
  printTaskUsage();
  process.exit(2);
}

function runtimes(args: string[]): void {
  const [subcommand, ...rest] = args;
  if (subcommand === 'list') {
    const json = rest.includes('--json');
    const unknown = rest.find((arg) => arg !== '--json');
    if (unknown) {
      console.error(`Unknown option for runtimes list: ${unknown}`);
      console.error('Usage: osc runtimes list [--json]');
      process.exit(2);
    }
    try {
      const entries = loadRuntimeProfiles(process.cwd());
      if (json) {
        console.log(JSON.stringify(entries.map((entry) => ({
          id: entry.profile.id,
          source: entry.source,
          path: entry.path ?? null,
          lane: entry.profile.lane,
          status: entry.profile.status,
          displayName: entry.profile.displayName,
        })), null, 2));
      } else {
        for (const entry of entries) {
          console.log(`${entry.profile.id}\t${entry.source}\t${entry.profile.lane}\t${entry.profile.status}\t${entry.profile.displayName}`);
        }
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }
  if (subcommand === 'show') {
    const [id] = rest;
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
  console.error('Usage: osc runtimes list [--json] | osc runtimes show <id>');
  process.exit(2);
}

interface WebDashboardOptions {
  mode: 'web' | 'serve';
  out?: string;
  port?: number;
  open: boolean;
}

function printWebDashboardUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage('Usage: osc dashboard --web [--out <path>] | osc dashboard --serve [--port <port>] [--open]', stream);
}

function takeWebDashboardValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${flag}`);
    printWebDashboardUsage();
    process.exit(2);
  }
  return value;
}

function parseWebDashboardOptions(args: string[]): WebDashboardOptions {
  let mode: 'web' | 'serve' | undefined;
  let out: string | undefined;
  let port: number | undefined;
  let open = false;

  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    switch (flag) {
      case '--web':
        if (mode && mode !== 'web') {
          console.error('Choose either --web or --serve, not both.');
          printWebDashboardUsage();
          process.exit(2);
        }
        mode = 'web';
        break;
      case '--serve':
        if (mode && mode !== 'serve') {
          console.error('Choose either --web or --serve, not both.');
          printWebDashboardUsage();
          process.exit(2);
        }
        mode = 'serve';
        break;
      case '--out':
        out = takeWebDashboardValue(args, i, flag);
        i += 1;
        break;
      case '--port': {
        const raw = takeWebDashboardValue(args, i, flag);
        const parsed = Number.parseInt(raw, 10);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
          console.error(`Invalid value for --port: ${raw}. Expected a port between 0 and 65535.`);
          process.exit(2);
        }
        port = parsed;
        i += 1;
        break;
      }
      case '--open':
        open = true;
        break;
      default:
        console.error(`Unknown option for dashboard: ${flag}`);
        printWebDashboardUsage();
        process.exit(2);
    }
  }

  if (!mode) {
    console.error('Missing required option: --web or --serve');
    printWebDashboardUsage();
    process.exit(2);
  }
  if (mode === 'web' && port !== undefined) {
    console.error('--port is only supported with --serve');
    process.exit(2);
  }
  if (mode === 'web' && open) {
    console.error('--open is only supported with --serve');
    process.exit(2);
  }
  if (mode === 'serve' && out) {
    console.error('--out is only supported with --web');
    process.exit(2);
  }

  return { mode, out, port, open };
}

function isWebDashboardInvocation(args: string[]): boolean {
  return args.some((arg) => ['--web', '--serve', '--out', '--port', '--open'].includes(arg));
}

async function webDashboardCommand(args: string[]): Promise<void> {
  if (args.length === 0 || isHelpArg(args[0])) {
    printWebDashboardUsage('stdout');
    return;
  }
  const options = parseWebDashboardOptions(args);
  try {
    if (options.mode === 'web') {
      const result = writeWebDashboard({ root: process.cwd(), out: options.out });
      const relativePath = relative(process.cwd(), result.path);
      console.log(`Generated web dashboard: ${relativePath.startsWith('..') ? result.path : relativePath}`);
      console.log(`Bytes: ${result.bytes}`);
      return;
    }

    const handle = await serveDashboard({ root: process.cwd(), port: options.port });
    console.log(`Serving Open Scaffold dashboard at ${handle.url}`);
    if (options.open) openDashboardUrl(handle.url);
    process.once('SIGINT', () => {
      handle.close()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function printCockpitUsage(stream: 'stdout' | 'stderr' = 'stderr'): void {
  printUsage(`Usage: osc cockpit config
  osc cockpit test [--dry-run]
  osc cockpit post --event <${COCKPIT_EVENT_TYPES.join('|')}> [--message <text>] [--run-id <id>] [--plan <slug>] [--task-id <id>] [--pr <url>] [--evidence-path <path>] [--dry-run]`, stream);
}

function takeCockpitValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new CockpitUsageError(`Missing value for ${flag}`);
  }
  return value;
}

function parseCockpitPostOptions(args: string[]): CockpitPostOptions {
  let event: CockpitEventType | undefined;
  let message: string | undefined;
  let runId: string | undefined;
  let planSlug: string | undefined;
  let taskId: string | undefined;
  let pr: string | undefined;
  let evidencePath: string | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    switch (flag) {
      case '--event':
        event = parseChoice(takeCockpitValue(args, i, flag), COCKPIT_EVENT_TYPES, flag) as CockpitEventType;
        i += 1;
        break;
      case '--message':
        message = takeCockpitValue(args, i, flag);
        i += 1;
        break;
      case '--run-id':
        runId = takeCockpitValue(args, i, flag);
        i += 1;
        break;
      case '--plan':
        planSlug = takeCockpitValue(args, i, flag);
        i += 1;
        break;
      case '--task-id':
        taskId = takeCockpitValue(args, i, flag);
        i += 1;
        break;
      case '--pr':
        pr = takeCockpitValue(args, i, flag);
        i += 1;
        break;
      case '--evidence-path':
        evidencePath = takeCockpitValue(args, i, flag);
        i += 1;
        break;
      case '--dry-run':
        dryRun = true;
        break;
      default:
        throw new CockpitUsageError(`Unknown option for cockpit post: ${flag}`);
    }
  }
  if (!event) throw new CockpitUsageError(`Missing required option: --event <${COCKPIT_EVENT_TYPES.join('|')}>`);
  return { event, message, runId, planSlug, taskId, pr, evidencePath, dryRun };
}

function parseCockpitTestOptions(args: string[]): { dryRun: boolean } {
  let dryRun = false;
  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true;
    else throw new CockpitUsageError(`Unknown option for cockpit test: ${arg}`);
  }
  return { dryRun };
}

async function cockpitCommand(args: string[]): Promise<void> {
  const [subcommand, ...rest] = args;
  if (subcommand === undefined || isHelpArg(subcommand)) {
    printCockpitUsage('stdout');
    return;
  }

  try {
    if (subcommand === 'config') {
      if (rest.length > 0) throw new CockpitUsageError(`Unknown option for cockpit config: ${rest[0]}`);
      process.stdout.write(formatCockpitConfig(loadCockpitConfig(process.cwd())));
      return;
    }

    if (subcommand === 'test') {
      const options = parseCockpitTestOptions(rest);
      const summary = await postCockpitEvent({ event: 'status', message: 'Open Scaffold cockpit test message.', dryRun: options.dryRun, testMode: true }, process.cwd());
      process.stdout.write(formatCockpitDispatchSummary(summary));
      if (hasCockpitDispatchFailures(summary)) process.exit(1);
      return;
    }

    if (subcommand === 'post') {
      const options = parseCockpitPostOptions(rest);
      const summary = await postCockpitEvent(options, process.cwd());
      process.stdout.write(formatCockpitDispatchSummary(summary));
      if (hasCockpitDispatchFailures(summary)) process.exit(1);
      return;
    }
  } catch (error) {
    if (error instanceof CockpitUsageError) {
      console.error(error.message);
      printCockpitUsage();
      process.exit(2);
    }
    if (error instanceof CockpitConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  console.error(`Unknown cockpit subcommand: ${subcommand}`);
  printCockpitUsage();
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
    case '-v':
    case '--version':
    case 'version':
      console.log(packageVersion());
      return;
    case 'init':
      init(args);
      return;
    case 'status':
      await status(args);
      return;
    case 'dashboard':
      if (isWebDashboardInvocation(args)) {
        await webDashboardCommand(args);
      } else {
        await dashboardCommand(args);
      }
      return;
    case 'task':
      taskCommand(args);
      return;
    case 'plan':
      await planCommand(args);
      return;
    case 'amend':
      amendCommand(args);
      return;
    case 'delegate':
    case 'run':
      createArtifacts(args, command);
      return;
    case 'dispatch':
      dispatchCommand(args);
      return;
    case 'work':
      workCommand(args);
      return;
    case 'compare':
      compareCommand(args);
      return;
    case 'trace':
      traceCommand(args);
      return;
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
    case 'evolve':
      evolutionCommand(args);
      return;
    case 'mcp': {
      const exitCode = await runMcpCommand(args, process.cwd());
      if (exitCode !== 0) process.exit(exitCode);
      return;
    }
    case 'metrics':
      metricsCommand(args);
      return;
    case 'study':
      studyCommand(args);
      return;
    case 'pr-summary':
      prSummaryCommand(args);
      return;
    case 'ab':
      abCommand(args);
      return;
    case 'cockpit':
      await cockpitCommand(args);
      return;
    case 'evidence':
      evidenceCommand(args);
      return;
    case 'close':
      closeCommand(args);
      return;
    case 'start':
      startCommand(args);
      return;
    case 'verify':
      verifyCommand(args);
      return;
    case 'doctor':
      doctorCommand(args);
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
