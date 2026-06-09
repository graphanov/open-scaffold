import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { assertAdapterTrusted, AdapterTrustError } from './adapter-trust.js';
import type { ExecutorLane, RuntimeWorkflow } from './artifacts.js';
import { redactSecrets } from './redaction.js';
import { toPosix, writeFileUnder, writeJsonUnder } from './path-safety.js';

export type RuntimeProfileSource = 'builtin' | 'project';
export type RuntimeProfileStatus = 'builtin' | 'adapter-candidate' | 'user-defined';

export interface RuntimeProfile {
  schemaVersion: 'open-scaffold.runtime-profile.v1';
  id: string;
  displayName: string;
  lane: ExecutorLane;
  status: RuntimeProfileStatus;
  description: string;
  links?: {
    homepage?: string | null;
    docs?: string | null;
  };
  workflows?: Partial<Record<RuntimeWorkflow, string | null>>;
  defaults?: {
    workflow?: RuntimeWorkflow | null;
    harnessSkill?: string | null;
    operatorSurface?: string | null;
  };
  authorityDefaults?: {
    sandboxPolicy?: string[];
    commitPolicy?: string;
    pushPolicy?: string;
    mergePolicy?: string;
    approvalPolicy?: string;
  };
  install?: {
    humanHint?: string;
    auto?: false;
  };
  launch?: {
    owner?: 'external-adapter' | 'manual' | 'none';
    commandTemplate?: string | null;
    expectedAdapterId?: string | null;
    spawning?: false;
  };
  evidence?: {
    receiptSchema?: 'open-scaffold.dispatch-receipt.v1';
    expectedPaths?: string[];
  };
  compatibility?: {
    minScaffoldSchema?: 'open-scaffold.run.v1';
  };
  lastReviewed?: string;
  notes?: string;
}

export interface ResolvedRuntimeProfile {
  profile: RuntimeProfile;
  source: RuntimeProfileSource;
  path?: string;
}

const PROFILE_SCHEMA_VERSION = 'open-scaffold.runtime-profile.v1';
const SUPPORTED_LANES: ExecutorLane[] = ['omc-claude', 'omx-codex', 'plain-agent', 'human', 'custom'];
const SUPPORTED_WORKFLOWS: RuntimeWorkflow[] = ['interview', 'plan', 'team', 'loop', 'execute', 'goal', 'custom'];
const SUPPORTED_STATUSES: RuntimeProfileStatus[] = ['builtin', 'adapter-candidate', 'user-defined'];
const SUPPORTED_OPERATOR_SURFACES = ['discord', 'slack', 'telegram', 'github', 'cli', 'none', 'custom'];

