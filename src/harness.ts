import { existsSync, lstatSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { writeAmbientWorkRecord, AMBIENT_WORK_RECORD_SCHEMA } from './ambient.js';
import { analyzeEvolutionLoop, buildEvolutionJudgmentCheckpoint, renderEvolutionAnalysis, type EvolutionJudgmentCheckpoint } from './evolution.js';
import { compileHandoffPacket } from './handoff.js';
import { analyzeFeedback, loadAcceptedImprovements, recordFeedback, type FeedbackRecord, type FeedbackSource, type FeedbackVerdict } from './feedback.js';
import { appendJsonLineUnder, createSafeOutputRoot, readJsonlUnder, readJsonUnder, writeFileUnder, writeJsonUnder } from './path-safety.js';
import { HARNESS_RUNTIME_RECEIPT_SCHEMA, runHarnessRuntimeAdapter, teamWorkerAdapterMetadata, type HarnessRuntimeReceipt, type TeamWorkerAdapterMetadata } from './runtimes.js';

export const HARNESS_COMMAND_RESULT_SCHEMA = 'osc.harness-command-result.v1';
export const HARNESS_EVENT_SCHEMA = 'osc.harness-event.v1';
export const HARNESS_STATUS_SCHEMA = 'osc.harness-status.v1';

export type HarnessCommandName = 'interview' | 'plan' | 'work' | 'team';
export type HarnessState = 'created' | 'ready' | 'waiting_on_human' | 'running' | 'completed' | 'failed' | 'blocked';

export interface ParsedHarnessCommand {
  raw: string;
  command: HarnessCommandName;
  intent: string;
  options: Record<string, string[]>;
  args: string[];
}

export interface HarnessArtifactLink {
  role: string;
  path: string;
  schema?: string;
}

export interface HumanGate {
  id: string;
  prompt: string;
  required: boolean;
  status: 'pending' | 'satisfied';
  workerId?: string;
  adapterId?: string;
  evidencePath?: string;
  answer?: {
    summary: string;
    answeredAt: string;
    boundary: {
      answer_is_task_input: true;
      answer_is_not_approval: true;
      does_not_grant_commit_push_merge_publish_release: true;
    };
  };
}

export interface WorkerStatus {
  id: string;
  role: string;
  state: 'queued' | 'ready' | 'running' | 'completed' | 'waiting_on_human' | 'blocked' | 'failed';
  evidencePath: string;
  evidenceLinks?: HarnessArtifactLink[];
  adapter?: TeamWorkerAdapterMetadata;
  failureCode?: string | null;
  humanGateIds?: string[];
  resumedFromGate?: string;
}

export interface HarnessStatus {
  schema: typeof HARNESS_STATUS_SCHEMA;
  runId: string;
  state: HarnessState;
  command: HarnessCommandName;
  updatedAt: string;
  pendingHumanGates: HumanGate[];
  artifacts: HarnessArtifactLink[];
  workers: WorkerStatus[];
  boundary: {
    feedback_is_not_approval: true;
    core_runtime_spawning: boolean;
    human_owns_merge_publish_release: true;
  };
}

export interface HarnessCommandResult {
  schema: typeof HARNESS_COMMAND_RESULT_SCHEMA;
  runId: string;
  command: HarnessCommandName;
  status: HarnessStatus;
  artifacts: HarnessArtifactLink[];
  humanGates: HumanGate[];
  workerStatuses: WorkerStatus[];
  events: unknown[];
  message: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function timestampId(date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function slugify(value: string, fallback = 'item'): string {
  const slug = String(value ?? '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return slug || fallback;
}

function safeRunId(value: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(value) || value === '.' || value === '..') throw new Error(`run id must be safe: ${value}`);
  return value;
}

function lexicalExists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: 'single' | 'double' | null = null;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quote === 'single') {
      if (ch === "'") quote = null;
      else current += ch;
      continue;
    }
    if (quote === 'double') {
      if (ch === '"') quote = null;
      else if (ch === '\\' && i + 1 < input.length) current += input[++i];
      else current += ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) { tokens.push(current); current = ''; }
      continue;
    }
    if (ch === "'") { quote = 'single'; continue; }
    if (ch === '"') { quote = 'double'; continue; }
    current += ch;
  }
  if (quote) throw new Error('Unclosed quote in harness command');
  if (current) tokens.push(current);
  return tokens;
}

const SUPPORTED = new Set<HarnessCommandName>(['interview', 'plan', 'work', 'team']);
const FORBIDDEN = new Set(['jon', 'damn-food', 'soy-sauce', 'vegetables', 'john-lomein']);

export function parseHarnessCommand(input: string): ParsedHarnessCommand {
  const raw = String(input ?? '').trim();
  if (!raw) throw new Error('Harness command is required');
  const tokens = tokenize(raw);
  const first = tokens.shift() ?? '';
  if (!first.startsWith('$')) throw new Error('Harness command must start with $interview, $plan, $work, or $team');
  const commandText = first.slice(1);
  if (FORBIDDEN.has(commandText)) throw new Error(`Unsupported harness command: ${first}. Open Scaffold does not expose prototype meme commands.`);
  if (!SUPPORTED.has(commandText as HarnessCommandName)) throw new Error(`Unsupported harness command: ${first}`);

  const args: string[] = [];
  const options: Record<string, string[]> = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.startsWith('--')) {
      const flag = token.slice(2);
      const next = tokens[i + 1];
      if (!next || next.startsWith('--')) {
        options[flag] = [...(options[flag] ?? []), 'true'];
      } else {
        options[flag] = [...(options[flag] ?? []), next];
        i += 1;
      }
    } else {
      args.push(token);
    }
  }
  return { raw, command: commandText as HarnessCommandName, intent: args.join(' ').trim(), options, args };
}

function option(parsed: ParsedHarnessCommand, name: string): string | undefined {
  return parsed.options[name]?.[0];
}

function optionList(parsed: ParsedHarnessCommand, name: string): string[] {
  return parsed.options[name] ?? [];
}

function optionFlag(parsed: ParsedHarnessCommand, name: string): boolean {
  return (parsed.options[name] ?? []).some((value) => value === 'true' || value === '1' || value === 'yes');
}

function runIdFor(command: HarnessCommandName, intent: string): string {
  return `harness-${command}-${slugify(intent || command)}-${timestampId()}`;
}

function uniqueRunIdFor(repoRoot: string, command: HarnessCommandName, intent: string): string {
  const base = runIdFor(command, intent);
  if (!lexicalExists(join(repoRoot, `.osc/runs/${base}`))) return base;
  for (let counter = 2; counter < 1000; counter += 1) {
    const candidate = `${base}-${counter}`;
    if (!lexicalExists(join(repoRoot, `.osc/runs/${candidate}`))) return candidate;
  }
  throw new Error(`could not create unique run id for ${command}`);
}

function artifact(runId: string, role: string, file: string, schema?: string): HarnessArtifactLink {
  return { role, path: `.osc/runs/${runId}/${file}`, schema };
}

function writeEvent(repoRoot: string, runId: string, type: string, payload: Record<string, unknown> = {}) {
  const event = {
    ...payload,
    schema: HARNESS_EVENT_SCHEMA,
    runId,
    type,
    timestamp: nowIso(),
    controlRoom: {
      schema: 'osc.control-room-event.v1',
      transport: 'neutral',
      platform: null,
      surfaceDependencies: [],
      canRenderFromStatusAndArtifacts: true,
    },
  };
  appendJsonLineUnder(repoRoot, `.osc/runs/${runId}/events.jsonl`, event, 'harness event path');
  return event;
}

function writeStatus(repoRoot: string, status: HarnessStatus): void {
  writeJsonUnder(repoRoot, `.osc/runs/${status.runId}/status.json`, status, 'harness status path');
}

