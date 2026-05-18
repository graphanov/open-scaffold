export interface RunPacket {
  schemaVersion?: unknown;
  runId?: unknown;
  taskId?: unknown;
  plan?: unknown;
  packageQuality?: unknown;
  runtimeSelection?: unknown;
  executor?: unknown;
  runtime?: unknown;
  artifacts?: unknown;
  commitPolicy?: unknown;
}

export interface ValidatedRunPacket {
  schemaVersion: 'open-scaffold.run.v1';
  runId: string;
  taskId: string | null;
  plan: {
    path: string;
    goal: string;
    acceptanceCriteria: string[];
    verificationSteps: string[];
    openQuestions: unknown[];
  };
  packageQuality: {
    executable: true;
    blockers: [];
  };
  runtimeSelection: {
    runtime: 'omx';
    workflow: 'plan';
    profileId: string | null;
    profileSource: string | null;
  };
  executor: {
    lane: 'omx-codex';
    harnessSkill: '$ralplan';
    spawning: false;
  };
  runtime: {
    repoPath: string;
    worktreePath: string | null;
    branch: string | null;
    tmuxSession: null;
    processId: null;
  };
  commitPolicy: string;
}

export interface RuntimeOmxOptions {
  receiptPath?: string;
}

export interface RuntimeOmxResult {
  runId: string;
  receiptPath: string;
  evidencePath: string;
  receipt: DispatchReceipt;
}

export interface DispatchReceipt {
  schema_version: 'open-scaffold.dispatch-receipt.v1';
  receipt_id: string;
  run_id: string;
  task_id: string | null;
  adapter_id: 'runtime-omx';
  runtime_backend: 'omx';
  invoked_by: '@open-scaffold/runtime-omx';
  invoked_at: '1970-01-01T00:00:00.000Z';
  working_directory: string;
  worktree_path: string | null;
  branch: string | null;
  run_packet_path: string;
  prompt_or_package_path: null;
  runtime_selection: {
    runtime: 'omx';
    workflow: 'plan';
    profile_id: string | null;
    profile_source: string | null;
  };
  authority: {
    sandbox_policy: string[];
    commit_policy: string;
    approval_policy: 'human_approval_required';
  };
  spawned: false;
  spawn_command_redacted: null;
  runtime_handle: null;
  logs: [];
  artifacts: string[];
  status: 'dry_run';
  failure: {
    code: null;
    message: null;
  };
  official_continuity: {
    repo: 'https://github.com/Yeachan-Heo/oh-my-codex';
    inspected_commit: 'ffef59333bccc0fc3175439f1c4892522412d29e';
    package: 'oh-my-codex';
    version: '0.17.3';
  };
  command_preview: {
    argv: string[];
    spawned: false;
    attempted: false;
  };
  runtime_omx: {
    kind: 'no-spawn-preview';
    workflow: '$ralplan';
    canonical_equivalent: '$plan --consensus';
    adapter_spawned_runtime: false;
    network_required: false;
    credentials_required: false;
    tmux_used: false;
    source_mutation: false;
  };
}