export const BUILT_IN_RUNTIME_PROFILES: RuntimeProfile[] = [
  {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: 'omc',
    displayName: 'OMC / oh-my-claudecode',
    lane: 'omc-claude',
    status: 'adapter-candidate',
    description: 'Claude Code + OMC / oh-my-claudecode workflow harness lane.',
    links: { homepage: 'https://github.com/Yeachan-Heo/oh-my-claudecode' },
    workflows: {
      interview: '/deep-interview',
      plan: '/ralplan',
      team: '/team',
      loop: '/ralph',
      execute: '/ultrawork',
      goal: '/ultrawork',
    },
    defaults: { workflow: 'plan', harnessSkill: '/ralplan', operatorSurface: 'none' },
    authorityDefaults: {
      sandboxPolicy: ['write_artifacts_only'],
      commitPolicy: 'commit_forbidden_without_operator_approval',
      pushPolicy: 'push_forbidden_without_operator_approval',
      mergePolicy: 'merge_forbidden_without_operator_approval',
      approvalPolicy: 'human_approval_required',
    },
    install: { humanHint: 'Install OMC from https://github.com/Yeachan-Heo/oh-my-claudecode; configure Claude Code authentication separately.', auto: false },
    launch: { owner: 'external-adapter', commandTemplate: null, expectedAdapterId: null, spawning: false },
    evidence: { receiptSchema: 'open-scaffold.dispatch-receipt.v1', expectedPaths: ['.osc/runs/<run_id>/dispatch-receipt.json'] },
    compatibility: { minScaffoldSchema: 'open-scaffold.run.v1' },
    lastReviewed: '2026-05-15',
    notes: 'Adapter candidate. Open Scaffold core packages the run; OMC/Claude execution remains adapter-owned.',
  },
  {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: 'codex',
    displayName: 'Codex via OMX / oh-my-codex',
    lane: 'omx-codex',
    status: 'adapter-candidate',
    description: 'User-facing Codex runtime preset backed by the current OMX / oh-my-codex adapter path.',
    links: { homepage: 'https://github.com/Yeachan-Heo/oh-my-codex', docs: 'https://github.com/graphanov/open-scaffold/tree/main/packages/runtime-omx' },
    workflows: {
      interview: '$deep-interview',
      plan: '$ralplan',
      team: '$team',
      loop: '$ralph',
      execute: '$ultrawork',
      goal: '$ultragoal',
    },
    defaults: { workflow: 'plan', harnessSkill: '$ralplan', operatorSurface: 'none' },
    authorityDefaults: {
      sandboxPolicy: ['write_artifacts_only'],
      commitPolicy: 'commit_forbidden_without_operator_approval',
      pushPolicy: 'push_forbidden_without_operator_approval',
      mergePolicy: 'merge_forbidden_without_operator_approval',
      approvalPolicy: 'human_approval_required',
    },
    install: { humanHint: 'Install OMX / oh-my-codex for the current Codex harness path; configure Codex authentication separately. Direct Codex-only adapter support remains future work.', auto: false },
    launch: { owner: 'external-adapter', commandTemplate: 'open-scaffold-runtime-omx <run.json>', expectedAdapterId: 'runtime-omx', spawning: false },
    evidence: { receiptSchema: 'open-scaffold.dispatch-receipt.v1', expectedPaths: ['.osc/runs/<run_id>/dispatch-receipt.json', '.osc/runs/<run_id>/runtime-omx-evidence.md'] },
    compatibility: { minScaffoldSchema: 'open-scaffold.run.v1' },
    lastReviewed: '2026-05-26',
    notes: 'Codex-first alias for broad users. The current adapter implementation remains runtime-omx; core packages the run and does not spawn.',
  },
  {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: 'omx',
    displayName: 'OMX / oh-my-codex',
    lane: 'omx-codex',
    status: 'adapter-candidate',
    description: 'Explicit OMX / oh-my-codex workflow harness lane for users who want the harness name.',
    links: { homepage: 'https://github.com/Yeachan-Heo/oh-my-codex', docs: 'https://github.com/graphanov/open-scaffold/tree/main/packages/runtime-omx' },
    workflows: {
      interview: '$deep-interview',
      plan: '$ralplan',
      team: '$team',
      loop: '$ralph',
      execute: '$ultrawork',
      goal: '$ultragoal',
    },
    defaults: { workflow: 'plan', harnessSkill: '$ralplan', operatorSurface: 'none' },
    authorityDefaults: {
      sandboxPolicy: ['write_artifacts_only'],
      commitPolicy: 'commit_forbidden_without_operator_approval',
      pushPolicy: 'push_forbidden_without_operator_approval',
      mergePolicy: 'merge_forbidden_without_operator_approval',
      approvalPolicy: 'human_approval_required',
    },
    install: { humanHint: 'Install OMX from https://github.com/Yeachan-Heo/oh-my-codex; configure Codex authentication separately.', auto: false },
    launch: { owner: 'external-adapter', commandTemplate: 'open-scaffold-runtime-omx <run.json>', expectedAdapterId: 'runtime-omx', spawning: false },
    evidence: { receiptSchema: 'open-scaffold.dispatch-receipt.v1', expectedPaths: ['.osc/runs/<run_id>/dispatch-receipt.json', '.osc/runs/<run_id>/runtime-omx-evidence.md'] },
    compatibility: { minScaffoldSchema: 'open-scaffold.run.v1' },
    lastReviewed: '2026-05-26',
    notes: 'Adapter candidate. Open Scaffold core packages the run; runtime-omx consumes this OMX/Codex lane while execution remains adapter-owned.',
  },
  {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: 'plain',
    displayName: 'Plain agent',
    lane: 'plain-agent',
    status: 'builtin',
    description: 'Runtime-neutral prompt package for any capable agent or human-operated CLI.',
    defaults: { workflow: null, harnessSkill: null, operatorSurface: 'none' },
    install: { humanHint: 'Use any agent/runtime capable of consuming the generated prompt package.', auto: false },
    launch: { owner: 'manual', commandTemplate: null, expectedAdapterId: null, spawning: false },
    evidence: { receiptSchema: 'open-scaffold.dispatch-receipt.v1', expectedPaths: ['.osc/runs/<run_id>/dispatch-receipt.json'] },
    compatibility: { minScaffoldSchema: 'open-scaffold.run.v1' },
    lastReviewed: '2026-05-15',
  },
  {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: 'human',
    displayName: 'Human/manual',
    lane: 'human',
    status: 'builtin',
    description: 'Manual execution while preserving Open Scaffold evidence and approval gates.',
    defaults: { workflow: null, harnessSkill: null, operatorSurface: 'none' },
    install: { humanHint: 'No runtime install required.', auto: false },
    launch: { owner: 'manual', commandTemplate: null, expectedAdapterId: null, spawning: false },
    evidence: { receiptSchema: 'open-scaffold.dispatch-receipt.v1', expectedPaths: ['.osc/runs/<run_id>/dispatch-receipt.json'] },
    compatibility: { minScaffoldSchema: 'open-scaffold.run.v1' },
    lastReviewed: '2026-05-15',
  },
  {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: 'custom',
    displayName: 'Custom adapter',
    lane: 'custom',
    status: 'builtin',
    description: 'Placeholder lane for adapter-defined execution. Prefer a project-local profile for repeatable custom runtimes.',
    defaults: { workflow: 'custom', harnessSkill: null, operatorSurface: 'none' },
    install: { humanHint: 'Define adapter-specific setup outside Open Scaffold core.', auto: false },
    launch: { owner: 'external-adapter', commandTemplate: null, expectedAdapterId: null, spawning: false },
    evidence: { receiptSchema: 'open-scaffold.dispatch-receipt.v1', expectedPaths: ['.osc/runs/<run_id>/dispatch-receipt.json'] },
    compatibility: { minScaffoldSchema: 'open-scaffold.run.v1' },
    lastReviewed: '2026-05-15',
  },
];