function makeStatus({ runId, command, state, humanGates = [], artifacts = [], workers = [], runtimeSpawned = false }: { runId: string; command: HarnessCommandName; state: HarnessState; humanGates?: HumanGate[]; artifacts?: HarnessArtifactLink[]; workers?: WorkerStatus[]; runtimeSpawned?: boolean }): HarnessStatus {
  return {
    schema: HARNESS_STATUS_SCHEMA,
    runId,
    command,
    state,
    updatedAt: nowIso(),
    pendingHumanGates: humanGates.filter((gate) => gate.required && gate.status === 'pending'),
    artifacts,
    workers,
    boundary: {
      feedback_is_not_approval: true,
      core_runtime_spawning: runtimeSpawned,
      human_owns_merge_publish_release: true,
    },
  };
}

function missingContextGate(command: HarnessCommandName): HumanGate {
  return {
    id: 'missing-required-context',
    required: true,
    status: 'pending',
    prompt: `${command} needs missing task context before execution continues: goal, constraints, acceptance criteria, no-go actions, verification, and required human decisions.`,
  };
}

function resultFor(repoRoot: string, runId: string, command: HarnessCommandName, status: HarnessStatus, humanGates: HumanGate[], artifacts: HarnessArtifactLink[], workers: WorkerStatus[], message: string): HarnessCommandResult {
  const events = readJsonlUnder(repoRoot, `.osc/runs/${runId}/events.jsonl`);
  return { schema: HARNESS_COMMAND_RESULT_SCHEMA, runId, command, status, artifacts, humanGates, workerStatuses: workers, events, message };
}

function ensureRunDir(repoRoot: string, runId: string): void {
  createSafeOutputRoot(repoRoot, `.osc/runs/${safeRunId(runId)}`, 'harness run output root');
}

function baseArtifacts(runId: string): HarnessArtifactLink[] {
  return [
    artifact(runId, 'status', 'status.json', HARNESS_STATUS_SCHEMA),
    artifact(runId, 'events', 'events.jsonl', HARNESS_EVENT_SCHEMA),
    artifact(runId, 'postflight', 'postflight.md'),
  ];
}

function writePostflight(repoRoot: string, runId: string, command: HarnessCommandName, state: HarnessState, details: { feedbackPath?: string; acceptedImprovementCount?: number; repairHypotheses?: string[]; handoffPath?: string } = {}): void {
  const lines = [
    `# Harness postflight: ${command}`,
    '',
    `Run ID: ${runId}`,
    `State: ${state}`,
    '',
    'This is a local Open Scaffold harness receipt. It is not merge, publish, release, deployment, or broad benchmark proof.',
    'Feedback is task input and learning signal, not owner approval.',
    '',
  ];
  if (details.feedbackPath) lines.push(`Feedback: ${details.feedbackPath}`);
  if (details.acceptedImprovementCount !== undefined) lines.push(`Accepted improvements inherited: ${details.acceptedImprovementCount}`);
  if (details.handoffPath) lines.push(`Handoff packet: ${details.handoffPath}`);
  if (details.repairHypotheses?.length) {
    lines.push('', '## Repair hypotheses', '');
    for (const hypothesis of details.repairHypotheses) lines.push(`- ${hypothesis}`);
  }
  lines.push('');
  writeFileUnder(repoRoot, `.osc/runs/${runId}/postflight.md`, lines.join('\n'), 'harness postflight path');
}

function numericOption(parsed: ParsedHarnessCommand, name: string, max: number): number | undefined {
  const raw = option(parsed, name);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  if (value > max) throw new Error(`${name} must be at most ${max}`);
  return value;
}

function runtimeArtifacts(runId: string): HarnessArtifactLink[] {
  return [
    artifact(runId, 'runtime_receipt', 'runtime-receipt.json', HARNESS_RUNTIME_RECEIPT_SCHEMA),
  ];
}

function checkpointArtifacts(runId: string): HarnessArtifactLink[] {
  return [
    artifact(runId, 'judgment_checkpoint', 'judgment-checkpoint.json', 'open-scaffold.evolution-judgment-checkpoint.v1'),
    artifact(runId, 'controller_signal', 'controller-signal.md', 'open-scaffold.evolution-controller-signal.v1'),
  ];
}

function mergeRuntimeEvidenceArtifacts(artifacts: HarnessArtifactLink[], receipt: HarnessRuntimeReceipt): HarnessArtifactLink[] {
  const seen = new Set(artifacts.map((item) => item.path));
  const merged = [...artifacts];
  for (const entry of receipt.evidencePaths) {
    if (seen.has(entry.path)) continue;
    seen.add(entry.path);
    merged.push({ role: entry.role, path: entry.path, schema: entry.schema });
  }
  return merged;
}

function runtimeState(receipt: HarnessRuntimeReceipt): HarnessState {
  if (receipt.status === 'completed') return 'completed';
  if (receipt.status === 'needs_human') return 'waiting_on_human';
  if (receipt.status === 'blocked') return 'blocked';
  if (receipt.status === 'failed') return 'failed';
  return 'ready';
}

function runtimeMessage(receipt: HarnessRuntimeReceipt): string {
  if (receipt.status === 'completed') return 'Runtime adapter completed and wrote a receipt. Verification and owner gates still remain.';
  if (receipt.status === 'needs_human') return 'Runtime adapter paused for human task input.';
  if (receipt.status === 'blocked') return 'Runtime adapter reported a blocked receipt.';
  if (receipt.status === 'failed') return `Runtime adapter failed closed: ${receipt.failure.code ?? 'unknown_failure'}.`;
  return 'Work package ready; no runtime spawned because backend authority was not passed.';
}

function runtimeRepairHypothesis(receipt: HarnessRuntimeReceipt): string {
  const code = receipt.failure.code ?? receipt.marker.state;
  if (receipt.status === 'blocked') {
    return `Repair runtime_blocked by resolving the blocker captured in the runtime receipt before retrying: ${receipt.marker.context || receipt.failure.message || 'No runtime context supplied.'}`;
  }
  return `Repair ${code} before retrying: inspect the runtime receipt/logs, fix the adapter output or task package, then retry without overwriting this attempt's evidence.`;
}

function buildWorkCheckpoint(repoRoot: string, parsed: ParsedHarnessCommand): { loopDir: string; checkpoint: EvolutionJudgmentCheckpoint; controllerSignal: string } | null {
  const loopDir = option(parsed, 'checkpoint') ?? option(parsed, 'judgment-checkpoint');
  if (!loopDir) return null;
  if (loopDir.startsWith('~') || loopDir.includes('\0')) throw new Error(`unsafe checkpoint loop path: ${loopDir}`);
  const resolvedLoopDir = resolve(repoRoot, loopDir);
  const analysis = analyzeEvolutionLoop(resolvedLoopDir, {}, repoRoot);
  return {
    loopDir,
    checkpoint: buildEvolutionJudgmentCheckpoint(analysis),
    controllerSignal: renderEvolutionAnalysis(analysis, 'terminal', { compact: true }),
  };
}

function recordRuntimeOutcomeFeedback(repoRoot: string, runId: string, receipt: HarnessRuntimeReceipt): FeedbackRecord | null {
  if (receipt.status !== 'failed' && receipt.status !== 'blocked') return null;
  const code = receipt.failure.code ?? receipt.marker.state;
  const verdict: FeedbackVerdict = receipt.status === 'blocked' ? 'block' : 'retry';
  const nextAction = receipt.status === 'blocked' ? 'block' : 'retry';
  const whatHappened = receipt.status === 'blocked'
    ? `Runtime adapter blocked (${code}). ${receipt.marker.context || receipt.failure.message || 'See runtime receipt.'}`
    : `Runtime adapter failed closed (${code}). ${receipt.failure.message || receipt.marker.context || 'See runtime receipt.'}`;
  const recorded = recordFeedback({
    repoRoot,
    runId,
    source: 'runtime',
    verdict,
    scope: 'runtime',
    whatHappened,
    whyItMatters: 'A failed or blocked runtime attempt must become repair input instead of being treated as success or approval.',
    repairHypothesis: runtimeRepairHypothesis(receipt),
    evidencePaths: receipt.evidencePaths.map((entry) => entry.path),
    nextAction,
  });
  return recorded.record;
}

function collectEvidencePathsFromStatus(status: HarnessStatus): string[] {
  return status.artifacts.map((item) => item.path);
}

