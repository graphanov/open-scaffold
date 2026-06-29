#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderStartPrompt, parseStartRuntime, START_RUNTIMES } from './start.js';
import { renderAuditManifest, validateAuditManifestFile, writeAuditManifest, type AuditArtifactInput } from './audit.js';
import { createRunArtifacts, previewRunArtifacts, type ArtifactMode, type ExecutorLane, type RunArtifactOptions, type RuntimeWorkflow } from './artifacts.js';
import { COCKPIT_EVENT_TYPES, CockpitConfigError, CockpitUsageError, formatCockpitConfig, formatCockpitDispatchSummary, hasCockpitDispatchFailures, loadCockpitConfig, postCockpitEvent, type CockpitEventType, type CockpitPostOptions } from './cockpit.js';
import { compareBareAttempts, compareProofManifest, renderAttemptComparisonJson, renderAttemptComparisonMarkdown, renderProofComparison, validateProofManifestFile, type ProofRenderFormat } from './compare.js';
import { CAPTURE_FORMATS, CaptureUsageError, captureRecord, defaultOutPath, isCaptureFormat, renderAmbientTrustReport, sanitizeReportString, verifyAmbientRecordText, writeCaptureRecord, type CaptureFormat } from './capture.js';
import { collectEvidence } from './evidence.js';
import { evidenceChainExitCode, formatEvidenceChainReport, verifyEvidenceChain } from './evidence-chain.js';
import { EVOLUTION_DECISIONS, EVOLUTION_STRATEGIES, analyzeEvolutionLoop, buildEvolutionJudgmentCheckpoint, compareEvolutionLoop, recordEvolutionAttempt, renderEvolutionAnalysis, renderEvolutionComparison, renderEvolutionJudgmentCheckpoint, validateEvolutionLoopDir, writeEvolutionLoop, type EvolutionAnalysisFormat, type EvolutionCompareFormat, type EvolutionDecision, type EvolutionJudgeAction, type EvolutionStrategy } from './evolution.js';
import { measureEvolutionAnalysisEfficiency, renderEvolutionEfficiencyReport } from './evolution-efficiency.js';
import { analyzeFeedback, recordFeedback } from './feedback.js';
import { askInteractiveFirstRun, formatFirstRunIntro, formatFirstRunPrewrite, formatFirstRunResult, previewFirstRun, previewFirstRunTarget, resolveFirstRunRenderMode, runFirstRun, type FirstRunTargetPreview } from './first-run.js';
import { runBenchSuite, runHandoffLab } from './bench.js';
import { CAPTURE_SETUP_TARGETS, isCaptureSetupTarget, renderCaptureSetupText, runCaptureSetup, type CaptureSetupTarget } from './capture-setup.js';
import { initializeScaffold, scaffoldTiers, type ScaffoldTier } from './init.js';
import { runMcpCommand } from './mcp-server.js';
import { scanPublicFilesForSecrets } from './redaction.js';
import { computePrCheck, renderPrCheckMarkdown } from './pr-check.js';
import { computePrSummary, renderPrSummaryMarkdown } from './pr-summary.js';
import { loadRuntimeProfiles, resolveRuntimeProfile } from './runtime-profiles.js';
import { compileResume, MAX_RESUME_MAX_CHARS, MIN_RESUME_MAX_CHARS } from './resume.js';
import { requestJudgeRuling } from './reviewer.js';
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

function coreHelp(): string {
  return `osc — Open Scaffold CLI

Records, handoff packets, and cheap-model review for AI-assisted work.
A fresh session — or a smaller model — picks up from repo truth, not chat history.

Start:
  osc first-run                                guided mission + first plan (scripts: --non-interactive --slug --mission --goal)
  osc init --tier <min|standard|max> --target <dir>

Handoff (compile the work record into a resume packet):
  osc handoff [--json] [--plan <slug>] [--ambient-session <id>] [--max-chars <n>]
  osc resume [--json] [--plan <slug>] [--ambient-session <id>] [--max-chars <n>]        same command, original name

Record (extract and inspect ambient work records):
  osc capture --from <claude-code|codex|jsonl-generic> --transcript <path> [--out <path>] [--detect]
  osc capture verify <record> [--json]
  osc capture setup <claude-code|codex|all> [--write] [--json]

Review and gate (judgment over recorded attempts):
  osc review <loop-dir> [--compact] [--format <terminal|markdown|json>]        front door
  osc analyze <loop-dir> [--compact] [--format <terminal|markdown|json>]       same command
  osc gate <loop-dir> [--judge-action <continue|stop_impossible|stop_blocked>] [--format <terminal|markdown|json>]

Structured intent (optional criteria source for claims-vs-actual checks):
  osc status [--json]
  osc plan new <slug> --stage <active|backlog|blocked>
  osc amend <plan-slug> [--message <text>]
  osc evidence new <slug>
  osc verify [--evidence-chain]
  osc close <plan-slug> [--message <text>]

More:
  osc help --all          full surface: schemas, MCP server, compare/trace, eval
`;
}

