import { createHash } from 'node:crypto';
import { closeSync, constants, existsSync, mkdirSync, openSync, readFileSync, realpathSync, writeSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import { AMBIENT_WORK_RECORD_SCHEMA, AmbientObserved, AmbientUsage, ambientDigest, buildTranscriptWorkRecord } from './ambient.js';
import { redactSecrets } from './redaction.js';
import { writeJsonUnder } from './path-safety.js';

// `osc capture` turns a finished agent-session transcript into an
// osc.ambient-work-record.v1 record without the worker's cooperation. Universality
// lives in the OUTPUT (one schema), not the parser: every runtime logs differently,
// so each gets a thin normalizer (a CaptureParser) into the shared transcript record
// shape exported by src/ambient.ts. Parsers here are zero-dependency and never throw
// on bad data — capture must be hook-safe (see captureCommand exit-code rules).

export const CAPTURE_FORMATS = ['claude-code', 'codex', 'jsonl-generic'] as const;
export type CaptureFormat = (typeof CAPTURE_FORMATS)[number];

const CLAIM_WORD_PATTERN = /\b(complete|completed|done|blocked|impossible|redesign|cannot|failed)\b/gi;

export interface CaptureResult {
  record: Record<string, unknown>;
  format: CaptureFormat;
  detected: boolean;
}

export interface AmbientTrustReport {
  label: string;
  schema: string;
  session_id: string;
  source: string;
  state: string;
  runtime: {
    adapter: string;
    spawned: boolean | null;
    status: string;
    failure_code: string | null;
    marker_state: string | null;
    token_total: number | null;
    token_availability: 'available' | 'unavailable';
  };
  transcript_observed: {
    available: boolean;
    assistant_turns: number | null;
    user_events: number | null;
    tool_census: Array<{ name: string; count: number }>;
    files_touched: {
      count: number;
      samples: string[];
      redacted_local_path_count: number;
      suppressed_count: number;
      truncated: boolean;
    };
    usage: Record<string, number | null>;
    token_availability: 'available' | 'unavailable';
    session_span: { started_at: string | null; ended_at: string | null; available: boolean };
    final_message_digest: string | null;
    fidelity_notes: string[];
  };
  warnings: string[];
  boundary: {
    authority: string;
    source: string;
  };
}

interface ParsedLines {
  lines: Array<Record<string, unknown>>;
  malformed: number;
}

interface CaptureParser {
  format: CaptureFormat;
  /** Confidence in [0,1] that these lines belong to this format; used by --detect. */
  sniff(parsed: ParsedLines): number;
  extract(parsed: ParsedLines, runId: string): { observed: AmbientObserved; adapter: string; command: string; intent: unknown };
}

function emptyUsage(): AmbientUsage {
  return { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseJsonl(raw: string): ParsedLines {
  const lines: Array<Record<string, unknown>> = [];
  let malformed = 0;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      const record = asRecord(parsed);
      if (record) lines.push(record);
      else malformed += 1;
    } catch {
      malformed += 1;
    }
  }
  return { lines, malformed };
}

function claimWords(text: string | null): string[] {
  if (!text) return [];
  const matches = text.match(CLAIM_WORD_PATTERN) ?? [];
  return [...new Set(matches.map((word) => word.toLowerCase()))];
}

/** Redact secrets, then digest, so a transcript snippet never leaks a token into the record. */
function digestText(text: string): string {
  return ambientDigest(redactSecrets(text));
}

function addFilePathsFromObject(value: unknown, files: Set<string>): void {
  const record = asRecord(value);
  if (!record) return;
  for (const key of ['file_path', 'path', 'filePath', 'notebook_path']) {
    if (typeof record[key] === 'string' && record[key]) files.add(redactSecrets(record[key] as string));
  }
}

function redactUnknown(value: unknown): unknown {
  if (typeof value === 'string') return redactSecrets(value);
  if (Array.isArray(value)) return value.map((item) => redactUnknown(item));
  const record = asRecord(value);
  if (!record) return value;
  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, redactUnknown(item)]));
}