function parentRetryAttempt(repoRoot: string, parentRunId: string): number {
  try {
    const packet = readJsonUnder<Record<string, unknown>>(repoRoot, `.osc/runs/${safeRunId(parentRunId)}/run.json`, 'parent run packet path');
    const retry = packet.retry && typeof packet.retry === 'object' ? packet.retry as Record<string, unknown> : null;
    return typeof retry?.attempt === 'number' ? retry.attempt + 1 : 2;
  } catch {
    return 2;
  }
}

function buildRetryMetadata(repoRoot: string, parsed: ParsedHarnessCommand): { parentRunId: string; attempt: number; repairHypothesis: string; previousEvidencePaths: string[] } | null {
  const parentRunId = option(parsed, 'retry-of');
  if (!parentRunId) return null;
  const safeParent = safeRunId(parentRunId);
  const explicit = option(parsed, 'repair-hypothesis');
  let inferredRepairHypothesis: string | undefined;
  if (!explicit) {
    try {
      inferredRepairHypothesis = analyzeFeedback({ repoRoot, runId: safeParent, writeCandidates: false }).repairHypotheses[0]?.hypothesis;
    } catch {
      inferredRepairHypothesis = undefined;
    }
  }
  const repairHypothesis = explicit ?? inferredRepairHypothesis ?? 'Retry with a bounded repair hypothesis and preserve the previous attempt evidence.';
  const parentStatus = readJsonUnder<HarnessStatus>(repoRoot, `.osc/runs/${safeParent}/status.json`, 'parent harness status path');
  const evidence = new Set(collectEvidencePathsFromStatus(parentStatus));
  evidence.add(`.osc/runs/${safeParent}/runtime-receipt.json`);
  evidence.add(`.osc/runs/${safeParent}/feedback.jsonl`);
  evidence.add(`.osc/runs/${safeParent}/postflight.md`);
  return {
    parentRunId: safeParent,
    attempt: parentRetryAttempt(repoRoot, safeParent),
    repairHypothesis,
    previousEvidencePaths: [...evidence],
  };
}

function handoffMaxChars(parsed: ParsedHarnessCommand): number {
  const value = numericOption(parsed, 'handoff-max-chars', 20_000) ?? 1600;
  if (value < 900) throw new Error('handoff-max-chars must be at least 900 so required sections survive the budget');
  return value;
}

function handoffRequested(parsed: ParsedHarnessCommand): boolean {
  return optionFlag(parsed, 'handoff') || option(parsed, 'handoff-max-chars') !== undefined;
}

function maybeWriteHandoffPacket(repoRoot: string, runId: string, command: HarnessCommandName, state: HarnessState, artifacts: HarnessArtifactLink[], receipt?: HarnessRuntimeReceipt, humanGates: HumanGate[] = []): { artifacts: HarnessArtifactLink[]; handoffPath?: string; repairHypotheses: string[] } {
  const packet = readJsonUnder<Record<string, unknown>>(repoRoot, `.osc/runs/${runId}/run.json`, 'work run packet path');
  const request = packet.handoff && typeof packet.handoff === 'object' ? packet.handoff as Record<string, unknown> : null;
  if (request?.requested !== true) return { artifacts, repairHypotheses: [] };
  const maxChars = typeof request.maxChars === 'number' ? request.maxChars : 1600;
  let repairHypotheses: string[] = [];
  try {
    repairHypotheses = analyzeFeedback({ repoRoot, runId }).repairHypotheses.map((item) => item.hypothesis);
  } catch {
    repairHypotheses = [];
  }
  const evidenceRefs = [...new Set([...artifacts.map((item) => item.path), ...(receipt?.evidencePaths.map((item) => item.path) ?? [])])];
  const pendingGatePrompts = humanGates
    .filter((gate) => gate.status === 'pending')
    .map((gate) => `Human gate ${gate.id}: ${gate.prompt}`);
  const blockers = state === 'waiting_on_human'
    ? (pendingGatePrompts.length ? pendingGatePrompts : ['Runtime adapter needs human task input before this run can continue.'])
    : state === 'failed' || state === 'blocked'
      ? (repairHypotheses.length ? repairHypotheses : ['Runtime attempt needs repair before retry.'])
      : [];
  const nextActions = state === 'completed'
    ? ['Run verification before claiming pass.', 'Owner decides commit, push, PR, merge, publish, and release gates.']
    : state === 'waiting_on_human'
      ? ['Answer pending human gate as bounded task input, not approval.', 'Resume the same run after the answer; preserve current evidence.']
      : state === 'ready'
        ? ['Execute or delegate the packaged $work task.', 'Preserve this run packet and evidence refs while continuing.']
        : ['Retry with the repair hypothesis if still in scope.', 'Preserve this run evidence and write new attempt evidence.'];
  const compiled = compileHandoffPacket({
    state: `Run ${runId} for $${command} is ${state}. Intent: ${String(packet.intent ?? '').trim() || 'not recorded'}. Runtime status: ${receipt?.status ?? 'not run'}.`,
    decisions: [
      'Keep evidence refs instead of raw logs.',
      'Feedback and handoff packets are not owner approval.',
      `Runtime adapter: ${receipt?.adapterId ?? (packet.runtime && typeof packet.runtime === 'object' ? String((packet.runtime as Record<string, unknown>).adapter ?? 'none') : 'none')}.`,
    ],
    blockers,
    evidenceRefs,
    nextActions,
    maxChars,
    reason: 'requested by $work handoff option',
  });
  const path = `.osc/runs/${runId}/handoff.md`;
  if (compiled.validation.status !== 'pass') {
    throw new Error(`handoff packet failed validation: missing sections ${compiled.validation.missingSections.join(', ') || 'none'}, length ${compiled.validation.length}/${compiled.validation.maxChars}`);
  }
  writeFileUnder(repoRoot, path, compiled.content, 'harness handoff path');
  packet.handoff = { requested: true, path, schema: compiled.schema, maxChars, budget: compiled.budget, validation: compiled.validation };
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/run.json`, packet, 'work run packet path');
  writeEvent(repoRoot, runId, 'handoff_packet_written', { path, validation: compiled.validation });
  const nextArtifacts = artifacts.some((item) => item.path === path) ? artifacts : [...artifacts, { role: 'handoff_packet', path, schema: compiled.schema }];
  return { artifacts: nextArtifacts, handoffPath: path, repairHypotheses };
}

function runtimeHumanGate(receipt: HarnessRuntimeReceipt, existing: HumanGate[]): HumanGate {
  const marker = receipt.marker;
  const context = 'context' in marker ? marker.context.trim() : '';
  let id = 'runtime-needs-human';
  let counter = 2;
  while (existing.some((gate) => gate.id === id)) id = `runtime-needs-human-${counter++}`;
  return {
    id,
    required: true,
    status: 'pending',
    prompt: context || 'Runtime adapter needs human task input before this same run can continue.',
  };
}

function updatePacketWithRuntime(repoRoot: string, runId: string, state: HarnessState, humanGates: HumanGate[], receipt?: HarnessRuntimeReceipt): void {
  const packet = readJsonUnder<Record<string, unknown>>(repoRoot, `.osc/runs/${runId}/run.json`, 'work run packet path');
  packet.status = state;
  packet.humanGates = humanGates;
  if (receipt) packet.runtimeReceipt = { path: `.osc/runs/${runId}/runtime-receipt.json`, status: receipt.status, failureCode: receipt.failure.code };
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/run.json`, packet, 'work run packet path');
}

