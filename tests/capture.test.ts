import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  CAPTURE_FORMATS,
  CaptureUsageError,
  captureRecord,
  defaultOutPath,
  detectFormat,
  isCaptureFormat,
  writeCaptureRecord,
} from '../src/capture.js';
import { ambientDigest } from '../src/ambient.js';
import { redactSecrets } from '../src/redaction.js';

const fixtures = resolve(import.meta.dirname, 'fixtures/capture');
const claudeFixture = join(fixtures, 'claude-code.jsonl');
const codexFixture = join(fixtures, 'codex.jsonl');
const genericFixture = join(fixtures, 'generic.jsonl');
const malformedFixture = join(fixtures, 'malformed.jsonl');

function observed(path: string, format?: 'claude-code' | 'codex' | 'jsonl-generic') {
  const result = captureRecord({ transcriptPath: path, format });
  return { result, observed: result.record.observed as Record<string, any>, runtime: result.record.runtime as Record<string, any> };
}

describe('capture format registry', () => {
  it('exposes exactly the v1 formats', () => {
    expect([...CAPTURE_FORMATS]).toEqual(['claude-code', 'codex', 'jsonl-generic']);
    expect(isCaptureFormat('codex')).toBe(true);
    expect(isCaptureFormat('aider')).toBe(false);
  });
});

describe('claude-code parser', () => {
  it('extracts turns, summed usage, tool census, and files from the contract shape', () => {
    const { result, observed: o, runtime } = observed(claudeFixture, 'claude-code');

    expect(result.record.schema).toBe('osc.ambient-work-record.v1');
    expect(result.record.source).toBe('transcript-extraction');
    expect(runtime.adapter).toBe('claude-code-transcript');
    expect(runtime.spawned).toBe(false);
    expect(o.assistant_turns).toBe(3);
    expect(o.user_events).toBe(2);
    // usage is per-turn in claude-code, so the parser sums across turns.
    expect(o.usage).toEqual({
      input_tokens: 2800,
      output_tokens: 870,
      cache_creation_input_tokens: 4000,
      cache_read_input_tokens: 10400,
    });
    expect(runtime.tokenTotal).toBe(2800 + 870 + 4000 + 10400);
    expect(o.tool_calls).toEqual({ Read: 1, Edit: 1, Bash: 1 });
    expect(o.files_touched).toEqual(['/repo/src/fetch.ts']);
    expect(o.started_at).toBe('2026-06-13T10:00:00.000Z');
    expect(o.ended_at).toBe('2026-06-13T10:00:20.000Z');
    expect(o.final_message_claim_words).toEqual(['complete']);
  });
  it('accumulates split final-message text before digesting and claim sniffing', () => {
    const finalText = 'Blocked first half; complete second half.';
    const rawText = [
      JSON.stringify({ type: 'assistant', timestamp: '2026-06-13T10:00:00.000Z', message: { role: 'assistant', usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: 'text', text: 'Earlier turn.' }] } }),
      JSON.stringify({ type: 'assistant', timestamp: '2026-06-13T10:00:01.000Z', message: { role: 'assistant', usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: 'text', text: 'Blocked first half; ' }, { type: 'text', text: 'complete second half.' }] } }),
    ].join('\n');

    const record = captureRecord({ transcriptPath: 'inline-claude', format: 'claude-code', rawText });
    const observedRecord = record.record.observed as Record<string, any>;

    expect(observedRecord.assistant_turns).toBe(2);
    expect(observedRecord.final_message_digest).toBe(ambientDigest(redactSecrets(finalText)));
    expect(observedRecord.final_message_claim_words).toEqual(['blocked', 'complete']);
  });
});

