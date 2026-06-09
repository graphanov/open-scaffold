import { existsSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { compileHandoffPacket } from './handoff.js';
import { analyzeFeedback, loadAcceptedImprovements, recordFeedback, type FeedbackRecord, type FeedbackSource, type FeedbackVerdict } from './feedback.js';
import { appendJsonLineUnder, createSafeOutputRoot, readJsonlUnder, readJsonUnder, writeFileUnder, writeJsonUnder } from './path-safety.js';
import { HARNESS_RUNTIME_RECEIPT_SCHEMA, runHarnessRuntimeAdapter, type HarnessRuntimeReceipt } from './runtimes.js';

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
  state: 'queued' | 'ready' | 'running' | 'completed' | 'blocked';
  evidencePath: string;
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
  const event = { schema: HARNESS_EVENT_SCHEMA, runId, type, timestamp: nowIso(), ...payload };
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
  const analysis = explicit ? null : analyzeFeedback({ repoRoot, runId: safeParent, writeCandidates: false });
  const repairHypothesis = explicit ?? analysis?.repairHypotheses[0]?.hypothesis ?? 'Retry with a bounded repair hypothesis and preserve the previous attempt evidence.';
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
  const context = [
    ...optionList(parsed, 'context'),
    ...(retry ? [`Repair hypothesis from ${retry.parentRunId}: ${retry.repairHypothesis}`] : []),
  ];
  const humanGates = context.length ? [] : [missingContextGate('work')];
  const allowSpawn = optionFlag(parsed, 'allow-spawn');
  const adapterId = option(parsed, 'adapter') ?? option(parsed, 'runtime') ?? 'codex';
  const timeoutMs = numericOption(parsed, 'timeout-ms', 30 * 60 * 1000);
  const maxLogBytes = numericOption(parsed, 'max-log-bytes', 2_000_000);
  const state: HarnessState = humanGates.length ? 'waiting_on_human' : 'ready';
  const handoff = handoffRequested(parsed) ? { requested: true, maxChars: handoffMaxChars(parsed), path: `.osc/runs/${runId}/handoff.md`, schema: 'osc.handoff-compiler.v1' } : { requested: false };
  const artifacts = [
    ...baseArtifacts(runId),
    artifact(runId, 'run_packet', 'run.json', 'osc.controlled-work-run.v1'),
    artifact(runId, 'work_package', 'work-package.md'),
    ...(retry ? [artifact(runId, 'retry_attempt', 'retry.json', 'osc.harness-retry.v1')] : []),
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
      spawning: allowSpawn && humanGates.length === 0,
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
    boundary: { feedback_is_not_approval: true, human_owns_merge_publish_release: true, runtime_adapter_executes: true, open_scaffold_records_evidence: true },
  };
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/run.json`, runPacket, 'work run packet path');
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
}

function parseTeamOutcome(raw: string): TeamOutcome {
  const [workerRaw, outcomeRaw] = raw.split(':');
  const workerId = slugify(workerRaw ?? '', 'worker');
  const outcome = (outcomeRaw ?? '').trim().toLowerCase();
  if (!workerId || !outcome) throw new Error('worker-outcome must use <worker>:<blocked|failed|rejected|benchmark-failed|reviewer-failed>');
  if (outcome === 'blocked') return { workerId, rawOutcome: outcome, source: 'runtime', verdict: 'block', nextAction: 'retry-team', state: 'blocked' };
  if (outcome === 'benchmark-failed') return { workerId, rawOutcome: outcome, source: 'benchmark', verdict: 'retry', nextAction: 'retry-team', state: 'blocked' };
  if (outcome === 'reviewer-failed' || outcome === 'rejected') return { workerId, rawOutcome: outcome, source: 'reviewer', verdict: 'retry', nextAction: 'retry-team', state: 'blocked' };
  if (outcome === 'failed') return { workerId, rawOutcome: outcome, source: 'runtime', verdict: 'retry', nextAction: 'retry-team', state: 'blocked' };
  throw new Error(`unsupported worker-outcome: ${outcome}`);
}

function routeTeam(repoRoot: string, parsed: ParsedHarnessCommand): HarnessCommandResult {
  const runId = uniqueRunIdFor(repoRoot, 'team', parsed.intent);
  ensureRunDir(repoRoot, runId);
  const teamOutcomes = optionList(parsed, 'worker-outcome').map(parseTeamOutcome);
  const outcomeByWorker = new Map(teamOutcomes.map((outcome) => [outcome.workerId, outcome]));
  const workers = (optionList(parsed, 'worker').length ? optionList(parsed, 'worker') : ['implementation', 'review']).map((id): WorkerStatus => {
    const workerId = slugify(id, 'worker');
    return {
      id: workerId,
      role: id,
      state: outcomeByWorker.get(workerId)?.state ?? 'ready',
      evidencePath: `.osc/runs/${runId}/workers/${workerId}/evidence.md`,
    };
  });
  for (const outcome of teamOutcomes) {
    if (!workers.some((worker) => worker.id === outcome.workerId)) throw new Error(`worker-outcome references unknown worker: ${outcome.workerId}`);
  }
  const artifacts = [...baseArtifacts(runId), artifact(runId, 'team_run', 'team.json', 'osc.team-run.v1'), artifact(runId, 'shared_evidence', 'shared-evidence.md'), artifact(runId, 'feedback', 'feedback.jsonl', 'osc.feedback.v1')];
  const improvements = inheritedImprovements(repoRoot, parsed).map((item) => ({ slug: item.slug, path: item.path, summary: item.content.split('\n').slice(0, 8).join('\n') }));
  const repairHypothesis = option(parsed, 'repair-hypothesis') ?? 'Summarize the failed worker lane, preserve shared evidence, and retry only the bounded team scope.';
  const state: HarnessState = teamOutcomes.length ? 'blocked' : 'ready';
  writeEvent(repoRoot, runId, 'command_started', { command: 'team', intent: parsed.intent, workers: workers.map((worker) => worker.id) });
  for (const worker of workers) writeFileUnder(repoRoot, worker.evidencePath, `# Worker evidence: ${worker.id}\n\nState: ${worker.state}\n`, 'worker evidence path');
  writeFileUnder(repoRoot, `.osc/runs/${runId}/shared-evidence.md`, '# Shared team evidence\n\nOne evidence record for the coordinated team run.\n\nFeedback path: feedback.jsonl\n', 'shared team evidence path');
  const feedbackRecords = teamOutcomes.map((outcome) => recordFeedback({
    repoRoot,
    runId,
    source: outcome.source,
    verdict: outcome.verdict,
    scope: 'run',
    whatHappened: `Team worker ${outcome.workerId} reported ${outcome.rawOutcome}.`,
    whyItMatters: 'A shared team run must preserve worker failure feedback and repair input before retrying.',
    repairHypothesis,
    evidencePaths: [`.osc/runs/${runId}/shared-evidence.md`, `.osc/runs/${runId}/workers/${outcome.workerId}/evidence.md`],
    nextAction: outcome.nextAction,
  }).record);
  if (feedbackRecords.length) writeEvent(repoRoot, runId, 'feedback_recorded', { feedbackPath: `.osc/runs/${runId}/feedback.jsonl`, feedbackIds: feedbackRecords.map((record) => record.id) });
  const repairHypotheses = feedbackRecords.map((record) => ({ hypothesis: record.repairHypothesis ?? repairHypothesis, evidenceIds: [record.id] }));
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/team.json`, {
    schema: 'osc.team-run.v1',
    runId,
    intent: parsed.intent,
    workers,
    feedback: { path: `.osc/runs/${runId}/feedback.jsonl`, schema: 'osc.feedback.v1', feedback_is_not_approval: true },
    repairHypotheses,
    improvements: { inherited: improvements },
    boundary: { one_shared_evidence_record: true, shared_postflight: true, core_runtime_spawning: false, feedback_is_not_approval: true },
  }, 'team run path');
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/human-gates.json`, [], 'human gates path');
  writePostflight(repoRoot, runId, 'team', state, {
    feedbackPath: `.osc/runs/${runId}/feedback.jsonl`,
    acceptedImprovementCount: improvements.length,
    repairHypotheses: repairHypotheses.map((item) => item.hypothesis),
  });
  const status = makeStatus({ runId, command: 'team', state, artifacts, workers });
  writeStatus(repoRoot, status);
  writeEvent(repoRoot, runId, state === 'blocked' ? 'command_blocked' : 'command_completed', { state });
  return resultFor(repoRoot, runId, 'team', status, [], artifacts, workers, state === 'blocked' ? 'Team run packaged with shared feedback and repair hypothesis.' : 'Team run packaged with worker lanes and shared evidence.');
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
