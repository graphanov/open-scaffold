import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { inspectScaffold, parsePlanFile, type MissionState, type PlanStage } from './scaffold.js';
import { formatTaskSummary, getTaskSummary, type TaskSummary } from './tasks.js';
import { validateScaffold } from './validation.js';

export type StalenessLevel = 'green' | 'yellow' | 'red';
export type VerifyLevel = 'green' | 'yellow' | 'red' | 'unknown';

export interface DashboardPlan {
  slug: string;
  path: string;
  modifiedAt: string;
  ageDays: number;
  staleness: StalenessLevel;
  goal: string;
  acceptanceSummary: string[];
}

export interface DashboardEvidenceNote {
  path: string;
  title: string;
  modifiedAt: string;
}

export interface DashboardVerifyStatus {
  level: VerifyLevel;
  label: string;
  command: string;
  exitCode: number | null;
  detail: string;
}

export interface DashboardData {
  root: string;
  projectName: string;
  mission: MissionState;
  counts: Record<PlanStage, number>;
  activePlans: DashboardPlan[];
  recentEvidence: DashboardEvidenceNote[];
  verify: DashboardVerifyStatus;
  taskSummary: TaskSummary | null;
  loadedAt: string;
}

export interface DashboardLoadOptions {
  now?: Date;
  runVerify?: boolean;
}

export interface DashboardFormatOptions {
  selectedIndex?: number;
  expanded?: boolean;
  color?: boolean;
  rows?: number;
  columns?: number;
}