// --- Claude Code: session JSONL ({type:"assistant", message:{usage, content:[...]}}) ---
// Ports examples/spikes/ambient-from-transcript.mjs: assistant turns, per-turn usage
// totals (input/output/cache split), tool-call census, files touched, session span,
// final text digest + claim-word sniff. Usage is per-turn here, so summing is correct.
const claudeCodeParser: CaptureParser = {
  format: 'claude-code',
  sniff(parsed) {
    let assistantWithUsage = 0;
    for (const line of parsed.lines) {
      if (line.type !== 'assistant') continue;
      const message = asRecord(line.message);
      if (message && asRecord(message.usage)) assistantWithUsage += 1;
    }
    if (assistantWithUsage === 0) return 0;
    return Math.min(1, 0.5 + assistantWithUsage / 4);
  },
  extract(parsed, _runId) {
    const usage = emptyUsage();
    const toolCalls: Record<string, number> = {};
    const files = new Set<string>();
    const stamps: string[] = [];
    let assistantTurns = 0;
    let userEvents = 0;
    let firstUserContent: unknown = null;
    let finalText: string | null = null;

    for (const line of parsed.lines) {
      if (typeof line.timestamp === 'string') stamps.push(line.timestamp);
      if (line.type === 'user') {
        userEvents += 1;
        if (firstUserContent === null) firstUserContent = asRecord(line.message)?.content ?? null;
        continue;
      }
      if (line.type !== 'assistant') continue;
      const message = asRecord(line.message);
      if (!message) continue;
      assistantTurns += 1;
      const turnUsage = asRecord(message.usage);
      if (turnUsage) {
        usage.input_tokens = numberOr(usage.input_tokens, 0) + numberOr(turnUsage.input_tokens, 0);
        usage.output_tokens = numberOr(usage.output_tokens, 0) + numberOr(turnUsage.output_tokens, 0);
        usage.cache_creation_input_tokens = numberOr(usage.cache_creation_input_tokens, 0) + numberOr(turnUsage.cache_creation_input_tokens, 0);
        usage.cache_read_input_tokens = numberOr(usage.cache_read_input_tokens, 0) + numberOr(turnUsage.cache_read_input_tokens, 0);
      }
      const turnText: string[] = [];
      for (const block of asArray(message.content)) {
        const blockRecord = asRecord(block);
        if (!blockRecord) continue;
        if (blockRecord.type === 'tool_use' && typeof blockRecord.name === 'string') {
          toolCalls[blockRecord.name] = (toolCalls[blockRecord.name] ?? 0) + 1;
          addFilePathsFromObject(blockRecord.input, files);
        }
        if (blockRecord.type === 'text' && typeof blockRecord.text === 'string' && blockRecord.text.trim()) {
          turnText.push(blockRecord.text);
        }
      }
      if (turnText.length > 0) finalText = turnText.join('');
    }

    stamps.sort();
    const observed: AmbientObserved = {
      assistant_turns: assistantTurns,
      user_events: userEvents,
      started_at: stamps[0] ?? null,
      ended_at: stamps[stamps.length - 1] ?? null,
      usage,
      tool_calls: toolCalls,
      files_touched: [...files].sort(),
      final_message_digest: finalText ? digestText(finalText) : null,
      final_message_claim_words: claimWords(finalText),
      notes: [],
    };
    return { observed, adapter: 'claude-code-transcript', command: 'claude-code-session', intent: firstUserContent };
  },
};

// --- Codex: rollout JSONL ({timestamp, type, payload}) ---
// type:"response_item" payloads carry message/function_call/function_call_output;
// type:"event_msg" payloads carry agent_message/mcp_tool_call_end/task_complete and
// token_count. Codex reports cumulative token totals in the LAST token_count event
// (info.total_token_usage) and has no cache-creation split — recorded null + a note.
const codexParser: CaptureParser = {
  format: 'codex',
  sniff(parsed) {
    let signals = 0;
    for (const line of parsed.lines) {
      const payload = asRecord(line.payload);
      if (!payload) continue;
      if (line.type === 'response_item' || line.type === 'event_msg') signals += 1;
      if (payload.type === 'token_count' || payload.type === 'task_complete') signals += 1;
    }
    if (signals === 0) return 0;
    return Math.min(1, 0.5 + signals / 8);
  },
  extract(parsed, _runId) {
    const toolCalls: Record<string, number> = {};
    const files = new Set<string>();
    const stamps: string[] = [];
    let assistantTurns = 0;
    let userEvents = 0;
    let firstUserText: unknown = null;
    let finalText: string | null = null;
    let lastTotalUsage: Record<string, unknown> | null = null;

    for (const line of parsed.lines) {
      if (typeof line.timestamp === 'string') stamps.push(line.timestamp);
      const payload = asRecord(line.payload);
      if (!payload) continue;
      const payloadType = payload.type;

      if (line.type === 'response_item') {
        if (payloadType === 'message') {
          const role = payload.role;
          const text = textFromContentBlocks(payload.content);
          if (role === 'assistant') {
            assistantTurns += 1;
            if (text) finalText = text;
          } else if (role === 'user') {
            userEvents += 1;
            if (firstUserText === null && text) firstUserText = text;
          }
        } else if (payloadType === 'function_call') {
          const name = typeof payload.name === 'string' ? payload.name : 'function_call';
          toolCalls[name] = (toolCalls[name] ?? 0) + 1;
          addCodexCallFiles(payload.arguments, files);
        } else if (payloadType === 'tool_search_call' || payloadType === 'local_shell_call' || payloadType === 'custom_tool_call') {
          const name = typeof payloadType === 'string' ? payloadType : 'tool_call';
          toolCalls[name] = (toolCalls[name] ?? 0) + 1;
        }
        continue;
      }

      if (line.type === 'event_msg') {
        if (payloadType === 'token_count') {
          const info = asRecord(payload.info);
          const total = info && asRecord(info.total_token_usage);
          if (total) lastTotalUsage = total;
        } else if (payloadType === 'mcp_tool_call_end') {
          const invocation = asRecord(payload.invocation);
          const server = typeof invocation?.server === 'string' ? invocation.server : 'mcp';
          const tool = typeof invocation?.tool === 'string' ? invocation.tool : 'tool';
          const name = `mcp:${server}.${tool}`;
          toolCalls[name] = (toolCalls[name] ?? 0) + 1;
        } else if (payloadType === 'agent_message' && typeof payload.message === 'string' && payload.message.trim()) {
          finalText = payload.message;
        } else if (payloadType === 'task_complete' && typeof payload.last_agent_message === 'string' && payload.last_agent_message.trim()) {
          finalText = payload.last_agent_message;
        } else if (payloadType === 'user_message' && firstUserText === null && typeof payload.message === 'string') {
          firstUserText = payload.message;
        }
      }
    }

    const notes: string[] = [];
    const usage = emptyUsage();
    if (lastTotalUsage) {
      // Codex total_token_usage is cumulative; take the last event, do not sum across events.
      usage.input_tokens = numberOr(lastTotalUsage.input_tokens, 0);
      usage.output_tokens = numberOr(lastTotalUsage.output_tokens, 0);
      usage.cache_read_input_tokens = numberOr(lastTotalUsage.cached_input_tokens, 0);
      usage.total_tokens = numberOr(lastTotalUsage.total_tokens, usage.input_tokens + usage.output_tokens);
      usage.cache_creation_input_tokens = null;
      notes.push('codex reports cumulative token_count.info.total_token_usage; total_tokens is authoritative and cache-creation split is unavailable (recorded null).');
    } else {
      usage.input_tokens = null;
      usage.output_tokens = null;
      usage.cache_read_input_tokens = null;
      usage.cache_creation_input_tokens = null;
      notes.push('no codex token_count event found; token usage recorded null.');
    }

    stamps.sort();
    const observed: AmbientObserved = {
      assistant_turns: assistantTurns,
      user_events: userEvents,
      started_at: stamps[0] ?? null,
      ended_at: stamps[stamps.length - 1] ?? null,
      usage,
      tool_calls: toolCalls,
      files_touched: [...files].sort(),
      final_message_digest: finalText ? digestText(finalText) : null,
      final_message_claim_words: claimWords(finalText),
      notes,
    };
    return { observed, adapter: 'codex-rollout', command: 'codex-session', intent: firstUserText };
  },
};