export const RESERVED_RUNTIME_PROFILE_IDS = new Set(BUILT_IN_RUNTIME_PROFILES.map((profile) => profile.id));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string, errors: string[]): string | undefined {
  const value = record[key];
  if (typeof value === 'string' && value.trim()) return value;
  errors.push(`${key} must be a non-empty string`);
  return undefined;
}

function validateWorkflows(value: unknown, errors: string[]): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    errors.push('workflows must be an object');
    return;
  }
  for (const [workflow, harnessSkill] of Object.entries(value)) {
    if (!SUPPORTED_WORKFLOWS.includes(workflow as RuntimeWorkflow)) {
      errors.push(`workflows.${workflow} is not a supported workflow`);
    }
    if (harnessSkill !== null && typeof harnessSkill !== 'string') {
      errors.push(`workflows.${workflow} must be a string or null`);
    }
    if (typeof harnessSkill === 'string' && !harnessSkill.trim()) {
      errors.push(`workflows.${workflow} must not be an empty string`);
    }
  }
}

export function validateRuntimeProfile(value: unknown): { ok: true; profile: RuntimeProfile } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ['profile must be a JSON object'] };

  const schemaVersion = requireString(value, 'schemaVersion', errors);
  const id = requireString(value, 'id', errors);
  requireString(value, 'displayName', errors);
  const lane = requireString(value, 'lane', errors);
  const status = requireString(value, 'status', errors);
  requireString(value, 'description', errors);

  if (schemaVersion && schemaVersion !== PROFILE_SCHEMA_VERSION) errors.push(`schemaVersion must be ${PROFILE_SCHEMA_VERSION}`);
  if (id && !/^[a-z][a-z0-9._-]*$/.test(id)) errors.push('id must start with a lowercase letter and contain only lowercase letters, numbers, dot, underscore, or hyphen');
  if (lane && !SUPPORTED_LANES.includes(lane as ExecutorLane)) errors.push(`lane must be one of: ${SUPPORTED_LANES.join(', ')}`);
  if (status && !SUPPORTED_STATUSES.includes(status as RuntimeProfileStatus)) errors.push(`status must be one of: ${SUPPORTED_STATUSES.join(', ')}`);

  validateWorkflows(value.workflows, errors);

  if (value.defaults !== undefined && !isRecord(value.defaults)) {
    errors.push('defaults must be an object');
  }
  if (isRecord(value.defaults)) {
    const workflow = value.defaults.workflow;
    if (workflow !== undefined && workflow !== null && !SUPPORTED_WORKFLOWS.includes(workflow as RuntimeWorkflow)) {
      errors.push(`defaults.workflow must be one of: ${SUPPORTED_WORKFLOWS.join(', ')}`);
    }
    if (value.defaults.harnessSkill !== undefined && value.defaults.harnessSkill !== null && typeof value.defaults.harnessSkill !== 'string') {
      errors.push('defaults.harnessSkill must be a string or null');
    }
    if (typeof value.defaults.harnessSkill === 'string' && !value.defaults.harnessSkill.trim()) {
      errors.push('defaults.harnessSkill must not be an empty string');
    }
    if (value.defaults.operatorSurface !== undefined && value.defaults.operatorSurface !== null && !SUPPORTED_OPERATOR_SURFACES.includes(String(value.defaults.operatorSurface))) {
      errors.push(`defaults.operatorSurface must be one of: ${SUPPORTED_OPERATOR_SURFACES.join(', ')}`);
    }
  }

  if (value.install !== undefined && !isRecord(value.install)) {
    errors.push('install must be an object');
  }
  if (isRecord(value.install) && value.install.auto !== undefined && value.install.auto !== false) {
    errors.push('install.auto must be false; Open Scaffold core does not execute runtime installers in v0');
  }
  if (value.launch !== undefined && !isRecord(value.launch)) {
    errors.push('launch must be an object');
  }
  if (isRecord(value.launch) && value.launch.spawning !== undefined && value.launch.spawning !== false) {
    errors.push('launch.spawning must be false; Open Scaffold core does not spawn runtimes in v0');
  }
  if (isRecord(value.launch) && value.launch.commandTemplate !== undefined && value.launch.commandTemplate !== null && typeof value.launch.commandTemplate !== 'string') {
    errors.push('launch.commandTemplate must be a string or null');
  }

  return errors.length ? { ok: false, errors } : { ok: true, profile: value as unknown as RuntimeProfile };
}