function applyRuntimeReceipt(repoRoot: string, runId: string, receipt: HarnessRuntimeReceipt, humanGates: HumanGate[], artifacts: HarnessArtifactLink[]): HarnessCommandResult {
  const nextGates = receipt.status === 'needs_human' ? [...humanGates, runtimeHumanGate(receipt, humanGates)] : humanGates;
  const nextState = runtimeState(receipt);
  let nextArtifacts = mergeRuntimeEvidenceArtifacts(artifacts, receipt);
  const ambient = writeAmbientWorkRecord({ repoRoot, runId, state: nextState, artifacts: nextArtifacts, receipt });
  if (!nextArtifacts.some((item) => item.path === ambient.path)) {
    nextArtifacts.push({ role: 'ambient_record', path: ambient.path, schema: AMBIENT_WORK_RECORD_SCHEMA });
  }
  const feedback = recordRuntimeOutcomeFeedback(repoRoot, runId, receipt);
  const handoff = maybeWriteHandoffPacket(repoRoot, runId, 'work', nextState, nextArtifacts, receipt, nextGates);
  nextArtifacts = handoff.artifacts;
  const feedbackPath = `.osc/runs/${runId}/feedback.jsonl`;
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/human-gates.json`, nextGates, 'human gates path');
  updatePacketWithRuntime(repoRoot, runId, nextState, nextGates, receipt);
  writePostflight(repoRoot, runId, 'work', nextState, {
    feedbackPath: feedback ? feedbackPath : undefined,
    repairHypotheses: handoff.repairHypotheses.length ? handoff.repairHypotheses : (feedback?.repairHypothesis ? [feedback.repairHypothesis] : []),
    handoffPath: handoff.handoffPath,
  });
  const status = makeStatus({ runId, command: 'work', state: nextState, humanGates: nextGates, artifacts: nextArtifacts, runtimeSpawned: receipt.spawned });
  writeStatus(repoRoot, status);
  writeEvent(repoRoot, runId, 'ambient_record_written', { path: ambient.path, schema: AMBIENT_WORK_RECORD_SCHEMA });
  writeEvent(repoRoot, runId, `runtime_${receipt.status}`, { receiptPath: `.osc/runs/${runId}/runtime-receipt.json`, failure: receipt.failure, marker: receipt.marker });
  if (feedback) writeEvent(repoRoot, runId, 'feedback_recorded', { feedbackId: feedback.id, feedbackPath });
  writeEvent(repoRoot, runId, nextState === 'waiting_on_human' ? 'command_blocked' : nextState === 'completed' ? 'command_completed' : 'command_blocked', { state: nextState });
  return resultFor(repoRoot, runId, 'work', status, nextGates, nextArtifacts, [], runtimeMessage(receipt));
}

function routeInterview(repoRoot: string, parsed: ParsedHarnessCommand): HarnessCommandResult {
  const runId = uniqueRunIdFor(repoRoot, 'interview', parsed.intent);
  ensureRunDir(repoRoot, runId);
  const context = optionList(parsed, 'context');
  const humanGates = context.length ? [] : [missingContextGate('interview')];
  const state: HarnessState = humanGates.length ? 'waiting_on_human' : 'completed';
  const artifacts = [...baseArtifacts(runId), artifact(runId, 'interview_draft', 'interview.json', 'osc.harness-interview.v1')];
  writeEvent(repoRoot, runId, 'command_started', { command: 'interview', intent: parsed.intent });
  if (humanGates.length) writeEvent(repoRoot, runId, 'human_gate', { gates: humanGates });
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/human-gates.json`, humanGates, 'human gates path');
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/interview.json`, {
    schema: 'osc.harness-interview.v1',
    runId,
    intent: parsed.intent,
    missingContext: humanGates.map((gate) => gate.prompt),
    capturedContext: context,
    workPackageDraft: {
      goal: parsed.intent,
      constraints: optionList(parsed, 'constraint'),
      acceptanceCriteria: optionList(parsed, 'acceptance'),
      noGo: optionList(parsed, 'no-go'),
      requiredHumanDecisions: humanGates.length ? ['missing-required-context'] : [],
      recommendedNextStep: humanGates.length ? 'answer the human gate before planning or work' : '$plan',
    },
    boundary: { clarification_only: true, not_approval: true },
  }, 'interview artifact path');
  writePostflight(repoRoot, runId, 'interview', state);
  const status = makeStatus({ runId, command: 'interview', state, humanGates, artifacts });
  writeStatus(repoRoot, status);
  writeEvent(repoRoot, runId, state === 'waiting_on_human' ? 'command_blocked' : 'command_completed', { state });
  return resultFor(repoRoot, runId, 'interview', status, humanGates, artifacts, [], state === 'waiting_on_human' ? 'Interview paused for missing context.' : 'Interview draft completed.');
}

function planMarkdown(slug: string, parsed: ParsedHarnessCommand): string {
  const acceptance = optionList(parsed, 'acceptance');
  const verify = optionList(parsed, 'verify');
  return [
    `# Plan: ${slug}`,
    '',
    '## Status',
    '',
    'active',
    '',
    '## Context',
    '',
    'Created by the Open Scaffold harness command router from a bounded `$plan` request.',
    '',
    '## Goal',
    '',
    parsed.intent || 'Create a bounded Open Scaffold work package.',
    '',
    '## Constraints / Out of scope',
    '',
    '- Do not spawn runtimes from Open Scaffold core.',
    '- Do not commit, push, merge, publish, release, or rewrite history without explicit owner approval.',
    '- Keep feedback and evidence as task input, not approval.',
    '',
    '## Files to touch',
    '',
    '- README.md — update only if this plan scope requires user-facing explanation.',
    '',
    '## Acceptance criteria',
    '',
    ...(acceptance.length ? acceptance : ['Plan has clear acceptance criteria and verification before work.']).map((item) => `- [ ] ${item}`),
    '',
    '## Verification steps',
    '',
    ...(verify.length ? verify : ['Run npm test.']).map((item, index) => `${index + 1}. ${item}`),
    '',
    '## Open questions',
    '',
    'None.',
    '',
  ].join('\n');
}

function routePlan(repoRoot: string, parsed: ParsedHarnessCommand): HarnessCommandResult {
  const runId = uniqueRunIdFor(repoRoot, 'plan', parsed.intent);
  ensureRunDir(repoRoot, runId);
  const slug = slugify(option(parsed, 'slug') ?? parsed.intent, 'harness-plan');
  const planPath = `.osc/plans/active/${slug}.md`;
  const artifacts = [...baseArtifacts(runId), artifact(runId, 'plan_receipt', 'plan.json', 'osc.harness-plan.v1')];
  writeEvent(repoRoot, runId, 'command_started', { command: 'plan', intent: parsed.intent, planSlug: slug });
  if (existsSync(join(repoRoot, planPath))) {
    const proposalPath = `.osc/runs/${runId}/plan-amendment-proposal.md`;
    writeFileUnder(repoRoot, proposalPath, planMarkdown(slug, parsed), 'plan amendment proposal path');
    artifacts.push({ role: 'plan_amendment_proposal', path: proposalPath });
  } else {
    writeFileUnder(repoRoot, planPath, planMarkdown(slug, parsed), 'plan artifact path');
    artifacts.push({ role: 'plan', path: planPath });
  }
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/plan.json`, { schema: 'osc.harness-plan.v1', runId, planSlug: slug, planPath, command: parsed.raw, boundary: { plan_is_repo_truth: true, not_approval: true } }, 'plan receipt path');
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/human-gates.json`, [], 'human gates path');
  writePostflight(repoRoot, runId, 'plan', 'completed');
  const status = makeStatus({ runId, command: 'plan', state: 'completed', artifacts });
  writeStatus(repoRoot, status);
  writeEvent(repoRoot, runId, 'command_completed', { state: 'completed' });
  return resultFor(repoRoot, runId, 'plan', status, [], artifacts, [], 'Plan artifact created or amendment proposal recorded.');
}

function inheritedImprovements(repoRoot: string, parsed: ParsedHarnessCommand) {
  return optionFlag(parsed, 'inherit-improvements') ? loadAcceptedImprovements({ repoRoot, query: parsed.intent, requireQuery: true }) : [];
}

