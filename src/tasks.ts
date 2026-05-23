import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { findScaffoldRoot } from './scaffold.js';

const require = createRequire(import.meta.url);

export const TASK_STATUSES = ['todo', 'in-progress', 'done', 'blocked', 'cancelled'] as const;
export type TaskStatus = typeof TASK_STATUSES[number];
export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const;
export type TaskPriority = typeof TASK_PRIORITIES[number];

type SqlValue = string | number | null;

interface SqliteRunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

interface SqliteStatement<T = unknown> {
  run(...values: SqlValue[]): SqliteRunResult;
  get(...values: SqlValue[]): T | undefined;
  all(...values: SqlValue[]): T[];
}

interface SqliteDatabase {
  exec(sql: string): void;
  prepare<T = unknown>(sql: string): SqliteStatement<T>;
  pragma(sql: string): void;
  close(): void;
}

interface TaskRow {
  local_id: number;
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  plan_slug: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
  completed_at: string | null;
  blocked_at: string | null;
  cancelled_at: string | null;
}

interface CommentRow {
  id: number;
  task_id: string;
  body: string;
  created_at: string;
}

interface CountRow {
  status: TaskStatus;
  count: number;
}

export interface LocalTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  plan: string | null;
  blockedReason: string | null;
  createdAt: string;
  updatedAt: string;
  claimedAt: string | null;
  completedAt: string | null;
  blockedAt: string | null;
  cancelledAt: string | null;
}

export interface TaskComment {
  id: number;
  taskId: string;
  body: string;
  createdAt: string;
}

export interface TaskDetails {
  task: LocalTask;
  comments: TaskComment[];
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  plan?: string;
}

export interface TaskSummary {
  total: number;
  counts: Partial<Record<TaskStatus, number>>;
}

export class TaskUsageError extends Error {}

export function taskDbPath(root: string): string {
  return join(root, '.osc', 'tasks.db');
}

function loadSqliteConstructor(): new (path: string) => SqliteDatabase {
  try {
    return require('better-sqlite3') as new (path: string) => SqliteDatabase;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Local task database requires the better-sqlite3 native dependency. Re-run npm install, try npm install --build-from-source, or use GitHub Issues for task tracking. (${detail})`);
  }
}

function resolveRoot(start = process.cwd()): string {
  const root = findScaffoldRoot(start);
  if (!root) throw new Error(`No Open Scaffold root found from ${start}. Run this inside a repo with .osc/plans and .osc/releases.`);
  return root;
}

function openDatabase(root: string, create: boolean): SqliteDatabase | null {
  const dbPath = taskDbPath(root);
  if (!create && !existsSync(dbPath)) return null;
  mkdirSync(join(root, '.osc'), { recursive: true });
  const Database = loadSqliteConstructor();
  let db: SqliteDatabase;
  try {
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not open local task database at .osc/tasks.db. Reinstall better-sqlite3 or remove the broken local DB file. (${detail})`);
  }
  return db;
}

