import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { isAbsolute, relative, resolve } from 'node:path';
import { assertRunPacketInputPath, safeOutputPaths } from './safe-paths.js';
import type { CommandRunner, CommandRunnerResult, RuntimeOmxOptions, RuntimeOmxOutcome, RuntimeOmxResult, RuntimeOmxStatus, RuntimeVersionInfo, ValidatedRunPacket } from './types.js';
import { validateRunPacket } from './validation.js';
import { omxRalplanCommand, writeArtifacts } from './receipt.js';

export { ValidationError } from './validation.js';
export type { CommandRunner, DispatchReceipt, RuntimeOmxOptions, RuntimeOmxResult, ValidatedRunPacket } from './types.js';

const REQUIRED_OMX_VERSION = '0.17.3' as const;

function text(value: string | Buffer | null | undefined): string {
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  return value ?? '';
}

const defaultCommandRunner: CommandRunner = (command, args, options) => {
  const result = spawnSync(command, args, { cwd: options.cwd, encoding: 'utf8' });
  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error,
  };
};

function semverParts(version: string): [number, number, number] | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:\+[0-9A-Za-z.-]+)?$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(a: string, b: string): number {
  const left = semverParts(a);
  const right = semverParts(b);
  if (!left || !right) return -1;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) return 1;
    if (left[index] < right[index]) return -1;
  }
  return 0;
}

function parseOmxVersion(output: string): string | null {
  const match = output.match(/oh-my-codex\s+v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)/i) ?? output.match(/\bv?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)\b/);
  return match ? match[1] : null;
}

function commandErrorCode(error: CommandRunnerResult['error']): string | null {
  if (!error) return null;
  return typeof (error as NodeJS.ErrnoException).code === 'string' ? (error as NodeJS.ErrnoException).code! : null;
}

function commandFailureMessage(result: CommandRunnerResult): string {
  const stderr = text(result.stderr).trim();
  const stdout = text(result.stdout).trim();
  const errorMessage = result.error instanceof Error ? result.error.message : '';
  return stderr || stdout || errorMessage || 'command failed';
}

function detectOmxVersion(command: string, runner: CommandRunner, cwd: string): { info: RuntimeVersionInfo; failureCode: string | null; failureMessage: string | null } {
  const result = runner(command, ['--version'], { cwd });
  const rawOutput = `${text(result.stdout)}${text(result.stderr)}`.trim();
  const detected = parseOmxVersion(rawOutput);
  const errorCode = commandErrorCode(result.error);
  if (errorCode === 'ENOENT') {
    return {
      info: { command, detected_version: null, required_minimum: REQUIRED_OMX_VERSION, version_ok: false, raw_output: rawOutput || null },
      failureCode: 'omx_not_found',
      failureMessage: `${command} was not found on PATH`,
    };
  }
  if (result.status !== 0) {
    return {
      info: { command, detected_version: detected, required_minimum: REQUIRED_OMX_VERSION, version_ok: false, raw_output: rawOutput || null },
      failureCode: 'omx_version_check_failed',
      failureMessage: commandFailureMessage(result),
    };
  }
  if (!detected) {
    return {
      info: { command, detected_version: null, required_minimum: REQUIRED_OMX_VERSION, version_ok: false, raw_output: rawOutput || null },
      failureCode: 'omx_version_unknown',
      failureMessage: `could not parse ${command} --version output`,
    };
  }
  const versionOk = compareSemver(detected, REQUIRED_OMX_VERSION) >= 0;
  return {
    info: { command, detected_version: detected, required_minimum: REQUIRED_OMX_VERSION, version_ok: versionOk, raw_output: rawOutput || null },
    failureCode: versionOk ? null : 'omx_version_too_old',
    failureMessage: versionOk ? null : `oh-my-codex ${detected} is older than required ${REQUIRED_OMX_VERSION}`,
  };
}

function safeBranch(branch: string | null): boolean {
  if (!branch) return false;
  if (/^(main|master|trunk|production|release)$/i.test(branch)) return false;
  return /^(runtime|feat|feature|fix|docs|chore|test|spike)\//.test(branch);
}

function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || rel === '.' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function resolveWorktreePath(packet: ValidatedRunPacket, repoRoot: string): { path: string | null; failureCode: string | null; failureMessage: string | null } {
  if (!packet.runtime.worktreePath) {
    return { path: null, failureCode: 'missing_worktree', failureMessage: 'runtime.worktreePath must be set before OMX launch' };
  }
  const candidate = isAbsolute(packet.runtime.worktreePath) ? resolve(packet.runtime.worktreePath) : resolve(repoRoot, packet.runtime.worktreePath);
  if (!existsSync(candidate)) {
    return { path: null, failureCode: 'missing_worktree', failureMessage: `runtime.worktreePath does not exist: ${packet.runtime.worktreePath}` };
  }
  const resolved = realpathSync.native(candidate);
  if (!isInside(repoRoot, resolved)) {
    return { path: null, failureCode: 'worktree_outside_repo', failureMessage: 'runtime.worktreePath must resolve inside runtime.repoPath before OMX launch' };
  }
  return { path: resolved, failureCode: null, failureMessage: null };
}