function routeWork(repoRoot: string, parsed: ParsedHarnessCommand): HarnessCommandResult {
  const runId = uniqueRunIdFor(repoRoot, 'work', parsed.intent);
  ensureRunDir(repoRoot, runId);
  const retry = buildRetryMetadata(repoRoot, parsed);
  const checkpoint = buildWorkCheckpoint(repoRoot, parsed);
  const context = [
    ...optionList(parsed, 'context'),
    ...(retry ? [`Repair hypothesis from ${retry.parentRunId}: ${retry.repairHypothesis}`] : []),
    ...(checkpoint ? [
      `Judgment checkpoint from ${checkpoint.loopDir}: action=${checkpoint.checkpoint.action}; retry_authorized=${checkpoint.checkpoint.retryAuthorized.allow}; mode=${checkpoint.checkpoint.retryAuthorized.mode}; reason=${checkpoint.checkpoint.retryAuthorized.reason}`,
      checkpoint.controllerSignal,
    ] : []),
  ];
  const humanGates = context.length ? [] : [missingContextGate('work')];
  const checkpointBlocksRuntime = Boolean(checkpoint && !checkpoint.checkpoint.retryAuthorized.allow && humanGates.length === 0);
  const allowSpawn = optionFlag(parsed, 'allow-spawn');
  const adapterId = option(parsed, 'adapter') ?? option(parsed, 'runtime') ?? 'codex';
  const timeoutMs = numericOption(parsed, 'timeout-ms', 30 * 60 * 1000);
  const maxLogBytes = numericOption(parsed, 'max-log-bytes', 2_000_000);
  const state: HarnessState = humanGates.length ? 'waiting_on_human' : checkpointBlocksRuntime ? 'blocked' : 'ready';
  const handoff = handoffRequested(parsed) ? { requested: true, maxChars: handoffMaxChars(parsed), path: `.osc/runs/${runId}/handoff.md`, schema: 'osc.handoff-compiler.v1' } : { requested: false };
  const artifacts = [
    ...baseArtifacts(runId),
    artifact(runId, 'run_packet', 'run.json', 'osc.controlled-work-run.v1'),
    artifact(runId, 'work_package', 'work-package.md'),
    ...(retry ? [artifact(runId, 'retry_attempt', 'retry.json', 'osc.harness-retry.v1')] : []),
    ...(checkpoint ? checkpointArtifacts(runId) : []),
    ...runtimeArtifacts(runId),
  ];
  const improvements = inheritedImprovements(repoRoot, parsed).map((item) => ({ slug: item.slug, path: item.path, summary: item.content.split('\n').slice(0, 8).join('\n') }));
  writeEvent(repoRoot, runId, 'command_started', { command: 'work', intent: parsed.intent, adapter: adapterId, allowSpawn });
  if (humanGates.length) writeEvent(repoRoot, runId, 'human_gate', { gates: humanGates });
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/human-gates.json`, humanGates, 'human gates path');
  const runPacket = {
    schema: 'osc.controlled-work-run.v1',
    runId,
    command: '$work',
    intent: parsed.intent,
    context,
    status: state,
    runtime: {
      adapter: adapterId,
      spawning: allowSpawn && humanGates.length === 0 && !checkpointBlocksRuntime,
      spawnAuthority: allowSpawn,
      timeoutMs: timeoutMs ?? null,
      maxLogBytes: maxLogBytes ?? null,
      model: option(parsed, 'model') ?? null,
      effort: option(parsed, 'effort') ?? null,
      note: 'Runtime adapters execute bounded work while Open Scaffold records evidence. Human gates do not grant owner authority.',
    },
    humanGates,
    evidence: { events: `.osc/runs/${runId}/events.jsonl`, postflight: `.osc/runs/${runId}/postflight.md`, feedback: `.osc/runs/${runId}/feedback.jsonl`, runtimeReceipt: `.osc/runs/${runId}/runtime-receipt.json` },
    improvements: { inherited: improvements },
    retry,
    handoff,
    judgmentCheckpoint: checkpoint ? {
      loopDir: checkpoint.loopDir,
      checkpointPath: `.osc/runs/${runId}/judgment-checkpoint.json`,
      controllerSignalPath: `.osc/runs/${runId}/controller-signal.md`,
      retryAuthorized: checkpoint.checkpoint.retryAuthorized,
    } : null,
    boundary: { feedback_is_not_approval: true, human_owns_merge_publish_release: true, runtime_adapter_executes: true, open_scaffold_records_evidence: true },
  };
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/run.json`, runPacket, 'work run packet path');
  if (checkpoint) {
    writeJsonUnder(repoRoot, `.osc/runs/${runId}/judgment-checkpoint.json`, checkpoint.checkpoint, 'judgment checkpoint path');
    writeFileUnder(repoRoot, `.osc/runs/${runId}/controller-signal.md`, checkpoint.controllerSignal, 'controller signal path');
    writeEvent(repoRoot, runId, 'judgment_checkpoint_recorded', { loopDir: checkpoint.loopDir, retryAuthorized: checkpoint.checkpoint.retryAuthorized });
  }
  if (retry) {
    writeJsonUnder(repoRoot, `.osc/runs/${runId}/retry.json`, {
      schema: 'osc.harness-retry.v1',
      runId,
      ...retry,
      boundary: {
        retry_preserves_previous_evidence: true,
        retry_writes_new_attempt_evidence: true,
        repair_hypothesis_is_not_approval: true,
      },
    }, 'retry attempt path');
    writeEvent(repoRoot, runId, 'retry_created', { parentRunId: retry.parentRunId, attempt: retry.attempt, previousEvidencePaths: retry.previousEvidencePaths });
  }
  writeFileUnder(repoRoot, `.osc/runs/${runId}/work-package.md`, [
    '# Controlled work package',
    '',
    `Run ID: ${runId}`,
    `Intent: ${parsed.intent}`,
    '',
    '## Runtime boundary',
    '',
    `- Adapter: ${adapterId}`,
    `- Spawn authority passed: ${allowSpawn ? 'yes' : 'no'}`,
    '- Runtime adapters execute bounded work while Open Scaffold writes status, receipts, gates, and evidence links.',
    ...(checkpoint ? [`- Judgment checkpoint: ${checkpoint.checkpoint.retryAuthorized.allow ? 'retry authorized' : 'retry blocked'} (${checkpoint.checkpoint.retryAuthorized.mode}: ${checkpoint.checkpoint.retryAuthorized.reason})`] : []),
    '- Human gate answers are task input, not approval.',
    '- Commit, push, merge, publish, release, deploy, credentials, and history rewrite remain owner-controlled.',
    ...(retry ? ['', '## Repair hypothesis for this retry', '', retry.repairHypothesis] : []),
    ...(improvements.length ? ['', '## Relevant accepted improvements', '', ...improvements.map((item) => `- ${item.slug}: ${item.path}`)] : []),
    '',
  ].join('\n'), 'work package path');
  writePostflight(repoRoot, runId, 'work', state, { acceptedImprovementCount: improvements.length, repairHypotheses: retry ? [retry.repairHypothesis] : [] });
  if (humanGates.length) {
    const status = makeStatus({ runId, command: 'work', state, humanGates, artifacts });
    writeStatus(repoRoot, status);
    writeEvent(repoRoot, runId, 'command_blocked', { state });
    return resultFor(repoRoot, runId, 'work', status, humanGates, artifacts, [], 'Work package paused for missing context.');
  }
  if (checkpointBlocksRuntime && checkpoint) {
    const feedback = recordFeedback({
      repoRoot,
      runId,
      source: 'reviewer',
      verdict: 'block',
      scope: 'run',
      whatHappened: `Judgment checkpoint blocked runtime dispatch: ${checkpoint.checkpoint.retryAuthorized.reason}.`,
      whyItMatters: 'Retry discipline must be enforced before spending another runtime attempt.',
      repairHypothesis: checkpoint.checkpoint.retryAuthorized.mode === 'blocked_by_packet'
        ? 'Redesign or amend the failing criterion, scorer, or artifact shape before another retry.'
        : 'Route to closeout or human review instead of retrying the same loop.',
      evidencePaths: [`.osc/runs/${runId}/judgment-checkpoint.json`, `.osc/runs/${runId}/controller-signal.md`],
      nextAction: checkpoint.checkpoint.retryAuthorized.mode,
    });
    writePostflight(repoRoot, runId, 'work', 'blocked', {
      feedbackPath: feedback.path,
      acceptedImprovementCount: improvements.length,
      repairHypotheses: [feedback.record.repairHypothesis ?? checkpoint.checkpoint.retryAuthorized.reason],
    });
    const status = makeStatus({ runId, command: 'work', state: 'blocked', humanGates, artifacts });
    writeStatus(repoRoot, status);
    writeEvent(repoRoot, runId, 'feedback_recorded', { feedbackId: feedback.record.id, feedbackPath: feedback.path });
    writeEvent(repoRoot, runId, 'command_blocked', { state: 'blocked', reason: checkpoint.checkpoint.retryAuthorized.reason });
    return resultFor(repoRoot, runId, 'work', status, humanGates, artifacts, [], 'Judgment checkpoint blocked runtime dispatch before another retry.');
  }
  const receipt = runHarnessRuntimeAdapter({ repoRoot, runId, runPacketPath: `.osc/runs/${runId}/run.json`, adapterId, allowSpawn, timeoutMs, maxLogBytes, model: option(parsed, 'model'), effort: option(parsed, 'effort') });
  return applyRuntimeReceipt(repoRoot, runId, receipt, humanGates, artifacts);
}