function initializeSchema(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT UNIQUE,
      title TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('todo', 'in-progress', 'done', 'blocked', 'cancelled')),
      priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
      plan_slug TEXT,
      blocked_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      claimed_at TEXT,
      completed_at TEXT,
      blocked_at TEXT,
      cancelled_at TEXT
    );
    CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_plan_slug ON tasks(plan_slug);
    CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
  `);
}

function formatTaskId(localId: number): string {
  return `T-${String(localId).padStart(3, '0')}`;
}

function normalizeTaskId(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  const match = trimmed.match(/^T-(\d+)$/);
  if (!match) throw new TaskUsageError(`Invalid task id: ${raw}. Expected an id like T-001.`);
  return `T-${match[1].padStart(3, '0')}`;
}

function parsePriority(raw: string | undefined): TaskPriority {
  const value = raw ?? 'medium';
  if ((TASK_PRIORITIES as readonly string[]).includes(value)) return value as TaskPriority;
  throw new TaskUsageError(`Invalid priority: ${value}. Expected one of: ${TASK_PRIORITIES.join(', ')}`);
}

function parseStatus(raw: string | undefined): TaskStatus | undefined {
  if (raw === undefined) return undefined;
  if ((TASK_STATUSES as readonly string[]).includes(raw)) return raw as TaskStatus;
  throw new TaskUsageError(`Invalid status: ${raw}. Expected one of: ${TASK_STATUSES.join(', ')}`);
}

function parsePlan(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  return value ? value : undefined;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapTask(row: TaskRow): LocalTask {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    plan: row.plan_slug,
    blockedReason: row.blocked_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    claimedAt: row.claimed_at,
    completedAt: row.completed_at,
    blockedAt: row.blocked_at,
    cancelledAt: row.cancelled_at,
  };
}

function mapComment(row: CommentRow): TaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function getTaskById(db: SqliteDatabase, taskId: string): LocalTask | null {
  const row = db.prepare<TaskRow>('SELECT * FROM tasks WHERE id = ?').get(taskId);
  return row ? mapTask(row) : null;
}

function requireTask(db: SqliteDatabase, taskId: string): LocalTask {
  const task = getTaskById(db, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  return task;
}

export function createTask(title: string, options: { priority?: string; plan?: string } = {}, start = process.cwd()): LocalTask {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new TaskUsageError('Missing required argument: title');
  const priority = parsePriority(options.priority);
  const plan = parsePlan(options.plan) ?? null;
  const root = resolveRoot(start);
  const db = openDatabase(root, true);
  if (!db) throw new Error('Could not initialize local task database.');
  try {
    const stamp = nowIso();
    db.exec('BEGIN IMMEDIATE');
    try {
      const inserted = db.prepare('INSERT INTO tasks (title, status, priority, plan_slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(cleanTitle, 'todo', priority, plan, stamp, stamp);
      const localId = Number(inserted.lastInsertRowid);
      const id = formatTaskId(localId);
      db.prepare('UPDATE tasks SET id = ? WHERE local_id = ?').run(id, localId);
      const task = getTaskById(db, id);
      if (!task) throw new Error(`Created task ${id} but could not read it back.`);
      db.exec('COMMIT');
      return task;
    } catch (error) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Preserve the original task creation error if rollback itself fails.
      }
      throw error;
    }
  } finally {
    db.close();
  }
}

export function listTasks(filters: TaskFilters = {}, start = process.cwd()): LocalTask[] {
  const status = parseStatus(filters.status);
  const priority = filters.priority === undefined ? undefined : parsePriority(filters.priority);
  const plan = parsePlan(filters.plan);
  const root = resolveRoot(start);
  const db = openDatabase(root, false);
  if (!db) return [];
  try {
    const clauses: string[] = [];
    const values: SqlValue[] = [];
    if (status) {
      clauses.push('status = ?');
      values.push(status);
    }
    if (priority) {
      clauses.push('priority = ?');
      values.push(priority);
    }
    if (plan) {
      clauses.push('plan_slug = ?');
      values.push(plan);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const rows = db.prepare<TaskRow>(`SELECT * FROM tasks${where} ORDER BY local_id ASC`).all(...values);
    return rows.map(mapTask);
  } finally {
    db.close();
  }
}

export function getTaskDetails(id: string, start = process.cwd()): TaskDetails {
  const taskId = normalizeTaskId(id);
  const root = resolveRoot(start);
  const db = openDatabase(root, false);
  if (!db) throw new Error(`Task not found: ${taskId}`);
  try {
    const task = requireTask(db, taskId);
    const comments = db.prepare<CommentRow>('SELECT * FROM task_comments WHERE task_id = ? ORDER BY id ASC').all(taskId).map(mapComment);
    return { task, comments };
  } finally {
    db.close();
  }
}

export function transitionTask(id: string, status: TaskStatus, options: { reason?: string } = {}, start = process.cwd()): LocalTask {
  const taskId = normalizeTaskId(id);
  parseStatus(status);
  const root = resolveRoot(start);
  const db = openDatabase(root, false);
  if (!db) throw new Error(`Task not found: ${taskId}`);
  try {
    requireTask(db, taskId);
    const stamp = nowIso();
    if (status === 'blocked') {
      const reason = options.reason?.trim();
      if (!reason) throw new TaskUsageError('Missing required option: --reason <text>');
      db.prepare('UPDATE tasks SET status = ?, blocked_reason = ?, blocked_at = ?, updated_at = ? WHERE id = ?')
        .run(status, reason, stamp, stamp, taskId);
    } else if (status === 'in-progress') {
      db.prepare('UPDATE tasks SET status = ?, blocked_reason = NULL, claimed_at = COALESCE(claimed_at, ?), updated_at = ? WHERE id = ?')
        .run(status, stamp, stamp, taskId);
    } else if (status === 'done') {
      db.prepare('UPDATE tasks SET status = ?, blocked_reason = NULL, completed_at = ?, updated_at = ? WHERE id = ?')
        .run(status, stamp, stamp, taskId);
    } else if (status === 'cancelled') {
      db.prepare('UPDATE tasks SET status = ?, blocked_reason = NULL, cancelled_at = ?, updated_at = ? WHERE id = ?')
        .run(status, stamp, stamp, taskId);
    } else {
      db.prepare('UPDATE tasks SET status = ?, blocked_reason = NULL, updated_at = ? WHERE id = ?')
        .run(status, stamp, taskId);
    }
    return requireTask(db, taskId);
  } finally {
    db.close();
  }
}

export function addTaskComment(id: string, body: string, start = process.cwd()): TaskComment {
  const taskId = normalizeTaskId(id);
  const cleanBody = body.trim();
  if (!cleanBody) throw new TaskUsageError('Missing required argument: comment');
  const root = resolveRoot(start);
  const db = openDatabase(root, false);
  if (!db) throw new Error(`Task not found: ${taskId}`);
  try {
    requireTask(db, taskId);
    const stamp = nowIso();
    const inserted = db.prepare('INSERT INTO task_comments (task_id, body, created_at) VALUES (?, ?, ?)').run(taskId, cleanBody, stamp);
    db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(stamp, taskId);
    const row = db.prepare<CommentRow>('SELECT * FROM task_comments WHERE id = ?').get(Number(inserted.lastInsertRowid));
    if (!row) throw new Error(`Added comment to ${taskId} but could not read it back.`);
    return mapComment(row);
  } finally {
    db.close();
  }
}

export function linkTaskPlan(id: string, plan: string, start = process.cwd()): LocalTask {
  const taskId = normalizeTaskId(id);
  const cleanPlan = parsePlan(plan);
  if (!cleanPlan) throw new TaskUsageError('Missing required option: --plan <slug>');
  const root = resolveRoot(start);
  const db = openDatabase(root, false);
  if (!db) throw new Error(`Task not found: ${taskId}`);
  try {
    requireTask(db, taskId);
    const stamp = nowIso();
    db.prepare('UPDATE tasks SET plan_slug = ?, updated_at = ? WHERE id = ?').run(cleanPlan, stamp, taskId);
    return requireTask(db, taskId);
  } finally {
    db.close();
  }
}

export function getTaskSummary(start = process.cwd()): TaskSummary | null {
  const root = resolveRoot(start);
  const db = openDatabase(root, false);
  if (!db) return null;
  try {
    const rows = db.prepare<CountRow>('SELECT status, COUNT(*) AS count FROM tasks GROUP BY status').all();
    const counts: Partial<Record<TaskStatus, number>> = {};
    let total = 0;
    for (const row of rows) {
      counts[row.status] = row.count;
      total += row.count;
    }
    return { total, counts };
  } finally {
    db.close();
  }
}

export function formatTaskTable(tasks: LocalTask[]): string {
  if (tasks.length === 0) return 'No tasks yet. Create one with `osc task new <title>`\n';
  const rows = tasks.map((task) => [task.id, task.status, task.priority, task.plan ?? '-', task.title]);
  const headers = ['ID', 'Status', 'Priority', 'Plan', 'Title'];
  const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => row[index].length)));
  const render = (row: string[]) => row.map((cell, index) => cell.padEnd(widths[index])).join('  ').trimEnd();
  return `${render(headers)}\n${render(widths.map((width) => '-'.repeat(width)))}\n${rows.map(render).join('\n')}\n`;
}

export function taskToJson(task: LocalTask): Record<string, string | null> {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    plan: task.plan,
    blockedReason: task.blockedReason,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    claimedAt: task.claimedAt,
    completedAt: task.completedAt,
    blockedAt: task.blockedAt,
    cancelledAt: task.cancelledAt,
  };
}

export function formatTaskDetails(details: TaskDetails): string {
  const { task, comments } = details;
  const lines = [
    `Task ${task.id}`,
    `Title: ${task.title}`,
    `Status: ${task.status}`,
    `Priority: ${task.priority}`,
    `Plan: ${task.plan ?? '-'}`,
    `Created: ${task.createdAt}`,
    `Updated: ${task.updatedAt}`,
  ];
  if (task.claimedAt) lines.push(`Claimed: ${task.claimedAt}`);
  if (task.completedAt) lines.push(`Completed: ${task.completedAt}`);
  if (task.blockedAt) lines.push(`Blocked: ${task.blockedAt}`);
  if (task.cancelledAt) lines.push(`Cancelled: ${task.cancelledAt}`);
  if (task.blockedReason) lines.push(`Blocked reason: ${task.blockedReason}`);
  lines.push('');
  lines.push('Comments:');
  if (comments.length === 0) lines.push('- None.');
  else for (const comment of comments) lines.push(`- ${comment.createdAt} — ${comment.body}`);
  return `${lines.join('\n')}\n`;
}

export function formatTaskSummary(summary: TaskSummary): string {
  if (summary.total === 0) return 'Tasks: 0';
  const parts = TASK_STATUSES
    .map((status) => ({ status, count: summary.counts[status] ?? 0 }))
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.count} ${entry.status}`);
  return `Tasks: ${parts.join(', ')}`;
}