function help(): string {
  return `osc — Open Scaffold CLI (full surface)

MISSION.md → plan → run packet/amendment → evidence → verification → close
Command maturity: stable day-one/day-two commands first; lab and advanced commands are labeled. Removed lab/advanced surfaces are listed separately as migration breadcrumbs.

First-read demo:
  osc first-run --non-interactive --slug <slug> --mission <text> --goal <text>
  osc init --tier <min|standard|max> --target <dir> [--force]
  osc init --from-existing --tier min --target <dir> [--force]
  osc init --min|--standard|--max --target <dir> [--force]
  osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]

Stable core protocol:
  osc handoff [--json] [--plan <slug>] [--ambient-session <id>] [--max-chars <n>]      alias of osc resume
  osc review <loop-dir> [--compact] [--format <terminal|markdown|json>]      alias of osc evolve analyze
  osc analyze <loop-dir> [--compact] [--format <terminal|markdown|json>]      same command, original name
  osc gate <loop-dir> [--judge-action <action> | --judge-endpoint <url> --judge-model <name>]      alias of osc evolve checkpoint
  osc resume [--json] [--plan <slug>] [--ambient-session <id>] [--max-chars <n>]
  osc status [--json]
  osc plan <plan-path>
  osc plan new <slug> --stage <active|backlog|blocked> [--from-template <name>]
  osc plan new --from-template list
  osc plan validate <slug-or-path> [--json] [--strict]
  osc plan move <slug> --to <active|backlog|blocked>
  osc amend <plan-slug> [--message <text>]
  osc evidence new <slug>
  osc evidence collect <slug> [--ci] [--dry-run] [--verbose]
  osc capture --from <claude-code|codex|jsonl-generic> --transcript <path> [--out <path>] [--detect] [--session-id <id>] [--repo <root>] [--hook-safe]
  osc capture verify <record> [--json]
  osc capture setup <claude-code|codex|all> [--write] [--dry-run] [--json]
  osc close <plan-slug> [--message <text>]
  osc trace <plan-slug> [--json] [--include-unverified]
  osc verify [--evidence-chain [--plan <slug>] [--json] [--strict] [--online-github]]
  osc pr check <plan-slug> [--format <markdown|json>] [--online-github]
  osc schemas list [--json]
  osc schemas show <schema-id>

Run-packet generation (no runtime spawning):
  osc start <plan-slug-or-path> --runtime <codex|omx|plain|human|custom>
  osc delegate <plan-path> [run binding options]
  osc run <plan-path> [--dry-run] [--json] [run binding options]
  osc feedback record <run-id> --source <human|tests|reviewer|benchmark|runtime|codex|hermes> --verdict <pass|retry|reject|block|improve> --scope <run|plan|command|docs|benchmark|runtime> --what-happened <text> --why-it-matters <text> [--repair-hypothesis <text>] [--evidence-path <path>]... --next-action <text> [--json]
  osc feedback analyze <run-id> [--json]
  osc bench suite [--mode simulated] [--fixture <id>]... [--include-ablations] [--ablation-fixture <id>]... [--out <dir>] [--json]
  osc bench handoff-lab [--out <dir>] [--json]

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
  osc evolve checkpoint <loop-dir> [--format <terminal|markdown|json>] [--out <path>] [--judge-action <continue|stop_impossible|stop_blocked>] [--judge-impossible-ac <id>]... [--judge-rationale <text>] [--judge-endpoint <url> --judge-model <name> [--judge-api-key-env <VAR>] [--judge-timeout-ms <n>]]
  osc evolve check <loop-dir>
  osc cockpit config
  osc cockpit test [--dry-run]
  osc cockpit post --event <event> [--message <text>] [--run-id <id>] [--plan <slug>] [--task-id <id>] [--pr <url>] [--evidence-path <path>] [--dry-run]

Diagnostics and advanced:
  osc mcp serve [--repo <path>] [--allow-write] [--validate]
  osc doctor --check secret-scan

Removed/repositioned migration appendix (not live maintained commands):
  migration notes: docs/STABILITY.md#command-maturity
  removed/repositioned: osc plan wizard <slug> [--stage <active|backlog|blocked>] [--non-interactive --answers <answers.json>]
  removed/repositioned: osc plan graph [--format <ascii|mermaid|json>] [--stage <active|backlog|all>] [--direction <downstream|upstream|both>] [--plan <slug>]
  removed/repositioned: osc plan stats [--json]
  removed/repositioned: osc evidence compact <run-or-loop> [--evaluation <evaluation-json>] [--candidate-note <path>]... [--out <dir>] [--json]
  removed/repositioned: osc task new/list/show/claim/start/complete/cancel/block/comment/link
  removed/repositioned: osc eval import/check
  removed/repositioned: osc status --dashboard
  removed/repositioned: osc work, osc dashboard, osc metrics, osc study, osc ab, broad osc doctor checks
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
  --harness-skill <skill>     optional runtime-native workflow hint
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
  validateOptions(args, ['--slug', '--mission', '--goal'], ['--non-interactive'], 'first-run');
  const nonInteractive = has(args, '--non-interactive');
  const mode = resolveFirstRunRenderMode({ nonInteractive });
  let targetPreview: FirstRunTargetPreview | undefined;
  const options = nonInteractive
    ? { slug: requireValue(args, '--slug'), mission: requireValue(args, '--mission'), goal: requireValue(args, '--goal'), nonInteractive: true }
    : await (async () => {
      targetPreview = previewFirstRunTarget(process.cwd());
      process.stdout.write(formatFirstRunIntro(mode));
      return askInteractiveFirstRun(targetPreview, mode);
    })();
  const preview = previewFirstRun(options, process.cwd(), targetPreview);
  process.stdout.write(formatFirstRunPrewrite(preview, mode));
  process.stdout.write(formatFirstRunResult(runFirstRun(options, process.cwd()), mode));
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

function adapterCommand(_args: string[]): void { removed('adapter'); }

function dispatchCommand(_args: string[]): void { removed('dispatch'); }

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

async function evolveCommand(args: string[]): Promise<void> {
  const sub = args[0] ?? die('Usage: osc evolve init|record|compare|analyze|checkpoint|check');
  if (isHelpArg(sub)) { console.log('Usage: osc evolve init|record|compare|analyze|checkpoint|check <args>'); return; }
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
  } else if (sub === 'checkpoint') {
    const format = (value(args, '--format') ?? 'terminal') as EvolutionAnalysisFormat;
    const judgeAction = value(args, '--judge-action') as EvolutionJudgeAction | undefined;
    if (judgeAction && !['continue', 'stop_impossible', 'stop_blocked'].includes(judgeAction)) die('Invalid --judge-action. Expected continue, stop_impossible, or stop_blocked.', 2);
    const judgeEndpoint = value(args, '--judge-endpoint');
    const judgeModel = value(args, '--judge-model');
    if (judgeEndpoint && judgeAction) die('Use either --judge-action (manual ruling) or --judge-endpoint (external reviewer), not both.', 2);
    if ((judgeEndpoint ? 1 : 0) + (judgeModel ? 1 : 0) === 1) die('--judge-endpoint and --judge-model must be provided together.', 2);
    const analysis = analyzeEvolutionLoop(args[1] ?? die('Usage: osc evolve checkpoint <loop-dir> [--judge-action <ruling>] [--judge-endpoint <url> --judge-model <name>]'), { plateauThreshold: value(args, '--plateau-threshold') ? Number(value(args, '--plateau-threshold')) : undefined }, process.cwd());
    let judge: { action: EvolutionJudgeAction; impossibleAcs?: string[]; rationale?: string } | null = judgeAction ? {
      action: judgeAction,
      impossibleAcs: values(args, '--judge-impossible-ac'),
      rationale: value(args, '--judge-rationale'),
    } : null;
    if (judgeEndpoint && judgeModel) {
      const ruled = await requestJudgeRuling({
        endpoint: judgeEndpoint,
        model: judgeModel,
        apiKeyEnv: value(args, '--judge-api-key-env'),
        timeoutMs: value(args, '--judge-timeout-ms') ? Number(value(args, '--judge-timeout-ms')) : undefined,
      }, renderEvolutionAnalysis(analysis, 'markdown'));
      judge = ruled.ruling;
      console.error(`External judge ${ruled.model} via ${ruled.endpoint}: action=${ruled.ruling.action}${ruled.usage.totalTokens !== null ? `, tokens=${ruled.usage.totalTokens}` : ''}`);
    }
    const checkpoint = buildEvolutionJudgmentCheckpoint(analysis, judge);
    const output = renderEvolutionJudgmentCheckpoint(checkpoint, format);
    const out = value(args, '--out') ?? value(args, '--output');
    if (out) { writeFileSync(resolve(out), output); console.log(`Wrote evolution checkpoint: ${resolve(out)}`); }
    else process.stdout.write(output);
    if (!checkpoint.retryAuthorized.allow) process.exitCode = 1;
  } else if (sub === 'check') {
    const loopDir = args[1] ?? die('Usage: osc evolve check <loop-dir>');
    const loopAbs = resolve(loopDir);
    const result = validateEvolutionLoopDir(loopAbs, findRootWithPlans(loopAbs) ?? process.cwd());
    for (const failure of result.failures) console.error(`FAIL ${failure.code}: ${failure.message}${failure.path ? ` (${failure.path})` : ''}`);
    for (const warning of result.warnings) console.warn(`WARN ${warning.code}: ${warning.message}${warning.path ? ` (${warning.path})` : ''}`);
    if (result.failures.length > 0) process.exit(1);
    console.log(`PASS evolution loop structure valid; ${result.warnings.length} warning(s)`);
    console.log('Note: this validates local loop structure only; it does not execute attempts, rank models, certify compliance, or approve release.');
  } else die('Usage: osc evolve init|record|compare|analyze|checkpoint|check');
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

function resumeCommand(args: string[], commandName = 'resume'): void {
  if (isHelpArg(args[0])) { const aliasLine = commandName === 'handoff' ? '\n\n`osc resume` is the original alias for the same read-only packet.' : '\n\n`osc handoff` is the product-named front door for the same read-only packet.'; console.log(`Usage: osc ${commandName} [--json] [--plan <slug>] [--ambient-session <id>] [--max-chars <n>]\n\nCompiles a compact, read-only handoff/resume packet from repo truth: mission digest, active plan with acceptance criteria, latest run state, repair hypotheses, accepted lessons, compact ambient capture summaries when present, and the next bounded action. A fresh agent or session continues from this packet instead of chat history.${aliasLine}`); return; }
  validateOptions(args, ['--plan', '--ambient-session', '--max-chars'], ['--json'], commandName);
  const extra = positional(args, ['--plan', '--ambient-session', '--max-chars']);
  if (extra.length) die(`Unknown argument for ${commandName}: ${extra[0]}`, 2);
  const maxCharsRaw = value(args, '--max-chars');
  let maxChars: number | undefined;
  if (maxCharsRaw !== undefined) {
    maxChars = Number(maxCharsRaw);
    if (!Number.isInteger(maxChars) || maxChars < MIN_RESUME_MAX_CHARS || maxChars > MAX_RESUME_MAX_CHARS) {
      die(`--max-chars must be an integer between ${MIN_RESUME_MAX_CHARS} and ${MAX_RESUME_MAX_CHARS}`, 2);
    }
  }
  try {
    const root = findScaffoldRoot(process.cwd()) ?? process.cwd();
    const result = compileResume(root, { planSlug: value(args, '--plan'), ambientSession: value(args, '--ambient-session'), maxChars });
    if (has(args, '--json')) console.log(JSON.stringify(result.summary, null, 2));
    else process.stdout.write(result.packet);
  } catch (error) {
    if (error instanceof Error) die(error.message, 2);
    throw error;
  }
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

function harnessCommand(_args: string[]): void { removed('harness'); }

function feedbackHelp(): string {
  return 'Usage: osc feedback record|analyze ...\n  osc feedback record <run-id> --source <human|tests|reviewer|benchmark|runtime|codex|hermes> --verdict <pass|retry|reject|block|improve> --scope <run|plan|command|docs|benchmark|runtime> --what-happened <text> --why-it-matters <text> [--repair-hypothesis <text>] [--evidence-path <path>]... --next-action <text> [--json]\n  osc feedback analyze <run-id> [--json]\n\nFeedback is task input and repair signal. It is not owner approval.';
}

function feedbackCommand(args: string[]): void {
  if (isHelpArg(args[0])) { console.log(feedbackHelp()); return; }
  const sub = args[0] ?? die(feedbackHelp(), 2);
  const json = has(args, '--json');
  try {
    if (sub === 'record') {
      const runId = args[1] ?? die('Usage: osc feedback record <run-id> --source <source> --verdict <verdict> --scope <scope> --what-happened <text> --why-it-matters <text> --next-action <text>', 2);
      const result = recordFeedback({
        repoRoot: process.cwd(),
        runId,
        source: requireValue(args, '--source') as Parameters<typeof recordFeedback>[0]['source'],
        verdict: requireValue(args, '--verdict') as Parameters<typeof recordFeedback>[0]['verdict'],
        scope: requireValue(args, '--scope') as Parameters<typeof recordFeedback>[0]['scope'],
        whatHappened: requireValue(args, '--what-happened'),
        whyItMatters: requireValue(args, '--why-it-matters'),
        repairHypothesis: value(args, '--repair-hypothesis'),
        evidencePaths: values(args, '--evidence-path'),
        nextAction: requireValue(args, '--next-action'),
      });
      if (json) console.log(JSON.stringify(result, null, 2)); else console.log(`Recorded feedback: ${result.path}`);
      return;
    }
    if (sub === 'analyze') {
      const runId = args[1] ?? die('Usage: osc feedback analyze <run-id> [--json]', 2);
      const result = analyzeFeedback({ repoRoot: process.cwd(), runId });
      if (json) console.log(JSON.stringify(result, null, 2)); else console.log(`Analyzed feedback for ${runId}: next=${result.nextAction}`);
      return;
    }
  } catch (error) {
    if (error instanceof Error) die(error.message, 2);
    throw error;
  }
  die(feedbackHelp(), 2);
}

function benchHelp(): string {
  return 'Usage: osc bench suite|handoff-lab ...\n  osc bench suite [--mode simulated] [--fixture <id>]... [--include-ablations] [--ablation-fixture <id>]... [--out <dir>] [--json]\n  osc bench handoff-lab [--out <dir>] [--json]\n\nBench commands write local reproduction receipts. Live runtime execution was retired from core; bench output does not grant broad proof or owner approval.';
}

function benchCommand(args: string[]): void {
  if (isHelpArg(args[0])) { console.log(benchHelp()); return; }
  const sub = args[0] ?? die(benchHelp(), 2);
  if (sub === 'suite' && isHelpArg(args[1])) {
    console.log('Usage: osc bench suite [--mode simulated] [--fixture <id>]... [--include-ablations] [--ablation-fixture <id>]... [--out <dir>] [--json]');
    return;
  }
  if (sub === 'handoff-lab' && isHelpArg(args[1])) {
    console.log('Usage: osc bench handoff-lab [--out <dir>] [--json]');
    return;
  }
  const numeric = (flag: string): number | undefined => {
    const raw = value(args, flag);
    if (raw === undefined) return undefined;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) die(`${flag} must be a positive integer`, 2);
    return parsed;
  };
  const flag = (name: string): boolean => has(args, name) && value(args, name) !== 'false';
  try {
    if (sub === 'suite') {
      const mode = choice(value(args, '--mode') ?? 'simulated', ['simulated', 'live'] as const, '--mode');
      const result = runBenchSuite({
        repoRoot: process.cwd(),
        mode,
        outDir: value(args, '--out') ?? value(args, '--output') ?? '.osc/bench/simulated-runtime-smoke',
        fixtureIds: values(args, '--fixture'),
        includeAblations: has(args, '--include-ablations'),
        ablationFixtureIds: values(args, '--ablation-fixture'),
        allowSpawn: flag('--allow-spawn'),
        adapterId: value(args, '--adapter') ?? 'codex',
        timeoutMs: numeric('--timeout-ms'),
        maxLogBytes: numeric('--max-log-bytes'),
        model: value(args, '--model'),
        effort: value(args, '--effort'),
      });
      if (has(args, '--json')) console.log(JSON.stringify(result, null, 2));
      else {
        console.log(`Wrote benchmark aggregate: ${result.aggregatePath}`);
        console.log(`Wrote benchmark report: ${result.reportPath}`);
        console.log(`Reproduction verdict: ${result.reproductionVerdict.status}`);
        console.log(`Broad dominance: ${result.boundary.broadDominance}`);
      }
      return;
    }
    if (sub === 'handoff-lab') {
      const result = runHandoffLab({ repoRoot: process.cwd(), outDir: value(args, '--out') ?? value(args, '--output') ?? '.osc/bench/handoff-lab-15' });
      if (has(args, '--json')) console.log(JSON.stringify(result, null, 2));
      else {
        console.log(`Handoff lab tested ${result.methodsTested} methods.`);
        console.log(`Wrote handoff lab aggregate: ${result.aggregatePath}`);
        console.log(`Wrote handoff lab report: ${result.reportPath}`);
      }
      return;
    }
  } catch (error) {
    if (error instanceof Error) die(error.message, 2);
    throw error;
  }
  die(benchHelp(), 2);
}

function captureHelp(): string {
  return [
    `Usage: osc capture --from <${CAPTURE_FORMATS.join('|')}> --transcript <path> [--out <path>] [--detect] [--session-id <id>] [--repo <root>] [--json] [--hook-safe]`,
    '       osc capture verify <record> [--json]',
    `       osc capture setup <${CAPTURE_SETUP_TARGETS.join('|')}> [--write] [--dry-run] [--json] [--claude-settings <path>] [--codex-config <path>]`,
    '',
    'Extract an osc.ambient-work-record.v1 record from a finished agent-session transcript:',
    'assistant turns, token usage, tool-call census, files touched, session span, and a',
    'redacted final-message digest. Read-only on the transcript; writes one record file.',
    '',
    'Verify an existing ambient record and print a sanitized trust report without raw transcript content.',
    '',
    'Setup ambient capture hooks without recording private config values:',
    '  setup claude-code   plan/install .claude/settings.local.json SessionEnd hook',
    '  setup codex         plan/install ${CODEX_HOME:-$HOME/.codex}/config.toml notify hook',
    '  setup all           plan/install both runtimes; --write is all-or-nothing',
    '',
    '  --from <format>     transcript format: claude-code | codex | jsonl-generic',
    '  --transcript <path> path to the session JSONL to read',
    '  --detect            sniff the format from the first parseable lines (exit 2 on ambiguity)',
    '  --out <path>        record output path (default: .osc/state/ambient/<session-id>.json in an .osc repo)',
    '  --hook-safe         never exit non-zero on bad/missing input (for SessionEnd-style hook wrappers)',
    '  --json              with verify/setup, emit JSON output',
    '  --write             install setup changes; default setup mode is dry-run',
    '',
    'capture observes facts; it does not approve work, certify correctness, or spawn a runtime.',
  ].join('\n');
}

function captureVerifyHelp(): string {
  return [
    'Usage: osc capture verify <record> [--json]',
    '',
    'Validate an osc.ambient-work-record.v1 file and print a sanitized trust report:',
    'schema/source/runtime validity, observed transcript facts when available, token',
    'availability, missing-fidelity warnings, and the no-approval/no-correctness/no-retry boundary.',
    '',
    'Malformed JSON, wrong schema, missing runtime, or malformed observed containers exit 2.',
  ].join('\n');
}

function validateCaptureSetupOptions(args: string[]): string | null {
  const valueFlags = new Set(['--claude-settings', '--codex-config']);
  const booleanFlags = new Set(['--write', '--dry-run', '--json']);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) return `Unexpected argument for capture setup: ${arg}`;
    const [flag, inlineValue] = arg.split('=', 2);
    if (valueFlags.has(flag)) {
      if (arg.includes('=')) {
        if (!inlineValue) return `Missing value for ${flag}`;
      } else {
        const next = args[i + 1];
        if (!next || next.startsWith('--')) return `Missing value for ${flag}`;
        i += 1;
      }
      continue;
    }
    if (booleanFlags.has(flag) && !arg.includes('=')) continue;
    return `Unknown option for capture setup: ${flag}`;
  }
  if (has(args, '--write') && has(args, '--dry-run')) return 'Use either --write or --dry-run, not both.';
  return null;
}

function captureSetupCommand(args: string[]): void {
  if (isHelpArg(args[0])) { console.log(captureHelp()); return; }
  const targetRaw = args[0] ?? die(captureHelp(), 2);
  if (!isCaptureSetupTarget(targetRaw)) {
    die(`Invalid capture setup target: ${targetRaw}. Expected one of: ${CAPTURE_SETUP_TARGETS.join(', ')}`, 2);
  }
  const optionArgs = args.slice(1);
  const optionError = validateCaptureSetupOptions(optionArgs);
  if (optionError) die(optionError, 2);
  const write = has(optionArgs, '--write');
  const repoRoot = findScaffoldRoot(process.cwd()) ?? process.cwd();
  const options = {
    write,
    repoRoot,
    claudeSettingsPath: value(optionArgs, '--claude-settings'),
    codexConfigPath: value(optionArgs, '--codex-config'),
  };
  try {
    const results = runCaptureSetup(targetRaw as CaptureSetupTarget, options);
    const mode = write ? 'write' : 'dry-run';
    const blocked = results.some((result) => result.status === 'blocked');
    if (has(optionArgs, '--json')) {
      console.log(JSON.stringify({ mode, results }, null, 2));
    } else {
      console.log(renderCaptureSetupText(results, mode));
    }
    if (blocked) process.exitCode = 2;
  } catch (error) {
    die(error instanceof Error ? error.message : String(error), 2);
  }
}

function validateCaptureOptions(args: string[]): string | null {
  const valueFlags = new Set(['--from', '--transcript', '--out', '--output', '--session-id', '--repo']);
  const booleanFlags = new Set(['--detect', '--json', '--hook-safe']);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const [flag, inlineValue] = arg.split('=', 2);
    if (valueFlags.has(flag)) {
      if (arg.includes('=')) {
        if (!inlineValue) return `Missing value for ${flag}`;
      } else {
        const next = args[i + 1];
        if (!next || next.startsWith('--')) return `Missing value for ${flag}`;
        i += 1;
      }
      continue;
    }
    if (booleanFlags.has(flag) && !arg.includes('=')) continue;
    return `Unknown option for capture: ${flag}`;
  }
  return null;
}

// `osc capture` runs after a session ends and must be hook-safe: a malformed or missing
// transcript can never break the triggering session. Exit-code contract:
//   - successful capture -> 0
//   - direct CLI misuse (bad --from, no --transcript, no --from/--detect) -> 2
//   - with --hook-safe, any data problem -> 0 (the hook wrapper records nothing, quietly)
// All errors are caught here; nothing bubbles to main()'s catch (which would exit 1).
function captureCommand(args: string[]): void {
  if (isHelpArg(args[0])) { console.log(captureHelp()); return; }
  if (args[0] === 'verify') { captureVerifyCommand(args.slice(1)); return; }
  if (args[0] === 'setup') { captureSetupCommand(args.slice(1)); return; }
  const hookSafe = has(args, '--hook-safe');
  const fail = (message: string): void => {
    if (hookSafe) return; // hook wrapper path: record nothing, never break the session
    die(message, 2);
  };
  const optionError = validateCaptureOptions(args);
  if (optionError) { fail(optionError); return; }

  const fromRaw = value(args, '--from');
  let format: CaptureFormat | undefined;
  if (fromRaw !== undefined) {
    if (!isCaptureFormat(fromRaw)) { fail(`Invalid --from value: ${fromRaw}. Expected one of: ${CAPTURE_FORMATS.join(', ')}`); return; }
    format = fromRaw;
  }
  const detect = has(args, '--detect');
  if (!format && !detect) { fail('Specify --from <claude-code|codex|jsonl-generic> or pass --detect.'); return; }

  const transcriptPath = value(args, '--transcript');
  if (!transcriptPath) { fail('Missing --transcript <path>.'); return; }

  const repoRoot = value(args, '--repo') ?? findScaffoldRoot(process.cwd()) ?? process.cwd();

  try {
    const result = captureRecord({ transcriptPath, format, detect, sessionId: value(args, '--session-id') });
    const runId = String(result.record.runId);
    const explicitOut = value(args, '--out') ?? value(args, '--output');
    const outPath = explicitOut ?? defaultOutPath(repoRoot, runId);
    const writtenPath = writeCaptureRecord(repoRoot, outPath, result.record, explicitOut !== undefined, [transcriptPath]);
    if (has(args, '--json')) {
      console.log(JSON.stringify({ path: relativeToCwd(writtenPath), format: result.format, detected: result.detected, record: result.record }, null, 2));
    } else {
      const observed = result.record.observed as { assistant_turns?: number };
      const runtime = result.record.runtime as { tokenTotal?: number | null };
      const tokenTotal = typeof runtime.tokenTotal === 'number' ? String(runtime.tokenTotal) : 'unknown';
      console.log(`Wrote ambient record (${result.format}${result.detected ? ', detected' : ''}): ${relativeToCwd(writtenPath)}`);
      console.log(`runId=${runId} turns=${observed.assistant_turns ?? 0} tokenTotal=${tokenTotal} schema=${result.record.schema}`);
    }
  } catch (error) {
    if (error instanceof CaptureUsageError) { fail(error.message); return; }
    // Any other failure (e.g. an unsafe output path) is still hook-safe under --hook-safe;
    // otherwise surface it as a usage error rather than letting it become an exit-1 crash.
    fail(error instanceof Error ? error.message : String(error));
  }
}

function captureVerifyCommand(args: string[]): void {
  if (isHelpArg(args[0])) { console.log(captureVerifyHelp()); return; }
  validateOptions(args, [], ['--json'], 'capture verify');
  const positions = positional(args, []);
  if (positions.length === 0) die('Missing required argument: record', 2);
  if (positions.length > 1) die(`Unexpected argument for capture verify: ${sanitizeReportString(positions[1])}`, 2);
  const recordPath = positions[0];
  const label = sanitizeReportString(recordPath);
  try {
    const resolved = resolve(recordPath);
    if (!existsSync(resolved)) die(`Ambient record not found: ${label}`, 2);
    const raw = readFileSync(resolved, 'utf8');
    const report = verifyAmbientRecordText(raw, label);
    if (has(args, '--json')) console.log(JSON.stringify(report, null, 2));
    else console.log(renderAmbientTrustReport(report));
  } catch (error) {
    if (error instanceof CaptureUsageError) die(error.message, 2);
    const reason = error instanceof Error ? error.message : String(error);
    die(`Could not verify ambient record ${label}: ${sanitizeReportString(reason, 260)}`, 2);
  }
}

function removed(command: string): never {
  die(`osc ${command} was removed/repositioned by the framework cleanup. See docs/STABILITY.md#command-maturity for shipped migration notes.`, 2);
}