function textFromContentBlocks(content: unknown): string | null {
  const text: string[] = [];
  for (const block of asArray(content)) {
    const blockRecord = asRecord(block);
    if (!blockRecord) continue;
    if ((blockRecord.type === 'output_text' || blockRecord.type === 'input_text' || blockRecord.type === 'text') && typeof blockRecord.text === 'string') {
      text.push(blockRecord.text);
    }
  }
  return text.length > 0 ? text.join('') : null;
}

function addCodexCallFiles(rawArguments: unknown, files: Set<string>): void {
  if (typeof rawArguments !== 'string' || !rawArguments.trim()) return;
  try {
    addFilePathsFromObject(JSON.parse(rawArguments), files);
  } catch {
    // arguments is not JSON (e.g. a raw shell string); skip path extraction, never throw.
  }
}

// --- jsonl-generic: best-effort fallback ---
// Counts lines/roles/timestamps only; clearly marked lower-fidelity in observed.notes.
// Recognizes common role fields (role, type) and any usage.*token* numbers if present.
const genericParser: CaptureParser = {
  format: 'jsonl-generic',
  sniff(parsed) {
    return parsed.lines.length > 0 ? 0.1 : 0;
  },
  extract(parsed, _runId) {
    const stamps: string[] = [];
    let assistantTurns = 0;
    let userEvents = 0;
    let firstUserContent: unknown = null;
    for (const line of parsed.lines) {
      for (const key of ['timestamp', 'time', 'ts']) {
        if (typeof line[key] === 'string') { stamps.push(line[key] as string); break; }
      }
      const role = roleOf(line);
      if (role === 'assistant') assistantTurns += 1;
      else if (role === 'user') {
        userEvents += 1;
        if (firstUserContent === null) firstUserContent = line.content ?? line.message ?? line.text ?? null;
      }
    }
    stamps.sort();
    const observed: AmbientObserved = {
      assistant_turns: assistantTurns,
      user_events: userEvents,
      started_at: stamps[0] ?? null,
      ended_at: stamps[stamps.length - 1] ?? null,
      usage: { input_tokens: null, output_tokens: null, cache_creation_input_tokens: null, cache_read_input_tokens: null },
      tool_calls: {},
      files_touched: [],
      final_message_digest: null,
      final_message_claim_words: [],
      notes: [
        'jsonl-generic best-effort extraction: line/role/timestamp counts only; tokens, tool census, and files are not available at this fidelity.',
        `parsed ${parsed.lines.length} json line(s).`,
      ],
    };
    return { observed, adapter: 'jsonl-generic', command: 'generic-session', intent: firstUserContent };
  },
};

function roleOf(line: Record<string, unknown>): string | null {
  if (typeof line.role === 'string') return line.role;
  const message = asRecord(line.message);
  if (message && typeof message.role === 'string') return message.role;
  if (line.type === 'assistant' || line.type === 'user') return line.type;
  return null;
}

const PARSERS: Record<CaptureFormat, CaptureParser> = {
  'claude-code': claudeCodeParser,
  codex: codexParser,
  'jsonl-generic': genericParser,
};

export class CaptureUsageError extends Error {}

export function isCaptureFormat(value: string): value is CaptureFormat {
  return (CAPTURE_FORMATS as readonly string[]).includes(value);
}

/**
 * Sniff the transcript format from parsed lines. Returns the best-confidence concrete
 * parser (claude-code | codex). Throws CaptureUsageError on ambiguity so the caller can
 * tell the user to pass --from; the generic fallback is never auto-selected by detection.
 */
