#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderStartPrompt, parseStartRuntime, START_RUNTIMES } from './start.js';
import { renderAuditManifest, validateAuditManifestFile, writeAuditManifest, type AuditArtifactInput } from './audit.js';
import { createRunArtifacts, previewRunArtifacts, type ArtifactMode, type ExecutorLane, type RunArtifactOptions, type RuntimeWorkflow } from './artifacts.js';
import { AdapterTrustError, checkAdapterTrust, formatAdapterTrustStatus, formatTrustedAdapterList, listTrustedAdapters, trustAdapter } from './adapter-trust.js';
import { COCKPIT_EVENT_TYPES, CockpitConfigError, CockpitUsageError, formatCockpitConfig, formatCockpitDispatchSummary, hasCockpitDispatchFailures, loadCockpitConfig, postCockpitEvent, type CockpitEventType, type CockpitPostOptions } from './cockpit.js';
import { compareBareAttempts, compareProofManifest, renderAttemptComparisonJson, renderAttemptComparisonMarkdown, renderProofComparison, validateProofManifestFile, type ProofRenderFormat } from './compare.js';
import { DispatchUsageError, formatDispatchSummary, runDispatch } from './dispatch.js';
import { collectEvidence } from './evidence.js';
import { evidenceChainExitCode, formatEvidenceChainReport, verifyEvidenceChain } from './evidence-chain.js';
import { EVOLUTION_DECISIONS, EVOLUTION_STRATEGIES, analyzeEvolutionLoop, compareEvolutionLoop, recordEvolutionAttempt, renderEvolutionAnalysis, renderEvolutionComparison, validateEvolutionLoopDir, writeEvolutionLoop, type EvolutionAnalysisFormat, type EvolutionCompareFormat, type EvolutionDecision, type EvolutionStrategy } from './evolution.js';
import { measureEvolutionAnalysisEfficiency, renderEvolutionEfficiencyReport } from './evolution-efficiency.js';
import { askInteractiveFirstRun, formatFirstRunResult, runFirstRun } from './first-run.js';
import { initializeScaffold, scaffoldTiers, type ScaffoldTier } from './init.js';
import { runMcpCommand } from './mcp-server.js';
import { scanPublicFilesForSecrets } from './redaction.js';
import { computePrCheck, renderPrCheckMarkdown } from './pr-check.js';
import { computePrSummary, renderPrSummaryMarkdown } from './pr-summary.js';
import { loadRuntimeProfiles, resolveRuntimeProfile } from './runtimes.js';
import { closePlan, createEvidenceNoteSkeleton, createPlanAmendment, createPlanSkeleton, findScaffoldRoot, inspectScaffold, listPlanTemplates, movePlan, parsePlanFile, planToJson, PLAN_CREATION_STAGES, type PlanCreationStage } from './scaffold.js';
import { renderSchemaDetail, renderSchemaList, schemaById, SCHEMA_REGISTRY } from './schema-registry.js';
import { buildTrace, formatTraceReport, TraceUsageError } from './trace.js';
import { validateScaffold } from './validation.js';
import { formatPlanValidationIssues, hasBlockingIssues, resolvePlanValidationPath, validatePlanFile } from './plan-validate.js';

function rootPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const candidates = [join(here, '..', 'package.json'), join(process.cwd(), 'package.json')];
    for (const path of candidates) {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as { version?: string };
      if (parsed.version) return parsed.version;
    }
  } catch {}
  return '0.0.0';
}

function help(): string {
  return `osc — Open Scaffold CLI

MISSION.md → plan → run packet/amendment → evidence → verification → close
Command maturity: stable day-one/day-two commands first; lab and advanced commands are labeled. Removed lab/advanced surfaces are listed separately as migration breadcrumbs.

First-read demo:
  osc first-run --non-interactive --slug <slug> --mission <text> --goal <text>
  osc init --tier <min|standard|max> --target <dir> [--force]
  osc init --from-existing --tier min --target <dir> [--force]
  osc init --min|--standard|--max --target <dir> [--force]
  osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]

Stable core protocol:
  osc status [--json]
  osc plan <plan-path>
  osc plan new <slug> --stage <active|backlog|blocked> [--from-template <name>]
  osc plan new --from-template list
  osc plan validate <slug-or-path> [--json] [--strict]
  osc plan move <slug> --to <active|backlog|blocked>
  osc amend <plan-slug> [--message <text>]
  osc evidence new <slug>
  osc evidence collect <slug> [--ci] [--dry-run] [--verbose]
  osc close <plan-slug> [--message <text>]
  osc trace <plan-slug> [--json] [--include-unverified]
  osc verify [--evidence-chain [--plan <slug>] [--json] [--strict] [--online-github]]
  osc pr check <plan-slug> [--format <markdown|json>] [--online-github]
  osc schemas list [--json]
  osc schemas show <schema-id>

Handoff and run packages:
  osc start <plan-slug-or-path> --runtime <codex|omx|plain|human|custom>
  osc delegate <plan-path> [run binding options]
  osc run <plan-path> [--dry-run] [--json] [run binding options]
  osc dispatch <run-json> --adapter <adapter-id>
  osc review <plan-path> [run binding options]
  osc ultrareview <plan-path> [run binding options]
  osc adapter check <adapter-id>
  osc adapter trust <adapter-id>
  osc adapter list --trusted
  osc runtimes list [--json]
  osc runtimes show <id>

Lab and experimental:
  osc eval init <plan-path> [--out <path>]
  osc audit init <run-or-plan> [--artifact <role> <path>]... [--out <path>]
  osc audit check <audit-manifest-path>
  osc prove compare <manifest.json> [--format <terminal|markdown|json>] [--out <path>]
  osc prove check <manifest.json>
  osc evolve init <run-or-plan> [--out <dir>] [--strategy <manual|greedy|tournament|novelty|map_elites|custom>]
  osc evolve record <loop-dir> --run <run-packet> [--evaluation <evaluation-json>] [--receipt <dispatch-receipt.json>] [--evidence <path>]... --decision <promote|reject|retry|block> [--score <0..1>] --rationale <text> [--repair-hypothesis <text>] [--target-metric <name>] [--expected-gain <number>] [--actual-delta <number>] [--tokens-total <integer>] [--estimated-usd <number>] [--usage-source <source>] [--usage-unavailable-reason <text>]
  osc evolve compare <loop-dir> [--a <attempt-id|run-id|frontier>] [--b <attempt-id|run-id|frontier>] [--format <terminal|markdown|json>] [--out <path>]
  osc evolve analyze <loop-dir> [--format <terminal|markdown|json>] [--out <path>] [--plateau-threshold <n>]
  osc evolve check <loop-dir>
  osc cockpit config
  osc cockpit test [--dry-run]
  osc cockpit post --event <event> [--message <text>] [--run-id <id>] [--plan <slug>] [--task-id <id>] [--pr <url>] [--evidence-path <path>] [--dry-run]

Diagnostics and advanced:
  osc mcp serve [--repo <path>] [--allow-write] [--validate]
  osc doctor --check secret-scan

Removed/repositioned migration appendix (not live maintained commands):
  migration notes: docs/COMMAND_MATURITY.md
  removed/repositioned: osc plan wizard <slug> [--stage <active|backlog|blocked>] [--non-interactive --answers <answers.json>]
  removed/repositioned: osc plan graph [--format <ascii|mermaid|json>] [--stage <active|backlog|all>] [--direction <downstream|upstream|both>] [--plan <slug>]
  removed/repositioned: osc plan stats [--json]
  removed/repositioned: osc evidence compact <run-or-loop> [--evaluation <evaluation-json>] [--candidate-note <path>]... [--out <dir>] [--json]
  removed/repositioned: osc task new/list/show/claim/start/complete/cancel/block/comment/link
  removed/repositioned: osc eval import/check
  removed/repositioned: osc status --dashboard
  removed/repositioned: osc work, osc dashboard, osc metrics, osc study, osc ab, broad osc doctor checks, resume helpers
`;
}
function die(message: string, code = 2): never {
  console.error(message);
  process.exit(code);
}
function isHelp(args: string[]): boolean { return args[0] === '-h' || args[0] === '--help' || args[0] === 'help'; }
function value(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i >= 0) return args[i + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}
function requireValue(args: string[], flag: string): string { return value(args, flag) ?? die(`Missing ${flag}`); }
function values(args: string[], flag: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i += 1) if (args[i] === flag && args[i + 1]) out.push(args[++i]);
  return out;
}
function has(args: string[], flag: string): boolean { return args.includes(flag); }
function choice<T extends readonly string[]>(raw: string, allowed: T, label: string): T[number] {
  if ((allowed as readonly string[]).includes(raw)) return raw as T[number];
  die(`Invalid value for ${label}: ${raw}. Expected one of: ${allowed.join(', ')}`);
}
function positional(args: string[], valueFlags: string[]): string[] {
  const skip = new Set(valueFlags);
  const out: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (skip.has(arg)) { i += 1; continue; }
    if (arg.startsWith('--')) continue;
    out.push(arg);
  }
  return out;
}