function reviewAliasHelp(command: 'review' | 'analyze'): string {
  return [
    `Usage: osc ${command} <loop-dir> [--compact] [--format <terminal|markdown|json>] [--out <path>] [--plateau-threshold <n>]`,
    '',
    `${command === 'review' ? 'osc review' : 'osc analyze'} reads recorded evolution-loop attempts; it does not create run packets, spawn runtimes, approve retries, merge, or publish.`,
    command === 'review' ? 'Alias of: osc evolve analyze' : 'Synonym of: osc review / osc evolve analyze',
  ].join('\n');
}

async function main(): Promise<void> {
  const [command = 'help', ...args] = process.argv.slice(2);
  try {
    switch (command) {
      case '-h': case '--help': case 'help': console.log(args.includes('--all') || args[0] === 'all' ? help() : coreHelp()); return;
      case '-v': case '--version': case 'version': console.log(rootPackageVersion()); return;
      case 'init': initCommand(args); return;
      case 'first-run': await firstRunCommand(args); return;
      case 'resume': resumeCommand(args); return;
      // Product-named front door: handoff/review/gate are stable aliases of
      // resume / evolve analyze / evolve checkpoint. analyze stays as a synonym.
      case 'handoff': resumeCommand(args, 'handoff'); return;
      case 'review': case 'analyze':
        if (args.some(isHelpArg)) { console.log(reviewAliasHelp(command)); return; }
        await evolveCommand(['analyze', ...args]); return;
      case 'gate': await evolveCommand(['checkpoint', ...args]); return;
      case 'status': statusCommand(args); return;
      case 'plan': planCommand(args); return;
      case 'amend': lifecycleCommand('amend', args); return;
      case 'close': lifecycleCommand('close', args); return;
      case 'evidence': evidenceCommand(args); return;
      case 'capture': captureCommand(args); return;
      case 'verify': verifyCommand(args); return;
      case 'trace': traceCommand(args); return;
      case 'start': startCommand(args); return;
      case 'delegate': case 'run': artifactsCommand(command, args); return;
      case 'adapter': case 'dispatch': case 'ultrareview': removed(command); return;
      case 'compare': compareCommand(args); return;
      case 'pr-summary': prSummaryCommand(args); return;
      case 'pr': prCommand(args); return;
      case 'audit': auditCommand(args); return;
      case 'prove': proofCommand(args); return;
      case 'evolve': await evolveCommand(args); return;
      case 'mcp': process.exitCode = await runMcpCommand(args); return;
      case 'cockpit': await cockpitCommand(args); return;
      case 'schemas': schemasCommand(args); return;
      case 'doctor': doctorCommand(args); return;
      case 'runtimes': runtimesCommand(args); return;
      case 'harness': removed('harness'); return;
      case 'feedback': feedbackCommand(args); return;
      case 'bench': benchCommand(args); return;
      case 'eval': evalCommand(args); return;
      case 'task': case 'metrics': case 'study': case 'ab': case 'dashboard': case 'work': removed(command);
      default: {
        die(`Unknown command: ${command}\n${coreHelp()}\nRun osc help --all for the full surface.`);
      }
    }
  } catch (error) {
    if (error instanceof Error) die(error.message, 1);
    throw error;
  }
}

main();