describe('codex parser', () => {
  it('extracts turns, last cumulative token total, tool census, and files', () => {
    const { result, observed: o, runtime } = observed(codexFixture, 'codex');

    expect(runtime.adapter).toBe('codex-rollout');
    expect(runtime.spawned).toBe(false);
    expect(o.assistant_turns).toBe(1);
    expect(o.user_events).toBe(1);
    // codex token_count is cumulative: the parser takes the LAST event, not a sum.
    expect(o.usage.input_tokens).toBe(5200);
    expect(o.usage.output_tokens).toBe(340);
    expect(o.usage.cache_read_input_tokens).toBe(1500);
    // codex has no cache-creation split: recorded null with a note, never invented.
    expect(o.usage.cache_creation_input_tokens).toBeNull();
    expect(o.usage.total_tokens).toBe(5750);
    expect(o.notes.some((note: string) => note.includes('total_tokens is authoritative'))).toBe(true);
    expect(runtime.tokenTotal).toBe(5750);
    expect(o.tool_calls.shell).toBe(1);
    expect(o.tool_calls['mcp:open_scaffold.get_handoff']).toBe(1);
    expect(o.files_touched).toEqual(['/repo/src/helper.ts']);
    expect(o.final_message_claim_words).toEqual(['done']);
    expect(o.started_at).toBe('2026-06-13T11:00:00.000Z');
    expect(o.ended_at).toBe('2026-06-13T11:00:12.000Z');
  });

  it('records null token usage with a note when no token_count event exists', () => {
    const record = captureRecord({
      transcriptPath: 'inline-codex',
      format: 'codex',
      rawText: '{"timestamp":"2026-06-13T11:00:00.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"hi"}]}}',
    });
    const o = record.record.observed as Record<string, any>;
    expect(o.usage.input_tokens).toBeNull();
    expect((record.record.runtime as Record<string, any>).tokenTotal).toBeNull();
    expect(o.notes.some((note: string) => note.includes('no codex token_count event found'))).toBe(true);
  });
});

describe('jsonl-generic parser', () => {
  it('counts lines/roles/timestamps only and marks lower fidelity', () => {
    const { observed: o, runtime } = observed(genericFixture, 'jsonl-generic');
    expect(runtime.adapter).toBe('jsonl-generic');
    expect(o.assistant_turns).toBe(2);
    expect(o.user_events).toBe(2);
    expect(o.usage.input_tokens).toBeNull();
    expect(runtime.tokenTotal).toBeNull();
    expect(o.tool_calls).toEqual({});
    expect(o.files_touched).toEqual([]);
    expect(o.started_at).toBe('2026-06-13T12:00:00.000Z');
    expect(o.notes.some((note: string) => note.includes('best-effort'))).toBe(true);
  });
});

describe('detection', () => {
  it('picks the right concrete parser per fixture family', () => {
    expect(captureRecord({ transcriptPath: claudeFixture, detect: true }).format).toBe('claude-code');
    expect(captureRecord({ transcriptPath: codexFixture, detect: true }).format).toBe('codex');
    expect(captureRecord({ transcriptPath: claudeFixture, detect: true }).detected).toBe(true);
  });

  it('throws a usage error when nothing matches, never auto-selecting generic', () => {
    expect(() => detectFormat({ lines: [{ foo: 'bar' }], malformed: 0 })).toThrow(CaptureUsageError);
  });
});

describe('malformed-line tolerance', () => {
  it('skips non-json and non-object lines, records a tolerance note, and never throws', () => {
    const { observed: o } = observed(malformedFixture, 'claude-code');
    expect(o.assistant_turns).toBe(1);
    expect(o.user_events).toBe(1);
    expect(o.notes.some((note: string) => /tolerated \d+ malformed/.test(note))).toBe(true);
  });
});

