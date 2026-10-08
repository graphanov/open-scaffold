import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  CAPTURE_FORMATS,
  CaptureUsageError,
  buildAmbientTrustReport,
  captureRecord,
  defaultOutPath,
  detectFormat,
  isCaptureFormat,
  renderAmbientTrustReport,
  sanitizeReportString,
  verifyAmbientRecordText,
  writeCaptureRecord,
} from '../src/capture.js';
import { AmbientObserved, AmbientUsage, ambientDigest, buildTranscriptWorkRecord } from '../src/ambient.js';
import { redactSecrets } from '../src/redaction.js';

const fixtures = resolve(import.meta.dirname, 'fixtures/capture');
const claudeFixture = join(fixtures, 'claude-code.jsonl');
const codexFixture = join(fixtures, 'codex.jsonl');
const genericFixture = join(fixtures, 'generic.jsonl');
const malformedFixture = join(fixtures, 'malformed.jsonl');
const recordFixtures = resolve(fixtures, 'records');

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

describe('token measurement availability', () => {
  const splitKeys = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'] as const;
  const completeUsage = { input_tokens: 7, output_tokens: 2, cache_creation_input_tokens: 1, cache_read_input_tokens: 3 };
  const unknownUsage = { input_tokens: null, output_tokens: null, cache_creation_input_tokens: null, cache_read_input_tokens: null };
  const zeroUsage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  const cumulativeUsage = { input_tokens: 5200, output_tokens: 340, cached_input_tokens: 1500, total_tokens: 5750 };

  function claudeTurn(usage: unknown, index = 0) {
    return {
      type: 'assistant', timestamp: `2026-06-13T10:00:0${index}.000Z`,
      message: { role: 'assistant', ...(usage === undefined ? {} : { usage }), content: [{ type: 'text', text: 'Synthetic observation.' }] },
    };
  }

  function codexSnapshot(usage: unknown) {
    return { type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: usage } } };
  }

  function captureInline(format: 'claude-code' | 'codex', lines: unknown[]) {
    return captureRecord({ transcriptPath: 'synthetic-token-availability', format, rawText: lines.map((line) => JSON.stringify(line)).join('\n') }).record;
  }

  function recordUsage(record: Record<string, unknown>) {
    return (record.observed as AmbientObserved).usage;
  }

  function expectAvailability(record: Record<string, unknown>, total: number | null, observedAvailability: 'available' | 'unavailable') {
    expect((record.runtime as Record<string, unknown>).tokenTotal).toBe(total);
    const report = buildAmbientTrustReport(record);
    expect(report.runtime.token_total).toBe(total);
    expect(report.runtime.token_availability).toBe(total === null ? 'unavailable' : 'available');
    expect(report.transcript_observed.token_availability).toBe(observedAvailability);
    if (total === null) expect(report.warnings).toContain('runtime.tokenTotal unavailable.');
    if (observedAvailability === 'unavailable') {
      expect(report.transcript_observed.fidelity_notes).toContain('token-usage-unavailable');
      expect(report.transcript_observed.fidelity_notes).not.toContain('high-fidelity-transcript-summary');
    }
    return report;
  }

  it.each([
    ['empty transcript', []],
    ['user-only transcript', [{ type: 'user', message: { content: 'Synthetic request.' } }]],
    ['absent usage', [claudeTurn(undefined)]],
    ['null usage', [claudeTurn(null)]],
    ['empty usage', [claudeTurn({})]],
  ])('keeps Claude %s unavailable', (_label, lines) => {
    const record = captureInline('claude-code', lines as unknown[]);
    expect(recordUsage(record)).toEqual(unknownUsage);
    const report = expectAvailability(record, null, 'unavailable');
    expect(renderAmbientTrustReport(report)).toContain('tokenTotal=unavailable; tokenAvailability=unavailable');
  });

  it.each([7, 0])('preserves a reported Claude input split of %s without inventing other splits or a total', (input) => {
    const record = captureInline('claude-code', [claudeTurn({ input_tokens: input })]);
    expect(recordUsage(record)).toEqual({ ...unknownUsage, input_tokens: input });
    const report = expectAvailability(record, null, 'available');
    expect(report.warnings).toContain('observed.usage.output_tokens unavailable.');
    expect(report.warnings).toContain('observed.usage.cache_read_input_tokens unavailable.');
  });

  it.each([
    ['reported then absent', [completeUsage, undefined]],
    ['absent then reported', [undefined, completeUsage]],
    ['reported then empty', [completeUsage, {}]],
    ['empty then reported', [{}, completeUsage]],
  ])('keeps Claude coverage gaps unavailable: %s', (_label, usages) => {
    const record = captureInline('claude-code', (usages as unknown[]).map(claudeTurn));
    expect((record.observed as AmbientObserved).assistant_turns).toBe(2);
    expect(recordUsage(record)).toEqual(unknownUsage);
    expect((record.observed as AmbientObserved).notes.some((note) => note.includes('coverage'))).toBe(true);
    expectAvailability(record, null, 'unavailable');
  });

  it('poisons only the Claude split with incomplete assistant-turn coverage', () => {
    const record = captureInline('claude-code', [claudeTurn(completeUsage), claudeTurn({ input_tokens: 5, output_tokens: 4, cache_creation_input_tokens: 0 }, 1)]);
    expect(recordUsage(record)).toEqual({ input_tokens: 12, output_tokens: 6, cache_creation_input_tokens: 1, cache_read_input_tokens: null });
    expectAvailability(record, null, 'available');
  });

  it.each(splitKeys)('keeps an invalid Claude %s unavailable while preserving other complete splits', (key) => {
    const record = captureInline('claude-code', [claudeTurn({ ...completeUsage, [key]: -1 }), claudeTurn(completeUsage, 1)]);
    const expected = Object.fromEntries(splitKeys.map((split) => [split, split === key ? null : completeUsage[split] * 2]));
    expect(recordUsage(record)).toEqual(expected);
    expectAvailability(record, null, 'available');
  });

  it.each([null, '7', false, {}, -1, 1.5])('treats invalid Claude input %j as unavailable', (input) => {
    const record = captureInline('claude-code', [claudeTurn({ ...completeUsage, input_tokens: input })]);
    expect(recordUsage(record)).toEqual({ ...completeUsage, input_tokens: null });
    expectAvailability(record, null, 'available');
  });

  it('treats a non-finite JSON token count as unavailable without breaking capture verification', () => {
    const rawText = JSON.stringify(claudeTurn(completeUsage)).replace('"input_tokens":7', '"input_tokens":1e400');
    const record = captureRecord({ transcriptPath: 'synthetic-non-finite', format: 'claude-code', rawText }).record;
    expect(recordUsage(record)).toEqual({ ...completeUsage, input_tokens: null });
    expectAvailability(record, null, 'available');
  });

  it('keeps an overflowing Claude aggregate unavailable', () => {
    const record = captureInline('claude-code', [claudeTurn({ ...completeUsage, input_tokens: Number.MAX_VALUE }), claudeTurn({ ...completeUsage, input_tokens: Number.MAX_VALUE }, 1)]);
    expect(recordUsage(record)).toEqual({ input_tokens: null, output_tokens: 4, cache_creation_input_tokens: 2, cache_read_input_tokens: 6 });
    expectAvailability(record, null, 'available');
  });

  it.each([
    ['complete observations', completeUsage, { input_tokens: 14, output_tokens: 4, cache_creation_input_tokens: 2, cache_read_input_tokens: 6 }, 26],
    ['explicit complete zeros', zeroUsage, zeroUsage, 0],
  ])('sums Claude %s across all counted turns', (_label, usage, expected, total) => {
    const record = captureInline('claude-code', [claudeTurn(usage), claudeTurn(usage, 1)]);
    expect(recordUsage(record)).toEqual(expected);
    expectAvailability(record, total as number, 'available');
  });

  it.each([
    ['empty cumulative snapshot', {}, { ...unknownUsage, total_tokens: null }, null, 'unavailable'],
    ['input only', { input_tokens: 7 }, { ...unknownUsage, input_tokens: 7, total_tokens: null }, null, 'available'],
    ['all supported splits without a total', { input_tokens: 7, output_tokens: 2, cached_input_tokens: 3 }, { ...unknownUsage, input_tokens: 7, output_tokens: 2, cache_read_input_tokens: 3, total_tokens: null }, null, 'available'],
    ['total only', { total_tokens: 17 }, { ...unknownUsage, total_tokens: 17 }, 17, 'available'],
    ['explicit zero total', { total_tokens: 0 }, { ...unknownUsage, total_tokens: 0 }, 0, 'available'],
  ])('uses only explicitly reported fields in the Codex %s', (_label, usage, expected, total, availability) => {
    const record = captureInline('codex', [codexSnapshot(usage)]);
    expect(recordUsage(record)).toEqual(expected);
    expectAvailability(record, total as number | null, availability as 'available' | 'unavailable');
  });

  it.each([
    ['empty', {}],
    ['input only', { input_tokens: 7 }],
    ['total only', { total_tokens: 17 }],
    ['invalid total', { total_tokens: -1 }],
  ])('does not salvage older fields from a Codex %s final snapshot', (_label, latest) => {
    const record = captureInline('codex', [codexSnapshot(cumulativeUsage), codexSnapshot(latest)]);
    const latestOnly = captureInline('codex', [codexSnapshot(latest)]);
    expect(recordUsage(record)).toEqual(recordUsage(latestOnly));
    const expectedTotal = (latest as { total_tokens?: number }).total_tokens === 17 ? 17 : null;
    expectAvailability(record, expectedTotal, _label === 'input only' || _label === 'total only' ? 'available' : 'unavailable');
  });

  it.each([undefined, null, [], 'unavailable'])('ignores Codex token_count events without a cumulative object: %j', (nonSnapshot) => {
    const record = captureInline('codex', [codexSnapshot(cumulativeUsage), codexSnapshot(nonSnapshot)]);
    const snapshotOnly = captureInline('codex', [codexSnapshot(cumulativeUsage)]);
    expect(recordUsage(record)).toEqual(recordUsage(snapshotOnly));
    expectAvailability(record, 5750, 'available');
  });

  it('keeps an empty Codex transcript unavailable', () => {
    const record = captureInline('codex', []);
    expect(recordUsage(record)).toEqual({ ...unknownUsage, total_tokens: null });
    expectAvailability(record, null, 'unavailable');
  });

  it.each(['input_tokens', 'output_tokens', 'cached_input_tokens', 'total_tokens'])('keeps invalid Codex %s null while preserving a reported authoritative total', (key) => {
    const record = captureInline('codex', [codexSnapshot({ ...cumulativeUsage, [key]: -1 })]);
    const expected = { input_tokens: 5200, output_tokens: 340, cache_creation_input_tokens: null, cache_read_input_tokens: 1500, total_tokens: 5750 };
    const normalizedKey = key === 'cached_input_tokens' ? 'cache_read_input_tokens' : key;
    expect(recordUsage(record)).toEqual({ ...expected, [normalizedKey]: null });
    expectAvailability(record, key === 'total_tokens' ? null : 5750, 'available');
  });

  it.each([null, '17', -1, 1.5])('keeps invalid Codex authoritative total %j unavailable', (total) => {
    const record = captureInline('codex', [codexSnapshot({ ...cumulativeUsage, total_tokens: total })]);
    expect(recordUsage(record).total_tokens).toBeNull();
    expectAvailability(record, null, 'available');
    expect((record.observed as AmbientObserved).notes.some((note) => note.includes('total_tokens unavailable'))).toBe(true);
  });

  it('keeps a non-finite Codex authoritative total unavailable', () => {
    const rawText = JSON.stringify(codexSnapshot(cumulativeUsage)).replace('"total_tokens":5750', '"total_tokens":1e400');
    const record = captureRecord({ transcriptPath: 'synthetic-non-finite', format: 'codex', rawText }).record;
    expect(recordUsage(record).total_tokens).toBeNull();
    expectAvailability(record, null, 'available');
  });

  function buildWithUsage(usage: AmbientUsage) {
    return buildTranscriptWorkRecord({
      runId: 'synthetic-direct-builder', adapter: 'claude-code-transcript', command: 'synthetic', intent: null,
      observed: { assistant_turns: 1, user_events: 0, started_at: null, ended_at: null, usage, tool_calls: {}, files_touched: [], final_message_digest: null, final_message_claim_words: [], notes: [] },
    });
  }

  it.each(splitKeys)('requires a valid direct-builder %s before constructing a total', (key) => {
    for (const value of [null, -1, 1.5, NaN, Infinity]) {
      const record = buildWithUsage({ ...completeUsage, [key]: value });
      expect((record.runtime as Record<string, unknown>).tokenTotal).toBeNull();
    }
  });

  it.each([null, -1, 1.5, NaN, Infinity])('does not replace an explicitly unavailable or invalid direct-builder total %s with a split sum', (total) => {
    const record = buildWithUsage({ ...completeUsage, total_tokens: total });
    expect((record.runtime as Record<string, unknown>).tokenTotal).toBeNull();
  });

  it('keeps a direct-builder partial measurement or overflowing split sum unavailable', () => {
    expectAvailability(buildWithUsage({ ...unknownUsage, input_tokens: 7 }), null, 'available');
    const overflowing = buildWithUsage({ ...completeUsage, input_tokens: Number.MAX_VALUE, output_tokens: Number.MAX_VALUE });
    expect((overflowing.runtime as Record<string, unknown>).tokenTotal).toBeNull();
  });

  it('preserves valid direct-builder totals and complete disjoint split sums, including zero', () => {
    expectAvailability(buildWithUsage(completeUsage), 13, 'available');
    expectAvailability(buildWithUsage(zeroUsage), 0, 'available');
    expectAvailability(buildWithUsage({ ...unknownUsage, total_tokens: 17 }), 17, 'available');
    expectAvailability(buildWithUsage({ ...unknownUsage, total_tokens: 0 }), 0, 'available');
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

describe('ambient record verifier trust report', () => {
  function reportFixture(name: string) {
    return verifyAmbientRecordText(readFileSync(join(recordFixtures, name), 'utf8'), name);
  }

  it('reports a valid Claude Code transcript record without trusting record-authored boundary prose', () => {
    const report = reportFixture('valid-claude-code.json');
    const rendered = renderAmbientTrustReport(report);

    expect(report.schema).toBe('osc.ambient-work-record.v1');
    expect(report.source).toBe('transcript-extraction');
    expect(report.session_id).toBe('claude-session-1');
    expect(report.runtime.adapter).toBe('claude-code-transcript');
    expect(report.transcript_observed.available).toBe(true);
    expect(report.transcript_observed.assistant_turns).toBe(2);
    expect(report.transcript_observed.user_events).toBe(1);
    expect(report.transcript_observed.tool_census).toEqual([{ name: 'Edit', count: 1 }, { name: 'Read', count: 1 }]);
    expect(report.transcript_observed.final_message_digest).toBe('6ca13d52ca70c883e0f0bb101e425a89e8624de51db2d2392593af6a84118090');
    expect(rendered).toContain('transcript-observed facts are available');
    expect(rendered).toContain('not approval, correctness certification, retry authorization, execution authority, or spawn authority');
    expect(rendered).not.toContain('APPROVED BY RECORD TEXT');
  });

  it('reports a valid Codex transcript record and token availability in JSON-safe shape', () => {
    const report = reportFixture('valid-codex.json');

    expect(report.runtime.token_total).toBe(5750);
    expect(report.runtime.token_availability).toBe('available');
    expect(report.transcript_observed.usage.total_tokens).toBe(5750);
    expect(report.transcript_observed.fidelity_notes).toEqual(['record-authored-notes-suppressed=1']);
    expect(JSON.stringify(report)).not.toContain('boundary.note');
    expect(JSON.stringify(report)).not.toContain('codex cache-creation split unavailable');
  });

  it('accepts ambient postflight records without observed facts as a fidelity warning', () => {
    const report = reportFixture('valid-postflight-no-observed.json');
    const rendered = renderAmbientTrustReport(report);

    expect(report.source).toBe('ambient-postflight');
    expect(report.transcript_observed.available).toBe(false);
    expect(report.boundary.source).toContain('postflight runtime receipt only');
    expect(rendered).toContain('Transcript-observed facts: unavailable');
    expect(rendered).toContain('not approval, correctness certification, retry authorization, execution authority, or spawn authority');
  });

  it('treats missing optional fidelity as unavailable instead of inventing values', () => {
    const report = reportFixture('missing-optional-fidelity.json');

    expect(report.transcript_observed.session_span.available).toBe(false);
    expect(report.transcript_observed.usage.input_tokens).toBeNull();
    expect(report.transcript_observed.token_availability).toBe('unavailable');
    expect(report.warnings.some((warning) => warning.includes('observed token usage unavailable'))).toBe(true);
  });

  it('fails closed for malformed JSON, roots, schema, runtime, source/observed mismatch, and malformed containers', () => {
    const validBase = {
      schema: 'osc.ambient-work-record.v1',
      runId: 'r',
      source: 'transcript-extraction',
      state: 'observed',
      runtime: { adapter: 'a', spawned: false, status: 's', failureCode: null, markerState: null, tokenTotal: null },
      observed: { assistant_turns: 1, user_events: 1, usage: {}, tool_calls: {}, files_touched: [], notes: [] },
    };
    const controlSuffixedSchema = {
      ...validBase,
      schema: 'osc.ambient-work-record.v1\u001b[31m',
    };

    expect(() => verifyAmbientRecordText('{', 'bad.json')).toThrow(/Malformed ambient record JSON/);
    expect(() => buildAmbientTrustReport([], 'array.json')).toThrow(/record must be an object/);
    expect(() => reportFixture('malformed-schema.json')).toThrow(/record.schema/);
    expect(() => buildAmbientTrustReport(controlSuffixedSchema)).toThrow(/record.schema/);
    expect(() => buildAmbientTrustReport({ schema: 'osc.ambient-work-record.v1', runId: 'r', source: 'transcript-extraction', state: 'observed', observed: {} })).toThrow(/runtime/);
    expect(() => buildAmbientTrustReport({ schema: 'osc.ambient-work-record.v1', runId: 1, source: 'transcript-extraction', state: 'observed', runtime: {} })).toThrow(/runId/);
    expect(() => buildAmbientTrustReport({ schema: 'osc.ambient-work-record.v1', runId: 'r', source: 'transcript-extraction', state: 'observed', runtime: { adapter: 'a', spawned: false, status: 's', failureCode: null, markerState: null, tokenTotal: null } })).toThrow(/requires observed object/);
    expect(() => buildAmbientTrustReport({ schema: 'osc.ambient-work-record.v1', runId: 'r', source: 'transcript-extraction ', state: 'observed', runtime: { adapter: 'a', spawned: false, status: 's', failureCode: null, markerState: null, tokenTotal: null } })).toThrow(/requires observed object/);
    expect(() => buildAmbientTrustReport({ schema: 'osc.ambient-work-record.v1', runId: 'r', source: 'transcript-extraction', state: 'observed', runtime: { adapter: 'a', spawned: false, status: 's', failureCode: null, markerState: null, tokenTotal: null }, observed: [] })).toThrow(/observed must be an object/);
    expect(() => buildAmbientTrustReport({ ...validBase, observed: {} })).toThrow(/complete observed transcript facts/);
    expect(() => buildAmbientTrustReport({ ...validBase, runtime: { ...validBase.runtime, tokenTotal: -1 } })).toThrow(/non-negative integer/);
    expect(() => buildAmbientTrustReport({ ...validBase, observed: { ...validBase.observed, usage: [] } })).toThrow(/observed.usage/);
    expect(() => buildAmbientTrustReport({ ...validBase, observed: { ...validBase.observed, usage: { input_tokens: 1.5 } } })).toThrow(/non-negative integer/);
    expect(() => buildAmbientTrustReport({ ...validBase, observed: { ...validBase.observed, tool_calls: { shell: '1' } } })).toThrow(/tool_calls/);
    expect(() => buildAmbientTrustReport({ ...validBase, observed: { ...validBase.observed, files_touched: [1] } })).toThrow(/files_touched/);
    expect(() => buildAmbientTrustReport({ ...validBase, observed: { ...validBase.observed, usage: { input_tokens: '1' } } })).toThrow(/input_tokens/);
  });

  it('sanitizes hostile record strings, path labels, and terminal controls in reports and errors', () => {
    const report = reportFixture('redaction-sensitive.json');
    const rendered = renderAmbientTrustReport(report);
    const serialized = JSON.stringify(report);
    const pathLabel = sanitizeReportString('/Users/ali\u001b[31mce/sk-proj-AAAAAAAAAAAABBBBBBBBBBBBBBBB.json');

    for (const output of [rendered, serialized, pathLabel]) {
      expect(output).not.toContain('/Users/');
      expect(output).not.toContain('sk-proj-AAAAAAAA');
      expect(output).not.toContain('ghp_AAAAAAAAAAAA');
      expect(output).not.toContain('\u001b');
      expect(output).not.toContain('\r');
      expect(output).not.toContain('\u0000');
    }
    for (const output of [serialized, pathLabel]) expect(output).not.toContain('\n');
    expect(serialized).not.toContain('/[local-path-redacted]');
    expect(serialized).not.toContain('sk-[redacted]');
    expect(serialized).not.toContain('gh*_[redacted]');
    expect(serialized).not.toContain('APPROVED');
    expect(serialized).not.toContain('correctness certified');
    expect(serialized).not.toContain('retry authorized');
    expect(report.session_id).toMatch(/^unsafe-session-[a-f0-9]{12}$/);
    expect(report.source).toBe('unrecognized-source');
    expect(report.state).toBe('unrecognized-state');
    expect(report.runtime.adapter).toBe('unrecognized-adapter');
    expect(report.runtime.status).toBe('unrecognized-status');
    expect(report.runtime.failure_code).toBe('failure-recorded');
    expect(report.runtime.marker_state).toBe('unrecognized-marker-state');
    expect(report.transcript_observed.tool_census).toEqual([]);
    expect(report.transcript_observed.files_touched).toMatchObject({ count: 2, redacted_local_path_count: 2 });
    expect(report.transcript_observed.final_message_digest).toBeNull();
    expect(report.transcript_observed.fidelity_notes).toContain('tool-names-suppressed');
  });
});

describe('output writer', () => {
  it('chooses a gitignored .osc/state/ambient path inside an .osc repo and a cwd path otherwise', () => {
    const repo = mkdtempSync(join(tmpdir(), 'osc-cap-repo-'));
    const noRepo = mkdtempSync(join(tmpdir(), 'osc-cap-norepo-'));
    mkdirSync(join(repo, '.osc'), { recursive: true });
    expect(defaultOutPath(repo, 'sess-1')).toBe('.osc/state/ambient/sess-1.json');
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
