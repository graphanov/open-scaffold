import { describe, expect, it } from 'vitest';
import { aggregateUsage, parseUsageReceipts, renderUsageLedger } from '../src/usage.js';

const baseReceipt = {
  schema: 'harness-bench.receipt.v1',
  run_id: 'retry-trap.T1.C-scaffold.s4242.r1.attempt-2',
  benchmark: 'retry-trap',
  task_id: 'T1',
  arm: 'C-scaffold',
  seed: 4242,
  replicate: 1,
  phase: 'attempt-2',
  model: 'claude-sonnet-4-6',
  started_at: '2026-06-10T20:00:00Z',
  duration_ms: 184211,
  duration_api_ms: 121000,
  num_turns: 14,
  usage: { input_tokens: 1204, output_tokens: 8311, cache_creation_input_tokens: 22050, cache_read_input_tokens: 310400 },
  total_cost_usd: null,
  usage_source: 'claude-cli-subscription',
  session_id: 'abc123',
  exit: { subtype: 'success', is_error: false },
  workspace: 'results/workspaces/foo',
  result_digest: 'sha256:abc',
};

describe('parseUsageReceipts', () => {
  it('parses a well-formed JSONL receipt', () => {
    const jsonl = JSON.stringify(baseReceipt);
    const { receipts, issues } = parseUsageReceipts(jsonl);
    expect(issues).toHaveLength(0);
    expect(receipts).toHaveLength(1);
    const r = receipts[0];
    expect(r.run_id).toBe('retry-trap.T1.C-scaffold.s4242.r1.attempt-2');
    expect(r.benchmark).toBe('retry-trap');
    expect(r.task_id).toBe('T1');
    expect(r.arm).toBe('C-scaffold');
    expect(r.usage.input_tokens).toBe(1204);
    expect(r.usage.output_tokens).toBe(8311);
    expect(r.usage.cache_creation_input_tokens).toBe(22050);
    expect(r.usage.cache_read_input_tokens).toBe(310400);
    expect(r.total_cost_usd).toBeNull();
    expect(r.usage_source).toBe('claude-cli-subscription');
    expect(r.num_turns).toBe(14);
    expect(r.duration_ms).toBe(184211);
  });

  it('is tolerant of unknown schema strings', () => {
    const line = JSON.stringify({ ...baseReceipt, schema: 'some-other-schema.v99' });
    const { receipts, issues } = parseUsageReceipts(line);
    expect(issues).toHaveLength(0);
    expect(receipts).toHaveLength(1);
    expect(receipts[0].schema).toBe('some-other-schema.v99');
  });

  it('is tolerant of unknown extra fields', () => {
    const line = JSON.stringify({ ...baseReceipt, extra_field: 'ignored', another: 42 });
    const { receipts, issues } = parseUsageReceipts(line);
    expect(issues).toHaveLength(0);
    expect(receipts).toHaveLength(1);
  });

  it('skips blank lines silently', () => {
    const jsonl = `${JSON.stringify(baseReceipt)}\n\n${JSON.stringify({ ...baseReceipt, run_id: 'run-2' })}`;
    const { receipts, issues } = parseUsageReceipts(jsonl);
    expect(issues).toHaveLength(0);
    expect(receipts).toHaveLength(2);
  });

  it('captures malformed JSON lines as issues with line numbers', () => {
    const jsonl = `${JSON.stringify(baseReceipt)}\nnot-json\n${JSON.stringify({ ...baseReceipt, run_id: 'run-2' })}`;
    const { receipts, issues } = parseUsageReceipts(jsonl);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/line 2/);
    expect(issues[0]).toMatch(/invalid JSON/);
    expect(receipts).toHaveLength(2);
  });

  it('captures non-object JSON lines as issues', () => {
    const jsonl = '"just a string"';
    const { receipts, issues } = parseUsageReceipts(jsonl);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/line 1/);
    expect(receipts).toHaveLength(0);
  });

  it('rejects receipts missing run_id', () => {
    const { run_id: _omit, ...noRunId } = baseReceipt;
    const { receipts, issues } = parseUsageReceipts(JSON.stringify(noRunId));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/run_id/);
    expect(receipts).toHaveLength(0);
  });

  it('rejects receipts missing usage_source', () => {
    const { usage_source: _omit, ...noSource } = baseReceipt;
    const { receipts, issues } = parseUsageReceipts(JSON.stringify(noSource));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/usage_source/);
    expect(receipts).toHaveLength(0);
  });

  it('rejects receipts where usage has no token fields', () => {
    const line = JSON.stringify({ ...baseReceipt, usage: {} });
    const { receipts, issues } = parseUsageReceipts(line);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/usage/);
    expect(receipts).toHaveLength(0);
  });

  it('rejects receipts where a token field is negative', () => {
    const line = JSON.stringify({ ...baseReceipt, usage: { input_tokens: -1 } });
    const { receipts, issues } = parseUsageReceipts(line);
    expect(issues).toHaveLength(1);
    expect(receipts).toHaveLength(0);
  });

  it('rejects receipts where a token field is a non-integer', () => {
    const line = JSON.stringify({ ...baseReceipt, usage: { input_tokens: 1.5 } });
    const { receipts, issues } = parseUsageReceipts(line);
    expect(issues).toHaveLength(1);
    expect(receipts).toHaveLength(0);
  });

  it('accepts partial usage objects — missing token fields stay undefined', () => {
    const line = JSON.stringify({ ...baseReceipt, usage: { input_tokens: 100 } });
    const { receipts, issues } = parseUsageReceipts(line);
    expect(issues).toHaveLength(0);
    expect(receipts).toHaveLength(1);
    expect(receipts[0].usage.input_tokens).toBe(100);
    expect(receipts[0].usage.output_tokens).toBeUndefined();
    expect(receipts[0].usage.cache_creation_input_tokens).toBeUndefined();
    expect(receipts[0].usage.cache_read_input_tokens).toBeUndefined();
  });

  it('rejects receipts where total_cost_usd is non-finite or negative', () => {
    for (const total_cost_usd of ['free', -0.01]) {
      const { receipts, issues } = parseUsageReceipts(JSON.stringify({ ...baseReceipt, total_cost_usd }));
      expect([issues.length, receipts.length]).toEqual([1, 0]);
    }
  });

  it('accepts total_cost_usd as a numeric value', () => {
    const line = JSON.stringify({ ...baseReceipt, total_cost_usd: 0.042 });
    const { receipts, issues } = parseUsageReceipts(line);
    expect(issues).toHaveLength(0);
    expect(receipts[0].total_cost_usd).toBe(0.042);
  });

  it('never throws on any input', () => {
    const inputs = ['', '\n\n\n', 'null', '[]', '{}', 'garbage{json'];
    for (const input of inputs) {
      expect(() => parseUsageReceipts(input)).not.toThrow();
    }
  });
});

