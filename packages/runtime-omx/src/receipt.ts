import { writeFileSync } from 'node:fs';
import type { DispatchReceipt, RuntimeOmxOutcome, ValidatedRunPacket } from './types.js';
import type { SafeOutputPaths } from './safe-paths.js';

const DRY_RUN_POLICIES = [
  'write_artifacts_only',
  'secrets_forbidden',
  'network_forbidden',
  'runtime_spawn_forbidden',
  'commit_forbidden',
  'push_forbidden',
  'merge_forbidden',
  'publish_forbidden',
  'human_approval_required',
];

const EXPLICIT_LAUNCH_POLICIES = [
  'explicit_allow_spawn_required',
  'read_only_codex_sandbox_required',
  'unsafe_branch_refused',
  'secrets_management_forbidden',
  'commit_forbidden',
  'push_forbidden',
  'merge_forbidden',
  'publish_forbidden',
  'human_approval_required',
];

function ralplanPrompt(packet: ValidatedRunPacket): string {
  const ac = packet.plan.acceptanceCriteria.map((criterion) => `- ${criterion}`).join('\n');
  const verification = packet.plan.verificationSteps.map((step) => `- ${step}`).join('\n');
  return [
    '$ralplan',
    '',
    'Open Scaffold run packet target: OMX / oh-my-codex.',
    `Plan: ${packet.plan.path}`,
    `Goal: ${packet.plan.goal.replace(/\s+/g, ' ').trim()}`,
    '',
    'Acceptance criteria:',
    ac,
    '',
    'Verification steps:',
    verification,
    '',
    'Authority: plan/review only. Do not commit, push, merge, publish, manage credentials, or perform destructive filesystem operations.',
  ].join('\n');
}

export function omxRalplanCommand(packet: ValidatedRunPacket, paths: SafeOutputPaths, omxCommand = 'omx', executionCwd = paths.repoRoot): string[] {
  return [omxCommand, 'exec', '--skip-git-repo-check', '--sandbox', 'read-only', '-C', executionCwd, ralplanPrompt(packet)];
}

function redactedCommand(commandArgv: string[]): string[] {
  if (commandArgv.length === 0) return [];
  return commandArgv.map((arg, index) => (index === commandArgv.length - 1 ? '[omx $ralplan prompt redacted; see run packet]' : arg));
}

function defaultOutcome(packet: ValidatedRunPacket, paths: SafeOutputPaths): RuntimeOmxOutcome {
  const commandArgv = omxRalplanCommand(packet, paths);
  return {
    status: 'dry_run',
    commandArgv,
    attempted: false,
    spawned: false,
    exitStatus: null,
    signal: null,
    failureCode: null,
    failureMessage: null,
    logContent: null,
    runtimeVersion: null,
    invokedAt: '1970-01-01T00:00:00.000Z',
  };
}

export function createReceipt(packet: ValidatedRunPacket, paths: SafeOutputPaths, outcome: RuntimeOmxOutcome = defaultOutcome(packet, paths)): DispatchReceipt {
  const launchMode = outcome.status === 'dry_run' ? 'no-spawn-preview' : 'explicit-launch';
  const logArtifacts = outcome.logContent ? [paths.relativeLogPath] : [];
  return {
    schema_version: 'open-scaffold.dispatch-receipt.v1',
    receipt_id: `runtime-omx:${launchMode}:${packet.runId}`,
    run_id: packet.runId,
    task_id: packet.taskId,
    adapter_id: 'runtime-omx',
    runtime_backend: 'omx',
    invoked_by: '@open-scaffold/runtime-omx',
    invoked_at: outcome.invokedAt,
    working_directory: paths.repoRoot,
    worktree_path: packet.runtime.worktreePath,
    branch: packet.runtime.branch,
    run_packet_path: paths.relativeRunPacketPath,
    prompt_or_package_path: null,
    runtime_selection: {
      runtime: 'omx',
      workflow: 'plan',
      profile_id: packet.runtimeSelection.profileId,
      profile_source: packet.runtimeSelection.profileSource,
    },
    authority: {
      sandbox_policy: launchMode === 'no-spawn-preview' ? DRY_RUN_POLICIES : EXPLICIT_LAUNCH_POLICIES,
      commit_policy: packet.commitPolicy,
      approval_policy: 'human_approval_required',
    },
    spawned: outcome.spawned,
    spawn_command_redacted: outcome.attempted ? redactedCommand(outcome.commandArgv) : null,
    runtime_handle: outcome.attempted
      ? {
          kind: 'process',
          command: outcome.commandArgv[0] ?? 'omx',
          exit_status: outcome.exitStatus,
          signal: outcome.signal,
        }
      : null,
    logs: logArtifacts,
    artifacts: [paths.relativeEvidencePath, ...logArtifacts],
    status: outcome.status,
    failure: { code: outcome.failureCode, message: outcome.failureMessage },
    official_continuity: {
      repo: 'https://github.com/Yeachan-Heo/oh-my-codex',
      inspected_commit: 'ffef59333bccc0fc3175439f1c4892522412d29e',
      package: 'oh-my-codex',
      version: '0.17.3',
    },
    runtime_version: outcome.runtimeVersion,
    command_preview: {
      argv: redactedCommand(outcome.commandArgv),
      spawned: outcome.spawned,
      attempted: outcome.attempted,
    },
    runtime_omx: {
      kind: launchMode,
      workflow: '$ralplan',
      canonical_equivalent: '$plan --consensus',
      adapter_spawned_runtime: outcome.spawned,
      network_required: false,
      credentials_required: false,
      tmux_used: false,
      source_mutation: false,
      exit_status: outcome.exitStatus,
    },
  };
}