interface TeamOutcome {
  workerId: string;
  rawOutcome: string;
  source: FeedbackSource;
  verdict: FeedbackVerdict;
  nextAction: string;
  state: WorkerStatus['state'];
  failureCode: string | null;
  recordsFeedback: boolean;
  needsHuman: boolean;
}

function splitWorkerOption(raw: string, optionName: string): { workerId: string; value: string } {
  const separator = raw.indexOf(':');
  if (separator <= 0 || separator === raw.length - 1) throw new Error(`${optionName} must use <worker>:<value>`);
  return { workerId: slugify(raw.slice(0, separator), 'worker'), value: raw.slice(separator + 1).trim() };
}

function parseTeamOutcome(raw: string): TeamOutcome {
  const { workerId, value } = splitWorkerOption(raw, 'worker-outcome');
  const outcome = value.toLowerCase();
  if (outcome === 'complete' || outcome === 'completed' || outcome === 'pass') {
    return { workerId, rawOutcome: outcome, source: 'runtime', verdict: 'pass', nextAction: 'none', state: 'completed', failureCode: null, recordsFeedback: false, needsHuman: false };
  }
  if (outcome === 'needs-human' || outcome === 'needs_human' || outcome === 'question') {
    return { workerId, rawOutcome: outcome, source: 'runtime', verdict: 'block', nextAction: 'answer-gate', state: 'waiting_on_human', failureCode: 'worker_needs_human', recordsFeedback: false, needsHuman: true };
  }
  if (outcome === 'blocked') {
    return { workerId, rawOutcome: outcome, source: 'runtime', verdict: 'block', nextAction: 'retry-team', state: 'blocked', failureCode: 'worker_blocked', recordsFeedback: true, needsHuman: false };
  }
  if (outcome === 'benchmark-failed') {
    return { workerId, rawOutcome: outcome, source: 'benchmark', verdict: 'retry', nextAction: 'retry-team', state: 'blocked', failureCode: 'benchmark_failed', recordsFeedback: true, needsHuman: false };
  }
  if (outcome === 'reviewer-failed' || outcome === 'rejected') {
    return { workerId, rawOutcome: outcome, source: 'reviewer', verdict: 'retry', nextAction: 'retry-team', state: 'blocked', failureCode: 'reviewer_failed', recordsFeedback: true, needsHuman: false };
  }
  if (outcome === 'failed') {
    return { workerId, rawOutcome: outcome, source: 'runtime', verdict: 'retry', nextAction: 'retry-team', state: 'failed', failureCode: 'worker_failed', recordsFeedback: true, needsHuman: false };
  }
  throw new Error(`unsupported worker-outcome: ${outcome}`);
}

function workerDefinitions(parsed: ParsedHarnessCommand): Array<{ id: string; role: string }> {
  const values = optionList(parsed, 'worker').length ? optionList(parsed, 'worker') : ['implementation', 'review'];
  const definitions = values.map((raw) => {
    const separator = raw.indexOf(':');
    const idSource = separator > 0 ? raw.slice(0, separator) : raw;
    const role = separator > 0 ? raw.slice(separator + 1).trim() : raw;
    return { id: slugify(idSource, 'worker'), role: role || idSource };
  });
  const seen = new Set<string>();
  for (const worker of definitions) {
    if (seen.has(worker.id)) throw new Error(`duplicate worker id after slug normalization: ${worker.id}`);
    seen.add(worker.id);
  }
  return definitions;
}

function workerValueMap(parsed: ParsedHarnessCommand, optionName: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const raw of optionList(parsed, optionName)) {
    const { workerId, value } = splitWorkerOption(raw, optionName);
    if (map.has(workerId)) throw new Error(`duplicate ${optionName} for worker: ${workerId}`);
    map.set(workerId, value);
  }
  return map;
}

function assertUniqueTeamOutcomes(outcomes: TeamOutcome[]) {
  const seen = new Set<string>();
  for (const outcome of outcomes) {
    if (seen.has(outcome.workerId)) throw new Error(`duplicate worker-outcome for worker: ${outcome.workerId}`);
    seen.add(outcome.workerId);
  }
}

function safePlanRef(parsed: ParsedHarnessCommand): { path: string } | null {
  const plan = option(parsed, 'plan') ?? option(parsed, 'plan-ref') ?? option(parsed, 'plan-path');
  if (!plan) return null;
  if (plan.startsWith('/') || plan.includes('..') || plan.includes('\0') || /^[a-z]+:/i.test(plan)) throw new Error(`unsafe team plan ref: ${plan}`);
  return { path: plan };
}

function teamState(workers: WorkerStatus[], humanGates: HumanGate[]): HarnessState {
  if (humanGates.some((gate) => gate.required && gate.status === 'pending')) return 'waiting_on_human';
  if (workers.some((worker) => worker.state === 'failed')) return 'failed';
  if (workers.some((worker) => worker.state === 'blocked')) return 'blocked';
  if (workers.length > 0 && workers.every((worker) => worker.state === 'completed')) return 'completed';
  return 'ready';
}

function teamImprovementSummaries(repoRoot: string, parsed: ParsedHarnessCommand) {
  const query = parsed.intent;
  return inheritedImprovements(repoRoot, parsed).map((item) => ({
    slug: item.slug,
    path: item.path,
    summary: item.content.split('\n').slice(0, 8).join('\n'),
    relevance: { requireQuery: true, query },
  }));
}

function writeTeamWorkerEvidence(repoRoot: string, worker: WorkerStatus, sharedEvidencePath: string) {
  writeFileUnder(repoRoot, worker.evidencePath, [
    `# Worker evidence: ${worker.id}`,
    '',
    `Role: ${worker.role}`,
    `State: ${worker.state}`,
    `Adapter: ${worker.adapter?.adapterId ?? 'unknown'}`,
    `Shared evidence: ${sharedEvidencePath}`,
    worker.failureCode ? `Failure code: ${worker.failureCode}` : 'Failure code: none',
    worker.humanGateIds?.length ? `Human gates: ${worker.humanGateIds.join(', ')}` : 'Human gates: none',
    worker.resumedFromGate ? `Resumed from gate: ${worker.resumedFromGate}` : null,
    '',
  ].filter((line) => line !== null).join('\n'), 'worker evidence path');
}

function writeSharedTeamEvidence(repoRoot: string, runId: string, sharedEvidencePath: string, planRef: { path: string } | null, goal: string, workers: WorkerStatus[]) {
  writeFileUnder(repoRoot, sharedEvidencePath, [
    '# Shared team evidence',
    '',
    `Run ID: ${runId}`,
    planRef ? `Plan: ${planRef.path}` : `Goal: ${goal || 'not recorded'}`,
    '',
    'One shared evidence record for every worker lane in this coordinated team run.',
    '',
    '## Worker lanes',
    '',
    ...workers.map((worker) => `- ${worker.id}: ${worker.state}; evidence ${worker.evidencePath}; adapter ${worker.adapter?.adapterId ?? 'unknown'}; failure ${worker.failureCode ?? 'none'}`),
    '',
    `Feedback path: .osc/runs/${runId}/feedback.jsonl`,
    `Postflight: .osc/runs/${runId}/postflight.md`,
    '',
  ].join('\n'), 'shared team evidence path');
}

