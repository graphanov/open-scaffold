#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRunArtifacts, type ArtifactMode, type ExecutorLane, type OperatorSurface, type RunArtifactOptions, type RuntimePreset, type RuntimeWorkflow } from './artifacts.js';
import { loadEvaluationSource, renderEvaluationEnvelope, validateEvaluationEnvelopeFile, writeEvaluationEnvelope } from './evaluation.js';
import { initializeScaffold, scaffoldTiers, type ScaffoldTier } from './init.js';
import { loadRuntimeProfiles, resolveRuntimeProfile } from './runtimes.js';
import { inspectScaffold, parsePlanFile, planToJson } from './scaffold.js';
import { validateScaffold } from './validation.js';

function printHelp(): void {
  console.log(`osc — Open Scaffold CLI

Usage:
  osc init --tier <min|standard|max> --target <dir> [--force]
  osc init --min|--standard|--max --target <dir> [--force]
  osc status [--json]
  osc plan <plan-path>
  osc delegate <plan-path> [run binding options]
  osc run <plan-path> [run binding options]
  osc review <plan-path> [run binding options]
  osc ultrareview <plan-path> [run binding options]
  osc eval init <run-or-plan> [--out <path>]
  osc eval check <evaluation-path>
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

function parseRunOptions(args: string[]): { planPathArg: string; options: RunArtifactOptions } {
  const planPathArg = requireArg(args, 'plan-path');
  const rest = args.slice(1);
  const options: RunArtifactOptions = {};

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
      default:
        console.error(`Unknown option for run artifacts: ${flag}`);
        printHelp();
        process.exit(2);
    }
  }

  applyRuntimeSelection(options, options.repo ? resolve(options.repo) : process.cwd());
  return { planPathArg, options };
}

function parseInitOptions(args: string[]): { tier: ScaffoldTier; target: string; force: boolean } {
  let tier: ScaffoldTier | undefined;
  let target: string | undefined;
  let force = false;

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
  return { tier, target, force };
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

function createArtifacts(args: string[], mode: ArtifactMode): void {
  const { planPathArg, options } = parseRunOptions(args);
  const planPath = resolve(planPathArg);
  if (!existsSync(planPath)) {
    console.error(`Plan not found: ${planPath}`);
    process.exit(1);
  }
  const plan = parsePlanFile(planPath);
  const run = createRunArtifacts(process.cwd(), plan, mode, options);
  console.log(`Created ${mode} artifacts:`);
  console.log(`  Run: ${run.runDir}`);
  console.log(`  Manifest: ${run.manifestPath}`);
  for (const prompt of run.promptPaths) console.log(`  Prompt: ${prompt}`);
  console.log('  Note: generic open-scaffold did not spawn a runtime; dispatch via your coordinator or harness adapter.');
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

function main(): void {
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
    case 'plan': {
      const planPath = resolve(requireArg(args, 'plan-path'));
      console.log(JSON.stringify(planToJson(parsePlanFile(planPath)), null, 2));
      return;
    }
    case 'delegate':
    case 'run':
    case 'review':
    case 'ultrareview':
      createArtifacts(args, command);
      return;
    case 'eval':
      evalCommand(args);
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

main();