function checkActualBranch(expectedBranch: string, worktreePath: string, runner: CommandRunner): { failureCode: string | null; failureMessage: string | null } {
  const result = runner('git', ['-C', worktreePath, 'rev-parse', '--abbrev-ref', 'HEAD'], { cwd: worktreePath });
  if (result.status !== 0) {
    return { failureCode: 'git_branch_check_failed', failureMessage: commandFailureMessage(result) };
  }
  const actual = text(result.stdout).trim();
  if (actual !== expectedBranch) {
    return { failureCode: 'branch_mismatch', failureMessage: `runtime.branch ${expectedBranch} does not match actual worktree branch ${actual}` };
  }
  return { failureCode: null, failureMessage: null };
}

function refusalOutcome(packet: ValidatedRunPacket, paths: ReturnType<typeof safeOutputPaths>, code: string, message: string, commandArgv?: string[], runtimeVersion: RuntimeVersionInfo | null = null, invokedAt?: string): RuntimeOmxOutcome {
  return {
    status: 'refused',
    commandArgv: commandArgv ?? omxRalplanCommand(packet, paths),
    attempted: false,
    spawned: false,
    exitStatus: null,
    signal: null,
    failureCode: code,
    failureMessage: message,
    logContent: null,
    runtimeVersion,
    invokedAt: invokedAt ?? new Date().toISOString(),
  };
}

function launchLog(commandArgv: string[], result: CommandRunnerResult, runtimeVersion: RuntimeVersionInfo): string {
  return [
    '# OMX Runtime Launch Log',
    '',
    `Command: ${commandArgv.slice(0, -1).join(' ')} [omx $ralplan prompt redacted; see run packet]`,
    `Runtime version: ${runtimeVersion.detected_version ?? '(unknown)'}`,
    `Exit status: ${result.status ?? '(none)'}`,
    `Signal: ${result.signal ?? '(none)'}`,
    '',
    '## stdout',
    '',
    text(result.stdout),
    '',
    '## stderr',
    '',
    text(result.stderr),
    '',
  ].join('\n');
}

export function runNoSpawnOmx(runPacketPath: string, options: RuntimeOmxOptions = {}): RuntimeOmxResult {
  assertRunPacketInputPath(runPacketPath);
  const raw = JSON.parse(readFileSync(runPacketPath, 'utf8')) as unknown;
  const packet = validateRunPacket(raw);
  const paths = safeOutputPaths(runPacketPath, packet.runtime.repoPath, options.receiptPath);
  const receipt = writeArtifacts(packet, paths);
  return {
    runId: packet.runId,
    receiptPath: paths.receiptPath,
    evidencePath: paths.evidencePath,
    logPath: null,
    receipt,
  };
}

export function runOmxRalplan(runPacketPath: string, options: RuntimeOmxOptions = {}): RuntimeOmxResult {
  assertRunPacketInputPath(runPacketPath);
  const raw = JSON.parse(readFileSync(runPacketPath, 'utf8')) as unknown;
  const packet = validateRunPacket(raw);
  const paths = safeOutputPaths(runPacketPath, packet.runtime.repoPath, options.receiptPath);
  if (!options.allowSpawn) {
    const receipt = writeArtifacts(packet, paths);
    return { runId: packet.runId, receiptPath: paths.receiptPath, evidencePath: paths.evidencePath, logPath: null, receipt };
  }

  const runner = options.commandRunner ?? defaultCommandRunner;
  const omxCommand = options.omxCommand ?? 'omx';
  const invokedAt = options.invokedAt ?? new Date().toISOString();

  let outcome: RuntimeOmxOutcome;
  let commandArgv = omxRalplanCommand(packet, paths, omxCommand);
  if (!safeBranch(packet.runtime.branch)) {
    outcome = refusalOutcome(packet, paths, 'unsafe_branch', 'runtime.branch must be a non-main disposable branch such as runtime/<slug> before OMX launch', commandArgv, null, invokedAt);
  } else {
    const worktree = resolveWorktreePath(packet, paths.repoRoot);
    if (worktree.failureCode) {
      outcome = refusalOutcome(packet, paths, worktree.failureCode, worktree.failureMessage!, commandArgv, null, invokedAt);
    } else {
      commandArgv = omxRalplanCommand(packet, paths, omxCommand, worktree.path!);
      const branchCheck = checkActualBranch(packet.runtime.branch!, worktree.path!, runner);
      if (branchCheck.failureCode) {
        outcome = refusalOutcome(packet, paths, branchCheck.failureCode, branchCheck.failureMessage!, commandArgv, null, invokedAt);
      } else {
        const version = detectOmxVersion(omxCommand, runner, worktree.path!);
        if (version.failureCode) {
          outcome = refusalOutcome(packet, paths, version.failureCode, version.failureMessage!, commandArgv, version.info, invokedAt);
        } else {
          const result = runner(commandArgv[0], commandArgv.slice(1), { cwd: worktree.path! });
          const status: RuntimeOmxStatus = result.status === 0 ? 'completed' : 'failed';
          const errorCode = commandErrorCode(result.error);
          outcome = {
            status,
            commandArgv,
            attempted: true,
            spawned: true,
            exitStatus: result.status,
            signal: result.signal ?? null,
            failureCode: status === 'failed' ? errorCode ?? 'omx_launch_failed' : null,
            failureMessage: status === 'failed' ? commandFailureMessage(result) : null,
            logContent: launchLog(commandArgv, result, version.info),
            runtimeVersion: version.info,
            invokedAt,
          };
        }
      }
    }
  }

  const receipt = writeArtifacts(packet, paths, outcome);
  return {
    runId: packet.runId,
    receiptPath: paths.receiptPath,
    evidencePath: paths.evidencePath,
    logPath: outcome.logContent ? paths.logPath : null,
    receipt,
  };
}