export function detectFormat(parsed: ParsedLines): CaptureFormat {
  const scored = [claudeCodeParser, codexParser]
    .map((parser) => ({ format: parser.format, score: parser.sniff(parsed) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) {
    throw new CaptureUsageError('Could not detect transcript format. Pass --from <claude-code|codex|jsonl-generic>.');
  }
  if (scored.length > 1 && scored[0].score === scored[1].score) {
    throw new CaptureUsageError('Transcript format is ambiguous between claude-code and codex. Pass --from to disambiguate.');
  }
  return scored[0].format;
}

export interface CaptureOptions {
  transcriptPath: string;
  format?: CaptureFormat;
  detect?: boolean;
  sessionId?: string;
  rawText?: string;
}

/**
 * Pure capture: read + parse + normalize a transcript into a CaptureResult.
 * Throws CaptureUsageError for usage problems (missing/unreadable transcript, ambiguous
 * detection, no --from/--detect). Never writes; the CLI layer owns output + exit codes.
 */
export function captureRecord(options: CaptureOptions): CaptureResult {
  const raw = options.rawText ?? readTranscript(options.transcriptPath);
  const parsed = parseJsonl(raw);

  let format = options.format;
  let detected = false;
  if (options.detect || !format) {
    if (format && !options.detect) {
      // explicit --from wins
    } else {
      format = detectFormat(parsed);
      detected = true;
    }
  }
  if (!format) {
    throw new CaptureUsageError('Specify --from <claude-code|codex|jsonl-generic> or pass --detect.');
  }

  const runId = deriveRunId(options.transcriptPath, options.sessionId);
  const parser = PARSERS[format];
  const { observed, adapter, command, intent } = parser.extract(parsed, runId);
  if (parsed.malformed > 0) {
    observed.notes.push(`tolerated ${parsed.malformed} malformed/non-object json line(s).`);
  }
  const record = buildTranscriptWorkRecord({ runId, adapter, command, intent: redactUnknown(intent), observed });
  return { record, format, detected };
}

const REPORT_MAX_STRING = 180;
const REPORT_MAX_ITEMS = 25;
const REPORT_MAX_SAMPLES = 8;
const REPORT_AUTHORITY_BOUNDARY = 'observed transcript evidence only; not approval, correctness certification, retry authorization, execution authority, or spawn authority.';
const ANSI_OSC_PATTERN = /\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g;
const ANSI_CSI_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;
const ANSI_SINGLE_PATTERN = /\u001B[@-_]/g;
const CONTROL_PATTERN = /[\u0000-\u001F\u007F-\u009F]/g;
const SAFE_SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;
const SAFE_TOOL_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/;
const SAFE_RELATIVE_PATH_PATTERN = /^(?!\.{1,2}(?:\/|$))(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))[A-Za-z0-9._/@:+-][A-Za-z0-9._/@:+ -]{0,179}$/;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const ALLOWED_SOURCES = new Set(['transcript-extraction', 'ambient-postflight']);
const ALLOWED_STATES = new Set(['observed', 'created', 'ready', 'waiting_on_human', 'running', 'completed', 'failed', 'blocked']);
const ALLOWED_ADAPTERS = new Set(['claude-code-transcript', 'codex-rollout', 'jsonl-generic', 'codex', 'claude-code', 'ambient-postflight']);
const ALLOWED_RUNTIME_STATUSES = new Set([...ALLOWED_STATES, 'complete']);
const ALLOWED_MARKER_STATES = new Set([...ALLOWED_RUNTIME_STATUSES]);

function stripTerminalControls(text: string): string {
  return text
    .replace(ANSI_OSC_PATTERN, '')
    .replace(ANSI_CSI_PATTERN, '')
    .replace(ANSI_SINGLE_PATTERN, '')
    .replace(CONTROL_PATTERN, '');
}

export function sanitizeReportString(value: unknown, maxLength = REPORT_MAX_STRING): string {
  const raw = String(value ?? '');
  const preRedacted = redactSecrets(raw);
  const normalizedRaw = stripTerminalControls(raw);
  const postRedacted = redactSecrets(normalizedRaw);
  const displaySource = postRedacted !== normalizedRaw ? postRedacted : stripTerminalControls(preRedacted);
  const display = redactSecrets(displaySource).replace(CONTROL_PATTERN, ' | ').replace(/\s+/g, ' ').trim();
  if (display.length <= maxLength) return display;
  return `${display.slice(0, Math.max(0, maxLength - 15))}...[truncated]`;
}

function failAmbientRecord(message: string): never {
  throw new CaptureUsageError(`Invalid ambient record: ${sanitizeReportString(message, 260)}`);
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  const record = asRecord(value);
  if (!record) failAmbientRecord(`${path} must be an object`);
  return record;
}

function requireStringField(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) failAmbientRecord(`${path}.${key} must be a non-empty string`);
  return value;
}

function optionalBooleanField(record: Record<string, unknown>, key: string, path: string, warnings: string[]): boolean | null {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    warnings.push(`${path}.${key} unavailable.`);
    return null;
  }
  const value = record[key];
  if (typeof value !== 'boolean') failAmbientRecord(`${path}.${key} must be boolean`);
  return value;
}

function optionalStringOrNullField(record: Record<string, unknown>, key: string, path: string, warnings: string[]): string | null {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    warnings.push(`${path}.${key} unavailable.`);
    return null;
  }
  const value = record[key];
  if (value === null) {
    warnings.push(`${path}.${key} unavailable.`);
    return null;
  }
  if (typeof value !== 'string') failAmbientRecord(`${path}.${key} must be string or null`);
  return sanitizeReportString(value);
}

function optionalRawStringOrNullField(record: Record<string, unknown>, key: string, path: string, warnings: string[]): string | null {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    warnings.push(`${path}.${key} unavailable.`);
    return null;
  }
  const value = record[key];
  if (value === null) {
    warnings.push(`${path}.${key} unavailable.`);
    return null;
  }
  if (typeof value !== 'string') failAmbientRecord(`${path}.${key} must be string or null`);
  return value;
}

