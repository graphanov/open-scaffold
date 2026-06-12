#!/usr/bin/env node
// Spike A core (plan 167): ambient work-record extraction from a real Claude
// Code session transcript — no harness involvement, no worker cooperation.
// Aligns with osc.ambient-work-record.v1 (src/ambient.ts), with
// source: "transcript-extraction" and a transcript-derived runtime block.
//
// Usage: node examples/spikes/ambient-from-transcript.mjs --transcript <session.jsonl> [--out record.json]

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const path = arg('transcript');
if (!path) {
  console.error('Usage: ambient-from-transcript.mjs --transcript <session.jsonl> [--out record.json]');
  process.exit(2);
}

const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => {
  try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);

const assistants = lines.filter((l) => l.type === 'assistant' && l.message);
const users = lines.filter((l) => l.type === 'user');
const stamps = lines.map((l) => l.timestamp).filter(Boolean).sort();

const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
const toolCalls = {};
const filesTouched = new Set();
let finalText = null;

for (const a of assistants) {
  const u = a.message.usage ?? {};
  for (const k of Object.keys(usage)) usage[k] += u[k] ?? 0;
  const content = Array.isArray(a.message.content) ? a.message.content : [];
  for (const block of content) {
    if (block.type === 'tool_use') {
      toolCalls[block.name] = (toolCalls[block.name] ?? 0) + 1;
      const input = block.input ?? {};
      if (typeof input.file_path === 'string') filesTouched.add(input.file_path);
      if (typeof input.path === 'string') filesTouched.add(input.path);
    }
    if (block.type === 'text' && block.text?.trim()) finalText = block.text;
  }
}

const claimWords = finalText ? (finalText.match(/\b(complete|completed|done|blocked|impossible|redesign|cannot|failed)\b/gi) ?? []) : [];
const digest = (v) => createHash('sha256').update(JSON.stringify(v), 'utf8').digest('hex');

const record = {
  schema: 'osc.ambient-work-record.v1',
  runId: basename(path).replace(/\.jsonl$/, ''),
  createdAt: new Date().toISOString(),
  source: 'transcript-extraction',
  intentDigest: digest(users[0]?.message?.content ?? null),
  command: 'claude-code-session',
  state: 'observed',
  runtime: {
    adapter: 'claude-code-transcript',
    spawned: true,
    status: 'observed',
    failureCode: null,
    markerState: null,
    tokenTotal: usage.input_tokens + usage.output_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens,
  },
  observed: {
    assistant_turns: assistants.length,
    user_events: users.length,
    started_at: stamps[0] ?? null,
    ended_at: stamps[stamps.length - 1] ?? null,
    usage,
    tool_calls: toolCalls,
    files_touched: [...filesTouched].sort(),
    final_message_digest: finalText ? digest(finalText) : null,
    final_message_claim_words: [...new Set(claimWords.map((w) => w.toLowerCase()))],
  },
  artifacts: [],
  evidencePaths: [],
  boundary: {
    worker_authored: false,
    approval: false,
    note: 'Extracted from an observed session transcript; facts, not claims. Not approval, not correctness.',
  },
};

const out = arg('out');
if (out) writeFileSync(out, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({
  runId: record.runId,
  turns: record.observed.assistant_turns,
  tokenTotal: record.runtime.tokenTotal,
  output_tokens: usage.output_tokens,
  tools: toolCalls,
  files_touched: record.observed.files_touched.length,
  claim_words: record.observed.final_message_claim_words,
  span: `${record.observed.started_at} -> ${record.observed.ended_at}`,
}, null, 2));
