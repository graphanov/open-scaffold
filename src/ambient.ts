import { createHash } from 'node:crypto';
import { readJsonUnder, writeJsonUnder } from './path-safety.js';

export const AMBIENT_WORK_RECORD_SCHEMA = 'osc.ambient-work-record.v1';

type AmbientWorkState = 'created' | 'ready' | 'waiting_on_human' | 'running' | 'completed' | 'failed' | 'blocked';

interface AmbientArtifactLink {
  role: string;
  path: string;
  schema?: string;
}

interface AmbientRuntimeReceipt {
  adapterId: string;
  spawned: boolean;
  status: string;
  failure: { code?: string | null };
  marker: { state: string };
  tokenUsage?: { totalTokens?: number } | null;
  evidencePaths: Array<{ role: string; path: string; schema?: string }>;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** sha256 over a canonical JSON encoding; shared by postflight and transcript-extraction records. */
export function ambientDigest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}

const digest = ambientDigest;

/** Token usage breakdown shared by transcript parsers; nulls mean "the runtime does not report this split". */
export interface AmbientUsage {
  input_tokens: number | null;
  output_tokens: number | null;
  cache_creation_input_tokens: number | null;
  cache_read_input_tokens: number | null;
  total_tokens?: number | null;
}

/** Observed facts a transcript parser extracts; mirrors the osc.ambient-work-record.v1 observed block. */
export interface AmbientObserved {
  assistant_turns: number;
  user_events: number;
  started_at: string | null;
  ended_at: string | null;
  usage: AmbientUsage;
  tool_calls: Record<string, number>;
  files_touched: string[];
  final_message_digest: string | null;
  final_message_claim_words: string[];
  notes: string[];
}

/**
 * Build an osc.ambient-work-record.v1 record from facts a transcript parser observed,
 * with source "transcript-extraction". This is the shared shape for `osc capture`
 * parsers so each runtime normalizer stays a thin mapper, not a record fork.
 */
export function buildTranscriptWorkRecord(input: {
  runId: string;
  adapter: string;
  command: string;
  intent: unknown;
  observed: AmbientObserved;
  createdAt?: string;
}): Record<string, unknown> {
  const { usage } = input.observed;
  const tokenTotal = typeof usage.total_tokens === 'number'
    ? usage.total_tokens
    : (usage.input_tokens ?? 0)
      + (usage.output_tokens ?? 0)
      + (usage.cache_creation_input_tokens ?? 0)
      + (usage.cache_read_input_tokens ?? 0);
  return {
    schema: AMBIENT_WORK_RECORD_SCHEMA,
    runId: input.runId,
    createdAt: input.createdAt ?? nowIso(),
    source: 'transcript-extraction',
    intentDigest: digest(input.intent ?? null),
    command: input.command,
    state: 'observed',
    runtime: {
      adapter: input.adapter,
      spawned: true,
      status: 'observed',
      failureCode: null,
      markerState: null,
      tokenTotal,
    },
    observed: input.observed,
    artifacts: [],
    evidencePaths: [],
    boundary: {
      worker_authored: false,
      approval: false,
      note: 'Extracted from an observed session transcript; facts, not claims. Not approval, not correctness.',
    },
  };
}

function tokenTotal(receipt: AmbientRuntimeReceipt): number | null {
  return receipt.tokenUsage?.totalTokens ?? null;
}

export function writeAmbientWorkRecord({
  repoRoot,
  runId,
  state,
  artifacts,
  receipt,
}: {
  repoRoot: string;
  runId: string;
  state: AmbientWorkState;
  artifacts: AmbientArtifactLink[];
  receipt: AmbientRuntimeReceipt;
}) {
  const packet = readJsonUnder<Record<string, unknown>>(repoRoot, `.osc/runs/${runId}/run.json`, 'work run packet path');
  const record = {
    schema: AMBIENT_WORK_RECORD_SCHEMA,
    runId,
    createdAt: nowIso(),
    source: 'ambient-postflight',
    intentDigest: digest({ intent: packet.intent ?? null, context: packet.context ?? [] }),
    command: packet.command ?? 'external-work',
    state,
    runtime: {
      adapter: receipt.adapterId,
      spawned: receipt.spawned,
      status: receipt.status,
      failureCode: receipt.failure.code,
      markerState: receipt.marker.state,
      tokenTotal: tokenTotal(receipt),
    },
    artifacts: artifacts.map((artifact) => ({
      role: artifact.role,
      path: artifact.path,
      schema: artifact.schema ?? null,
    })),
    evidencePaths: receipt.evidencePaths.map((entry) => ({
      role: entry.role,
      path: entry.path,
      schema: entry.schema ?? null,
    })),
    boundary: {
      extracted_after_runtime: true,
      not_worker_authored: true,
      not_approval: true,
      not_correctness_certification: true,
      no_runtime_spawning: true,
      git_state_not_collected_by_core: true,
    },
  };
  const path = `.osc/runs/${runId}/ambient-record.json`;
  writeJsonUnder(repoRoot, path, record, 'ambient work record path');
  return { path, record };
}
