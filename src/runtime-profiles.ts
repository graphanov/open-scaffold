import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExecutorLane, RuntimeWorkflow } from './artifacts.js';

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
      interview: 'deep-interview',
      plan: 'ralplan',
      team: 'team',
      loop: 'ralph',
      execute: 'ultrawork',
      goal: 'ultragoal',
    },
    defaults: { workflow: 'plan', harnessSkill: 'ralplan', operatorSurface: 'none' },
    authorityDefaults: {
      sandboxPolicy: ['write_artifacts_only'],
      commitPolicy: 'commit_forbidden_without_operator_approval',
      pushPolicy: 'push_forbidden_without_operator_approval',
      mergePolicy: 'merge_forbidden_without_operator_approval',
      approvalPolicy: 'human_approval_required',
    },
    install: { humanHint: 'Install OMX / oh-my-codex for the current Codex harness path; configure Codex authentication separately. Direct Codex-only adapter support remains future work.', auto: false },
    launch: { owner: 'external-adapter', commandTemplate: null, expectedAdapterId: null, spawning: false },
    evidence: { receiptSchema: 'open-scaffold.dispatch-receipt.v1', expectedPaths: ['.osc/runs/<run_id>/dispatch-receipt.json'] },
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
      interview: 'deep-interview',
      plan: 'ralplan',
      team: 'team',
      loop: 'ralph',
      execute: 'ultrawork',
      goal: 'ultragoal',
    },
    defaults: { workflow: 'plan', harnessSkill: 'ralplan', operatorSurface: 'none' },
    authorityDefaults: {
      sandboxPolicy: ['write_artifacts_only'],
      commitPolicy: 'commit_forbidden_without_operator_approval',
      pushPolicy: 'push_forbidden_without_operator_approval',
      mergePolicy: 'merge_forbidden_without_operator_approval',
      approvalPolicy: 'human_approval_required',
    },
    install: { humanHint: 'Install OMX from https://github.com/Yeachan-Heo/oh-my-codex; configure Codex authentication separately.', auto: false },
    launch: { owner: 'external-adapter', commandTemplate: null, expectedAdapterId: null, spawning: false },
    evidence: { receiptSchema: 'open-scaffold.dispatch-receipt.v1', expectedPaths: ['.osc/runs/<run_id>/dispatch-receipt.json'] },
    compatibility: { minScaffoldSchema: 'open-scaffold.run.v1' },
    lastReviewed: '2026-05-26',
    notes: 'Adapter candidate. Open Scaffold core packages the run; external execution remains adapter-owned.',
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