function optionalNumberOrNullField(record: Record<string, unknown>, key: string, path: string, warnings: string[]): number | null {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    warnings.push(`${path}.${key} unavailable.`);
    return null;
  }
  const value = record[key];
  if (value === null) {
    warnings.push(`${path}.${key} unavailable.`);
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) failAmbientRecord(`${path}.${key} must be a non-negative integer or null`);
  return value;
}

function optionalCountField(record: Record<string, unknown>, key: string, path: string, warnings: string[]): number | null {
  const value = optionalNumberOrNullField(record, key, path, warnings);
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 0) failAmbientRecord(`${path}.${key} must be a non-negative integer`);
  return value;
}

function validateUsage(value: unknown, warnings: string[]): Record<string, number | null> {
  const keys = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'total_tokens'];
  if (value === undefined) {
    warnings.push('observed.usage unavailable.');
    return Object.fromEntries(keys.map((key) => [key, null])) as Record<string, number | null>;
  }
  const usage = requireRecord(value, 'observed.usage');
  return Object.fromEntries(keys.map((key) => [key, optionalNumberOrNullField(usage, key, 'observed.usage', warnings)])) as Record<string, number | null>;
}

function validateToolCalls(value: unknown, warnings: string[]): Array<{ name: string; count: number }> {
  if (value === undefined) {
    warnings.push('observed.tool_calls unavailable.');
    return [];
  }
  const toolCalls = requireRecord(value, 'observed.tool_calls');
  const suppressed = { count: 0, calls: 0 };
  const entries = Object.entries(toolCalls).flatMap(([name, count]) => {
    if (typeof count !== 'number' || !Number.isFinite(count) || !Number.isInteger(count) || count < 0) {
      failAmbientRecord('observed.tool_calls entries must use non-negative integer counts');
    }
    const normalized = normalizeToolName(name);
    if (!normalized) {
      suppressed.count += 1;
      suppressed.calls += count;
      return [];
    }
    return [{ name: normalized, count }];
  }).sort((a, b) => a.name.localeCompare(b.name));
  if (suppressed.count > 0) warnings.push(`tool names suppressed: ${suppressed.count} entr${suppressed.count === 1 ? 'y' : 'ies'} / ${suppressed.calls} call(s).`);
  if (entries.length > REPORT_MAX_ITEMS) warnings.push(`observed.tool_calls truncated to ${REPORT_MAX_ITEMS} entries.`);
  return entries.slice(0, REPORT_MAX_ITEMS);
}

function validateStringList(value: unknown, path: string, warnings: string[]): string[] {
  if (value === undefined) {
    warnings.push(`${path} unavailable.`);
    return [];
  }
  if (!Array.isArray(value)) failAmbientRecord(`${path} must be an array`);
  const out = value.map((item, index) => {
    if (typeof item !== 'string') failAmbientRecord(`${path}[${index}] must be a string`);
    return sanitizeReportString(item);
  });
  if (out.length > REPORT_MAX_ITEMS) warnings.push(`${path} truncated to ${REPORT_MAX_ITEMS} entries.`);
  return out.slice(0, REPORT_MAX_ITEMS);
}

function hashLabel(prefix: string, value: string): string {
  return `${prefix}-${createHash('sha256').update(value).digest('hex').slice(0, 12)}`;
}

function normalizeSessionId(value: string, warnings: string[]): string {
  const stripped = stripTerminalControls(value).trim();
  const redacted = redactSecrets(stripped);
  if (redacted === stripped && SAFE_SESSION_ID_PATTERN.test(stripped)) return stripped;
  warnings.push('record session id normalized to a verifier-owned label.');
  return hashLabel('unsafe-session', value);
}

function normalizeAllowlisted(value: string, allowed: Set<string>, fallback: string, warning: string, warnings: string[]): string {
  const stripped = stripTerminalControls(value).trim();
  if (allowed.has(stripped)) return stripped;
  warnings.push(warning);
  return fallback;
}

function normalizeToolName(value: string): string | null {
  const stripped = stripTerminalControls(value).trim();
  const redacted = redactSecrets(stripped);
  if (redacted !== stripped) return null;
  if (!SAFE_TOOL_NAME_PATTERN.test(stripped)) return null;
  return stripped;
}

function normalizeTimestamp(value: string | null, field: string, warnings: string[]): string | null {
  if (value === null) return null;
  const stripped = stripTerminalControls(value).trim();
  if (!ISO_UTC_PATTERN.test(stripped) || Number.isNaN(Date.parse(stripped))) {
    warnings.push(`${field} unavailable: invalid timestamp.`);
    return null;
  }
  return stripped;
}

function normalizeDigest(value: unknown, warnings: string[]): string | null {
  if (value === undefined || value === null) {
    warnings.push('observed.final_message_digest unavailable.');
    return null;
  }
  if (typeof value !== 'string') failAmbientRecord('observed.final_message_digest must be string or null');
  const stripped = stripTerminalControls(value).trim();
  if (SHA256_HEX_PATTERN.test(stripped)) return stripped;
  warnings.push('observed.final_message_digest unavailable: invalid digest shape.');
  return null;
}