describe('aggregateUsage', () => {
  it('groups by benchmark, task_id, arm and sums tokens across receipts', () => {
    const { receipts } = parseUsageReceipts([
      JSON.stringify({ ...baseReceipt, run_id: 'r1', usage: { input_tokens: 100, output_tokens: 200 }, num_turns: undefined, duration_ms: undefined }),
      JSON.stringify({ ...baseReceipt, run_id: 'r2', usage: { input_tokens: 300, output_tokens: 400 } }),
    ].join('\n'));
    const ledger = aggregateUsage(receipts);
    expect(ledger.rows).toHaveLength(1);
    expect([ledger.rows[0].runCount, ledger.rows[0].inputTokens, ledger.rows[0].outputTokens, ledger.rows[0].cacheCreationInputTokens, ledger.rows[0].cacheReadInputTokens, ledger.rows[0].numTurns, ledger.rows[0].durationMs]).toEqual([2, 400, 600, null, null, null, null]);
  });

  it('keeps separate groups for different arms', () => {
    const { receipts } = parseUsageReceipts([
      JSON.stringify({ ...baseReceipt, run_id: 'r1', arm: 'A', usage: { input_tokens: 10 } }),
      JSON.stringify({ ...baseReceipt, run_id: 'r2', arm: 'B', usage: { input_tokens: 20 } }),
    ].join('\n'));
    const ledger = aggregateUsage(receipts);
    expect(ledger.rows).toHaveLength(2);
    const armA = ledger.rows.find((r) => r.arm === 'A');
    const armB = ledger.rows.find((r) => r.arm === 'B');
    expect(armA?.inputTokens).toBe(10);
    expect(armB?.inputTokens).toBe(20);
  });

  it('cost honesty rule: costUsdTotal is null if any receipt in the group lacks numeric cost', () => {
    const { receipts } = parseUsageReceipts([
      JSON.stringify({ ...baseReceipt, run_id: 'r1', total_cost_usd: 0.5 }),
      JSON.stringify({ ...baseReceipt, run_id: 'r2', total_cost_usd: null }),
    ].join('\n'));
    const ledger = aggregateUsage(receipts);
    expect(ledger.rows[0].costUsdTotal).toBeNull();
  });

  it('cost honesty rule: costUsdTotal is summed when all receipts in group carry numeric cost', () => {
    const { receipts } = parseUsageReceipts([
      JSON.stringify({ ...baseReceipt, run_id: 'r1', total_cost_usd: 0.10, usage_source: 'api-key' }),
      JSON.stringify({ ...baseReceipt, run_id: 'r2', total_cost_usd: 0.20, usage_source: 'api-key' }),
    ].join('\n'));
    const ledger = aggregateUsage(receipts);
    expect(ledger.rows[0].costUsdTotal).toBeCloseTo(0.30, 10);
  });

  it('cost honesty rule: costUsdTotal is null when cost is absent (undefined) for any receipt', () => {
    const withoutCost = { ...baseReceipt };
    // Remove total_cost_usd entirely
    const { total_cost_usd: _omit, ...noCostField } = withoutCost;
    const { receipts } = parseUsageReceipts([
      JSON.stringify({ ...noCostField, run_id: 'r1', usage_source: 'api-key', usage: { input_tokens: 10 } }),
      JSON.stringify({ ...baseReceipt, run_id: 'r2', total_cost_usd: 0.10, usage_source: 'api-key' }),
    ].join('\n'));
    const ledger = aggregateUsage(receipts);
    expect(ledger.rows[0].costUsdTotal).toBeNull();
  });

  it('flags subscription receipts that carry a numeric total_cost_usd and keeps cost unknown', () => {
    const { receipts } = parseUsageReceipts(
      JSON.stringify({ ...baseReceipt, run_id: 'r1', usage_source: 'claude-cli-subscription', total_cost_usd: 1.23 }),
    );
    const ledger = aggregateUsage(receipts);
    expect([ledger.issues.some((i) => i.includes('subscription') && i.includes('inconsistent billing claim')), ledger.rows[0].costUsdTotal]).toEqual([true, null]);
  });

  it('does not flag subscription receipts with null total_cost_usd', () => {
    const { receipts } = parseUsageReceipts(
      JSON.stringify({ ...baseReceipt, run_id: 'r1', usage_source: 'claude-cli-subscription', total_cost_usd: null }),
    );
    const ledger = aggregateUsage(receipts);
    const subscriptionIssues = ledger.issues.filter((i) => i.includes('subscription'));
    expect(subscriptionIssues).toHaveLength(0);
  });

  it('flags duplicate run_ids', () => {
    const { receipts } = parseUsageReceipts([
      JSON.stringify({ ...baseReceipt, run_id: 'dup-run' }),
      JSON.stringify({ ...baseReceipt, run_id: 'dup-run', arm: 'different-arm' }),
    ].join('\n'));
    const ledger = aggregateUsage(receipts);
    expect(ledger.issues.some((i) => i.includes('duplicate run_id') && i.includes('dup-run'))).toBe(true);
  });

  it('does not flag distinct run_ids', () => {
    const { receipts } = parseUsageReceipts([
      JSON.stringify({ ...baseReceipt, run_id: 'r1' }),
      JSON.stringify({ ...baseReceipt, run_id: 'r2' }),
    ].join('\n'));
    const ledger = aggregateUsage(receipts);
    expect(ledger.issues.filter((i) => i.includes('duplicate'))).toHaveLength(0);
  });

  it('sorts rows stably: benchmark, then task_id, then arm', () => {
    const { receipts } = parseUsageReceipts([
      JSON.stringify({ ...baseReceipt, run_id: 'r1', benchmark: 'z-bench', task_id: 'T2', arm: 'B', usage: { input_tokens: 1 } }),
      JSON.stringify({ ...baseReceipt, run_id: 'r2', benchmark: 'a-bench', task_id: 'T1', arm: 'A', usage: { input_tokens: 1 } }),
      JSON.stringify({ ...baseReceipt, run_id: 'r3', benchmark: 'a-bench', task_id: 'T1', arm: 'B', usage: { input_tokens: 1 } }),
      JSON.stringify({ ...baseReceipt, run_id: 'r4', benchmark: 'a-bench', task_id: 'T2', arm: 'A', usage: { input_tokens: 1 } }),
    ].join('\n'));
    const ledger = aggregateUsage(receipts);
    const keys = ledger.rows.map((r) => `${r.benchmark}/${r.task_id}/${r.arm}`);
    expect(keys).toEqual(['a-bench/T1/A', 'a-bench/T1/B', 'a-bench/T2/A', 'z-bench/T2/B']);
  });

  it('returns empty rows and no issues for empty receipts array', () => {
    const ledger = aggregateUsage([]);
    expect(ledger.rows).toHaveLength(0);
    expect(ledger.issues).toHaveLength(0);
  });
});

