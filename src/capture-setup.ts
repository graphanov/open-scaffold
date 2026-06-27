import { constants, closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, writeSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CAPTURE_SETUP_TARGETS = ['claude-code', 'codex', 'all'] as const;
export type CaptureSetupTarget = typeof CAPTURE_SETUP_TARGETS[number];
export type CaptureSetupRuntime = Exclude<CaptureSetupTarget, 'all'>;
export type CaptureSetupStatus = 'would-install' | 'installed' | 'blocked';

export interface CaptureSetupOptions {
  cwd?: string;
  repoRoot?: string;
  env?: NodeJS.ProcessEnv;
  write?: boolean;
  claudeSettingsPath?: string;
  codexConfigPath?: string;
  nodePath?: string;
  claudeHookPath?: string;
  codexHookPath?: string;
}

export interface CaptureSetupResult {
  runtime: CaptureSetupRuntime;
  status: CaptureSetupStatus;
  configPath: string;
  hookPath: string;
  command?: string;
  stanza?: string;
  changed: boolean;
  message: string;
}

interface CaptureSetupPlan extends CaptureSetupResult {
  content?: string;
}

type JsonObject = Record<string, unknown>;

export function isCaptureSetupTarget(value: string): value is CaptureSetupTarget {
  return (CAPTURE_SETUP_TARGETS as readonly string[]).includes(value);
}

export function runCaptureSetup(target: CaptureSetupTarget, options: CaptureSetupOptions = {}): CaptureSetupResult[] {
  const plans = expandTarget(target).map((runtime) => planRuntime(runtime, options));
  const blocked = plans.some((plan) => plan.status === 'blocked');
  if (options.write && blocked) {
    return plans.map((plan) => {
      if (plan.status === 'blocked' || plan.status === 'installed') return publicResult(plan);
      return publicResult({
        ...plan,
        status: 'blocked',
        changed: false,
        message: `Not writing ${plan.runtime} setup because another requested target is blocked.`,
        content: undefined,
      });
    });
  }
  if (options.write) {
    for (const plan of plans) {
      if (plan.changed && plan.content !== undefined) writeUtf8NoFollow(plan.configPath, plan.content, `${plan.runtime} config`);
    }
    return plans.map((plan) => publicResult({
      ...plan,
      status: 'installed',
      message: plan.changed ? `Installed ${plan.runtime} ambient capture setup.` : plan.message,
      content: undefined,
    }));
  }
  return plans.map(publicResult);
}

export function renderCaptureSetupText(results: CaptureSetupResult[], mode: 'dry-run' | 'write'): string {
  const lines = [`capture setup ${mode}:`];
  for (const result of results) {
    lines.push(`- ${result.runtime}: ${result.status}`);
    lines.push(`  config: ${result.configPath}`);
    lines.push(`  hook: ${result.hookPath}`);
    if (result.command) lines.push(`  command: ${result.command}`);
    if (result.stanza) lines.push(`  stanza: ${result.stanza}`);
    lines.push(`  changed: ${String(result.changed)}`);
    lines.push(`  message: ${result.message}`);
  }
  return lines.join('\n');
}

function publicResult(plan: CaptureSetupPlan): CaptureSetupResult {
  const { content: _content, ...result } = plan;
  return result;
}

function expandTarget(target: CaptureSetupTarget): CaptureSetupRuntime[] {
  return target === 'all' ? ['claude-code', 'codex'] : [target];
}

function planRuntime(runtime: CaptureSetupRuntime, options: CaptureSetupOptions): CaptureSetupPlan {
  return runtime === 'claude-code' ? planClaude(options) : planCodex(options);
}

function planClaude(options: CaptureSetupOptions): CaptureSetupPlan {
  const cwd = resolve(options.cwd ?? process.cwd());
  const configPath = resolvePath(options.claudeSettingsPath ?? join(options.repoRoot ?? cwd, '.claude', 'settings.local.json'), cwd);
  const hookPath = resolvePath(options.claudeHookPath ?? shippedHookPath('ambient-hook.mjs'), cwd);
  const command = `${shellQuote(options.nodePath ?? process.execPath)} ${shellQuote(hookPath)}`;
  const base = basePlan('claude-code', configPath, hookPath, { command });
  const preflight = preflightConfig(configPath, hookPath, 'Claude Code');
  if (preflight) return { ...base, ...preflight };
  let settings: JsonObject = {};
  if (existsSync(configPath)) {
    try {
      const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as unknown;
      if (!isJsonObject(parsed)) return blocked(base, 'Claude Code settings must be a JSON object.');
      settings = parsed;
    } catch (error) {
      return blocked(base, `Could not parse Claude Code settings JSON: ${errorMessage(error)}`);
    }
  }
  const planned = mergeClaudeSettings(settings, command);
  if (planned.blocked) return blocked(base, planned.blocked);
  if (!planned.changed) return { ...base, status: 'installed', changed: false, message: 'Claude Code SessionEnd ambient capture hook is already installed.' };
  return {
    ...base,
    status: 'would-install',
    changed: true,
    content: `${JSON.stringify(planned.settings, null, 2)}\n`,
    message: 'Would install Claude Code SessionEnd ambient capture hook.',
  };
}

function planCodex(options: CaptureSetupOptions): CaptureSetupPlan {
  const cwd = resolve(options.cwd ?? process.cwd());
  const configPath = resolvePath(options.codexConfigPath ?? defaultCodexConfigPath(options.env ?? process.env), cwd);
  const hookPath = resolvePath(options.codexHookPath ?? shippedHookPath('codex-notify.mjs'), cwd);
  const stanza = `notify = [${tomlString(options.nodePath ?? process.execPath)}, ${tomlString(hookPath)}]`;
  const base = basePlan('codex', configPath, hookPath, { stanza });
  const preflight = preflightConfig(configPath, hookPath, 'Codex');
  if (preflight) return { ...base, ...preflight };
  let content = '';
  if (existsSync(configPath)) {
    try {
      content = readFileSync(configPath, 'utf8');
    } catch (error) {
      return blocked(base, `Could not read Codex config: ${errorMessage(error)}`);
    }
  }
  const planned = mergeCodexConfig(content, stanza);
  if (planned.blocked) return blocked(base, planned.blocked);
  if (!planned.changed) return { ...base, status: 'installed', changed: false, message: 'Codex notify ambient capture hook is already installed.' };
  return {
    ...base,
    status: 'would-install',
    changed: true,
    content: planned.content,
    message: 'Would install Codex notify ambient capture hook.',
  };
}

function basePlan(
  runtime: CaptureSetupRuntime,
  configPath: string,
  hookPath: string,
  generated: Pick<CaptureSetupResult, 'command'> | Pick<CaptureSetupResult, 'stanza'>,
): CaptureSetupPlan {
  return {
    runtime,
    status: 'blocked',
    configPath,
    hookPath,
    changed: false,
    message: '',
    ...generated,
  };
}

function blocked(base: CaptureSetupPlan, message: string): CaptureSetupPlan {
  return { ...base, status: 'blocked', changed: false, message };
}

function preflightConfig(configPath: string, hookPath: string, label: string): Pick<CaptureSetupPlan, 'status' | 'changed' | 'message'> | null {
  if (!existsSync(hookPath)) {
    return {
      status: 'blocked',
      changed: false,
      message: `${label} hook target not found: ${hookPath}. Run setup from an installed open-scaffold package or a checkout that includes examples/hooks.`,
    };
  }
  const symlinkMessage = finalSymlinkMessage(configPath, `${label} config`);
  if (symlinkMessage) return { status: 'blocked', changed: false, message: symlinkMessage };
  const parentSymlinkMessage = parentPathMessage(configPath, `${label} config`);
  if (parentSymlinkMessage) return { status: 'blocked', changed: false, message: parentSymlinkMessage };
  return null;
}

function mergeClaudeSettings(settings: JsonObject, command: string): { settings?: JsonObject; changed?: boolean; blocked?: string } {
  const hooksValue = settings.hooks;
  if (hooksValue !== undefined && !isJsonObject(hooksValue)) {
    return { blocked: 'Claude Code settings hooks must be an object; not rewriting incompatible settings.' };
  }
  const hooks = hooksValue === undefined ? {} : hooksValue;
  const sessionEndValue = hooks.SessionEnd;
  if (sessionEndValue !== undefined && !Array.isArray(sessionEndValue)) {
    return { blocked: 'Claude Code hooks.SessionEnd must be an array; not rewriting incompatible settings.' };
  }
  const sessionEnd = sessionEndValue === undefined ? [] : [...sessionEndValue];
  for (const entry of sessionEnd) {
    if (!isJsonObject(entry)) return { blocked: 'Claude Code hooks.SessionEnd entries must be objects; not rewriting incompatible settings.' };
    const commandHooks = entry.hooks;
    if (!Array.isArray(commandHooks)) {
      return { blocked: 'Claude Code SessionEnd entry hooks must be arrays; not rewriting incompatible settings.' };
    }
    for (const hook of commandHooks) {
      if (!isJsonObject(hook)) return { blocked: 'Claude Code SessionEnd command hooks must be objects; not rewriting incompatible settings.' };
      if (hook.command !== undefined && typeof hook.command !== 'string') {
        return { blocked: 'Claude Code SessionEnd command hook command values must be strings; not rewriting incompatible settings.' };
      }
    }
    if (commandHooks.some((hook) => isJsonObject(hook) && hook.command === command)) {
      return { settings, changed: false };
    }
  }
  const nextHooks: JsonObject = { ...hooks, SessionEnd: [...sessionEnd, { hooks: [{ type: 'command', command }] }] };
  return { settings: { ...settings, hooks: nextHooks }, changed: true };
}

function mergeCodexConfig(content: string, stanza: string): { content?: string; changed?: boolean; blocked?: string } {
  const preamble = tomlPreamble(content);
  const notifyLine = findTopLevelNotifyLine(preamble.lines);
  if (notifyLine) {
    if (notifyLine.trim() === stanza) return { content, changed: false };
    return { blocked: 'Codex config already has a different top-level notify setting; not rewriting it.' };
  }
  if (preamble.firstTable === -1) {
    const prefix = content.length === 0 ? '' : content.endsWith('\n') ? content : `${content}\n`;
    return { content: `${prefix}${stanza}\n`, changed: true };
  }
  const before = content.slice(0, preamble.firstTable);
  const after = content.slice(preamble.firstTable);
  const separator = before.length === 0 || before.endsWith('\n') ? '' : '\n';
  return { content: `${before}${separator}${stanza}\n${after}`, changed: true };
}

interface TomlPreamble {
  firstTable: number;
  lines: string[];
}

type TomlStringState = 'none' | 'multiline-basic' | 'multiline-literal';

function tomlPreamble(content: string): TomlPreamble {
  let offset = 0;
  let stringState: TomlStringState = 'none';
  const lines: string[] = [];
  for (const line of content.split(/(?<=\n)/)) {
    const body = line.replace(/\r?\n$/, '');
    if (stringState === 'none' && isTomlTableHeader(body)) return { firstTable: offset, lines };
    if (stringState === 'none') lines.push(body);
    stringState = scanTomlStringState(body, stringState);
    offset += line.length;
  }
  return { firstTable: -1, lines };
}

function isTomlTableHeader(line: string): boolean {
  return /^\s*(?:\[\s*[A-Za-z0-9_."'-][^\]]*?\s*\]|\[\[\s*[A-Za-z0-9_."'-][^\]]*?\s*\]\])\s*(?:#.*)?$/.test(line);
}

function scanTomlStringState(line: string, initialState: TomlStringState): TomlStringState {
  let state = initialState;
  let i = 0;
  while (i < line.length) {
    if (state !== 'none') {
      const marker = state === 'multiline-basic' ? '"""' : "'''";
      const end = line.indexOf(marker, i);
      if (end === -1) return state;
      state = 'none';
      i = end + marker.length;
      continue;
    }
    if (line[i] === '#') return state;
    if (line.startsWith('"""', i)) {
      state = 'multiline-basic';
      i += 3;
      continue;
    }
    if (line.startsWith("'''", i)) {
      state = 'multiline-literal';
      i += 3;
      continue;
    }
    if (line[i] === '"') {
      i = skipBasicString(line, i + 1);
      continue;
    }
    if (line[i] === "'") {
      const end = line.indexOf("'", i + 1);
      i = end === -1 ? line.length : end + 1;
      continue;
    }
    i += 1;
  }
  return state;
}

function skipBasicString(line: string, start: number): number {
  let escaped = false;
  for (let i = start; i < line.length; i += 1) {
    const char = line[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') return i + 1;
  }
  return line.length;
}

function findTopLevelNotifyLine(lines: string[]): string | null {
  for (const line of lines) {
    if (/^\s*(?:#|$)/.test(line)) continue;
    if (/^\s*notify\s*=/.test(line)) return line.trim();
  }
  return null;
}

function finalSymlinkMessage(path: string, label: string): string | null {
  try {
    if (lstatSync(path).isSymbolicLink()) return `${label} must not be a symlink: ${path}`;
  } catch (error) {
    if ((error as { code?: string })?.code === 'ENOENT') return null;
    return `Could not inspect ${label}: ${errorMessage(error)}`;
  }
  return null;
}

function parentPathMessage(path: string, label: string): string | null {
  let current = dirname(path);
  const { root } = parse(current);
  while (current !== root) {
    try {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) return `${label} parent directory must not be a symlink: ${current}`;
      if (!stat.isDirectory()) return `${label} parent path is not a directory: ${current}`;
      return null;
    } catch (error) {
      if ((error as { code?: string })?.code === 'ENOENT') {
        current = dirname(current);
        continue;
      }
      return `Could not inspect ${label} parent path: ${errorMessage(error)}`;
    }
  }
  return null;
}

function writeUtf8NoFollow(path: string, content: string, label: string): void {
  const parentMessage = parentPathMessage(path, label);
  if (parentMessage) throw new Error(parentMessage);
  mkdirSync(dirname(path), { recursive: true });
  const postMkdirParentMessage = parentPathMessage(path, label);
  if (postMkdirParentMessage) throw new Error(postMkdirParentMessage);
  const symlinkMessage = finalSymlinkMessage(path, label);
  if (symlinkMessage) throw new Error(symlinkMessage);
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | (constants.O_NOFOLLOW ?? 0);
  let handle: number | null = null;
  try {
    handle = openSync(path, flags, 0o666);
    writeSync(handle, content, undefined, 'utf8');
  } catch (error) {
    if ((error as { code?: string })?.code === 'ELOOP') throw new Error(`${label} must not be a symlink: ${path}`);
    throw error;
  } finally {
    if (handle !== null) closeSync(handle);
  }
}

function shippedHookPath(filename: 'ambient-hook.mjs' | 'codex-notify.mjs'): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', 'examples', 'hooks', filename);
}

function defaultCodexConfigPath(env: NodeJS.ProcessEnv): string {
  const root = env.CODEX_HOME || (env.HOME ? join(env.HOME, '.codex') : join(homedir(), '.codex'));
  return join(root, 'config.toml');
}

function resolvePath(path: string, cwd: string): string {
  return isAbsolute(path) ? resolve(path) : resolve(cwd, path);
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