function normalizeFailureCode(value: string | null, warnings: string[]): string | null {
  if (value === null) return null;
  const stripped = stripTerminalControls(value).trim();
  if (!stripped) return null;
  warnings.push('runtime.failureCode suppressed; failure presence recorded without record-authored prose.');
  return 'failure-recorded';
}

function normalizeMarkerState(value: string | null, warnings: string[]): string | null {
  if (value === null) return null;
  return normalizeAllowlisted(value, ALLOWED_MARKER_STATES, 'unrecognized-marker-state', 'runtime.markerState unrecognized.', warnings);
}

function normalizeFiles(value: unknown, warnings: string[]): AmbientTrustReport['transcript_observed']['files_touched'] {
  if (value === undefined) {
    warnings.push('observed.files_touched unavailable.');
    return { count: 0, samples: [], redacted_local_path_count: 0, suppressed_count: 0, truncated: false };
  }
  if (!Array.isArray(value)) failAmbientRecord('observed.files_touched must be an array');
  const samples: string[] = [];
  let redacted = 0;
  let suppressed = 0;
  for (const [index, item] of value.entries()) {
    if (typeof item !== 'string') failAmbientRecord(`observed.files_touched[${index}] must be a string`);
    const stripped = stripTerminalControls(item).trim();
    const secretRedacted = redactSecrets(stripped);
    if (!stripped || secretRedacted !== stripped || secretRedacted.includes('/[local-path-redacted]')) {
      redacted += 1;
      continue;
    }
    if (!SAFE_RELATIVE_PATH_PATTERN.test(stripped)) {
      suppressed += 1;
      continue;
    }
    if (!samples.includes(stripped) && samples.length < REPORT_MAX_SAMPLES) samples.push(stripped);
  }
  if (redacted > 0) warnings.push(`file paths redacted: ${redacted}.`);
  if (suppressed > 0) warnings.push(`file paths suppressed: ${suppressed}.`);
  const truncated = samples.length < (value.length - redacted - suppressed);
  if (truncated) warnings.push(`observed.files_touched samples truncated to ${REPORT_MAX_SAMPLES}.`);
  return { count: value.length, samples, redacted_local_path_count: redacted, suppressed_count: suppressed, truncated };
}

function fidelityNotes(input: {
  observed: Record<string, unknown> | null;
  tokenAvailability: 'available' | 'unavailable';
  sessionSpanAvailable: boolean;
  digest: string | null;
  files: AmbientTrustReport['transcript_observed']['files_touched'];
  warnings: string[];
}): string[] {
  const notes: string[] = [];
  if (!input.observed) notes.push('transcript-observed-facts-unavailable');
  if (input.tokenAvailability === 'unavailable') notes.push('token-usage-unavailable');
  if (!input.sessionSpanAvailable) notes.push('session-span-unavailable');
  if (!input.digest) notes.push('final-message-digest-unavailable');
  if (input.files.redacted_local_path_count > 0) notes.push(`file-paths-redacted=${input.files.redacted_local_path_count}`);
  if (input.files.suppressed_count > 0) notes.push(`file-paths-suppressed=${input.files.suppressed_count}`);
  const rawNotes = input.observed?.notes;
  if (Array.isArray(rawNotes) && rawNotes.length > 0) notes.push(`record-authored-notes-suppressed=${rawNotes.length}`);
  const suppressedTools = input.warnings.find((warning) => warning.startsWith('tool names suppressed:'));
  if (suppressedTools) notes.push('tool-names-suppressed');
  return notes.length > 0 ? notes : ['high-fidelity-transcript-summary'];
}

function sourceBoundary(source: string, observedAvailable: boolean, warnings: string[]): string {
  if (source === 'transcript-extraction') return 'transcript-observed facts are available.';
  if (source === 'ambient-postflight' && !observedAvailable) return 'postflight runtime receipt only; transcript-observed facts are unavailable.';
  if (source === 'ambient-postflight') return 'postflight runtime receipt with transcript-observed facts present.';
  warnings.push('record source unrecognized.');
  return 'unrecognized source; source-specific fidelity is not assumed.';
}

