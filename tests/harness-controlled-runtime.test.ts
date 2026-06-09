import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { answerHumanGate, getHarnessStatus, routeHarnessCommand } from '../src/harness.js';
import { classifyRuntimeOutcome, parseLomeinRuntimeMarker } from '../src/runtimes.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempScaffold(prefix = 'osc-controlled-runtime-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', root], { encoding: 'utf8' });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nControlled runtime test repo.\n', 'utf8');
  return root;
}

function trustAdapterConfig(root: string, id: string): void {
  const result = execFileSync(tsx, [cli, 'adapter', 'trust', id], { cwd: root, encoding: 'utf8' });
  expect(result).toContain(`Adapter: ${id}`);
}

function writeMarkerAdapter(root: string, id: string, body: string, extra: Record<string, unknown> = {}): void {
  const adapterDir = join(root, '.osc/adapters');
  mkdirSync(adapterDir, { recursive: true });
  writeFileSync(join(adapterDir, `${id}.mjs`), body, 'utf8');
  writeFileSync(join(adapterDir, `${id}.json`), JSON.stringify({
    schemaVersion: 'open-scaffold.adapter.v1',
    id,
    command: [process.execPath, `.osc/adapters/${id}.mjs`],
    timeoutMs: 1_000,
    maxStdoutBytes: 1_000,
    maxStderrBytes: 1_000,
    ...extra,
  }, null, 2) + '\n', 'utf8');
  trustAdapterConfig(root, id);
}

function readRunJson(root: string, runId: string): any {
  return JSON.parse(readFileSync(join(root, `.osc/runs/${runId}/run.json`), 'utf8'));
}

function readRuntimeReceipt(root: string, runId: string): any {
  return JSON.parse(readFileSync(join(root, `.osc/runs/${runId}/runtime-receipt.json`), 'utf8'));
}

