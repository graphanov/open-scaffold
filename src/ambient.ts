import { createHash } from 'node:crypto';
import type { HarnessArtifactLink, HarnessState } from './harness.js';
import type { HarnessRuntimeReceipt } from './runtimes.js';
import { readJsonUnder, writeJsonUnder } from './path-safety.js';

export const AMBIENT_WORK_RECORD_SCHEMA = 'osc.ambient-work-record.v1';

function nowIso(): string {
  return new Date().toISOString();
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}

function tokenTotal(receipt: HarnessRuntimeReceipt): number | null {
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
  state: HarnessState;
  artifacts: HarnessArtifactLink[];
  receipt: HarnessRuntimeReceipt;
}) {
  const packet = readJsonUnder<Record<string, unknown>>(repoRoot, `.osc/runs/${runId}/run.json`, 'work run packet path');
  const record = {
    schema: AMBIENT_WORK_RECORD_SCHEMA,
    runId,
    createdAt: nowIso(),
    source: 'harness-postflight',
    intentDigest: digest({ intent: packet.intent ?? null, context: packet.context ?? [] }),
    command: packet.command ?? '$work',
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