function validateOptions(args: string[], valueFlags: string[], booleanFlags: string[], context: string): void {
  const valueSet = new Set(valueFlags);
  const booleanSet = new Set(booleanFlags);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const [flag, inlineValue] = arg.split('=', 2);
    if (valueSet.has(flag)) {
      if (arg.includes('=')) {
        if (!inlineValue) die(`Missing value for ${flag}`, 2);
        continue;
      }
      const next = args[i + 1];
      if (!next || next.startsWith('--')) die(`Missing value for ${flag}`, 2);
      i += 1;
      continue;
    }
    if (booleanSet.has(flag) && !arg.includes('=')) continue;
    die(`Unknown option for ${context}: ${flag}`, 2);
  }
}

function usage(message: string, stream: 'stdout' | 'stderr' = 'stderr'): void {
  if (stream === 'stdout') console.log(message);
  else console.error(message);
}
function isHelpArg(arg: string | undefined): boolean {
  return arg === '-h' || arg === '--help' || arg === 'help';
}
function requiredArg(args: string[], name: string): string {
  if (!args[0] || args[0].startsWith('--')) die(`Missing required argument: ${name}`);
  return args[0];
}
function relativeToCwd(path: string): string {
  const rel = relative(process.cwd(), path);
  return rel && !rel.startsWith('..') ? rel : path;
}
function scaffoldHelperError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  const usageLike = /^(Unsafe slug|Invalid value|Invalid plan stage|Use osc close|Unknown option|Missing value)/.test(message);
  die(message, usageLike ? 2 : 1);
}