function routeTeam(repoRoot: string, parsed: ParsedHarnessCommand): HarnessCommandResult {
  const runId = uniqueRunIdFor(repoRoot, 'team', parsed.intent);
  ensureRunDir(repoRoot, runId);
  const teamOutcomes = optionList(parsed, 'worker-outcome').map(parseTeamOutcome);
  assertUniqueTeamOutcomes(teamOutcomes);
  const outcomeByWorker = new Map(teamOutcomes.map((outcome) => [outcome.workerId, outcome]));
  const adapterByWorker = workerValueMap(parsed, 'worker-adapter');
  const questionByWorker = workerValueMap(parsed, 'worker-question');
  const defaultAdapter = option(parsed, 'adapter') ?? option(parsed, 'runtime') ?? 'plain';
  const sharedEvidencePath = `.osc/runs/${runId}/shared-evidence.md`;
  const workers = workerDefinitions(parsed).map(({ id, role }): WorkerStatus => {
    const outcome = outcomeByWorker.get(id);
    const evidencePath = `.osc/runs/${runId}/workers/${id}/evidence.md`;
    const adapterId = adapterByWorker.get(id) ?? defaultAdapter;
    const humanGateIds = outcome?.needsHuman ? [`worker-${id}-needs-human`] : [];
    return {
      id,
      role,
      state: outcome?.state ?? 'ready',
      evidencePath,
      evidenceLinks: [
        { role: 'shared_evidence', path: sharedEvidencePath },
        { role: 'worker_evidence', path: evidencePath, schema: 'osc.team-worker-lane.v1' },
      ],
      adapter: teamWorkerAdapterMetadata(repoRoot, adapterId),
      failureCode: outcome?.failureCode ?? null,
      humanGateIds,
    };
  });
  for (const outcome of teamOutcomes) {
    if (!workers.some((worker) => worker.id === outcome.workerId)) throw new Error(`worker-outcome references unknown worker: ${outcome.workerId}`);
  }
  for (const workerId of adapterByWorker.keys()) {
    if (!workers.some((worker) => worker.id === workerId)) throw new Error(`worker-adapter references unknown worker: ${workerId}`);
  }
  for (const workerId of questionByWorker.keys()) {
    if (!workers.some((worker) => worker.id === workerId)) throw new Error(`worker-question references unknown worker: ${workerId}`);
  }
  const humanGates: HumanGate[] = workers.flatMap((worker) => {
    const outcome = outcomeByWorker.get(worker.id);
    if (!outcome?.needsHuman) return [];
    const gateId = `worker-${worker.id}-needs-human`;
    return [{
      id: gateId,
      required: true,
      status: 'pending' as const,
      workerId: worker.id,
      adapterId: worker.adapter?.adapterId,
      evidencePath: worker.evidencePath,
      prompt: questionByWorker.get(worker.id) ?? `Worker lane ${worker.id} needs bounded task input before the shared team run can continue.`,
    }];
  });
  const artifacts = [...baseArtifacts(runId), artifact(runId, 'team_run', 'team.json', 'osc.team-run.v1'), artifact(runId, 'shared_evidence', 'shared-evidence.md'), artifact(runId, 'feedback', 'feedback.jsonl', 'osc.feedback.v1')];
  const improvements = teamImprovementSummaries(repoRoot, parsed);
  const repairHypothesis = option(parsed, 'repair-hypothesis') ?? 'Summarize the failed worker lane, preserve shared evidence, and retry only the bounded team scope.';
  const state = teamState(workers, humanGates);
  const planRef = safePlanRef(parsed);
  writeEvent(repoRoot, runId, 'command_started', { command: 'team', intent: parsed.intent, workers: workers.map((worker) => worker.id), planRef });
  for (const worker of workers) {
    writeTeamWorkerEvidence(repoRoot, worker, sharedEvidencePath);
    writeEvent(repoRoot, runId, 'team_worker_status', { workerId: worker.id, state: worker.state, adapterId: worker.adapter?.adapterId, failureCode: worker.failureCode, evidencePath: worker.evidencePath });
  }
  writeSharedTeamEvidence(repoRoot, runId, sharedEvidencePath, planRef, parsed.intent, workers);
  const feedbackRecords = teamOutcomes.filter((outcome) => outcome.recordsFeedback).map((outcome) => recordFeedback({
    repoRoot,
    runId,
    source: outcome.source,
    verdict: outcome.verdict,
    scope: 'run',
    whatHappened: `Team worker ${outcome.workerId} reported ${outcome.rawOutcome} (${outcome.failureCode ?? 'no_failure_code'}).`,
    whyItMatters: 'A shared team run must preserve worker failure feedback and repair input before retrying.',
    repairHypothesis,
    evidencePaths: [sharedEvidencePath, `.osc/runs/${runId}/workers/${outcome.workerId}/evidence.md`],
    nextAction: outcome.nextAction,
  }).record);
  if (humanGates.length) writeEvent(repoRoot, runId, 'human_gate', { gates: humanGates, gateSchema: 'osc.team-shared-gate.v1' });
  if (feedbackRecords.length) writeEvent(repoRoot, runId, 'feedback_recorded', { feedbackPath: `.osc/runs/${runId}/feedback.jsonl`, feedbackIds: feedbackRecords.map((record) => record.id) });
  const repairHypotheses = feedbackRecords.map((record) => ({ workerId: record.whatHappened.match(/Team worker ([^ ]+)/)?.[1] ?? null, hypothesis: record.repairHypothesis ?? repairHypothesis, evidenceIds: [record.id] }));
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/team.json`, {
    schema: 'osc.team-run.v1',
    runId,
    command: '$team',
    intent: parsed.intent,
    planRef,
    status: state,
    workers,
    humanGates,
    sharedEvidence: { path: sharedEvidencePath, schema: 'osc.team-shared-evidence.v1' },
    feedback: { path: `.osc/runs/${runId}/feedback.jsonl`, schema: 'osc.feedback.v1', feedback_is_not_approval: true },
    repairHypotheses,
    improvements: { inherited: improvements },
    controlRoom: { statusPath: `.osc/runs/${runId}/status.json`, eventStreamPath: `.osc/runs/${runId}/events.jsonl`, eventSchema: 'osc.control-room-event.v1', transport: 'neutral' },
    boundary: {
      one_shared_run_record: true,
      one_shared_evidence_record: true,
      shared_postflight: true,
      core_runtime_spawning: false,
      feedback_is_not_approval: true,
      worker_lanes_have_no_owner_authority: true,
      human_owns_merge_publish_release: true,
    },
  }, 'team run path');
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/human-gates.json`, humanGates, 'human gates path');
  writePostflight(repoRoot, runId, 'team', state, {
    feedbackPath: `.osc/runs/${runId}/feedback.jsonl`,
    acceptedImprovementCount: improvements.length,
    repairHypotheses: repairHypotheses.map((item) => item.hypothesis),
  });
  const status = makeStatus({ runId, command: 'team', state, humanGates, artifacts, workers });
  writeStatus(repoRoot, status);
  writeEvent(repoRoot, runId, 'control_room_status', { state, pendingHumanGates: status.pendingHumanGates.length, workerStates: workers.map((worker) => ({ id: worker.id, state: worker.state, failureCode: worker.failureCode ?? null })) });
  const commandEvent = state === 'completed' ? 'command_completed' : state === 'ready' ? 'command_ready' : 'command_blocked';
  writeEvent(repoRoot, runId, commandEvent, { state });
  const message = state === 'waiting_on_human'
    ? 'Team run is waiting on worker-level human task input.'
    : state === 'blocked' || state === 'failed'
      ? 'Team run packaged with shared feedback and repair hypothesis.'
      : 'Team run packaged with worker lanes and shared evidence.';
  return resultFor(repoRoot, runId, 'team', status, humanGates, artifacts, workers, message);
}

export function routeHarnessCommand({ repoRoot = process.cwd(), input }: { repoRoot?: string; input: string }): HarnessCommandResult {
  const parsed = parseHarnessCommand(input);
  if (parsed.command === 'interview') return routeInterview(repoRoot, parsed);
  if (parsed.command === 'plan') return routePlan(repoRoot, parsed);
  if (parsed.command === 'work') return routeWork(repoRoot, parsed);
  return routeTeam(repoRoot, parsed);
}