function readProjectProfiles(root: string): ResolvedRuntimeProfile[] {
  const dir = join(root, '.osc', 'runtimes');
  if (!existsSync(dir)) return [];
  const profiles: ResolvedRuntimeProfile[] = [];
  const seenProjectIds = new Set<string>();
  for (const entry of readdirSync(dir).sort()) {
    if (!entry.endsWith('.json')) continue;
    const path = join(dir, entry);
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
      throw new Error(`Invalid runtime profile JSON at ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const validation = validateRuntimeProfile(parsed);
    if (validation.ok === false) {
      throw new Error(`Invalid runtime profile at ${path}: ${validation.errors.join('; ')}`);
    }
    if (RESERVED_RUNTIME_PROFILE_IDS.has(validation.profile.id)) {
      throw new Error(`Project runtime profile ${path} uses reserved built-in id: ${validation.profile.id}`);
    }
    if (seenProjectIds.has(validation.profile.id)) {
      throw new Error(`Duplicate project runtime profile id: ${validation.profile.id}`);
    }
    seenProjectIds.add(validation.profile.id);
    profiles.push({ profile: validation.profile, source: 'project', path });
  }
  return profiles;
}

export function loadRuntimeProfiles(root: string): ResolvedRuntimeProfile[] {
  return [
    ...BUILT_IN_RUNTIME_PROFILES.map((profile) => ({ profile, source: 'builtin' as const })),
    ...readProjectProfiles(root),
  ];
}

export function resolveRuntimeProfile(root: string, id: string): ResolvedRuntimeProfile | null {
  return loadRuntimeProfiles(root).find((entry) => entry.profile.id === id) ?? null;
}

export const HARNESS_RUNTIME_RECEIPT_SCHEMA = 'osc.harness-runtime-receipt.v1';

export type LomeinRuntimeMarker = 'LOMEIN_COMPLETE' | 'LOMEIN_NEEDS_HUMAN' | 'LOMEIN_BLOCKED';
export type LomeinRuntimeMarkerState = 'complete' | 'needs_human' | 'blocked' | 'missing' | 'duplicate' | 'non_final';
export type HarnessRuntimeStatus = 'dry_run' | 'completed' | 'needs_human' | 'blocked' | 'failed';
export type HarnessRuntimeFailureCode =
  | 'spawn_authority_missing'
  | 'adapter_not_found'
  | 'adapter_not_trusted'
  | 'adapter_config_invalid'
  | 'runtime_timeout'
  | 'runtime_signaled'
  | 'runtime_non_zero'
  | 'runtime_marker_missing'
  | 'runtime_marker_duplicate'
  | 'runtime_marker_non_final'
  | 'runtime_blocked'
  | 'runtime_spawn_error';

export interface LomeinRuntimeMarkerParse {
  state: LomeinRuntimeMarkerState;
  marker: LomeinRuntimeMarker | null;
  count: number;
  finalStandalone: boolean;
  context: string;
}

export interface RuntimeProcessOutcome {
  stdout: string;
  stderr: string;
  status: number | null;
  signal: string | null;
  timedOut: boolean;
}

export interface RuntimeOutcomeClassification {
  status: Exclude<HarnessRuntimeStatus, 'dry_run'>;
  failureCode: HarnessRuntimeFailureCode | null;
  marker: LomeinRuntimeMarkerParse;
}

interface ProjectAdapterConfigFile {
  schemaVersion?: unknown;
  id?: unknown;
  command?: unknown;
  timeoutMs?: unknown;
  maxStdoutBytes?: unknown;
  maxStderrBytes?: unknown;
  env?: unknown;
  envAllowlist?: unknown;
}

interface RuntimeAdapterDefinition {
  id: string;
  name: string;
  command: string[];
  timeoutMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
  env: Record<string, string>;
  envAllowlist: string[];
  kind: 'builtin-codex' | 'project';
  appendRunPacketArg: boolean;
}

export interface HarnessRuntimeReceipt {
  schema: typeof HARNESS_RUNTIME_RECEIPT_SCHEMA;
  runId: string;
  adapterName: string;
  adapterId: string;
  commandSummary: string[];
  timeoutMs: number;
  spawned: boolean;
  status: HarnessRuntimeStatus;
  exit: { status: number | null; signal: string | null; timedOut: boolean };
  marker: (LomeinRuntimeMarkerParse | { state: 'not_run'; marker: null; count: 0; finalStandalone: false; context: '' });
  evidencePaths: Array<{ role: string; path: string; schema?: string }>;
  logs: Array<{ role: 'stdout' | 'stderr'; path: string; maxBytes: number; truncated: boolean }>;
  failure: { code: HarnessRuntimeFailureCode | null; message: string | null };
  boundary: {
    runtime_adapter_executes: true;
    open_scaffold_records_evidence: true;
    human_gate_answers_are_task_input: true;
    human_owns_commit_push_merge_publish_release: true;
  };
}

export interface RunHarnessRuntimeOptions {
  repoRoot: string;
  runId: string;
  runPacketPath: string;
  adapterId: string;
  allowSpawn: boolean;
  timeoutMs?: number;
  maxLogBytes?: number;
  model?: string;
  effort?: string;
}

const knownMarkers = new Set<LomeinRuntimeMarker>(['LOMEIN_COMPLETE', 'LOMEIN_NEEDS_HUMAN', 'LOMEIN_BLOCKED']);
const markerLinePattern = /^(LOMEIN_COMPLETE|LOMEIN_NEEDS_HUMAN|LOMEIN_BLOCKED)$/;
const defaultHarnessRuntimeTimeoutMs = 10 * 60 * 1000;
const maxHarnessRuntimeTimeoutMs = 30 * 60 * 1000;
const defaultHarnessRuntimeLogBytes = 64 * 1024;
const maxHarnessRuntimeLogBytes = 2_000_000;
const controlCharPattern = /[\u0000-\u001F\u007F]/;

function isSafeRuntimeAdapterId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) && !value.includes('..');
}

function readPositiveInteger(value: unknown, field: string, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || typeof value !== 'number' || value <= 0) throw new Error(`${field} must be a positive integer`);
  if (value > max) throw new Error(`${field} must be at most ${max}`);
  return value;
}

function readStringRecord(value: unknown, field: string): Record<string, string> {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${field} must be an object with string values`);
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error(`${field} contains an invalid environment variable name`);
    if (typeof raw !== 'string') throw new Error(`${field} must be an object with string values`);
    if (controlCharPattern.test(raw)) throw new Error(`${field} contains unsupported control characters`);
    out[key] = raw;
  }
  return out;
}