function findRootWithPlans(start: string): string | null {
  let current = resolve(start);
  while (true) {
    if (existsSync(join(current, '.osc', 'plans'))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function printRunArtifactsUsage(mode: ArtifactMode, stream: 'stdout' | 'stderr' = 'stderr'): void {
  const dryRunOptions = mode === 'run' ? ' [--dry-run] [--json]' : '';
  usage(`Usage: osc ${mode} <plan-path>${dryRunOptions} [run binding options]

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
  --commit-policy <text>      Commit/push approval rule${mode === 'run' ? '\n\nDry-run options:\n  --dry-run                   Preview run artifacts without writing .osc/runs files\n  --json                      With --dry-run, print only machine-readable JSON' : ''}`, stream);
}

const OPERATOR_SURFACES = ['discord', 'slack', 'telegram', 'github', 'cli', 'none', 'custom'] as const;

function applyRuntimeSelection(options: RunArtifactOptions, root: string): void {
  if (!options.runtime) return;
  const profiles = loadRuntimeProfiles(root);
  const resolved = profiles.find((entry) => entry.profile.id === options.runtime) ?? null;
  if (!resolved) die(`Unknown runtime profile: ${options.runtime}. Available runtimes: ${profiles.map((entry) => entry.profile.id).join(', ') || '(none)'}`, 2);
  const { profile, source } = resolved;
  if (options.executor && options.executor !== profile.lane) die(`--runtime ${options.runtime} maps to executor ${profile.lane}, but --executor ${options.executor} was also provided`, 2);
  options.executor = profile.lane;
  options.runtimeProfileId = profile.id;
  options.runtimeProfileSource = source;
  if (!options.workflow && profile.defaults?.workflow) options.workflow = profile.defaults.workflow;
  if (!options.operatorSurface && profile.defaults?.operatorSurface) {
    if (!(OPERATOR_SURFACES as readonly string[]).includes(profile.defaults.operatorSurface)) die(`Runtime profile ${profile.id} has unsupported defaults.operatorSurface: ${profile.defaults.operatorSurface}`, 1);
    options.operatorSurface = profile.defaults.operatorSurface as RunArtifactOptions['operatorSurface'];
  }
  if (options.workflow) {
    const hasWorkflowMapping = Boolean(profile.workflows && Object.prototype.hasOwnProperty.call(profile.workflows, options.workflow));
    const expected = hasWorkflowMapping ? profile.workflows?.[options.workflow] : undefined;
    if (typeof expected === 'string') {
      if (options.harnessSkill && options.harnessSkill !== expected) die(`--runtime ${options.runtime} with --workflow ${options.workflow} requires --harness-skill ${expected}, got ${options.harnessSkill}`, 2);
      options.harnessSkill = expected;
    } else if (hasWorkflowMapping) {
      // explicit null mapping: supported workflow with no inferred harness skill
    } else if (profile.defaults?.harnessSkill && options.workflow === profile.defaults.workflow && !options.harnessSkill) {
      options.harnessSkill = profile.defaults.harnessSkill;
    } else if (profile.defaults?.harnessSkill && !options.harnessSkill) {
      die(`--runtime ${options.runtime} does not define workflow ${options.workflow}; provide --harness-skill explicitly or choose a supported workflow`, 2);
    }
  } else if (profile.defaults?.harnessSkill && !options.harnessSkill) {
    options.harnessSkill = profile.defaults.harnessSkill;
  }
}

const RUN_VALUE_FLAGS = ['--task-id','--source-ref','--runtime','--workflow','--executor','--harness-skill','--repo','--worktree','--branch','--operator-surface','--operator-thread','--issue','--pr','--commit-policy'];

function parseRunOptions(mode: ArtifactMode, args: string[]): { planPath: string; options: RunArtifactOptions; dryRun: boolean; json: boolean } {
  if (isHelpArg(args[0])) {
    printRunArtifactsUsage('run', 'stdout');
    process.exit(0);
  }
  validateOptions(args, RUN_VALUE_FLAGS, mode === 'run' ? ['--dry-run', '--json'] : [], mode);
  const [planPath] = positional(args, RUN_VALUE_FLAGS);
  if (!planPath) { printRunArtifactsUsage('run'); process.exit(2); }
  const workflow = value(args, '--workflow') as RuntimeWorkflow | undefined;
  const executor = value(args, '--executor') as ExecutorLane | undefined;
  const options: RunArtifactOptions = {
    taskId: value(args, '--task-id'),
    sourceRef: values(args, '--source-ref'),
    runtime: value(args, '--runtime'),
    workflow,
    executor,
    harnessSkill: value(args, '--harness-skill'),
    repo: value(args, '--repo'),
    worktree: value(args, '--worktree'),
    branch: value(args, '--branch'),
    operatorSurface: value(args, '--operator-surface') as RunArtifactOptions['operatorSurface'],
    operatorThread: value(args, '--operator-thread'),
    issue: value(args, '--issue'),
    pr: value(args, '--pr'),
    commitPolicy: value(args, '--commit-policy'),
  };
  try {
    applyRuntimeSelection(options, options.repo ? resolve(options.repo) : (findScaffoldRoot(dirname(resolve(planPath))) ?? process.cwd()));
  } catch (error) {
    if (error instanceof Error) die(error.message, /Unknown runtime profile|requires --harness-skill|does not define workflow|maps to executor/.test(error.message) ? 2 : 1);
    throw error;
  }
  return {
    planPath,
    dryRun: has(args, '--dry-run'),
    json: has(args, '--json'),
    options,
  };
}

function artifactsCommand(mode: ArtifactMode, args: string[]): void {
  if (isHelpArg(args[0])) { printRunArtifactsUsage(mode, 'stdout'); return; }
  const parsed = parseRunOptions(mode, args);
  const planPath = resolve(parsed.planPath);
  if (!existsSync(planPath)) die(`Plan not found: ${planPath}`, 1);
  const scaffoldRoot = findScaffoldRoot(dirname(planPath));
  const plan = parsePlanFile(planPath);
  const root = parsed.dryRun ? (scaffoldRoot ?? process.cwd()) : process.cwd();
  const options = { ...parsed.options, scaffoldRoot: scaffoldRoot ?? process.cwd() };
  if (parsed.dryRun) {
    const preview = previewRunArtifacts(root, plan, mode, options);
    const payload = { run: preview.manifest, packageMarkdown: preview.packageMarkdown, promptFiles: preview.promptFiles, filesToTouch: preview.filesToTouch };
    if (parsed.json) console.log(JSON.stringify(payload, null, 2));
    else {
      console.log('Dry-run run.json:');
      console.log(JSON.stringify(preview.manifest, null, 2));
      console.log('Dry-run package.md:');
      console.log(preview.packageMarkdown);
      console.log(`Would create run ${preview.runId} for ${preview.manifest.plan.slug} with executor ${preview.manifest.executor.lane ?? 'unspecified'}${preview.manifest.runtimeSelection.workflow ? `, workflow ${preview.manifest.runtimeSelection.workflow}` : ''}${preview.manifest.executor.harnessSkill ? `, harness skill ${preview.manifest.executor.harnessSkill}` : ''}.`);
      if (preview.filesToTouch.length) console.log(`Files to touch: ${preview.filesToTouch.join(', ')}`);
    }
    if (!preview.manifest.packageQuality.executable) process.exit(1);
    return;
  }
  if (parsed.json) die('--json is only supported with --dry-run for osc run');
  const result = createRunArtifacts(process.cwd(), plan, mode, options);
  console.log('Created run artifacts:');
  console.log(`  Run: ${resolve(result.runDir)}`);
  console.log(`  Manifest: ${resolve(result.manifestPath)}`);
  for (const prompt of result.promptPaths) console.log(`  Prompt: ${resolve(prompt)}`);
  console.log('  Note: generic open-scaffold did not spawn a runtime; dispatch via your coordinator or harness adapter.');
}

function initCommand(args: string[]): void {
  const initUsage = 'Usage: osc init --tier <min|standard|max> --target <dir> [--force]\n  osc init --from-existing --tier min --target <dir> [--force]\n  osc init --min|--standard|--max --target <dir> [--force]';
  if (isHelp(args)) { console.log(initUsage); return; }
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--tier' || arg === '--target') { i += 1; continue; }
    if (['--force', '--from-existing', '--min', '--standard', '--max'].includes(arg)) continue;
    if (arg.startsWith('--')) { console.error(`Unknown option for init: ${arg}`); console.error(initUsage); process.exit(2); }
  }
  const tierRaw = value(args, '--tier') ?? (has(args, '--min') ? 'min' : has(args, '--standard') ? 'standard' : has(args, '--max') ? 'max' : undefined);
  const tier = choice(tierRaw ?? die('Missing --tier'), scaffoldTiers, '--tier') as ScaffoldTier;
  const result = initializeScaffold({ tier, target: requireValue(args, '--target'), force: has(args, '--force'), fromExisting: has(args, '--from-existing') });
  console.log(result.summary);
}

async function firstRunCommand(args: string[]): Promise<void> {
  if (isHelpArg(args[0])) { console.log('Usage: osc first-run [--non-interactive --slug <slug> --mission <text> --goal <text>]'); return; }
  const options = has(args, '--non-interactive')
    ? { slug: requireValue(args, '--slug'), mission: requireValue(args, '--mission'), goal: requireValue(args, '--goal') }
    : await askInteractiveFirstRun();
  process.stdout.write(formatFirstRunResult(runFirstRun(options, process.cwd())));
}

function statusCommand(args: string[]): void {
  if (has(args, '--dashboard')) removed('status --dashboard');
  const unknown = args.find((arg) => arg !== '--json');
  if (unknown) die(`Unknown option for status: ${unknown}`, 2);
  const scaffold = inspectScaffold(process.cwd());
  const validation = validateScaffold(process.cwd());
  const summary = { mission: scaffold.mission.defined ? 'defined' : 'undefined', plans: Object.fromEntries(Object.entries(scaffold.plans).map(([stage, plans]) => [stage, plans.length])), failures: validation.failures.length, warnings: validation.warnings.length };
  if (has(args, '--json')) console.log(JSON.stringify({ scaffold, validation, summary }, null, 2));
  else console.log(`Mission: ${summary.mission}
Plans: ${JSON.stringify(summary.plans)}
Validation: ${summary.failures} failure(s), ${summary.warnings} warning(s)`);
}


function planCommand(args: string[]): void {
  if (args.length === 0 || isHelp(args)) { console.log('Usage: osc plan <plan-path> | osc plan new|validate|move ...'); return; }
  const sub = args[0];
  if (sub === 'new') {
    if (isHelpArg(args[1])) { console.log('Usage: osc plan new <slug> --stage <active|backlog|blocked> [--from-template <name>]'); return; }
    validateOptions(args.slice(1), ['--stage','--from-template'], [], 'plan new');
    if (args[1] === '--from-template' && args[2] === 'list') { for (const t of listPlanTemplates()) console.log(`${t.name}\t${t.path}`); return; }
    const slug = positional(args.slice(1), ['--stage','--from-template'])[0] ?? die('Usage: osc plan new <slug> --stage <active|backlog|blocked>');
    const stage = choice(requireValue(args, '--stage'), PLAN_CREATION_STAGES, '--stage') as PlanCreationStage;
    try {
      const created = createPlanSkeleton(slug, stage, process.cwd(), { templateName: value(args, '--from-template') });
      console.log(`Created plan: ${created.relativePath ?? relativeToCwd(created.path)}`);
      if (value(args, '--from-template')) console.log(`Template: ${value(args, '--from-template')}`);
      console.log('Next: review the template placeholders and replace angle-bracket prompts before implementation.');
    } catch (error) { scaffoldHelperError(error); }
    return;
  }
  if (sub === 'validate') {
    if (isHelpArg(args[1])) { console.log('Usage: osc plan validate <slug-or-path> [--json] [--strict]'); return; }
    const target = args[1] ?? die('Usage: osc plan validate <slug-or-path> [--json] [--strict]');
    const result = validatePlanFile(resolvePlanValidationPath(target), { strict: has(args, '--strict') });
    if (has(args, '--json')) console.log(JSON.stringify(result.issues, null, 2));
    else console.log(formatPlanValidationIssues(result.issues) || 'Plan validation passed.');
    if (hasBlockingIssues(result.issues, has(args, '--strict'))) process.exit(1);
    return;
  }
  if (sub === 'move') {
    if (isHelpArg(args[1])) { console.log('Usage: osc plan move <slug> --to <active|backlog|blocked>'); return; }
    const slug = args[1] ?? die('Usage: osc plan move <slug> --to <active|backlog|blocked>');
    const unknown = args.slice(2).filter((arg, index, arr) => arg !== '--to' && arr[index - 1] !== '--to');
    if (unknown.length) die(`Unknown option for plan move: ${unknown[0]}`);
    const rawTo = requireValue(args, '--to');
    if (rawTo === 'done') die('Use osc close to move plans to done.', 2);
    try {
      const moved = movePlan(slug, choice(rawTo, PLAN_CREATION_STAGES, '--to') as PlanCreationStage);
      console.log(`Moved plan: ${moved.slug ?? slug}`);
      console.log(`From: ${moved.fromStage}`);
      console.log(`To: ${moved.toStage}`);
    } catch (error) { scaffoldHelperError(error); }
    return;
  }
  if (['wizard', 'stats', 'graph'].includes(sub)) removed(`plan ${sub}`);
  const plan = parsePlanFile(resolve(sub));
  console.log(JSON.stringify(planToJson(plan), null, 2));
}

function lifecycleCommand(kind: 'amend' | 'close', args: string[]): void {
  if (isHelp(args)) { console.log(`Usage: osc ${kind} <plan-slug> [--message <text>]`); return; }
  const slug = args[0] ?? die(`Usage: osc ${kind} <plan-slug> [--message <text>]`);
  const message = value(args, '--message') ?? '';
  const unknown = args.slice(1).filter((arg, index, arr) => arg !== '--message' && arr[index - 1] !== '--message');
  if (unknown.length) die(`Unknown option for ${kind}: ${unknown[0]}`);
  try {
    if (kind === 'amend') {
      const result = createPlanAmendment(slug, process.cwd(), message);
      console.log(`Created amendment: ${result.relativePath ?? relativeToCwd(result.path)}`);
      if (result.changelogStamped) console.log('Stamped: MISSION.md changelog');
      console.log('Next: fill in the TODO sections in the amendment, then verify and commit.');
    } else {
      const result = closePlan(slug, process.cwd(), message);
      if (result.alreadyDone) { console.log(`Plan ${result.slug}.md is already in done/.`); return; }
      console.log(`Closed: ${result.slug}`);
      console.log(`Moved to done/: ${result.movedFiles.join(', ')}`);
      if (result.changelogStamped) console.log('Stamped: MISSION.md changelog');
    }
  } catch (error) {
    scaffoldHelperError(error);
  }
}

function evidenceCommand(args: string[]): void {
  if (args.length === 0 || isHelp(args)) { console.log('Usage: osc evidence new <slug> | osc evidence collect <slug> [--ci] [--dry-run] [--verbose]'); return; }
  const sub = args[0];
  if (sub === 'compact') removed('evidence compact');
  if ((sub === 'new' || sub === 'collect') && isHelpArg(args[1])) { console.log(`Usage: osc evidence ${sub} <slug>${sub === 'collect' ? ' [--ci] [--dry-run] [--verbose]' : ''}`); return; }
  const slug = args[1] ?? die('Usage: osc evidence new|collect <slug>');
  if (sub === 'new') {
    try {
      const result = createEvidenceNoteSkeleton(slug, process.cwd());
      console.log(`Created evidence note: ${result.relativePath ?? relativeToCwd(result.path)}`);
      console.log('Next: replace every TODO with verified evidence before closing the plan.');
    } catch (error) { scaffoldHelperError(error); }
  }
  else if (sub === 'collect') {
    try {
      const result = collectEvidence(slug, process.cwd(), { ci: has(args, '--ci'), dryRun: has(args, '--dry-run'), verbose: has(args, '--verbose') });
      if (has(args, '--dry-run')) {
        console.log(result.block);
        console.log('No files were written. Re-run without --dry-run to append this block.');
      } else {
        console.log(`Collected evidence: ${result.relativePath}`);
        console.log(`Appended timestamped block for ${result.slug}.`);
        if (has(args, '--verbose')) console.log(result.block);
      }
    } catch (error) { scaffoldHelperError(error); }
  } else die('Usage: osc evidence new|collect <slug>');
}

function verifyCommand(args: string[]): void {
  const verifyUsage = 'Usage: osc verify [--evidence-chain [--plan <slug>] [--json] [--strict] [--online-github]]';
  if (isHelpArg(args[0])) { console.log(verifyUsage); return; }
  if (!has(args, '--evidence-chain') && has(args, '--json')) { console.error('--json is only supported with --evidence-chain'); console.error(verifyUsage); process.exit(2); }
  if (!has(args, '--evidence-chain') && (has(args, '--strict') || has(args, '--plan'))) { console.error('--plan and --strict are only supported with --evidence-chain'); console.error(verifyUsage); process.exit(2); }
  if (has(args, '--evidence-chain')) {
    const report = verifyEvidenceChain(process.cwd(), { plan: value(args, '--plan'), onlineGithub: has(args, '--online-github') || has(args, '--github-online') });
    if (has(args, '--json')) console.log(JSON.stringify(report.plans, null, 2)); else process.stdout.write(formatEvidenceChainReport(report, { strict: has(args, '--strict') }));
    process.exit(evidenceChainExitCode(report, { strict: has(args, '--strict') }));
  }
  const result = validateScaffold(process.cwd());
  console.log(result.failures.length === 0 ? 'Scaffold verification passed.' : result.failures.map((f) => f.message).join('\n'));
  if (result.failures.length > 0) process.exit(1);
}

function traceCommand(args: string[]): void {
  if (isHelpArg(args[0])) { console.log('Usage: osc trace <plan-slug> [--json] [--include-unverified]'); return; }
  const slug = args[0] ?? die('Missing required argument: plan-slug');
  for (const flag of args.slice(1)) if (flag !== '--json' && flag !== '--include-unverified') die(`Unknown option for trace: ${flag}`, 2);
  try {
    const report = buildTrace(process.cwd(), slug, { includeUnverified: has(args, '--include-unverified') });
    if (has(args, '--json')) console.log(JSON.stringify(report, null, 2)); else console.log(formatTraceReport(report));
  } catch (error) { if (error instanceof TraceUsageError) die(error.message); throw error; }
}

function startCommand(args: string[]): void {
  const plan = args[0] ?? die('Usage: osc start <plan-slug-or-path> --runtime <codex|omx|plain|human|custom>');
  const runtime = parseStartRuntime(requireValue(args, '--runtime')) ?? die(`Invalid --runtime. Expected ${START_RUNTIMES.join('|')}`);
  const result = renderStartPrompt(plan, { runtime, cwd: process.cwd() });
  console.log(result.prompt);
}

function adapterCommand(args: string[]): void {
  const sub = args[0];
  try {
    if (sub === 'list' && has(args, '--trusted')) console.log(formatTrustedAdapterList(listTrustedAdapters()));
    else if (sub === 'check') console.log(formatAdapterTrustStatus(checkAdapterTrust(args[1] ?? die('Usage: osc adapter check <adapter-id>'))));
    else if (sub === 'trust') {
      const id = args[1] ?? die('Usage: osc adapter trust <adapter-id>');
      const status = trustAdapter(id);
      console.log(`Trusted adapter: ${status.adapterId}`);
      console.log(formatAdapterTrustStatus(status));
    }
    else die('Usage: osc adapter check|trust <adapter-id> | osc adapter list --trusted');
  } catch (error) {
    if (error instanceof AdapterTrustError) die(error.message, 2);
    throw error;
  }
}

function dispatchCommand(args: string[]): void {
  const runPacket = args[0] ?? die('Usage: osc dispatch <run-json> --adapter <adapter-id> [--allow-full-env]');
  try {
    const adapterId = value(args, '--adapter') ?? die('Missing required option: --adapter <adapter-id>', 2);
    const result = runDispatch(runPacket, { adapterId, allowFullEnv: has(args, '--allow-full-env') });
    console.log(formatDispatchSummary(result, process.cwd()));
    if (result.exitStatus !== 0 || result.timedOut) process.exit(1);
  } catch (error) { if (error instanceof DispatchUsageError || error instanceof AdapterTrustError) die(error.message, 2); throw error; }
}

function compareCommand(args: string[]): void {
  if (isHelpArg(args[0])) { console.log('Usage: osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]'); return; }
  const [a, b] = positional(args, ['--output','--out']);
  if (!a || !b) die('Usage: osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]');
  const comparison = compareBareAttempts(a, b);
  const output = has(args, '--json') ? renderAttemptComparisonJson(comparison) : renderAttemptComparisonMarkdown(comparison);
  const out = value(args, '--output') ?? value(args, '--out');
  if (out) {
    const resolvedOut = resolve(out);
    writeFileSync(resolvedOut, output);
    console.log(`Wrote attempt comparison: ${resolvedOut}`);
  } else process.stdout.write(output.endsWith('\n') ? output : `${output}\n`);
}

function prSummaryCommand(args: string[]): void {
  if (isHelpArg(args[0])) { console.log('Usage: osc pr-summary <plan-slug> [--format <markdown|json>]'); return; }
  const slug = args[0] ?? die('Missing required argument: plan-slug');
  const format = value(args, '--format') ?? 'markdown';
  if (!['markdown', 'json'].includes(format)) die(`Invalid value for --format: ${format}. Expected one of: markdown, json`);
  const report = computePrSummary(slug);
  if (format === 'json') console.log(JSON.stringify(report, null, 2)); else console.log(renderPrSummaryMarkdown(report));
}
function prCommand(args: string[]): void {
  if (isHelpArg(args[0])) { console.log('Usage: osc pr check <plan-slug> [--format <markdown|json>] [--online-github]'); return; }
  if (args[0] !== 'check') die('Usage: osc pr check <plan-slug> [--format <markdown|json>] [--online-github]');
  const slug = requiredArg(args.slice(1), 'plan-slug');
  const format = value(args, '--format') ?? 'markdown';
  if (!['markdown', 'json'].includes(format)) die(`Invalid value for --format: ${format}. Expected one of: markdown, json`);
  const report = computePrCheck(slug, { onlineGithub: has(args, '--online-github') || has(args, '--github-online') });
  if (format === 'json') console.log(JSON.stringify(report, null, 2)); else console.log(renderPrCheckMarkdown(report));
}

function auditCommand(args: string[]): void {
  const sub = args[0] ?? die('Usage: osc audit init|check ...');
  if (sub === 'init') {
    const source = args[1] ?? die('Usage: osc audit init <run-or-plan> [--artifact <role> <path>]... [--out <path>]');
    const artifacts: AuditArtifactInput[] = [];
    for (let i = 0; i < args.length; i += 1) if (args[i] === '--artifact') artifacts.push({ role: args[i + 1] ?? die('Missing artifact role'), path: args[i + 2] ?? die('Missing artifact path') });
    const out = value(args, '--out') ?? value(args, '--output');
    const auditRoot = findRootWithPlans(dirname(resolve(source))) ?? findRootWithPlans(process.cwd()) ?? process.cwd();
    const manifest = renderAuditManifest(resolve(source), artifacts, auditRoot);
    if (!out) { process.stdout.write(manifest); return; }
    const absoluteOut = resolve(out);
    if (existsSync(absoluteOut) && !has(args, '--force')) die(`Refusing to overwrite existing audit manifest: ${absoluteOut}`, 1);
    if (has(args, '--force') && existsSync(absoluteOut)) writeFileSync(absoluteOut, manifest, 'utf8');
    else writeAuditManifest(resolve(source), artifacts, absoluteOut, auditRoot);
    console.log(`Created audit manifest: ${absoluteOut}`);
    console.log('Note: this is a local digest-integrity manifest only; it does not certify correctness, compliance, approval, runtime execution, model quality, or external anchoring.');
  } else if (sub === 'check') {
    if (args.length > 2) { console.error(`Unknown option for audit check: ${args[2]}`); console.error('Usage: osc audit init <run-or-plan> [--artifact <role> <path>]... [--out <path>] | osc audit check <audit-manifest-path>'); process.exit(2); }
    const manifestPath = resolve(args[1] ?? die('Usage: osc audit check <audit-manifest-path>'));
    const auditRoot = findRootWithPlans(dirname(manifestPath)) ?? findRootWithPlans(process.cwd()) ?? process.cwd();
    const result = validateAuditManifestFile(manifestPath, auditRoot);
    for (const failure of result.failures) console.error(`FAIL ${failure.code}: ${failure.message}${failure.path ? ` (${failure.path})` : ''}`);
    for (const warning of result.warnings) console.warn(`WARN ${warning.code}: ${warning.message}${warning.path ? ` (${warning.path})` : ''}`);
    if (result.failures.length > 0) process.exit(1);
    let artifactCount = 0;
    try {
      const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as { artifacts?: unknown[] };
      artifactCount = Array.isArray(parsed.artifacts) ? parsed.artifacts.length : 0;
    } catch {}
    console.log(`PASS audit manifest structure/digests valid; ${artifactCount} artifact(s); ${result.warnings.length} warning(s)`);
    console.log('Note: this check validates local artifact presence and sha256 digest consistency only; it does not judge correctness, compliance, approval, runtime execution, model quality, or external anchoring.');
  } else die('Usage: osc audit init|check ...');
}

function proofCommand(args: string[]): void {
  const sub = args[0] ?? die('Usage: osc prove compare|check <manifest.json>');
  if (isHelpArg(sub)) { console.log('Usage: osc prove compare <manifest.json> [--format <terminal|markdown|json>] [--out <path>]\n  osc prove check <manifest.json>'); return; }
  if (sub === 'compare') {
    validateOptions(args.slice(1), ['--format','--out','--output'], [], 'prove compare');
    const proofArgs = positional(args.slice(1), ['--format','--out','--output']);
    if (proofArgs.length !== 1) die('Usage: osc prove compare <manifest.json> [--format <terminal|markdown|json>] [--out <path>]', 2);
    const manifestPath = proofArgs[0], format = (value(args, '--format') ?? 'terminal') as ProofRenderFormat, out = value(args, '--out') ?? value(args, '--output');
    if (!['terminal', 'markdown', 'json'].includes(format)) die(`Invalid value for --format: ${format}. Expected one of: terminal, markdown, json`, 2);
    const output = renderProofComparison(compareProofManifest(manifestPath), format);
    if (out) { writeFileSync(resolve(out), output); console.log(`Wrote proof comparison: ${resolve(out)}`); } else process.stdout.write(output); return;
  }
  if (sub === 'check') {
    validateOptions(args.slice(1), [], [], 'prove check');
    const proofArgs = positional(args.slice(1), []);
    if (proofArgs.length !== 1) die('Usage: osc prove check <manifest.json>', 2);
    const validation = validateProofManifestFile(proofArgs[0]);
    for (const issue of [...validation.failures, ...validation.warnings]) (issue.level === 'fail' ? console.error : console.warn)(`${issue.level.toUpperCase()} ${issue.code}: ${issue.message}${issue.path ? ` (${issue.path})` : ''}`);
    if (validation.failures.length > 0) process.exit(1);
    console.log(`PASS proof comparison manifest valid; ${validation.warnings.length} warning(s)`); console.log('Note: this validates source-labeled receipts only; it does not spawn Codex, rank models, certify correctness, or prove universal superiority.'); return;
  }
  die('Usage: osc prove compare|check <manifest.json>', 2);
}

function evolveCommand(args: string[]): void {
  const sub = args[0] ?? die('Usage: osc evolve init|record|compare|analyze|check');
  if (isHelpArg(sub)) { console.log('Usage: osc evolve init|record|compare|analyze|check <args>'); return; }
  if (sub === 'init') {
    const source = args[1] ?? die('Usage: osc evolve init <run-or-plan> [--out <dir>] [--strategy <manual|greedy>]');
    const rawStrategy = value(args, '--strategy') ?? 'manual';
    if (!(EVOLUTION_STRATEGIES as readonly string[]).includes(rawStrategy)) {
      console.error(`Invalid value for --strategy: ${rawStrategy}`);
      usage('Usage: osc evolve init <run-or-plan> [--out <dir>] [--strategy <manual|greedy|tournament|novelty|map_elites|custom>]');
      process.exit(2);
    }
    const strategy = rawStrategy as EvolutionStrategy;
    const sourcePath = resolve(source);
    const root = findRootWithPlans(dirname(sourcePath)) ?? findScaffoldRoot(dirname(sourcePath)) ?? process.cwd();
    const result = writeEvolutionLoop(sourcePath, value(args, '--out') ?? value(args, '--output') ?? '', root, { strategy });
    console.log(`Created evolution loop: ${result.loopDir}`);
    console.log('Boundary: Open Scaffold records loop metadata only; it does not spawn a runtime or rank models.');
  } else if (sub === 'record') {
    const loopDir = args[1] ?? die('Usage: osc evolve record <loop-dir> --run <run-packet> --decision <promote|reject|retry|block> --rationale <text>');
    const decision = choice(requireValue(args, '--decision'), EVOLUTION_DECISIONS, '--decision') as EvolutionDecision;
    const loopAbs = resolve(loopDir);
    const root = findRootWithPlans(loopAbs) ?? findScaffoldRoot(loopAbs) ?? process.cwd();
    const resolveFromCwd = (path: string | undefined) => path ? resolve(path) : undefined;
    const result = recordEvolutionAttempt(loopAbs, { runPath: resolve(requireValue(args, '--run')), evaluationPath: resolveFromCwd(value(args, '--evaluation')), receiptPaths: values(args, '--receipt').map((path) => resolve(path)), evidencePaths: values(args, '--evidence').map((path) => resolve(path)), decision, score: value(args, '--score') ? Number(value(args, '--score')) : undefined, rationale: value(args, '--rationale') ?? '', repairHypothesis: value(args, '--repair-hypothesis') ? { hypothesis: value(args, '--repair-hypothesis')!, targetMetric: value(args, '--target-metric'), expectedGain: value(args, '--expected-gain') ? Number(value(args, '--expected-gain')) : undefined, actualDelta: value(args, '--actual-delta') ? Number(value(args, '--actual-delta')) : undefined } : undefined, usage: value(args, '--tokens-total') || value(args, '--estimated-usd') || value(args, '--usage-source') || value(args, '--usage-unavailable-reason') ? { totalTokens: value(args, '--tokens-total') ? Number(value(args, '--tokens-total')) : undefined, estimatedUsd: value(args, '--estimated-usd') ? Number(value(args, '--estimated-usd')) : undefined, source: value(args, '--usage-source') ?? 'manual', unavailableReason: value(args, '--usage-unavailable-reason') } : undefined }, root);
    console.log(`Recorded evolution attempt: ${String(result.attempt.attempt_id ?? result.attempt.id ?? 'unknown')}`);
    if (result.frontierUpdated) console.log(`Updated frontier: ${String(result.attempt.attempt_id ?? result.attempt.id ?? 'unknown')}`);
  } else if (sub === 'compare') {
    const format = (value(args, '--format') ?? 'terminal') as EvolutionCompareFormat;
    const output = renderEvolutionComparison(compareEvolutionLoop(args[1] ?? die('Usage: osc evolve compare <loop-dir>'), { a: value(args, '--a'), b: value(args, '--b') }, process.cwd()), format);
    const out = value(args, '--out') ?? value(args, '--output');
    if (out) { writeFileSync(resolve(out), output); console.log(`Wrote evolution comparison: ${resolve(out)}`); }
    else process.stdout.write(output);
  } else if (sub === 'analyze') {
    const format = (value(args, '--format') ?? 'terminal') as EvolutionAnalysisFormat;
    const analysis = analyzeEvolutionLoop(args[1] ?? die('Usage: osc evolve analyze <loop-dir>'), { plateauThreshold: value(args, '--plateau-threshold') ? Number(value(args, '--plateau-threshold')) : undefined }, process.cwd());
    const output = has(args, '--efficiency')
      ? renderEvolutionEfficiencyReport(measureEvolutionAnalysisEfficiency(analysis), format)
      : renderEvolutionAnalysis(analysis, format, { compact: has(args, '--compact') });
    const out = value(args, '--out') ?? value(args, '--output');
    if (out) { writeFileSync(resolve(out), output); console.log(`Wrote evolution analysis: ${resolve(out)}`); }
    else process.stdout.write(output);
  } else if (sub === 'check') {
    const loopDir = args[1] ?? die('Usage: osc evolve check <loop-dir>');
    const loopAbs = resolve(loopDir);
    const result = validateEvolutionLoopDir(loopAbs, findRootWithPlans(loopAbs) ?? process.cwd());
    for (const failure of result.failures) console.error(`FAIL ${failure.code}: ${failure.message}${failure.path ? ` (${failure.path})` : ''}`);
    for (const warning of result.warnings) console.warn(`WARN ${warning.code}: ${warning.message}${warning.path ? ` (${warning.path})` : ''}`);
    if (result.failures.length > 0) process.exit(1);
    console.log(`PASS evolution loop structure valid; ${result.warnings.length} warning(s)`);
    console.log('Note: this validates local loop structure only; it does not execute attempts, rank models, certify compliance, or approve release.');
  } else die('Usage: osc evolve init|record|compare|analyze|check');
}

async function cockpitCommand(args: string[]): Promise<void> {
  const sub = args[0] ?? die('Usage: osc cockpit config|test|post');
  try {
    if (isHelpArg(sub)) { console.log(`Usage: osc cockpit config\n  osc cockpit test [--dry-run]\n  osc cockpit post --event <${COCKPIT_EVENT_TYPES.join('|')}> [--message <text>] [--run-id <id>] [--plan <slug>] [--task-id <id>] [--pr <url>] [--evidence-path <path>] [--dry-run]`); return; }
    if (sub === 'config') console.log(formatCockpitConfig(loadCockpitConfig(process.cwd())));
    else if (sub === 'test') {
      const summary = await postCockpitEvent({ event: 'status', message: 'Open Scaffold cockpit test message.', dryRun: has(args, '--dry-run'), testMode: true }, process.cwd());
      console.log(formatCockpitDispatchSummary(summary));
      if (hasCockpitDispatchFailures(summary)) process.exit(1);
    } else if (sub === 'post') {
      const event = choice(requireValue(args, '--event'), COCKPIT_EVENT_TYPES, '--event') as CockpitEventType;
      const options: CockpitPostOptions = { event, message: value(args, '--message'), runId: value(args, '--run-id'), planSlug: value(args, '--plan'), taskId: value(args, '--task-id'), pr: value(args, '--pr'), evidencePath: value(args, '--evidence-path'), dryRun: has(args, '--dry-run') };
      const summary = await postCockpitEvent(options, process.cwd());
      console.log(formatCockpitDispatchSummary(summary));
      if (hasCockpitDispatchFailures(summary)) process.exit(1);
    } else die('Usage: osc cockpit config|test|post');
  } catch (error) { if (error instanceof CockpitUsageError || error instanceof CockpitConfigError) die(error.message); throw error; }
}

function schemasCommand(args: string[]): void {
  if (args[0] === 'list') {
    if (has(args, '--json')) console.log(JSON.stringify(SCHEMA_REGISTRY, null, 2));
    else console.log(renderSchemaList());
  }
  else if (args[0] === 'show') console.log(renderSchemaDetail(schemaById(args[1] ?? die('Usage: osc schemas show <schema-id>')) ?? (() => die('Unknown schema id'))()));
  else die('Usage: osc schemas list | osc schemas show <schema-id>');
}

function doctorCommand(args: string[]): void {
  if (isHelpArg(args[0])) { console.log('Usage: osc doctor --check secret-scan'); return; }
  validateOptions(args, ['--check'], [], 'doctor');
  const check = value(args, '--check');
  if (check && check !== 'secret-scan') die(`Unknown doctor check: ${check}`, 2);
  const findings = scanPublicFilesForSecrets(process.cwd());
  if (findings.length === 0) { console.log('PASS secret-scan: no obvious token/webhook strings found.'); return; }
  console.log(`FAIL secret-scan: ${findings.length} potential secret(s) found.`);
  for (const finding of findings) console.log(`- ${finding.path}:${finding.line}: ${finding.detail}`);
  process.exit(1);
}
function evalCommand(args: string[]): void {
  const sub = args[0];
  if (sub === 'import' || sub === 'check') removed(`eval ${sub}`);
  if (sub !== 'init') die('Usage: osc eval init <plan-path> [--out <path>]', 2);
  const source = args[1] ?? die('Usage: osc eval init <plan-path> [--out <path>]', 2);
  const sourcePath = resolve(source);
  const root = findRootWithPlans(dirname(sourcePath)) ?? process.cwd();
  const relSource = relative(root, sourcePath).split('\\').join('/');
  const isPlanFile = /^\.osc\/plans\/(active|backlog|blocked|done)\/[^/]+\.md$/.test(relSource)
    && !/-amendment-\d+\.md$/.test(relSource);
  if (!sourcePath.endsWith('.md') || !existsSync(sourcePath) || !statSync(sourcePath).isFile() || !isPlanFile) {
    die('osc eval init only accepts a plan markdown file under .osc/plans/<stage>/; run-packet evaluation is repositioned outside the reduced maintained CLI.', 2);
  }
  const plan = parsePlanFile(sourcePath);
  const now = new Date().toISOString();
  const envelope = {
    schema: 'open-scaffold.evaluation.v1',
    evaluation_id: `${plan.slug}-evaluation`,
    created_at: now,
    subject: {
      source: 'plan',
      plan: relative(root, sourcePath),
      plan_slug: plan.slug,
      task_id: null,
      run_id: null,
      run_packet: null,
    },
    acceptance_criteria: plan.acceptanceCriteria.map((text, index) => ({
      id: `AC${index + 1}`,
      text,
      status: 'not_evaluated',
      evaluator: { kind: 'human', name: null, ref: null },
      evidence: [],
      rationale: 'TODO: evaluate this criterion with concrete evidence.',
    })),
    decision: { status: 'blocked', approver: 'human', rationale: 'TODO: record the close decision after evaluation.' },
    improvement: { route: 'retry_run', target: null, carried_forward: [], do_not_assume: ['This scaffolded evaluation is not approval evidence until filled.'] },
    boundary: { runtime_spawning: false, model_ranking: false, correctness_certification: false },
  };
  const out = value(args, '--out') ?? value(args, '--output');
  const json = `${JSON.stringify(envelope, null, 2)}\n`;
  if (out) { writeFileSync(resolve(out), json); console.log(`Wrote evaluation envelope: ${resolve(out)}`); }
  else process.stdout.write(json);
}

function runtimesCommand(args: string[]): void {
  const [sub, ...rest] = args;
  try {
    if (sub === 'list') {
      const json = rest.includes('--json');
      const unknown = rest.find((arg) => arg !== '--json');
      if (unknown) die(`Unknown option for runtimes list: ${unknown}`, 2);
      const entries = loadRuntimeProfiles(process.cwd());
      if (json) console.log(JSON.stringify(entries.map((entry) => ({ id: entry.profile.id, source: entry.source, path: entry.path ?? null, lane: entry.profile.lane, status: entry.profile.status, displayName: entry.profile.displayName })), null, 2));
      else for (const entry of entries) console.log(`${entry.profile.id}\t${entry.source}\t${entry.profile.lane}\t${entry.profile.status}\t${entry.profile.displayName}`);
      return;
    }
    if (sub === 'show') {
      const id = requiredArg(rest, 'runtime id');
      const resolved = resolveRuntimeProfile(process.cwd(), id);
      if (!resolved) die(`Unknown runtime profile: ${id}`, 2);
      console.log(JSON.stringify({ ...resolved.profile, source: resolved.source, path: resolved.path ?? null }, null, 2));
      return;
    }
  } catch (error) {
    if (error instanceof Error) die(error.message, 1);
    throw error;
  }
  die('Usage: osc runtimes list [--json] | osc runtimes show <id>', 2);
}

function removed(command: string): never {
  die(`osc ${command} was removed/repositioned by the framework cleanup. See docs/COMMAND_MATURITY.md for shipped migration notes.`, 2);
}

async function main(): Promise<void> {
  const [command = 'help', ...args] = process.argv.slice(2);
  try {
    switch (command) {
      case '-h': case '--help': case 'help': console.log(help()); return;
      case '-v': case '--version': case 'version': console.log(rootPackageVersion()); return;
      case 'init': initCommand(args); return;
      case 'first-run': await firstRunCommand(args); return;
      case 'status': statusCommand(args); return;
      case 'plan': planCommand(args); return;
      case 'amend': lifecycleCommand('amend', args); return;
      case 'close': lifecycleCommand('close', args); return;
      case 'evidence': evidenceCommand(args); return;
      case 'verify': verifyCommand(args); return;
      case 'trace': traceCommand(args); return;
      case 'start': startCommand(args); return;
      case 'delegate': case 'run': case 'review': case 'ultrareview': artifactsCommand(command, args); return;
      case 'adapter': adapterCommand(args); return;
      case 'dispatch': dispatchCommand(args); return;
      case 'compare': compareCommand(args); return;
      case 'pr-summary': prSummaryCommand(args); return;
      case 'pr': prCommand(args); return;
      case 'audit': auditCommand(args); return;
      case 'prove': proofCommand(args); return;
      case 'evolve': evolveCommand(args); return;
      case 'mcp': process.exitCode = await runMcpCommand(args); return;
      case 'cockpit': await cockpitCommand(args); return;
      case 'schemas': schemasCommand(args); return;
      case 'doctor': doctorCommand(args); return;
      case 'runtimes': runtimesCommand(args); return;
      case 'eval': evalCommand(args); return;
      case 'task': case 'metrics': case 'study': case 'ab': case 'dashboard': case 'work': removed(command);
      default: {
        die(`Unknown command: ${command}\n${help()}`);
      }
    }
  } catch (error) {
    if (error instanceof Error) die(error.message, 1);
    throw error;
  }
}

main();
