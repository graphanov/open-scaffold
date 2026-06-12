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

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
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