function readStringArray(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || !entry.trim())) throw new Error(`${field} must be an array of non-empty strings`);
  return value.map((entry) => entry.trim());
}

function loadProjectRuntimeAdapter(repoRoot: string, adapterId: string): RuntimeAdapterDefinition | null {
  if (!isSafeRuntimeAdapterId(adapterId)) throw new Error(`Unsafe adapter id: ${adapterId}`);
  const path = join(repoRoot, '.osc', 'adapters', `${adapterId}.json`);
  if (!existsSync(path)) return null;
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as ProjectAdapterConfigFile;
  if (parsed.schemaVersion !== 'open-scaffold.adapter.v1') throw new Error(`Adapter ${adapterId} has unsupported schemaVersion; expected open-scaffold.adapter.v1.`);
  if (parsed.id !== adapterId) throw new Error(`Adapter config id mismatch: expected ${adapterId}.`);
  if (!Array.isArray(parsed.command) || parsed.command.length === 0 || parsed.command.some((part) => typeof part !== 'string' || !part.trim())) {
    throw new Error(`Adapter ${adapterId} command must be a non-empty string array.`);
  }
  return {
    id: adapterId,
    name: adapterId,
    command: parsed.command.map((part) => String(part)),
    timeoutMs: readPositiveInteger(parsed.timeoutMs, `Adapter ${adapterId} timeoutMs`, defaultHarnessRuntimeTimeoutMs, maxHarnessRuntimeTimeoutMs),
    maxStdoutBytes: readPositiveInteger(parsed.maxStdoutBytes, `Adapter ${adapterId} maxStdoutBytes`, defaultHarnessRuntimeLogBytes, maxHarnessRuntimeLogBytes),
    maxStderrBytes: readPositiveInteger(parsed.maxStderrBytes, `Adapter ${adapterId} maxStderrBytes`, defaultHarnessRuntimeLogBytes, maxHarnessRuntimeLogBytes),
    env: readStringRecord(parsed.env, `Adapter ${adapterId} env`),
    envAllowlist: readStringArray(parsed.envAllowlist, `Adapter ${adapterId} envAllowlist`),
    kind: 'project',
    appendRunPacketArg: true,
  };
}

function builtInCodexRuntimeAdapter(options: RunHarnessRuntimeOptions): RuntimeAdapterDefinition {
  const model = options.model?.trim() || 'gpt-5.5';
  const effort = options.effort?.trim() || 'xhigh';
  return {
    id: 'codex',
    name: 'codex',
    command: ['codex', 'exec', '--sandbox', 'workspace-write', '--model', model, '-c', `model_reasoning_effort="${effort}"`, '-'],
    timeoutMs: options.timeoutMs ?? defaultHarnessRuntimeTimeoutMs,
    maxStdoutBytes: options.maxLogBytes ?? defaultHarnessRuntimeLogBytes,
    maxStderrBytes: options.maxLogBytes ?? defaultHarnessRuntimeLogBytes,
    env: {},
    envAllowlist: ['PATH', 'HOME'],
    kind: 'builtin-codex',
    appendRunPacketArg: false,
  };
}