export const createHarnessRun = routeHarnessCommand;

export function getHarnessStatus({ repoRoot = process.cwd(), runId }: { repoRoot?: string; runId: string }) {
  const safe = safeRunId(runId);
  const status = readJsonUnder<HarnessStatus>(repoRoot, `.osc/runs/${safe}/status.json`, 'harness status path');
  const gates = lexicalExists(join(repoRoot, `.osc/runs/${safe}/human-gates.json`))
    ? readJsonUnder<HumanGate[]>(repoRoot, `.osc/runs/${safe}/human-gates.json`, 'human gates path')
    : [];
  return { ...status, pendingHumanGates: gates.filter((gate) => gate.required && gate.status === 'pending') };
}

export function answerHumanGate({ repoRoot = process.cwd(), runId, gateId, answer }: { repoRoot?: string; runId: string; gateId: string; answer: string }): HarnessCommandResult {
  const safe = safeRunId(runId);
  const gates = readJsonUnder<HumanGate[]>(repoRoot, `.osc/runs/${safe}/human-gates.json`, 'human gates path');
  const status = readJsonUnder<HarnessStatus>(repoRoot, `.osc/runs/${safe}/status.json`, 'harness status path');
  const runPacketPath = join(repoRoot, `.osc/runs/${safe}/run.json`);
  const hasRunPacket = lexicalExists(runPacketPath);
  const packet = hasRunPacket ? readJsonUnder<Record<string, unknown>>(repoRoot, `.osc/runs/${safe}/run.json`, 'work run packet path') : null;
  const gate = gates.find((item) => item.id === gateId);
  if (!gate) throw new Error(`human gate not found: ${gateId}`);
  if (gate.status === 'satisfied') throw new Error(`human gate already satisfied: ${gateId}`);
  const summary = String(answer ?? '').trim();
  if (!summary) throw new Error('human gate answer is required');
  gate.status = 'satisfied';
  gate.answer = {
    summary,
    answeredAt: nowIso(),
    boundary: {
      answer_is_task_input: true,
      answer_is_not_approval: true,
      does_not_grant_commit_push_merge_publish_release: true,
    },
  };
  const pending = gates.filter((item) => item.required && item.status === 'pending');
  const runtime = packet && typeof packet.runtime === 'object' && packet.runtime !== null ? packet.runtime as Record<string, unknown> : null;
  const shouldResumeRuntime = status.command === 'work'
    && gateId.startsWith('runtime-needs-human')
    && pending.length === 0
    && runtime?.spawnAuthority === true
    && typeof runtime.adapter === 'string';

  if (packet) {
    const context = Array.isArray(packet.context) ? packet.context.map((item) => String(item)) : [];
    context.push(`Human answer for ${gate.id}: ${summary}`);
    packet.context = context;
    packet.humanGates = gates;
    packet.status = shouldResumeRuntime ? 'running' : (pending.length ? 'waiting_on_human' : 'ready');
  }

  writeJsonUnder(repoRoot, `.osc/runs/${safe}/human-gates.json`, gates, 'human gates path');
  if (packet) writeJsonUnder(repoRoot, `.osc/runs/${safe}/run.json`, packet, 'work run packet path');
  writeEvent(repoRoot, safe, 'human_gate_answered', { gateId, boundary: gate.answer.boundary });

  if (status.command === 'team' && lexicalExists(join(repoRoot, `.osc/runs/${safe}/team.json`))) {
    const team = readJsonUnder<Record<string, unknown>>(repoRoot, `.osc/runs/${safe}/team.json`, 'team run path');
    const workers = Array.isArray(team.workers) ? team.workers as WorkerStatus[] : [];
    const workerId = gate.workerId ?? gate.id.replace(/^worker-/, '').replace(/-needs-human$/, '');
    for (const worker of workers) {
      if (worker.id !== workerId) continue;
      worker.state = 'ready';
      worker.failureCode = null;
      worker.resumedFromGate = gate.id;
      worker.humanGateIds = (worker.humanGateIds ?? []).filter((id) => id !== gate.id);
    }
    const nextState = teamState(workers, gates);
    team.status = nextState;
    team.workers = workers;
    team.humanGates = gates;
    writeJsonUnder(repoRoot, `.osc/runs/${safe}/team.json`, team, 'team run path');
    const sharedEvidence = team.sharedEvidence as { path?: unknown } | undefined;
    const sharedEvidencePath = typeof sharedEvidence?.path === 'string' ? sharedEvidence.path : `.osc/runs/${safe}/shared-evidence.md`;
    const planRef = team.planRef && typeof team.planRef === 'object' && typeof (team.planRef as { path?: unknown }).path === 'string'
      ? { path: String((team.planRef as { path: unknown }).path) }
      : null;
    const goal = typeof team.intent === 'string' ? team.intent : '';
    for (const worker of workers) writeTeamWorkerEvidence(repoRoot, worker, sharedEvidencePath);
    writeSharedTeamEvidence(repoRoot, safe, sharedEvidencePath, planRef, goal, workers);
    writePostflight(repoRoot, safe, 'team', nextState, {
      feedbackPath: `.osc/runs/${safe}/feedback.jsonl`,
      acceptedImprovementCount: Array.isArray((team.improvements as { inherited?: unknown[] } | undefined)?.inherited) ? (team.improvements as { inherited: unknown[] }).inherited.length : undefined,
      repairHypotheses: Array.isArray(team.repairHypotheses) ? (team.repairHypotheses as Array<{ hypothesis?: unknown }>).map((item) => String(item.hypothesis ?? '')).filter(Boolean) : [],
    });
    const nextStatus = makeStatus({ runId: safe, command: 'team', state: nextState, humanGates: gates, artifacts: status.artifacts, workers });
    writeStatus(repoRoot, nextStatus);
    writeEvent(repoRoot, safe, 'team_worker_resumed', { workerId, gateId, state: nextState });
    writeEvent(repoRoot, safe, 'control_room_status', { state: nextState, pendingHumanGates: nextStatus.pendingHumanGates.length, workerStates: workers.map((worker) => ({ id: worker.id, state: worker.state, failureCode: worker.failureCode ?? null })) });
    const terminalEvent = nextState === 'completed' ? 'command_completed' : nextState === 'ready' ? 'command_ready' : 'command_blocked';
    writeEvent(repoRoot, safe, terminalEvent, { state: nextState });
    return resultFor(repoRoot, safe, 'team', nextStatus, gates, status.artifacts, workers, 'Human gate answer recorded as team task input.');
  }

  if (shouldResumeRuntime && runtime) {
    const runningStatus = makeStatus({ runId: safe, command: 'work', state: 'running', humanGates: gates, artifacts: status.artifacts, workers: status.workers, runtimeSpawned: true });
    writeStatus(repoRoot, runningStatus);
    writeEvent(repoRoot, safe, 'runtime_resume_started', { gateId, adapter: runtime.adapter });
    const timeoutMs = typeof runtime.timeoutMs === 'number' ? runtime.timeoutMs : undefined;
    const maxLogBytes = typeof runtime.maxLogBytes === 'number' ? runtime.maxLogBytes : undefined;
    const model = typeof runtime.model === 'string' ? runtime.model : undefined;
    const effort = typeof runtime.effort === 'string' ? runtime.effort : undefined;
    const receipt = runHarnessRuntimeAdapter({ repoRoot, runId: safe, runPacketPath: `.osc/runs/${safe}/run.json`, adapterId: String(runtime.adapter), allowSpawn: true, timeoutMs, maxLogBytes, model, effort });
    return applyRuntimeReceipt(repoRoot, safe, receipt, gates, status.artifacts);
  }

  const nextState: HarnessState = pending.length ? 'waiting_on_human' : 'ready';
  const nextStatus = makeStatus({ runId: safe, command: status.command, state: nextState, humanGates: gates, artifacts: status.artifacts, workers: status.workers });
  writeStatus(repoRoot, nextStatus);
  return resultFor(repoRoot, safe, status.command, nextStatus, gates, status.artifacts, status.workers, 'Human gate answer recorded as task input.');
}
