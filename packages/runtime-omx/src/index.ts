import { readFileSync } from 'node:fs';
import { assertRunPacketInputPath, safeOutputPaths } from './safe-paths.js';
import type { RuntimeOmxOptions, RuntimeOmxResult } from './types.js';
import { validateRunPacket } from './validation.js';
import { writeArtifacts } from './receipt.js';

export { ValidationError } from './validation.js';
export type { DispatchReceipt, RuntimeOmxOptions, RuntimeOmxResult, ValidatedRunPacket } from './types.js';

export function runNoSpawnOmx(runPacketPath: string, options: RuntimeOmxOptions = {}): RuntimeOmxResult {
  assertRunPacketInputPath(runPacketPath);
  const raw = JSON.parse(readFileSync(runPacketPath, 'utf8')) as unknown;
  const packet = validateRunPacket(raw);
  const paths = safeOutputPaths(runPacketPath, packet.runtime.repoPath, options.receiptPath);
  const receipt = writeArtifacts(packet, paths);
  return {
    runId: packet.runId,
    receiptPath: paths.receiptPath,
    evidencePath: paths.evidencePath,
    receipt,
  };
}
