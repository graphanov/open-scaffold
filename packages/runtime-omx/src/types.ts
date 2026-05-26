export type RuntimeOmxSelectionRuntime = 'omx' | 'codex';

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
    runtime: RuntimeOmxSelectionRuntime;
    workflow: 'plan';
    profileId: RuntimeOmxSelectionRuntime | null;
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

export interface CommandRunnerOptions {
  cwd: string;
}

export interface CommandRunnerResult {
  status: number | null;
  signal?: string | null;
  stdout?: string | Buffer | null;
  stderr?: string | Buffer | null;
  error?: NodeJS.ErrnoException | Error | null;
}

export type CommandRunner = (command: string, args: string[], options: CommandRunnerOptions) => CommandRunnerResult;

export interface RuntimeOmxOptions {
  receiptPath?: string;
  allowSpawn?: boolean;
  omxCommand?: string;
  commandRunner?: CommandRunner;
  invokedAt?: string;
}

export interface RuntimeOmxResult {
  runId: string;
  receiptPath: string;
  evidencePath: string;
  logPath: string | null;
  receipt: DispatchReceipt;
}

export type RuntimeOmxStatus = 'dry_run' | 'completed' | 'failed' | 'refused';

export interface RuntimeVersionInfo {
  command: string;
  detected_version: string | null;
  required_minimum: '0.17.3';
  version_ok: boolean;
  raw_output: string | null;
}

export interface DispatchReceipt {
  schema_version: 'open-scaffold.dispatch-receipt.v1';
  receipt_id: string;
  run_id: string;
  task_id: string | null;
  adapter_id: 'runtime-omx';
  runtime_backend: 'omx';
  invoked_by: '@open-scaffold/runtime-omx';
  invoked_at: string;
  working_directory: string;
  worktree_path: string | null;
  branch: string | null;
  run_packet_path: string;
  prompt_or_package_path: null;
  runtime_selection: {
    runtime: RuntimeOmxSelectionRuntime;
    workflow: 'plan';
    profile_id: RuntimeOmxSelectionRuntime | null;
    profile_source: string | null;
  };
  authority: {
    sandbox_policy: string[];
    commit_policy: string;
    approval_policy: 'human_approval_required';
  };
  spawned: boolean;
  spawn_command_redacted: string[] | null;
  runtime_handle: {
    kind: 'process';
    command: string;
    exit_status: number | null;
    signal: string | null;
  } | null;
  logs: string[];
  artifacts: string[];
  status: RuntimeOmxStatus;
  failure: {
    code: string | null;
    message: string | null;
  };
  official_continuity: {
    repo: 'https://github.com/Yeachan-Heo/oh-my-codex';
    inspected_commit: 'ffef59333bccc0fc3175439f1c4892522412d29e';
    package: 'oh-my-codex';
    version: '0.17.3';
  };
  runtime_version: RuntimeVersionInfo | null;
  command_preview: {
    argv: string[];
    spawned: boolean;
    attempted: boolean;
  };
  runtime_omx: {
    kind: 'no-spawn-preview' | 'explicit-launch';
    workflow: '$ralplan';
    canonical_equivalent: '$plan --consensus';
    adapter_spawned_runtime: boolean;
    network_required: boolean;
    credentials_required: boolean;
    tmux_used: boolean;
    source_mutation: boolean;
    exit_status: number | null;
  };
}

export interface RuntimeOmxOutcome {
  status: RuntimeOmxStatus;
  commandArgv: string[];
  attempted: boolean;
  spawned: boolean;
  exitStatus: number | null;
  signal: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  logContent: string | null;
  runtimeVersion: RuntimeVersionInfo | null;
  invokedAt: string;
}
