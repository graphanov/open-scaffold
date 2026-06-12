// usage.ts — benchmark-neutral usage-receipt ledger
// Ingests run-receipt JSONL, aggregates per (benchmark, task_id, arm),
// and renders a markdown table.
//
// Cost honesty rule: USD totals are NEVER summed from partial data. The
// evolution-loop contract forbids invented USD figures — if any receipt in a
// group is missing or null for total_cost_usd, the entire group's costUsdTotal
// is null. This mirrors the telemetry-completeness discipline in evolution.ts.

export interface UsageTokens {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface UsageReceipt {
  run_id: string;
  benchmark?: string;
  task_id?: string;
  arm?: string;
  seed?: number;
  replicate?: number;
  phase?: string;
  model?: string;
  started_at?: string;
  duration_ms?: number;
  duration_api_ms?: number;
  num_turns?: number;
  usage: UsageTokens;
  total_cost_usd?: number | null;
  usage_source: string;
  session_id?: string;
  schema?: string;
}

export interface UsageLedgerRow {
  benchmark: string;
  task_id: string;
  arm: string;
  runCount: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  numTurns: number;
  durationMs: number;
  /** null unless EVERY receipt in the group carries a numeric total_cost_usd */
  costUsdTotal: number | null;
}

export interface UsageLedger {
  rows: UsageLedgerRow[];
  issues: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asNonNegativeInteger(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (!Number.isInteger(value) || value < 0) return undefined;
  return value;
}

function parseUsageTokens(raw: unknown): { tokens: UsageTokens; valid: boolean } {
  if (!isRecord(raw)) return { tokens: {}, valid: false };
  const tokens: UsageTokens = {};
  let hasAtLeastOne = false;
  for (const key of ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'] as const) {
    if (Object.hasOwn(raw, key)) {
      const parsed = asNonNegativeInteger(raw[key]);
      if (parsed === undefined) return { tokens: {}, valid: false };
      tokens[key] = parsed;
      hasAtLeastOne = true;
    }
  }
  return { tokens, valid: hasAtLeastOne };
}

export function parseUsageReceipts(jsonl: string): { receipts: UsageReceipt[]; issues: string[] } {
  const receipts: UsageReceipt[] = [];
  const issues: string[] = [];

  const lines = jsonl.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    const lineNum = i + 1;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      issues.push(`line ${lineNum}: invalid JSON`);
      continue;
    }

    if (!isRecord(parsed)) {
      issues.push(`line ${lineNum}: expected a JSON object`);
      continue;
    }

    const run_id = asString(parsed.run_id);
    if (!run_id) {
      issues.push(`line ${lineNum}: missing required field run_id`);
      continue;
    }

    const usage_source = asString(parsed.usage_source);
    if (!usage_source) {
      issues.push(`line ${lineNum}: missing required field usage_source`);
      continue;
    }

    const { tokens, valid: usageValid } = parseUsageTokens(parsed.usage);
    if (!usageValid) {
      issues.push(`line ${lineNum}: usage object must be present with at least one non-negative integer token field`);
      continue;
    }

    // total_cost_usd: accept null, a finite number, or absent
    let total_cost_usd: number | null | undefined;
    if (Object.hasOwn(parsed, 'total_cost_usd')) {
      const raw = parsed.total_cost_usd;
      if (raw === null) {
        total_cost_usd = null;
      } else {
        const n = asFiniteNumber(raw);
        if (n === null) {
          issues.push(`line ${lineNum}: total_cost_usd must be a finite number or null`);
          continue;
        }
        total_cost_usd = n;
      }
    }

    const receipt: UsageReceipt = {
      run_id,
      usage: tokens,
      usage_source,
    };

    if (typeof parsed.benchmark === 'string') receipt.benchmark = parsed.benchmark;
    if (typeof parsed.task_id === 'string') receipt.task_id = parsed.task_id;
    if (typeof parsed.arm === 'string') receipt.arm = parsed.arm;
    if (typeof parsed.model === 'string') receipt.model = parsed.model;
    if (typeof parsed.started_at === 'string') receipt.started_at = parsed.started_at;
    if (typeof parsed.phase === 'string') receipt.phase = parsed.phase;
    if (typeof parsed.session_id === 'string') receipt.session_id = parsed.session_id;
    if (typeof parsed.schema === 'string') receipt.schema = parsed.schema;