export function buildAmbientTrustReport(value: unknown, label = 'ambient record'): AmbientTrustReport {
  const warnings: string[] = [];
  const record = requireRecord(value, 'record');
  const schema = requireStringField(record, 'schema', 'record');
  if (schema !== AMBIENT_WORK_RECORD_SCHEMA) failAmbientRecord(`record.schema must be ${AMBIENT_WORK_RECORD_SCHEMA}`);
  const runId = requireStringField(record, 'runId', 'record');
  const rawSource = requireStringField(record, 'source', 'record');
  const source = normalizeAllowlisted(rawSource, ALLOWED_SOURCES, 'unrecognized-source', 'record source unrecognized.', warnings);
  const state = normalizeAllowlisted(requireStringField(record, 'state', 'record'), ALLOWED_STATES, 'unrecognized-state', 'record state unrecognized.', warnings);
  const runtime = requireRecord(record.runtime, 'runtime');
  const runtimeTokenTotal = optionalNumberOrNullField(runtime, 'tokenTotal', 'runtime', warnings);
  const observedRaw = record.observed;
  const observedPresent = Object.prototype.hasOwnProperty.call(record, 'observed');
  const observed = asRecord(observedRaw);
  if (observedPresent && !observed) failAmbientRecord('observed must be an object when present');
  if (rawSource === 'transcript-extraction' && !observed) failAmbientRecord('source transcript-extraction requires observed object');
  if (rawSource === 'transcript-extraction' && observed && !['assistant_turns', 'user_events', 'usage', 'tool_calls', 'files_touched', 'notes'].every((key) => Object.prototype.hasOwnProperty.call(observed, key))) failAmbientRecord('source transcript-extraction requires complete observed transcript facts');

  const observedUsage = observed ? validateUsage(observed.usage, warnings) : validateUsage(undefined, warnings);
  const tokenAvailability = Object.values(observedUsage).some((item) => typeof item === 'number') ? 'available' : 'unavailable';
  if (tokenAvailability === 'unavailable') warnings.push('observed token usage unavailable.');

  const startedAt = observed ? normalizeTimestamp(optionalRawStringOrNullField(observed, 'started_at', 'observed', warnings), 'observed.started_at', warnings) : null;
  const endedAt = observed ? normalizeTimestamp(optionalRawStringOrNullField(observed, 'ended_at', 'observed', warnings), 'observed.ended_at', warnings) : null;
  const filesTouched = observed ? normalizeFiles(observed.files_touched, warnings) : normalizeFiles(undefined, warnings);
  const digest = observed ? normalizeDigest(observed.final_message_digest, warnings) : null;
  const sessionSpanAvailable = Boolean(startedAt && endedAt);
  const report: AmbientTrustReport = {
    label: sanitizeReportString(label),
    schema,
    session_id: normalizeSessionId(runId, warnings),
    source,
    state,
    runtime: {
      adapter: normalizeAllowlisted(requireStringField(runtime, 'adapter', 'runtime'), ALLOWED_ADAPTERS, 'unrecognized-adapter', 'runtime.adapter unrecognized.', warnings),
      spawned: optionalBooleanField(runtime, 'spawned', 'runtime', warnings),
      status: normalizeAllowlisted(requireStringField(runtime, 'status', 'runtime'), ALLOWED_RUNTIME_STATUSES, 'unrecognized-status', 'runtime.status unrecognized.', warnings),
      failure_code: normalizeFailureCode(optionalRawStringOrNullField(runtime, 'failureCode', 'runtime', warnings), warnings),
      marker_state: normalizeMarkerState(optionalRawStringOrNullField(runtime, 'markerState', 'runtime', warnings), warnings),
      token_total: runtimeTokenTotal,
      token_availability: typeof runtimeTokenTotal === 'number' ? 'available' : 'unavailable',
    },
    transcript_observed: {
      available: Boolean(observed),
      assistant_turns: observed ? optionalCountField(observed, 'assistant_turns', 'observed', warnings) : null,
      user_events: observed ? optionalCountField(observed, 'user_events', 'observed', warnings) : null,
      tool_census: observed ? validateToolCalls(observed.tool_calls, warnings) : [],
      files_touched: filesTouched,
      usage: observedUsage,
      token_availability: tokenAvailability,
      session_span: { started_at: startedAt, ended_at: endedAt, available: sessionSpanAvailable },
      final_message_digest: digest,
      fidelity_notes: [],
    },
    warnings,
    boundary: {
      authority: REPORT_AUTHORITY_BOUNDARY,
      source: '',
    },
  };
  report.transcript_observed.fidelity_notes = fidelityNotes({ observed, tokenAvailability, sessionSpanAvailable, digest, files: filesTouched, warnings });
  report.boundary.source = sourceBoundary(source, report.transcript_observed.available, report.warnings);
  return report;
}

export function verifyAmbientRecordText(rawText: string, label = 'ambient record'): AmbientTrustReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new CaptureUsageError(`Malformed ambient record JSON in ${sanitizeReportString(label)}: ${sanitizeReportString(reason, 220)}`);
  }
  return buildAmbientTrustReport(parsed, label);
}

function availability(value: string | number | boolean | null): string {
  if (value === null) return 'unavailable';
  return String(value);
}

export function renderAmbientTrustReport(report: AmbientTrustReport): string {
  const toolSummary = report.transcript_observed.tool_census.length > 0
    ? report.transcript_observed.tool_census.map((entry) => `${entry.name}=${entry.count}`).join(', ')
    : 'none observed';
  const fileSummary = report.transcript_observed.files_touched;
  const filesSummary = [
    `count=${fileSummary.count}`,
    fileSummary.samples.length > 0 ? `samples=${fileSummary.samples.join(', ')}` : 'samples=none',
    `redacted_local_paths=${fileSummary.redacted_local_path_count}`,
    `suppressed=${fileSummary.suppressed_count}`,
    `truncated=${fileSummary.truncated}`,
  ].join('; ');
  const usageSummary = Object.entries(report.transcript_observed.usage)
    .map(([key, value]) => `${key}=${availability(value)}`)
    .join(', ');
  const notes = report.transcript_observed.fidelity_notes.length > 0 ? report.transcript_observed.fidelity_notes : ['none'];
  const warnings = report.warnings.length > 0 ? report.warnings : ['none'];
  return [
    'Ambient record trust report',
    `Record: ${report.label}`,
    `Schema: ${report.schema}`,
    `Source: ${report.source}`,
    `Session id: ${report.session_id}`,
    `State: ${report.state}`,
    `Runtime: adapter=${report.runtime.adapter}; status=${report.runtime.status}; spawned=${availability(report.runtime.spawned)}; failure=${availability(report.runtime.failure_code)}; marker=${availability(report.runtime.marker_state)}; tokenTotal=${availability(report.runtime.token_total)}; tokenAvailability=${report.runtime.token_availability}`,
    `Transcript-observed facts: ${report.transcript_observed.available ? 'available' : 'unavailable'}`,
    `Assistant turns: ${availability(report.transcript_observed.assistant_turns)}`,
    `User events: ${availability(report.transcript_observed.user_events)}`,
    `Tool-call census: ${toolSummary}`,
    `Files touched: ${filesSummary}`,
    `Usage: ${usageSummary}; tokenAvailability=${report.transcript_observed.token_availability}`,
    `Session span: started=${availability(report.transcript_observed.session_span.started_at)}; ended=${availability(report.transcript_observed.session_span.ended_at)}; available=${report.transcript_observed.session_span.available}`,
    `Final-message digest: ${availability(report.transcript_observed.final_message_digest)}`,
    `Fidelity notes: ${notes.join(' | ')}`,
    `Warnings: ${warnings.join(' | ')}`,
    `Authority boundary: ${report.boundary.authority}`,
    `Source boundary: ${report.boundary.source}`,
  ].join('\n');
}