describe('renderUsageLedger', () => {
  it('renders a markdown table with header and data rows', () => {
    const { receipts } = parseUsageReceipts(
      JSON.stringify({ ...baseReceipt, run_id: 'r1', usage_source: 'api-key', total_cost_usd: 0.123456 }),
    );
    const ledger = aggregateUsage(receipts);
    const output = renderUsageLedger(ledger);
    expect(output).toContain('| benchmark | task_id | arm |');
    expect(output).toContain('retry-trap');
    expect(output).toContain('T1');
    expect(output).toContain('C-scaffold');
    expect(output).toContain('1204');
    expect(output).toContain('8311');
    expect(output).toContain('22050');
    expect(output).toContain('310400');
    expect(output).toContain('0.123456');
    expect(output.endsWith('\n')).toBe(true);
  });

  it('renders null cost as "null" in the table', () => {
    const { receipts } = parseUsageReceipts(
      JSON.stringify({ ...baseReceipt, run_id: 'r1', total_cost_usd: null }),
    );
    const ledger = aggregateUsage(receipts);
    const output = renderUsageLedger(ledger);
    expect(output).toContain('| null |');
  });

  it('renders an empty table body when there are no rows', () => {
    const ledger = aggregateUsage([]);
    const output = renderUsageLedger(ledger);
    const lines = output.trim().split('\n');
    expect(lines).toHaveLength(2); // header + separator only
    expect(lines[0]).toContain('benchmark');
  });

  it('renders raw integer token counts (no thousands separators)', () => {
    const { receipts } = parseUsageReceipts(
      JSON.stringify({ ...baseReceipt, run_id: 'r1', usage: { cache_read_input_tokens: 310400 } }),
    );
    const ledger = aggregateUsage(receipts);
    const output = renderUsageLedger(ledger);
    expect(output).toContain('310400');
    expect(output).not.toContain('310,400');
  });

  it('produces stable string output matching expected snapshot', () => {
    const { receipts } = parseUsageReceipts([
      JSON.stringify({ ...baseReceipt, run_id: 'r1', benchmark: 'bench-a', task_id: 'T1', arm: 'ctrl', usage: { input_tokens: 100, output_tokens: 200 }, total_cost_usd: null, usage_source: 'claude-cli-subscription' }),
      JSON.stringify({ ...baseReceipt, run_id: 'r2', benchmark: 'bench-a', task_id: 'T1', arm: 'scaf', usage: { input_tokens: 150, output_tokens: 250 }, total_cost_usd: null, usage_source: 'claude-cli-subscription' }),
    ].join('\n'));
    const ledger = aggregateUsage(receipts);
    const output = renderUsageLedger(ledger);
    const expected = [
      '| benchmark | task_id | arm | runs | input_tokens | output_tokens | cache_creation_tokens | cache_read_tokens | num_turns | duration_ms | cost_usd |',
      '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
      '| bench-a | T1 | ctrl | 1 | 100 | 200 | null | null | 14 | 184211 | null |',
      '| bench-a | T1 | scaf | 1 | 150 | 250 | null | null | 14 | 184211 | null |',
      '',
    ].join('\n');
    expect(output).toBe(expected);
  });
});
