export class ValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join('; '));
    this.name = 'ValidationError';
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string, issues: string[]): string | undefined {
  const value = record[key];
  if (typeof value === 'string' && value.trim()) return value;
  issues.push(`${key} must be a non-empty string`);
  return undefined;
}

function stringArray(value: unknown, key: string, issues: string[]): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || !item.trim())) {
    issues.push(`${key} must be a non-empty string array`);
    return undefined;
  }
  return value;
}

function isBlockingQuestion(value: unknown): boolean {
  if (typeof value === 'string') return /^\[?blocking\]?[:\s-]/i.test(value.trim()) || /^blocking[:\s-]/i.test(value.trim());
  if (!isRecord(value)) return false;
  if (value.blocking === true || value.required === true) return true;
  const status = typeof value.status === 'string' ? value.status : '';
  const severity = typeof value.severity === 'string' ? value.severity : '';
  return /blocking/i.test(status) || /blocking/i.test(severity);
}

export function validateRunPacket(value: unknown): import('./types.js').ValidatedRunPacket {
  const issues: string[] = [];
  if (!isRecord(value)) throw new ValidationError(['run packet must be a JSON object']);

  if (value.schemaVersion !== 'open-scaffold.run.v1') issues.push('schemaVersion must be open-scaffold.run.v1');
  const runId = stringField(value, 'runId', issues);
  const taskId = typeof value.taskId === 'string' ? value.taskId : null;

  const plan = isRecord(value.plan) ? value.plan : undefined;
  if (!plan) issues.push('plan must be an object');
  const planPath = plan ? stringField(plan, 'path', issues) : undefined;
  const planGoal = plan ? stringField(plan, 'goal', issues) : undefined;
  const acceptanceCriteria = plan ? stringArray(plan.acceptanceCriteria, 'plan.acceptanceCriteria', issues) : undefined;
  const verificationSteps = plan ? stringArray(plan.verificationSteps, 'plan.verificationSteps', issues) : undefined;
  const openQuestions = Array.isArray(plan?.openQuestions) ? plan.openQuestions : [];
  if (openQuestions.some(isBlockingQuestion)) issues.push('plan.openQuestions must not contain blocking questions');

  const packageQuality = isRecord(value.packageQuality) ? value.packageQuality : undefined;
  if (!packageQuality) issues.push('packageQuality must be an object');
  if (packageQuality?.executable !== true) issues.push('packageQuality.executable must be true');
  if (!Array.isArray(packageQuality?.blockers) || packageQuality.blockers.length !== 0) issues.push('packageQuality.blockers must be an empty array');

  const runtimeSelection = isRecord(value.runtimeSelection) ? value.runtimeSelection : undefined;
  if (!runtimeSelection) issues.push('runtimeSelection must be an object');
  if (runtimeSelection?.runtime !== 'omx') issues.push('runtimeSelection.runtime must be omx');
  if (runtimeSelection?.workflow !== 'plan') issues.push('runtimeSelection.workflow must be plan for the OMX $ralplan preview');
  if (runtimeSelection?.profileId !== undefined && runtimeSelection.profileId !== null && runtimeSelection.profileId !== 'omx') issues.push('runtimeSelection.profileId must be omx when present');
  if (runtimeSelection?.profileSource !== undefined && runtimeSelection.profileSource !== null && runtimeSelection.profileSource !== 'builtin') issues.push('runtimeSelection.profileSource must be builtin when present');

  const executor = isRecord(value.executor) ? value.executor : undefined;
  if (!executor) issues.push('executor must be an object');
  if (executor?.lane !== 'omx-codex') issues.push('executor.lane must be omx-codex');
  if (executor?.harnessSkill !== '$ralplan') issues.push('executor.harnessSkill must be $ralplan');
  if (executor?.spawning !== false) issues.push('executor.spawning must be false');

  const runtime = isRecord(value.runtime) ? value.runtime : undefined;
  if (!runtime) issues.push('runtime must be an object');
  const repoPath = runtime ? stringField(runtime, 'repoPath', issues) : undefined;
  const worktreePath = typeof runtime?.worktreePath === 'string' && runtime.worktreePath.trim() ? runtime.worktreePath : null;
  const branch = typeof runtime?.branch === 'string' && runtime.branch.trim() ? runtime.branch : null;
  if (runtime?.tmuxSession !== undefined && runtime.tmuxSession !== null) issues.push('runtime.tmuxSession must be null for no-spawn preview');
  if (runtime?.processId !== undefined && runtime.processId !== null) issues.push('runtime.processId must be null for no-spawn preview');

  const commitPolicy = stringField(value, 'commitPolicy', issues);

  if (issues.length) throw new ValidationError(issues);

  return {
    schemaVersion: 'open-scaffold.run.v1',
    runId: runId!,
    taskId,
    plan: {
      path: planPath!,
      goal: planGoal!,
      acceptanceCriteria: acceptanceCriteria!,
      verificationSteps: verificationSteps!,
      openQuestions,
    },
    packageQuality: { executable: true, blockers: [] },
    runtimeSelection: {
      runtime: 'omx',
      workflow: 'plan',
      profileId: runtimeSelection!.profileId === 'omx' ? 'omx' : null,
      profileSource: runtimeSelection!.profileSource === 'builtin' ? 'builtin' : null,
    },
    executor: { lane: 'omx-codex', harnessSkill: '$ralplan', spawning: false },
    runtime: { repoPath: repoPath!, worktreePath, branch, tmuxSession: null, processId: null },
    commitPolicy: commitPolicy!,
  };
}