function readTranscript(transcriptPath: string): string {
  if (!transcriptPath || !transcriptPath.trim()) {
    throw new CaptureUsageError('Missing --transcript <path>.');
  }
  const resolved = isAbsolute(transcriptPath) ? transcriptPath : resolve(process.cwd(), transcriptPath);
  if (!existsSync(resolved)) {
    throw new CaptureUsageError(`Transcript not found: ${transcriptPath}`);
  }
  try {
    return readFileSync(resolved, 'utf8');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new CaptureUsageError(`Could not read transcript: ${reason}`);
  }
}

function deriveRunId(transcriptPath: string, sessionId?: string): string {
  if (sessionId && sessionId.trim()) return sessionId.trim();
  const base = basename(transcriptPath || 'session').replace(/\.jsonl$/i, '');
  return base || 'session';
}

/**
 * Default output path for a captured record. Inside an .osc repo it lands under
 * .osc/state/ambient/<runId>.json, which is covered by the scaffolded .osc/.gitignore;
 * otherwise it lands next to cwd.
 */
export function defaultOutPath(repoRoot: string, runId: string): string {
  const safeRunId = runId.replace(/[^A-Za-z0-9._-]/g, '_') || 'session';
  return existsSync(resolve(repoRoot, '.osc'))
    ? `.osc/state/ambient/${safeRunId}.json`
    : `${safeRunId}.ambient-record.json`;
}

/**
 * Write a captured record. `out` may be absolute or relative.
 * - When it resolves inside repoRoot, the repo-safe writer is used (refuses .. escapes
 *   and symlinked components); this covers the default and relative-path cases.
 * - When `explicit` is true and the path resolves OUTSIDE the repo (e.g. `--out /tmp/x`),
 *   it is the user's deliberate choice and is written with a symlink-safe direct write.
 *   The default path is never `explicit`, so it can never silently escape the repo.
 * Returns the absolute path written.
 */
export function writeCaptureRecord(
  repoRoot: string,
  out: string,
  record: Record<string, unknown>,
  explicit = false,
  forbiddenPaths: string[] = [],
): string {
  const root = realOrResolve(resolve(repoRoot));
  // Realpath both sides so a symlinked root prefix (e.g. macOS /var -> /private/var)
  // cancels and the relativeness check reflects the true tree, not the link surface.
  const absolute = realOrResolve(isAbsolute(out) ? resolve(out) : resolve(root, out));
  for (const forbiddenPath of forbiddenPaths) {
    const forbiddenAbsolute = realOrResolve(isAbsolute(forbiddenPath) ? resolve(forbiddenPath) : resolve(process.cwd(), forbiddenPath));
    if (absolute === forbiddenAbsolute) {
      throw new CaptureUsageError('--out must not overwrite --transcript; choose a separate record path.');
    }
  }
  const relativeOut = relative(root, absolute).split('\\').join('/');
  const insideRepo = relativeOut !== '' && relativeOut !== '.' && !relativeOut.startsWith('..');
  if (insideRepo) {
    return writeJsonUnder(root, relativeOut, record, 'capture record path');
  }
  if (!explicit) {
    throw new CaptureUsageError(`--out must resolve to a path inside the repository: ${out}`);
  }
  return writeJsonNoFollow(absolute, record);
}

/**
 * Write JSON to an explicit absolute path with O_NOFOLLOW on the final component, so an
 * attacker-planted symlink at the target cannot redirect the write. Parent dirs are
 * created as needed. Used only for an explicit user-chosen --out outside the repo.
 */
function writeJsonNoFollow(absolutePath: string, record: Record<string, unknown>): string {
  mkdirSync(dirname(absolutePath), { recursive: true });
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | (constants.O_NOFOLLOW ?? 0);
  let handle: number | null = null;
  try {
    handle = openSync(absolutePath, flags, 0o666);
    writeSync(handle, `${JSON.stringify(record, null, 2)}\n`, undefined, 'utf8');
  } catch (error) {
    if ((error as { code?: string })?.code === 'ELOOP') {
      throw new CaptureUsageError(`--out must not be a symlink: ${absolutePath}`);
    }
    throw error;
  } finally {
    if (handle !== null) closeSync(handle);
  }
  return absolutePath;
}

/** Resolve to a real path when the target (or its nearest existing parent) exists. */
function realOrResolve(path: string): string {
  if (existsSync(path)) return realpathSync.native(path);
  const parent = resolve(path, '..');
  if (parent !== path && existsSync(parent)) return resolve(realpathSync.native(parent), basename(path));
  return resolve(path);
}