export function evidenceMarkdown(packet: ValidatedRunPacket, paths: SafeOutputPaths, outcome: RuntimeOmxOutcome = defaultOutcome(packet, paths)): string {
  const launched = outcome.status === 'dry_run' ? 'false' : String(outcome.spawned);
  const exitStatus = outcome.exitStatus === null ? '(none)' : String(outcome.exitStatus);
  const runtimeVersion = outcome.runtimeVersion?.detected_version ?? '(not checked)';
  return [
    '# OMX Runtime Package Evidence',
    '',
    'Schema: open-scaffold.adapter-evidence.v1',
    'Adapter ID: runtime-omx',
    'Runtime backend: omx',
    `Mode: ${outcome.status === 'dry_run' ? 'no-spawn preview' : 'explicit opt-in launch'}`,
    `Status: ${outcome.status}`,
    'Workflow: $ralplan',
    'Canonical OMX skill equivalent: $plan --consensus',
    `Run ID: ${packet.runId}`,
    `Task ID: ${packet.taskId ?? '(none)'}`,
    `Plan: ${packet.plan.path}`,
    `Run packet: ${paths.relativeRunPacketPath}`,
    `Dispatch receipt: ${paths.relativeReceiptPath}`,
    `Runtime version: ${runtimeVersion}`,
    `Exit status: ${exitStatus}`,
    outcome.logContent ? `Log: ${paths.relativeLogPath}` : 'Log: (none)',
    '',
    '## Boundary result',
    '',
    `- Spawned: ${launched}`,
    `- OMX launched: ${launched}`,
    `- Codex launched: ${launched}`,
    '- tmux used: false',
    '- Network required by adapter: false',
    '- Credentials managed by adapter: false',
    '- Source mutation by adapter: false',
    '- Commit/push/merge/publish authority: false',
    '- Codex sandbox requested by adapter: read-only',
    '',
    'The adapter does not commit, push, merge, publish, manage credentials, or perform destructive filesystem operations.',
    'This evidence proves dispatch/launch mechanics and factual receipt writing only; task correctness remains a separate postflight/evaluation question.',
    outcome.failureCode ? '' : undefined,
    outcome.failureCode ? '## Failure / refusal' : undefined,
    outcome.failureCode ? '' : undefined,
    outcome.failureCode ? `- Code: ${outcome.failureCode}` : undefined,
    outcome.failureMessage ? `- Message: ${outcome.failureMessage}` : undefined,
    '',
  ].filter((line): line is string => line !== undefined).join('\n');
}

export function writeArtifacts(packet: ValidatedRunPacket, paths: SafeOutputPaths, outcome?: RuntimeOmxOutcome): DispatchReceipt {
  const finalOutcome = outcome ?? defaultOutcome(packet, paths);
  const receipt = createReceipt(packet, paths, finalOutcome);
  writeFileSync(paths.receiptPath, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  writeFileSync(paths.evidencePath, evidenceMarkdown(packet, paths, finalOutcome), 'utf8');
  if (finalOutcome.logContent) writeFileSync(paths.logPath, finalOutcome.logContent, 'utf8');
  return receipt;
}