    const seed = asNonNegativeInteger(parsed.seed);
    if (seed !== undefined) receipt.seed = seed;
    const replicate = asNonNegativeInteger(parsed.replicate);
    if (replicate !== undefined) receipt.replicate = replicate;
    const duration_ms = asNonNegativeInteger(parsed.duration_ms);
    if (duration_ms !== undefined) receipt.duration_ms = duration_ms;
    const duration_api_ms = asNonNegativeInteger(parsed.duration_api_ms);
    if (duration_api_ms !== undefined) receipt.duration_api_ms = duration_api_ms;
    const num_turns = asNonNegativeInteger(parsed.num_turns);
    if (num_turns !== undefined) receipt.num_turns = num_turns;

    if (total_cost_usd !== undefined) receipt.total_cost_usd = total_cost_usd;

    receipts.push(receipt);
  }

  return { receipts, issues };
}

type GroupKey = string;

function groupKey(receipt: UsageReceipt): GroupKey {
  return `${receipt.benchmark ?? ''}\0${receipt.task_id ?? ''}\0${receipt.arm ?? ''}`;
}

export function aggregateUsage(receipts: UsageReceipt[]): UsageLedger {
  const issues: string[] = [];
  const rowMap = new Map<GroupKey, UsageLedgerRow>();
  const groupCostComplete = new Map<GroupKey, boolean>();
  const seenRunIds = new Map<string, number>();

  for (const receipt of receipts) {
    const idx = seenRunIds.get(receipt.run_id);
    if (idx !== undefined) {
      issues.push(`duplicate run_id: ${receipt.run_id}`);
    } else {
      seenRunIds.set(receipt.run_id, receipts.indexOf(receipt));
    }

    // Flag subscription receipts that carry a numeric USD cost
    if (receipt.usage_source.includes('subscription') && typeof receipt.total_cost_usd === 'number') {
      issues.push(`run_id ${receipt.run_id}: usage_source contains "subscription" but total_cost_usd is ${receipt.total_cost_usd} (inconsistent billing claim)`);
    }

    const key = groupKey(receipt);
    let row = rowMap.get(key);
    if (!row) {
      row = {
        benchmark: receipt.benchmark ?? '',
        task_id: receipt.task_id ?? '',
        arm: receipt.arm ?? '',
        runCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        numTurns: 0,
        durationMs: 0,
        costUsdTotal: 0,
      };
      rowMap.set(key, row);
      groupCostComplete.set(key, true);
    }

    row.runCount += 1;
    row.inputTokens += receipt.usage.input_tokens ?? 0;
    row.outputTokens += receipt.usage.output_tokens ?? 0;
    row.cacheCreationInputTokens += receipt.usage.cache_creation_input_tokens ?? 0;
    row.cacheReadInputTokens += receipt.usage.cache_read_input_tokens ?? 0;
    row.numTurns += receipt.num_turns ?? 0;
    row.durationMs += receipt.duration_ms ?? 0;

    // Cost honesty: if ANY receipt in the group lacks a numeric cost, null the group.
    const hasCost = typeof receipt.total_cost_usd === 'number' && !receipt.usage_source.includes('subscription');
    if (!hasCost) {
      groupCostComplete.set(key, false);
    }
    if (hasCost && groupCostComplete.get(key)) {
      row.costUsdTotal = (row.costUsdTotal ?? 0) + (receipt.total_cost_usd as number);
    }
  }

  // Apply cost honesty rule: zero out groups that aren't fully costed
  for (const [key, complete] of groupCostComplete) {
    const row = rowMap.get(key);
    if (row && !complete) {
      row.costUsdTotal = null;
    }
  }

  // Stable sort: benchmark, then task_id, then arm
  const rows = [...rowMap.values()].sort((a, b) => {
    const bCmp = a.benchmark.localeCompare(b.benchmark);
    if (bCmp !== 0) return bCmp;
    const tCmp = a.task_id.localeCompare(b.task_id);
    if (tCmp !== 0) return tCmp;
    return a.arm.localeCompare(b.arm);
  });

  return { rows, issues };
}

export function renderUsageLedger(ledger: UsageLedger): string {
  const lines: string[] = [];
  lines.push('| benchmark | task_id | arm | runs | input_tokens | output_tokens | cache_creation_tokens | cache_read_tokens | num_turns | duration_ms | cost_usd |');
  lines.push('|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');

  for (const row of ledger.rows) {
    const cost = row.costUsdTotal === null ? 'null' : row.costUsdTotal.toFixed(6);
    lines.push(
      `| ${row.benchmark} | ${row.task_id} | ${row.arm} | ${row.runCount} | ${row.inputTokens} | ${row.outputTokens} | ${row.cacheCreationInputTokens} | ${row.cacheReadInputTokens} | ${row.numTurns} | ${row.durationMs} | ${cost} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}