describe('controlled $work runtime parity', () => {
  it('keeps executable $work in dry-run unless explicit spawn authority is present', () => {
    const root = tempScaffold();
    try {
      writeMarkerAdapter(root, 'fake-complete', `
import { writeFileSync } from 'node:fs';
writeFileSync('.osc/adapter-was-spawned.txt', 'spawned');
console.log('runtime work done');
console.log('LOMEIN_COMPLETE');
`);

      const result = routeHarnessCommand({
        repoRoot: root,
        input: '$work "dry-run authority boundary" --context "repo truth" --adapter fake-complete',
      });

      expect(result.status.state).toBe('ready');
      expect(existsSync(join(root, '.osc/adapter-was-spawned.txt'))).toBe(false);
      const packet = readRunJson(root, result.runId);
      expect(packet.runtime).toMatchObject({ adapter: 'fake-complete', spawning: false, spawnAuthority: false });
      const receipt = readRuntimeReceipt(root, result.runId);
      expect(receipt).toMatchObject({
        schema: 'osc.harness-runtime-receipt.v1',
        runId: result.runId,
        adapterName: 'fake-complete',
        spawned: false,
        status: 'dry_run',
        failure: { code: 'spawn_authority_missing' },
      });
      expect(receipt.evidencePaths.every((entry: any) => entry.path.startsWith('.osc/runs/'))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('writes a completed repo-relative adapter receipt only for a final standalone single LOMEIN_COMPLETE marker', () => {
    const root = tempScaffold();
    try {
      writeMarkerAdapter(root, 'fake-complete', `
console.log('runtime work done for ' + process.argv[2]);
console.log('LOMEIN_COMPLETE');
`);

      const result = routeHarnessCommand({
        repoRoot: root,
        input: '$work "complete runtime" --context "repo truth" --adapter fake-complete --allow-spawn',
      });

      expect(result.status.state).toBe('completed');
      const receipt = readRuntimeReceipt(root, result.runId);
      expect(receipt).toMatchObject({
        adapterName: 'fake-complete',
        spawned: true,
        status: 'completed',
        timeoutMs: 1000,
        exit: { status: 0, signal: null, timedOut: false },
        marker: { state: 'complete', marker: 'LOMEIN_COMPLETE', count: 1, finalStandalone: true },
        failure: { code: null, message: null },
      });
      expect(JSON.stringify(receipt)).not.toContain(root);
      expect(JSON.stringify(receipt.commandSummary)).not.toMatch(/\/Users\//);
      expect(receipt.evidencePaths.map((entry: any) => entry.path)).toContain(`.osc/runs/${result.runId}/runtime/stdout.log`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('writes a blocked receipt instead of success for LOMEIN_BLOCKED', () => {
    const root = tempScaffold();
    try {
      writeMarkerAdapter(root, 'fake-blocked', `
console.log('Blocked because required fixture data is missing.');
console.log('LOMEIN_BLOCKED');
`);

      const result = routeHarnessCommand({
        repoRoot: root,
        input: '$work "blocked runtime" --context "repo truth" --adapter fake-blocked --allow-spawn',
      });

      expect(result.status.state).toBe('blocked');
      const receipt = readRuntimeReceipt(root, result.runId);
      expect(receipt).toMatchObject({
        status: 'blocked',
        marker: { state: 'blocked', marker: 'LOMEIN_BLOCKED' },
        failure: { code: 'runtime_blocked' },
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('parses complete, needs-human, blocked, missing, duplicate, non-final, timeout, signaled, and non-zero marker states', () => {
    expect(parseLomeinRuntimeMarker('done\nLOMEIN_COMPLETE\n')).toMatchObject({ state: 'complete', marker: 'LOMEIN_COMPLETE', count: 1, finalStandalone: true });
    expect(parseLomeinRuntimeMarker('Question: choose target file\nLOMEIN_NEEDS_HUMAN\n')).toMatchObject({ state: 'needs_human', marker: 'LOMEIN_NEEDS_HUMAN', context: 'Question: choose target file' });
    expect(parseLomeinRuntimeMarker('blocked because dependency missing\nLOMEIN_BLOCKED\n')).toMatchObject({ state: 'blocked', marker: 'LOMEIN_BLOCKED' });
    expect(parseLomeinRuntimeMarker('done without marker\n')).toMatchObject({ state: 'missing', marker: null, count: 0 });
    expect(parseLomeinRuntimeMarker('LOMEIN_COMPLETE\nagain\nLOMEIN_COMPLETE\n')).toMatchObject({ state: 'duplicate', count: 2 });
    expect(parseLomeinRuntimeMarker('LOMEIN_COMPLETE\nmore output\n')).toMatchObject({ state: 'non_final', marker: 'LOMEIN_COMPLETE', finalStandalone: false });
    expect(classifyRuntimeOutcome({ stdout: 'LOMEIN_COMPLETE\n', stderr: '', status: 0, signal: null, timedOut: true })).toMatchObject({ status: 'failed', failureCode: 'runtime_timeout' });
    expect(classifyRuntimeOutcome({ stdout: 'LOMEIN_COMPLETE\n', stderr: '', status: null, signal: 'SIGTERM', timedOut: false })).toMatchObject({ status: 'failed', failureCode: 'runtime_signaled' });
    expect(classifyRuntimeOutcome({ stdout: 'LOMEIN_COMPLETE\n', stderr: '', status: 2, signal: null, timedOut: false })).toMatchObject({ status: 'failed', failureCode: 'runtime_non_zero' });
  });

  it('persists LOMEIN_NEEDS_HUMAN as a resumable gate and resumes the same run after an answer', () => {
    const root = tempScaffold();
    try {
      writeMarkerAdapter(root, 'needs-then-complete', `
import { readFileSync } from 'node:fs';
const packet = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const answered = (packet.humanGates || []).some((gate) => gate.id === 'runtime-needs-human' && gate.status === 'satisfied');
if (!answered) {
  console.log('Need target choice before continuing. Pick README.md or docs/HARNESS_COMMANDS.md.');
  console.log('LOMEIN_NEEDS_HUMAN');
} else {
  console.log('Resumed with human task input: ' + packet.humanGates.find((gate) => gate.id === 'runtime-needs-human').answer.summary);
  console.log('LOMEIN_COMPLETE');
}
`);

      const blocked = routeHarnessCommand({
        repoRoot: root,
        input: '$work "runtime human gate" --context "repo truth" --adapter needs-then-complete --allow-spawn',
      });

      expect(blocked.status.state).toBe('waiting_on_human');
      expect(blocked.humanGates).toHaveLength(1);
      expect(blocked.humanGates[0]).toMatchObject({ id: 'runtime-needs-human', status: 'pending', required: true });
      expect(blocked.humanGates[0].prompt).toContain('Pick README.md');
      const needsReceipt = readRuntimeReceipt(root, blocked.runId);
      expect(needsReceipt).toMatchObject({ status: 'needs_human', marker: { state: 'needs_human' } });

      const answered = answerHumanGate({
        repoRoot: root,
        runId: blocked.runId,
        gateId: 'runtime-needs-human',
        answer: 'Use README.md first. This is task input only, not approval.',
      });

      expect(answered.runId).toBe(blocked.runId);
      expect(answered.status.state).toBe('completed');
      expect(answered.humanGates[0].answer?.boundary).toMatchObject({ answer_is_task_input: true, answer_is_not_approval: true });
      const packet = readRunJson(root, blocked.runId);
      expect(packet.status).toBe('completed');
      expect(packet.humanGates[0]).toMatchObject({ status: 'satisfied' });
      expect(readRuntimeReceipt(root, blocked.runId)).toMatchObject({ status: 'completed', marker: { state: 'complete' } });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('bounds and redacts runtime logs without absolute local path leaks', () => {
    const root = tempScaffold();
    try {
      writeMarkerAdapter(root, 'leaky', `
console.log('absolute repo path: ' + process.cwd());
console.log('Authorization: Bearer abcdefghijklmnopqrstuvwxyz1234567890');
console.log('x'.repeat(5000));
console.log('LOMEIN_COMPLETE');
`, { maxStdoutBytes: 220 });

      const result = routeHarnessCommand({
        repoRoot: root,
        input: '$work "bounded logs" --context "repo truth" --adapter leaky --allow-spawn',
      });

      const receipt = readRuntimeReceipt(root, result.runId);
      const stdoutPath = join(root, `.osc/runs/${result.runId}/runtime/stdout.log`);
      const stdout = readFileSync(stdoutPath, 'utf8');
      expect(receipt.logs[0]).toMatchObject({ path: `.osc/runs/${result.runId}/runtime/stdout.log`, truncated: true, maxBytes: 220 });
      expect(stdout.length).toBeLessThan(420);
      expect(stdout).not.toContain(root);
      expect(stdout).not.toContain('/Users/');
      expect(JSON.stringify(receipt)).not.toContain(root);
      expect(JSON.stringify(receipt)).not.toContain('/Users/');
      expect(JSON.stringify(receipt)).not.toContain('abcdefghijklmnopqrstuvwxyz1234567890');
      expect(stdout).not.toContain('abcdefghijklmnopqrstuvwxyz1234567890');
      expect(stdout).toMatch(/redacted|truncated/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects symlinked run-state status reads', () => {
    const root = tempScaffold();
    try {
      const created = routeHarnessCommand({ repoRoot: root, input: '$work "symlink status safety"' });
      const outside = mkdtempSync(join(tmpdir(), 'osc-runtime-outside-'));
      const gatesPath = join(root, `.osc/runs/${created.runId}/human-gates.json`);
      rmSync(gatesPath);
      symlinkSync(join(outside, 'human-gates.json'), gatesPath);

      expect(() => getHarnessStatus({ repoRoot: root, runId: created.runId })).toThrow(/symlink/i);
      expect(existsSync(join(outside, 'human-gates.json'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects symlinked run-state writes and leaves the gate pending', () => {
    const root = tempScaffold();
    try {
      const created = routeHarnessCommand({ repoRoot: root, input: '$work "symlink safety"' });
      const outside = mkdtempSync(join(tmpdir(), 'osc-runtime-outside-'));
      const runJson = join(root, `.osc/runs/${created.runId}/run.json`);
      rmSync(runJson);
      symlinkSync(join(outside, 'run.json'), runJson);

      expect(() => answerHumanGate({
        repoRoot: root,
        runId: created.runId,
        gateId: 'missing-required-context',
        answer: 'Answer should not mutate symlinked run state.',
      })).toThrow(/symlink/i);

      const gates = JSON.parse(readFileSync(join(root, `.osc/runs/${created.runId}/human-gates.json`), 'utf8'));
      expect(gates[0]).toMatchObject({ status: 'pending' });
      expect(existsSync(join(outside, 'run.json'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