describe('redaction', () => {
  it('redacts transcript intent before digesting it', () => {
    const intentText = 'Use token sk-proj-abcdefghijklmnopqrstuvwxyzABCDEF123456 and inspect /Users/someone/secret.txt.';
    const rawIntent = [{ type: 'text', text: intentText }];
    const redactedIntent = [{ type: 'text', text: redactSecrets(intentText) }];
    const rawText = [
      JSON.stringify({ type: 'user', timestamp: '2026-06-13T10:00:00.000Z', message: { role: 'user', content: rawIntent } }),
      JSON.stringify({ type: 'assistant', timestamp: '2026-06-13T10:00:01.000Z', message: { role: 'assistant', usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: 'text', text: 'Done.' }] } }),
    ].join('\n');

    const record = captureRecord({ transcriptPath: 'inline-claude', format: 'claude-code', rawText });

    expect(record.record.intentDigest).toBe(ambientDigest(redactedIntent));
    expect(record.record.intentDigest).not.toBe(ambientDigest(rawIntent));
  });

  it('redacts private local paths before recording touched files', () => {
    const rawText = [
      JSON.stringify({ timestamp: '2026-06-13T11:00:00.000Z', type: 'response_item', payload: { type: 'function_call', name: 'shell', arguments: JSON.stringify({ file_path: '/Users/someone/project/secret.ts' }) } }),
      JSON.stringify({ timestamp: '2026-06-13T11:00:01.000Z', type: 'event_msg', payload: { type: 'agent_message', message: 'Done.' } }),
    ].join('\n');

    const record = captureRecord({ transcriptPath: 'inline-codex', format: 'codex', rawText });
    const observedRecord = record.record.observed as Record<string, any>;
    const serialized = JSON.stringify(record.record);

    expect(observedRecord.files_touched).toEqual(['/[local-path-redacted]']);
    expect(serialized).not.toContain('/Users/someone');
  });

  it('redacts secrets before digesting the final message (no token leaks into the record)', () => {
    const record = captureRecord({ transcriptPath: claudeFixture, format: 'claude-code' });
    const serialized = JSON.stringify(record.record);
    // The raw secret/path from the final message must not survive anywhere in the record.
    expect(serialized).not.toContain('sk-proj-AAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    expect(serialized).not.toContain('/Users/secret/key.txt');
    // The digest is taken over redacted text: digesting redactSecrets(finalText)
    // independently must reproduce the recorded digest, proving the order is
    // redact-then-hash (a raw-text digest would differ).
    const o = record.record.observed as Record<string, any>;
    const finalText = 'The change is complete and tests pass. My token is sk-proj-AAAAAAAAAAAAAAAAAAAAAAAAAAAA stored at /Users/secret/key.txt.';
    expect(o.final_message_digest).toBe(ambientDigest(redactSecrets(finalText)));
    expect(o.final_message_digest).not.toBe(ambientDigest(finalText));
  });
});

describe('output writer', () => {
  it('chooses an .osc-dev/ambient path inside an .osc repo and a cwd path otherwise', () => {
    const repo = mkdtempSync(join(tmpdir(), 'osc-cap-repo-'));
    const noRepo = mkdtempSync(join(tmpdir(), 'osc-cap-norepo-'));
    mkdirSync(join(repo, '.osc'), { recursive: true });
    expect(defaultOutPath(repo, 'sess-1')).toBe('.osc-dev/ambient/sess-1.json');
    expect(defaultOutPath(noRepo, 'sess-1')).toBe('sess-1.ambient-record.json');
    // unsafe run-id characters are sanitized for the filename
    expect(defaultOutPath(noRepo, '../evil')).toBe('.._evil.ambient-record.json');
  });

  it('writes a valid record under the repo root', () => {
    const repo = mkdtempSync(join(tmpdir(), 'osc-cap-write-'));
    const record = captureRecord({ transcriptPath: codexFixture, format: 'codex' }).record;
    const written = writeCaptureRecord(repo, 'out/record.json', record);
    const parsed = JSON.parse(readFileSync(written, 'utf8'));
    expect(parsed.schema).toBe('osc.ambient-work-record.v1');
    expect(parsed.observed.assistant_turns).toBe(1);
  });
});

describe('usage errors', () => {
  it('reports a missing transcript as a usage error, not a thrown read crash', () => {
    expect(() => captureRecord({ transcriptPath: '/no/such/transcript.jsonl', format: 'codex' })).toThrow(CaptureUsageError);
  });
  it('requires a format or detection', () => {
    expect(() => captureRecord({ transcriptPath: codexFixture })).not.toThrow();
  });
});