function resolveHarnessRuntimeAdapter(options: RunHarnessRuntimeOptions): RuntimeAdapterDefinition {
  const project = loadProjectRuntimeAdapter(options.repoRoot, options.adapterId);
  if (project) {
    return {
      ...project,
      timeoutMs: options.timeoutMs ?? project.timeoutMs,
      maxStdoutBytes: options.maxLogBytes ?? project.maxStdoutBytes,
      maxStderrBytes: options.maxLogBytes ?? project.maxStderrBytes,
    };
  }
  if (options.adapterId === 'codex') return builtInCodexRuntimeAdapter(options);
  throw new Error(`Unknown runtime adapter: ${options.adapterId}`);
}

function envForAdapter(adapter: RuntimeAdapterDefinition): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  const allowlist = new Set(['PATH', ...adapter.envAllowlist]);
  for (const key of allowlist) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  return { ...env, ...adapter.env };
}

function commandPartSummary(repoRoot: string, part: string, index: number): string {
  const normalized = part.replace(/\\/g, '/');
  const absolute = isAbsolute(part) ? resolve(part) : resolve(repoRoot, part);
  const root = resolve(repoRoot);
  const rel = relative(root, absolute);
  if ((part.includes('/') || part.includes('\\') || isAbsolute(part)) && rel && !rel.startsWith('..') && !isAbsolute(rel)) return toPosix(rel);
  if (index === 0 && isAbsolute(part)) return basename(part);
  return sanitizeRuntimeText(normalized, repoRoot);
}

function commandSummary(repoRoot: string, adapter: RuntimeAdapterDefinition): string[] {
  return adapter.command.map((part, index) => commandPartSummary(repoRoot, part, index));
}

function sanitizeRuntimeText(text: string, repoRoot: string): string {
  const root = resolve(repoRoot);
  let output = redactSecrets(text).split(root).join('<repo>');
  try {
    output = output.split(resolve(repoRoot)).join('<repo>');
  } catch {}
  const home = process.env.HOME;
  if (home) output = output.split(home).join('<home>');
  return output;
}

function truncateRuntimeLog(content: string, maxBytes: number): { content: string; truncated: boolean } {
  const data = Buffer.from(content, 'utf8');
  if (data.length <= maxBytes) return { content, truncated: false };
  const marker = `\n[open-scaffold: runtime log truncated to ${maxBytes} bytes from ${data.length} bytes]\n`;
  const retained = data.subarray(0, maxBytes).toString('utf8');
  const lastNewline = retained.lastIndexOf('\n');
  const prefix = lastNewline >= 0 ? retained.slice(0, lastNewline + 1) : retained;
  return { content: `${prefix}${marker}`, truncated: true };
}

function runPacketPrompt(repoRoot: string, runPacketPath: string): string {
  const packet = sanitizeRuntimeText(readFileSync(resolve(repoRoot, runPacketPath), 'utf8'), repoRoot);
  return [
    'You are a bounded Open Scaffold runtime adapter worker.',
    'Execute only the work package below. Do not commit, push, merge, publish, release, deploy, rewrite history, or touch credentials.',
    'If you complete the bounded work, end your final answer with exactly one standalone final line: LOMEIN_COMPLETE',
    'If you need human task input, put the question/context before the final standalone line: LOMEIN_NEEDS_HUMAN',
    'If you are blocked, explain why before the final standalone line: LOMEIN_BLOCKED',
    '',
    '<run.json>',
    packet,
    '</run.json>',
    '',
  ].join('\n');
}

