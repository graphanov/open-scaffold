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
  source: string;
  runId: string;
  state: string;
  runtime: {
    adapter: string;
    spawned: boolean | null;
    status: string;
    failureCode: string | null;
    markerState: string | null;
    tokenTotal: number | null;
    tokenAvailability: 'available' | 'unavailable';
  };
  transcriptObserved: {
    available: boolean;
    assistantTurns: number | null;
    userEvents: number | null;
    toolCalls: Array<{ name: string; count: number }>;
    filesTouched: string[];
    usage: Record<string, number | null>;
    tokenAvailability: 'available' | 'unavailable';
    sessionSpan: { startedAt: string | null; endedAt: string | null; available: boolean };
    notes: string[];
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
const REPORT_AUTHORITY_BOUNDARY = 'not approval; not correctness certification; not retry authorization.';
const ANSI_OSC_PATTERN = /\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g;
const ANSI_CSI_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;
const ANSI_SINGLE_PATTERN = /\u001B[@-_]/g;
const CONTROL_PATTERN = /[\u0000-\u001F\u007F-\u009F]/g;

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
  const entries = Object.entries(toolCalls).map(([name, count]) => {
    if (typeof count !== 'number' || !Number.isFinite(count) || !Number.isInteger(count) || count < 0) {
      failAmbientRecord(`observed.tool_calls count for ${sanitizeReportString(name)} must be a non-negative integer`);
    }
    return { name: sanitizeReportString(name), count };
  }).sort((a, b) => a.name.localeCompare(b.name));
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

function sourceBoundary(source: string, observedAvailable: boolean, warnings: string[]): string {
  if (source === 'transcript-extraction') return 'transcript-observed facts are available.';
  if (source === 'ambient-postflight' && !observedAvailable) return 'postflight runtime receipt only; transcript-observed facts are unavailable.';
  if (source === 'ambient-postflight') return 'postflight runtime receipt with transcript-observed facts present.';
  const displaySource = sanitizeReportString(source); warnings.push(`source is unrecognized: ${displaySource}.`);
  return `unrecognized source: ${displaySource}; source-specific fidelity is not assumed.`;
}

export function buildAmbientTrustReport(value: unknown, label = 'ambient record'): AmbientTrustReport {
  const warnings: string[] = [];
  const record = requireRecord(value, 'record');
  const schema = requireStringField(record, 'schema', 'record');
  if (schema !== AMBIENT_WORK_RECORD_SCHEMA) failAmbientRecord(`record.schema must be ${AMBIENT_WORK_RECORD_SCHEMA}`);
  const runId = requireStringField(record, 'runId', 'record');
  const source = requireStringField(record, 'source', 'record');
  const state = requireStringField(record, 'state', 'record');
  const runtime = requireRecord(record.runtime, 'runtime');
  const runtimeTokenTotal = optionalNumberOrNullField(runtime, 'tokenTotal', 'runtime', warnings);
  const observedRaw = record.observed;
  const observedPresent = Object.prototype.hasOwnProperty.call(record, 'observed');
  const observed = asRecord(observedRaw);
  if (observedPresent && !observed) failAmbientRecord('observed must be an object when present');
  if (source === 'transcript-extraction' && !observed) failAmbientRecord('source transcript-extraction requires observed object'); if (source === 'transcript-extraction' && observed && !['assistant_turns', 'user_events', 'usage', 'tool_calls', 'files_touched', 'notes'].every((key) => Object.prototype.hasOwnProperty.call(observed, key))) failAmbientRecord('source transcript-extraction requires complete observed transcript facts');

  const observedUsage = observed ? validateUsage(observed.usage, warnings) : validateUsage(undefined, warnings);
  const tokenAvailability = Object.values(observedUsage).some((item) => typeof item === 'number') ? 'available' : 'unavailable';
  if (tokenAvailability === 'unavailable') warnings.push('observed token usage unavailable.');

  const startedAt = observed ? optionalStringOrNullField(observed, 'started_at', 'observed', warnings) : null;
  const endedAt = observed ? optionalStringOrNullField(observed, 'ended_at', 'observed', warnings) : null;
  const report: AmbientTrustReport = {
    label: sanitizeReportString(label),
    schema: sanitizeReportString(schema),
    source: sanitizeReportString(source),
    runId: sanitizeReportString(runId),
    state: sanitizeReportString(state),
    runtime: {
      adapter: sanitizeReportString(requireStringField(runtime, 'adapter', 'runtime')),
      spawned: optionalBooleanField(runtime, 'spawned', 'runtime', warnings),
      status: sanitizeReportString(requireStringField(runtime, 'status', 'runtime')),
      failureCode: optionalStringOrNullField(runtime, 'failureCode', 'runtime', warnings),
      markerState: optionalStringOrNullField(runtime, 'markerState', 'runtime', warnings),
      tokenTotal: runtimeTokenTotal,
      tokenAvailability: typeof runtimeTokenTotal === 'number' ? 'available' : 'unavailable',
    },
    transcriptObserved: {
      available: Boolean(observed),
      assistantTurns: observed ? optionalCountField(observed, 'assistant_turns', 'observed', warnings) : null,
      userEvents: observed ? optionalCountField(observed, 'user_events', 'observed', warnings) : null,
      toolCalls: observed ? validateToolCalls(observed.tool_calls, warnings) : [],
      filesTouched: observed ? validateStringList(observed.files_touched, 'observed.files_touched', warnings) : [],
      usage: observedUsage,
      tokenAvailability,
      sessionSpan: { startedAt, endedAt, available: Boolean(startedAt && endedAt) },
      notes: observed ? validateStringList(observed.notes, 'observed.notes', warnings) : [],
    },
    warnings,
    boundary: {
      authority: REPORT_AUTHORITY_BOUNDARY,
      source: '',
    },
  };
  report.boundary.source = sourceBoundary(source, report.transcriptObserved.available, report.warnings);
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
  const toolSummary = report.transcriptObserved.toolCalls.length > 0
    ? report.transcriptObserved.toolCalls.map((entry) => `${entry.name}=${entry.count}`).join(', ')
    : 'none observed';
  const filesSummary = report.transcriptObserved.filesTouched.length > 0
    ? report.transcriptObserved.filesTouched.join(', ')
    : 'none observed';
  const usageSummary = Object.entries(report.transcriptObserved.usage)
    .map(([key, value]) => `${key}=${availability(value)}`)
    .join(', ');
  const notes = report.transcriptObserved.notes.length > 0 ? report.transcriptObserved.notes : ['none'];
  const warnings = report.warnings.length > 0 ? report.warnings : ['none'];
  return [
    'Ambient record trust report',
    `Record: ${report.label}`,
    `Schema: ${report.schema}`,
    `Source: ${report.source}`,
    `Run/session id: ${report.runId}`,
    `State: ${report.state}`,
    `Runtime: adapter=${report.runtime.adapter}; status=${report.runtime.status}; spawned=${availability(report.runtime.spawned)}; failure=${availability(report.runtime.failureCode)}; marker=${availability(report.runtime.markerState)}; tokenTotal=${availability(report.runtime.tokenTotal)}; tokenAvailability=${report.runtime.tokenAvailability}`,
    `Transcript-observed facts: ${report.transcriptObserved.available ? 'available' : 'unavailable'}`,
    `Assistant turns: ${availability(report.transcriptObserved.assistantTurns)}`,
    `User events: ${availability(report.transcriptObserved.userEvents)}`,
    `Tool-call census: ${toolSummary}`,
    `Files touched: ${filesSummary}`,
    `Usage: ${usageSummary}; tokenAvailability=${report.transcriptObserved.tokenAvailability}`,
    `Session span: started=${availability(report.transcriptObserved.sessionSpan.startedAt)}; ended=${availability(report.transcriptObserved.sessionSpan.endedAt)}; available=${report.transcriptObserved.sessionSpan.available}`,
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
