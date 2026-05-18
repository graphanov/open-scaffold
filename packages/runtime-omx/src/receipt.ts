import { writeFileSync } from 'node:fs';
import type { DispatchReceipt, ValidatedRunPacket } from './types.js';
import type { SafeOutputPaths } from './safe-paths.js';

const NO_SPAWN_POLICIES = [
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

function ralplanPreview(packet: ValidatedRunPacket): string {
  const task = packet.plan.goal.replace(/\s+/g, ' ').trim().replace(/"/g, '\\"');
  return `$ralplan "${task}"`;
}

export function createReceipt(packet: ValidatedRunPacket, paths: SafeOutputPaths): DispatchReceipt {
  return {
    schema_version: 'open-scaffold.dispatch-receipt.v1',
    receipt_id: `runtime-omx:no-spawn:${packet.runId}`,
    run_id: packet.runId,
    task_id: packet.taskId,
    adapter_id: 'runtime-omx',
    runtime_backend: 'omx',
    invoked_by: '@open-scaffold/runtime-omx',
    invoked_at: '1970-01-01T00:00:00.000Z',
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
      sandbox_policy: NO_SPAWN_POLICIES,
      commit_policy: packet.commitPolicy,
      approval_policy: 'human_approval_required',
    },
    spawned: false,
    spawn_command_redacted: null,
    runtime_handle: null,
    logs: [],
    artifacts: [paths.relativeEvidencePath],
    status: 'dry_run',
    failure: { code: null, message: null },
    official_continuity: {
      repo: 'https://github.com/Yeachan-Heo/oh-my-codex',
      inspected_commit: 'ffef59333bccc0fc3175439f1c4892522412d29e',
      package: 'oh-my-codex',
      version: '0.17.3',
    },
    command_preview: {
      argv: ['omx', 'exec', '--skip-git-repo-check', '-C', paths.repoRoot, ralplanPreview(packet)],
      spawned: false,
      attempted: false,
    },
    runtime_omx: {
      kind: 'no-spawn-preview',
      workflow: '$ralplan',
      canonical_equivalent: '$plan --consensus',
      adapter_spawned_runtime: false,
      network_required: false,
      credentials_required: false,
      tmux_used: false,
      source_mutation: false,
    },
  };
}

export function evidenceMarkdown(packet: ValidatedRunPacket, paths: SafeOutputPaths): string {
  return [
    '# OMX Runtime Package Evidence',
    '',
    'Schema: open-scaffold.adapter-evidence.v1',
    'Adapter ID: runtime-omx',
    'Runtime backend: omx',
    'Mode: no-spawn preview',
    'Workflow: $ralplan',
    'Canonical OMX skill equivalent: $plan --consensus',
    `Run ID: ${packet.runId}`,
    `Task ID: ${packet.taskId ?? '(none)'}`,
    `Plan: ${packet.plan.path}`,
    `Run packet: ${paths.relativeRunPacketPath}`,
    `Dispatch receipt: ${paths.relativeReceiptPath}`,
    '',
    '## Boundary result',
    '',
    '- Spawned: false',
    '- OMX launched: false',
    '- Codex launched: false',
    '- tmux used: false',
    '- Network required: false',
    '- Credentials required: false',
    '- Source mutation: false',
    '- Commit/push/merge/publish authority: false',
    '',
    'No OMX, Codex, tmux, network, credentials, commit, push, merge, publish, or source mutation occurred.',
    'This evidence proves only structural handoff validation and deterministic receipt writing; task correctness remains a separate postflight/evaluation question.',
    '',
  ].join('\n');
}

export function writeArtifacts(packet: ValidatedRunPacket, paths: SafeOutputPaths): DispatchReceipt {
  const receipt = createReceipt(packet, paths);
  writeFileSync(paths.receiptPath, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  writeFileSync(paths.evidencePath, evidenceMarkdown(packet, paths), 'utf8');
  return receipt;
}