export function parseLomeinRuntimeMarker(output: string): LomeinRuntimeMarkerParse {
  const normalized = String(output ?? '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const meaningful = lines.map((line, index) => ({ raw: line, trimmed: line.trim(), index })).filter((line) => line.trimmed.length > 0);
  const markerLines = meaningful.filter((line) => markerLinePattern.test(line.trimmed));
  if (markerLines.length === 0) return { state: 'missing', marker: null, count: 0, finalStandalone: false, context: '' };
  const last = meaningful.at(-1);
  const finalStandalone = Boolean(last && markerLinePattern.test(last.trimmed));
  const marker = markerLines.at(-1)?.trimmed as LomeinRuntimeMarker;
  const context = markerLines.length ? lines.slice(0, markerLines[0]!.index).join('\n').trim() : '';
  if (markerLines.length > 1) return { state: 'duplicate', marker, count: markerLines.length, finalStandalone, context };
  if (!finalStandalone) return { state: 'non_final', marker, count: 1, finalStandalone: false, context };
  if (!knownMarkers.has(marker)) return { state: 'missing', marker: null, count: 0, finalStandalone: false, context: '' };
  if (marker === 'LOMEIN_COMPLETE') return { state: 'complete', marker, count: 1, finalStandalone: true, context };
  if (marker === 'LOMEIN_NEEDS_HUMAN') return { state: 'needs_human', marker, count: 1, finalStandalone: true, context };
  return { state: 'blocked', marker, count: 1, finalStandalone: true, context };
}

function sanitizeMarkerParse(marker: LomeinRuntimeMarkerParse, repoRoot: string): LomeinRuntimeMarkerParse {
  const sanitized = sanitizeRuntimeText(marker.context, repoRoot);
  const maxContextChars = 4000;
  const context = sanitized.length > maxContextChars
    ? `${sanitized.slice(0, maxContextChars)}\n[open-scaffold: runtime marker context truncated from ${sanitized.length} chars]`
    : sanitized;
  return { ...marker, context };
}

export function classifyRuntimeOutcome(outcome: RuntimeProcessOutcome): RuntimeOutcomeClassification {
  const marker = parseLomeinRuntimeMarker(outcome.stdout);
  if (outcome.timedOut) return { status: 'failed', failureCode: 'runtime_timeout', marker };
  if (outcome.signal) return { status: 'failed', failureCode: 'runtime_signaled', marker };
  if (outcome.status !== 0) return { status: 'failed', failureCode: 'runtime_non_zero', marker };
  if (marker.state === 'complete') return { status: 'completed', failureCode: null, marker };
  if (marker.state === 'needs_human') return { status: 'needs_human', failureCode: null, marker };
  if (marker.state === 'blocked') return { status: 'blocked', failureCode: 'runtime_blocked', marker };
  if (marker.state === 'duplicate') return { status: 'failed', failureCode: 'runtime_marker_duplicate', marker };
  if (marker.state === 'non_final') return { status: 'failed', failureCode: 'runtime_marker_non_final', marker };
  return { status: 'failed', failureCode: 'runtime_marker_missing', marker };
}

function receiptBase(options: RunHarnessRuntimeOptions, adapter: RuntimeAdapterDefinition, spawned: boolean): Omit<HarnessRuntimeReceipt, 'status' | 'exit' | 'marker' | 'failure' | 'logs' | 'evidencePaths'> {
  return {
    schema: HARNESS_RUNTIME_RECEIPT_SCHEMA,
    runId: options.runId,
    adapterName: adapter.name,
    adapterId: adapter.id,
    commandSummary: commandSummary(options.repoRoot, adapter),
    timeoutMs: adapter.timeoutMs,
    spawned,
    boundary: {
      runtime_adapter_executes: true,
      open_scaffold_records_evidence: true,
      human_gate_answers_are_task_input: true,
      human_owns_commit_push_merge_publish_release: true,
    },
  };
}

function writeReceipt(repoRoot: string, runId: string, receipt: HarnessRuntimeReceipt): HarnessRuntimeReceipt {
  writeJsonUnder(repoRoot, `.osc/runs/${runId}/runtime-receipt.json`, receipt, 'harness runtime receipt path');
  return receipt;
}

function failureMessage(code: HarnessRuntimeFailureCode | null): string | null {
  if (!code) return null;
  const messages: Record<HarnessRuntimeFailureCode, string> = {
    spawn_authority_missing: 'Runtime spawn authority was not passed; wrote a dry-run receipt instead.',
    adapter_not_found: 'Runtime adapter was not found.',
    adapter_not_trusted: 'Runtime adapter is not trusted for local execution.',
    adapter_config_invalid: 'Runtime adapter config is invalid.',
    runtime_timeout: 'Runtime process timed out.',
    runtime_signaled: 'Runtime process ended because of a signal.',
    runtime_non_zero: 'Runtime process exited non-zero.',
    runtime_marker_missing: 'Runtime output did not end with a required marker.',
    runtime_marker_duplicate: 'Runtime output contained more than one standalone marker.',
    runtime_marker_non_final: 'Runtime marker was not the final standalone line.',
    runtime_blocked: 'Runtime reported LOMEIN_BLOCKED.',
    runtime_spawn_error: 'Runtime process failed before a normal exit.',
  };
  return messages[code];
}

function adapterErrorReceipt(options: RunHarnessRuntimeOptions, adapterId: string, code: HarnessRuntimeFailureCode, message: string): HarnessRuntimeReceipt {
  const fallback: RuntimeAdapterDefinition = {
    id: adapterId,
    name: adapterId,
    command: [],
    timeoutMs: options.timeoutMs ?? defaultHarnessRuntimeTimeoutMs,
    maxStdoutBytes: options.maxLogBytes ?? defaultHarnessRuntimeLogBytes,
    maxStderrBytes: options.maxLogBytes ?? defaultHarnessRuntimeLogBytes,
    env: {},
    envAllowlist: [],
    kind: 'project',
    appendRunPacketArg: true,
  };
  return writeReceipt(options.repoRoot, options.runId, {
    ...receiptBase(options, fallback, false),
    status: 'failed',
    exit: { status: null, signal: null, timedOut: false },
    marker: { state: 'not_run', marker: null, count: 0, finalStandalone: false, context: '' },
    logs: [],
    evidencePaths: [{ role: 'runtime_receipt', path: `.osc/runs/${options.runId}/runtime-receipt.json`, schema: HARNESS_RUNTIME_RECEIPT_SCHEMA }],
    failure: { code, message: sanitizeRuntimeText(message, options.repoRoot) },
  });
}

export function runHarnessRuntimeAdapter(options: RunHarnessRuntimeOptions): HarnessRuntimeReceipt {
  let adapter: RuntimeAdapterDefinition;
  try {
    adapter = resolveHarnessRuntimeAdapter(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code: HarnessRuntimeFailureCode = /unknown runtime adapter/i.test(message) ? 'adapter_not_found' : 'adapter_config_invalid';
    return adapterErrorReceipt(options, options.adapterId, code, message);
  }

  const base = receiptBase(options, adapter, options.allowSpawn);
  const receiptPath = `.osc/runs/${options.runId}/runtime-receipt.json`;
  if (!options.allowSpawn) {
    return writeReceipt(options.repoRoot, options.runId, {
      ...base,
      status: 'dry_run',
      exit: { status: null, signal: null, timedOut: false },
      marker: { state: 'not_run', marker: null, count: 0, finalStandalone: false, context: '' },
      logs: [],
      evidencePaths: [{ role: 'runtime_receipt', path: receiptPath, schema: HARNESS_RUNTIME_RECEIPT_SCHEMA }],
      failure: { code: 'spawn_authority_missing', message: failureMessage('spawn_authority_missing') },
    });
  }

  if (adapter.kind === 'project') {
    try {
      assertAdapterTrusted(adapter.id, options.repoRoot);
    } catch (error) {
      const message = error instanceof AdapterTrustError || error instanceof Error ? error.message : String(error);
      return adapterErrorReceipt(options, adapter.id, 'adapter_not_trusted', message);
    }
  }

  const runPacketPath = toPosix(relative(resolve(options.repoRoot), resolve(options.repoRoot, options.runPacketPath)));
  const args = adapter.appendRunPacketArg ? [...adapter.command.slice(1), runPacketPath] : adapter.command.slice(1);
  const input = adapter.appendRunPacketArg ? undefined : runPacketPrompt(options.repoRoot, runPacketPath);
  const result = spawnSync(adapter.command[0]!, args, {
    cwd: options.repoRoot,
    encoding: 'utf8',
    env: envForAdapter(adapter),
    timeout: adapter.timeoutMs,
    killSignal: 'SIGKILL',
    maxBuffer: Math.max(adapter.maxStdoutBytes + adapter.maxStderrBytes + 64 * 1024, 128 * 1024),
    input,
  });

  const timedOut = (result.error as { code?: unknown } | undefined)?.code === 'ETIMEDOUT';
  const rawStdout = String(result.stdout ?? '');
  const rawStderr = [String(result.stderr ?? ''), result.error && !timedOut ? `[open-scaffold: runtime process error] ${result.error.message}` : ''].filter(Boolean).join('\n');
  const stdout = truncateRuntimeLog(sanitizeRuntimeText(rawStdout, options.repoRoot), adapter.maxStdoutBytes);
  const stderr = truncateRuntimeLog(sanitizeRuntimeText(rawStderr, options.repoRoot), adapter.maxStderrBytes);
  const stdoutPath = `.osc/runs/${options.runId}/runtime/stdout.log`;
  const stderrPath = `.osc/runs/${options.runId}/runtime/stderr.log`;
  writeFileUnder(options.repoRoot, stdoutPath, stdout.content, 'harness runtime stdout log path');
  writeFileUnder(options.repoRoot, stderrPath, stderr.content, 'harness runtime stderr log path');

  const classification = classifyRuntimeOutcome({
    stdout: rawStdout,
    stderr: rawStderr,
    status: result.status,
    signal: result.signal,
    timedOut,
  });
  if (result.error && !timedOut) classification.failureCode = 'runtime_spawn_error';
  classification.marker = sanitizeMarkerParse(classification.marker, options.repoRoot);
  const logs: HarnessRuntimeReceipt['logs'] = [
    { role: 'stdout', path: stdoutPath, maxBytes: adapter.maxStdoutBytes, truncated: stdout.truncated },
    { role: 'stderr', path: stderrPath, maxBytes: adapter.maxStderrBytes, truncated: stderr.truncated },
  ];
  const evidencePaths = [
    { role: 'runtime_receipt', path: receiptPath, schema: HARNESS_RUNTIME_RECEIPT_SCHEMA },
    { role: 'runtime_stdout_log', path: stdoutPath },
    { role: 'runtime_stderr_log', path: stderrPath },
  ];
  return writeReceipt(options.repoRoot, options.runId, {
    ...base,
    status: classification.status,
    exit: { status: result.status, signal: result.signal, timedOut },
    marker: classification.marker,
    logs,
    evidencePaths,
    failure: { code: classification.failureCode, message: failureMessage(classification.failureCode) },
  });
}