export interface DashboardRunOptions {
  root?: string;
  watch?: boolean;
  intervalSeconds?: number;
}

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorize(text: string, color: keyof typeof ANSI, enabled: boolean): string {
  if (!enabled) return text;
  return `${ANSI[color]}${text}${ANSI.reset}`;
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

function truncateAnsi(text: string, columns: number): string {
  if (!Number.isFinite(columns) || columns <= 0) return text;
  const visible = stripAnsi(text);
  if (visible.length <= columns) return text;
  const suffix = '…';
  const limit = Math.max(0, columns - suffix.length);
  if (text === visible) return `${visible.slice(0, limit)}${suffix}`;

  let output = '';
  let count = 0;
  for (let i = 0; i < text.length && count < limit; i += 1) {
    if (text[i] === '\x1b') {
      const match = text.slice(i).match(/^\x1b\[[0-9;?]*[A-Za-z]/);
      if (match) {
        output += match[0];
        i += match[0].length - 1;
        continue;
      }
    }
    output += text[i];
    count += 1;
  }
  return `${output}${suffix}`;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / 86_400_000);
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

export function stalenessLevel(ageDays: number): StalenessLevel {
  if (ageDays < 7) return 'green';
  if (ageDays <= 30) return 'yellow';
  return 'red';
}

function projectName(root: string): string {
  const packagePath = join(root, 'package.json');
  if (existsSync(packagePath)) {
    try {
      const parsed = JSON.parse(readFileSync(packagePath, 'utf8')) as { name?: unknown };
      if (typeof parsed.name === 'string' && parsed.name.trim()) return parsed.name.trim();
    } catch {
      // Fall through to directory name.
    }
  }
  return basename(root);
}

function evidenceTitle(text: string, file: string): string {
  const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.replace(/^Release \/ Evidence Note:\s*/i, '').trim();
  return basename(file, '.md');
}

function recentEvidence(root: string): DashboardEvidenceNote[] {
  const releasesDir = join(root, '.osc', 'releases');
  if (!existsSync(releasesDir)) return [];
  return readdirSync(releasesDir)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .map((file) => {
      const path = join(releasesDir, file);
      const stat = statSync(path);
      const text = readFileSync(path, 'utf8');
      return {
        path: relative(root, path),
        title: evidenceTitle(text, file),
        modifiedAt: stat.mtime.toISOString(),
        modifiedTime: stat.mtime.getTime(),
      };
    })
    .sort((a, b) => b.modifiedTime - a.modifiedTime || a.path.localeCompare(b.path))
    .slice(0, 3)
    .map(({ modifiedTime: _modifiedTime, ...note }) => note);
}

function runVerify(root: string, enabled: boolean): DashboardVerifyStatus {
  const command = 'osc verify';
  if (!enabled) {
    return { level: 'unknown', label: 'not run', command, exitCode: null, detail: 'verification skipped by caller' };
  }
  const result = validateScaffold(root);
  if (!result.ok) {
    const firstFailure = result.failures[0];
    return {
      level: 'red',
      label: 'failing',
      command,
      exitCode: 1,
      detail: firstFailure ? `${firstFailure.code}: ${firstFailure.message}` : 'validation failed',
    };
  }
  if (result.warnings.length > 0) {
    const firstWarning = result.warnings[0];
    return {
      level: 'yellow',
      label: 'warnings',
      command,
      exitCode: 0,
      detail: firstWarning ? `${firstWarning.code}: ${firstWarning.message}` : 'validation warnings present',
    };
  }
  return {
    level: 'green',
    label: 'passing',
    command,
    exitCode: 0,
    detail: 'validation passed',
  };
}

function loadTaskSummary(root: string): TaskSummary | null {
  if (!existsSync(join(root, '.osc', 'tasks.db'))) return null;
  try {
    return getTaskSummary(root);
  } catch {
    return null;
  }
}

export function loadDashboardData(root = process.cwd(), options: DashboardLoadOptions = {}): DashboardData {
  const now = options.now ?? new Date();
  const state = inspectScaffold(root);
  const counts = Object.fromEntries(
    (['active', 'backlog', 'blocked', 'done'] as const).map((stage) => [stage, state.plans[stage].length]),
  ) as Record<PlanStage, number>;
  const activePlans = state.plans.active.map((summary) => {
    const fullPath = join(root, summary.path);
    const stat = statSync(fullPath);
    const parsed = parsePlanFile(fullPath);
    const ageDays = roundOne(daysBetween(stat.mtime, now));
    return {
      slug: summary.slug,
      path: summary.path,
      modifiedAt: stat.mtime.toISOString(),
      ageDays,
      staleness: stalenessLevel(ageDays),
      goal: parsed.goal,
      acceptanceSummary: parsed.acceptanceCriteria.slice(0, 3),
    };
  });

  return {
    root,
    projectName: projectName(root),
    mission: state.mission,
    counts,
    activePlans,
    recentEvidence: recentEvidence(root),
    verify: runVerify(root, options.runVerify ?? true),
    taskSummary: loadTaskSummary(root),
    loadedAt: now.toISOString(),
  };
}

function stalenessLabel(plan: DashboardPlan): string {
  if (plan.staleness === 'green') return `green ${plan.ageDays}d`;
  if (plan.staleness === 'yellow') return `yellow ${plan.ageDays}d`;
  return `red ${plan.ageDays}d`;
}

function levelColor(level: StalenessLevel | VerifyLevel): keyof typeof ANSI {
  if (level === 'green') return 'green';
  if (level === 'yellow') return 'yellow';
  if (level === 'red') return 'red';
  return 'dim';
}

function renderPlanLine(plan: DashboardPlan, index: number, selectedIndex: number, color: boolean): string {
  const marker = index === selectedIndex ? '›' : ' ';
  const status = colorize(stalenessLabel(plan), levelColor(plan.staleness), color);
  return `${marker} ${plan.slug}  ${status}  ${plan.path}`;
}

function renderExpandedPlan(plan: DashboardPlan, verify: DashboardVerifyStatus, color: boolean): string[] {
  const lines = [`  Goal: ${plan.goal || '(none)'}`];
  const criteria = plan.acceptanceSummary.length > 0 ? plan.acceptanceSummary : ['(no acceptance criteria found)'];
  for (const item of criteria) lines.push(`  AC: ${item}`);
  lines.push(`  Last verification: ${colorize(verify.label, levelColor(verify.level), color)} (${verify.command})`);
  return lines;
}

function taskSummaryLine(summary: TaskSummary | null): string | null {
  if (!summary) return null;
  return formatTaskSummary(summary);
}

export function formatDashboardText(data: DashboardData, options: DashboardFormatOptions = {}): string {
  const color = options.color ?? false;
  const selectedIndex = Math.min(Math.max(options.selectedIndex ?? 0, 0), Math.max(data.activePlans.length - 1, 0));
  const expanded = options.expanded ?? false;
  const columns = options.columns ?? 100;
  const rows = options.rows ?? Number.POSITIVE_INFINITY;
  const mission = data.mission.defined ? colorize('defined', 'green', color) : colorize(`not defined (${data.mission.reason ?? 'unknown'})`, 'red', color);
  const verify = colorize(data.verify.label, levelColor(data.verify.level), color);
  const lines: string[] = [];

  lines.push(colorize('Open Scaffold dashboard', 'bold', color));
  lines.push(`${data.projectName}  |  Mission: ${mission}  |  Verify: ${verify}  |  ${new Date(data.loadedAt).toISOString()}`);
  lines.push('');
  lines.push(`Plans: active ${data.counts.active} · backlog ${data.counts.backlog} · blocked ${data.counts.blocked} · done ${data.counts.done}`);
  const tasks = taskSummaryLine(data.taskSummary);
  if (tasks) lines.push(tasks);
  lines.push('');
  lines.push(colorize('Active plans', 'blue', color));
  if (data.activePlans.length === 0) {
    lines.push('No active plans. Create one with `osc plan new <slug> --stage active`');
  } else {
    data.activePlans.forEach((plan, index) => {
      lines.push(renderPlanLine(plan, index, selectedIndex, color));
      if (expanded && index === selectedIndex) lines.push(...renderExpandedPlan(plan, data.verify, color));
    });
  }
  lines.push('');
  lines.push(colorize('Recent evidence', 'cyan', color));
  if (data.recentEvidence.length === 0) {
    lines.push('No evidence notes yet. Create one with `osc evidence new <slug>`.');
  } else {
    for (const note of data.recentEvidence) lines.push(`- ${note.title}  ${note.path}`);
  }
  lines.push('');
  lines.push(`Footer: ↑/↓ select · Enter expand · r refresh · q quit · verify ${data.verify.label}`);

  const fitted = lines.map((line) => truncateAnsi(line, columns));
  if (Number.isFinite(rows) && rows > 0 && fitted.length > rows) return fitted.slice(0, rows).join('\n');
  return fitted.join('\n');
}

export type DashboardKey = 'up' | 'down' | 'enter' | 'refresh' | 'quit' | 'none';
export type DashboardKeyResult = DashboardKey | 'pending';

function parseCompleteKey(value: string): DashboardKey {
  if (value === '\u0003' || value === 'q' || value === 'Q') return 'quit';
  if (value === 'r' || value === 'R') return 'refresh';
  if (value === '\r' || value === '\n') return 'enter';
  if (value === '\x1b[A') return 'up';
  if (value === '\x1b[B') return 'down';
  return 'none';
}

function isPartialEscapeSequence(value: string): boolean {
  return value === '\x1b' || value === '\x1b[';
}

export class DashboardKeyParser {
  private pendingEscapeSequence: string | null = null;

  push(buffer: Buffer): DashboardKeyResult {
    const value = buffer.toString('utf8');
    if (!value) return 'none';

    if (this.pendingEscapeSequence) {
      const combined = `${this.pendingEscapeSequence}${value}`;
      const parsed = parseCompleteKey(combined);
      if (parsed !== 'none') {
        this.pendingEscapeSequence = null;
        return parsed;
      }
      if (isPartialEscapeSequence(combined)) {
        this.pendingEscapeSequence = combined;
        return 'pending';
      }
      this.pendingEscapeSequence = null;
      return parseCompleteKey(value);
    }

    if (isPartialEscapeSequence(value)) {
      this.pendingEscapeSequence = value;
      return 'pending';
    }

    return parseCompleteKey(value);
  }

  flushPendingEscape(): DashboardKey {
    const pending = this.pendingEscapeSequence;
    this.pendingEscapeSequence = null;
    if (pending === '\x1b') return 'quit';
    return 'none';
  }
}

export async function runDashboard(options: DashboardRunOptions = {}): Promise<void> {
  const root = options.root ?? process.cwd();
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  if (!interactive) {
    const data = loadDashboardData(root);
    console.log(formatDashboardText(data, { color: false, columns: process.stdout.columns ?? 100 }));
    return;
  }

  let data = loadDashboardData(root);
  let selectedIndex = 0;
  let expanded = false;
  const intervalSeconds = options.intervalSeconds ?? 30;
  let timer: NodeJS.Timeout | null = null;

  const render = () => {
    process.stdout.write('\x1b[H\x1b[2J');
    process.stdout.write(formatDashboardText(data, {
      selectedIndex,
      expanded,
      color: true,
      rows: process.stdout.rows ?? 24,
      columns: process.stdout.columns ?? 80,
    }));
  };

  const refresh = () => {
    data = loadDashboardData(root);
    selectedIndex = Math.min(selectedIndex, Math.max(data.activePlans.length - 1, 0));
    render();
  };

  await new Promise<void>((resolve, reject) => {
    const stdin = process.stdin;
    const keyParser = new DashboardKeyParser();
    let pendingEscapeTimer: NodeJS.Timeout | null = null;
    let onData: ((buffer: Buffer) => void) | null = null;
    let settled = false;

    const clearPendingEscapeTimer = () => {
      if (pendingEscapeTimer) clearTimeout(pendingEscapeTimer);
      pendingEscapeTimer = null;
    };

    const cleanup = (error?: unknown) => {
      if (settled) return;
      settled = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      clearPendingEscapeTimer();
      if (onData) stdin.off('data', onData);
      if (typeof stdin.setRawMode === 'function') stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\x1b[?25h\x1b[?1049l');
      if (error) reject(error);
      else resolve();
    };

    const handleKey = (key: DashboardKey) => {
      if (key === 'none') return;
      if (key === 'quit') {
        cleanup();
        return;
      }
      if (key === 'refresh') refresh();
      if (key === 'enter') {
        expanded = !expanded;
        render();
      }
      if (key === 'up') {
        selectedIndex = Math.max(0, selectedIndex - 1);
        render();
      }
      if (key === 'down') {
        selectedIndex = Math.min(Math.max(data.activePlans.length - 1, 0), selectedIndex + 1);
        render();
      }
    };

    const flushPendingEscape = () => {
      pendingEscapeTimer = null;
      try {
        handleKey(keyParser.flushPendingEscape());
      } catch (error) {
        cleanup(error);
      }
    };

    const schedulePendingEscapeFlush = () => {
      clearPendingEscapeTimer();
      pendingEscapeTimer = setTimeout(flushPendingEscape, 25);
    };

    onData = (buffer: Buffer) => {
      try {
        clearPendingEscapeTimer();
        const key = keyParser.push(buffer);
        if (key === 'pending') {
          schedulePendingEscapeFlush();
          return;
        }
        handleKey(key);
      } catch (error) {
        cleanup(error);
      }
    };

    process.stdout.write('\x1b[?1049h\x1b[?25l');
    if (typeof stdin.setRawMode === 'function') stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
    if (options.watch) {
      timer = setInterval(() => {
        try {
          refresh();
        } catch (error) {
          cleanup(error);
        }
      }, Math.max(1, intervalSeconds) * 1000);
    }
    try {
      render();
    } catch (error) {
      cleanup(error);
    }
  });
}
