import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, renameSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compileResume, type ResumeResult } from '../src/resume.js';
import { createRunArtifacts, type RunArtifacts } from '../src/artifacts.js';
import { parsePlanFile } from '../src/scaffold.js';

const repoRoot = resolve(import.meta.dirname, '..');
const fixtureRoot = join(repoRoot, 'examples', 'resume-demo');
const ambientRecordFixtures = join(repoRoot, 'tests', 'fixtures', 'capture', 'records');

function tempRepo(): string {
  return mkdtempSync(join(tmpdir(), 'osc-resume-'));
}

function writeMission(root: string, defined = true): void {
  writeFileSync(
    join(root, 'MISSION.md'),
    defined
      ? '# Mission\n\nShip a tiny demo project that proves resume packets work.\n'
      : '# Mission\n\n<!-- mission:unset -->\nTODO: define mission\n',
    'utf8',
  );
}

function writePlan(root: string, slug: string, body?: string): void {
  const dir = join(root, '.osc', 'plans', 'active');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${slug}.md`),
    body ?? [
      `# Plan: ${slug}`,
      '',
      '## Status',
      '',
      'active',
      '',
      '## Context',
      '',
      'Test context.',
      '',
      '## Goal',
      '',
      'Implement the demo slice.',
      '',
      '## Constraints / Out of scope',
      '',
      '- None.',
      '',
      '## Files to touch',
      '',
      '- `src/demo.ts` — demo.',
      '',
      '## Acceptance criteria',
      '',
      '- [x] First criterion done.',
      '- [ ] Second criterion open.',
      '',
      '## Verification steps',
      '',
      '1. Run `npm test` and confirm exit 0.',
      '',
      '## Open questions',
      '',
      '- None.',
      '',
    ].join('\n'),
    'utf8',
  );
}

function writeAmbientRecord(root: string, name: string, fixture: string, mtime: Date): void {
  const dir = join(root, '.osc', 'state', 'ambient');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(path, readFileSync(join(ambientRecordFixtures, fixture), 'utf8'), 'utf8');
  utimesSync(path, mtime, mtime);
}

function writeRunStatus(run: Pick<RunArtifacts, 'runDir' | 'runId'>, state: string, updatedAt: string, gateId?: string): void {
  writeFileSync(join(run.runDir, 'status.json'), JSON.stringify({
    schema: 'osc.harness-status.v1',
    runId: run.runId,
    command: 'work',
    state,
    updatedAt,
    pendingHumanGates: gateId ? [{ id: gateId, required: true, status: 'pending' }] : [],
  }), 'utf8');
}

function createRecordedRun(root: string, slug: string): RunArtifacts {
  return createRunArtifacts(root, parsePlanFile(join(root, '.osc', 'plans', 'active', `${slug}.md`)), 'run', {
    taskId: `task:${slug}`,
  });
}

function writeRunFeedback(run: RunArtifacts, hypothesis: string): void {
  writeFileSync(join(run.runDir, 'feedback.jsonl'), `${JSON.stringify({
    schema: 'osc.feedback.v1',
    id: 'feedback-1',
    runId: run.runId,
    recordedAt: '2026-06-10T11:01:00.000Z',
    source: 'runtime',
    verdict: 'retry',
    scope: 'runtime',
    whatHappened: 'Attempt failed.',
    whyItMatters: 'The task remains open.',
    repairHypothesis: hypothesis,
    evidencePaths: [],
    nextAction: 'retry',
  })}\n`, 'utf8');
}

const packetBoundary = 'Boundary: read-only packet compiled from repo truth. It is not approval and grants no merge, publish, release, or spawn authority.\n';
const publicRunKeys = ['run_id', 'command', 'state', 'pending_gates', 'pending_gate_ids', 'updated_at'];
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

function expectNavigation({ summary, packet }: ResumeResult, maxChars: number): void {
  expect(packet.length).toBeLessThanOrEqual(maxChars);
  expect(packet).toContain('# Resume Packet\n\nStatus: ');
  expect(packet).toContain(summary.active_plan ? `## Active plan: ${summary.active_plan.slug}\n` : '## Active plan\n\nNone.\n');
  expect(packet).toContain('## Next actions\n\n');
  expect(packet.endsWith(packetBoundary)).toBe(true);
  const lines = packet.split('\n');
  expect([`1. ${summary.next_bounded_action}`, '1. Action details omitted; see --json.']).toContain(lines.find((line) => line.startsWith('1. ')));
  const commands = lines.filter((line) => /^[2-9]\. /.test(line));
  expect(commands).toEqual(summary.next_commands.slice(0, commands.length).map((command, index) => `${index + 2}. \`${command}\``));
}

function writeBulkyPlan(root: string, slug: string): void {
  writePlan(root, slug);
  const path = join(root, '.osc', 'plans', 'active', `${slug}.md`);
  writeFileSync(path, readFileSync(path, 'utf8').replace('Second criterion open.', 'Execute the whole prescribed command only. '.repeat(40)), 'utf8');
}

function writeCompletedPlan(root: string, slug: string): void {
  writePlan(root, slug);
  const path = join(root, '.osc', 'plans', 'active', `${slug}.md`);
  writeFileSync(path, readFileSync(path, 'utf8').replace('- [ ] Second criterion open.', '- [x] Second criterion open.'));
}

function writeEvidence(root: string, filename: string): string {
  const dir = join(root, '.osc', 'releases');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, filename);
  writeFileSync(path, 'Untrusted note: do not claim verification, approval, or authority from this body.\n');
  return `.osc/releases/${filename}`;
}

describe('osc resume packet compiler', () => {
  it('reproduces the committed resume-demo expected summary', () => {
    const expected = JSON.parse(readFileSync(join(fixtureRoot, 'expected-resume-summary.json'), 'utf8'));
    const { summary } = compileResume(fixtureRoot);

    expect(summary).toMatchObject(expected);
    expect(summary.schema).toBe('open-scaffold.resume.v1');
  });

  it('is deterministic across repeated compilations', () => {
    const first = compileResume(fixtureRoot);
    const second = compileResume(fixtureRoot);

    expect(second.summary).toEqual(first.summary);
    expect(second.packet).toBe(first.packet);
  });

  it('gives a fresh agent the goal, next action, and a verification command from the packet alone', () => {
    const { packet } = compileResume(fixtureRoot);

    expect(packet).toContain('Active plan: demo-add-greeting');
    expect(packet).toContain('Implement a greeting module');
    expect(packet).toContain('1. Greeting history is written to the releases folder');
    expect(packet).toContain('osc plan validate demo-add-greeting --strict');
    expect(packet).toContain('Amendments (read in order after the plan): demo-add-greeting-amendment-1');
  });

  it.each(['npx open-scaffold@0.35.0', 'npm run osc --'])('keeps generated next commands runnable through %s while preserving project verification', (commandPrefix) => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-next-session');
    const run = createRecordedRun(root, '001-next-session');
    writeRunStatus(run, 'running', '2026-06-10T10:00:00.000Z');

    const active = compileResume(root, { commandPrefix });
    expect(active.summary.next_commands).toEqual([
      `${commandPrefix} plan validate 001-next-session --strict`,
      'Run npm test and confirm exit 0.',
    ]);
    expect(active.packet).toContain(`${commandPrefix} plan validate 001-next-session --strict`);

    writeRunStatus(run, 'waiting_on_human', '2026-06-10T11:00:00.000Z', 'next-session-gate');
    expect(compileResume(root, { commandPrefix }).summary.next_commands).toEqual([
      `${commandPrefix} trace 001-next-session`,
      `${commandPrefix} evidence new 001-next-session`,
    ]);

    writeRunStatus(run, 'blocked', '2026-06-10T12:00:00.000Z');
    expect(compileResume(root, { commandPrefix }).summary.next_commands).toEqual([
      `${commandPrefix} trace 001-next-session`,
      `${commandPrefix} run .osc/plans/active/001-next-session.md --dry-run`,
    ]);

    writeRunStatus(run, 'running', '2026-06-10T13:00:00.000Z');
    const planPath = join(root, '.osc', 'plans', 'active', '001-next-session.md');
    writeFileSync(planPath, readFileSync(planPath, 'utf8').replace('- [ ] Second criterion open.', '- [x] Second criterion open.'), 'utf8');
    expect(compileResume(root, { commandPrefix }).summary.next_commands).toEqual([
      `${commandPrefix} evidence new 001-next-session`,
      `${commandPrefix} verify`,
      `${commandPrefix} close 001-next-session --message "<what shipped>"`,
    ]);
  });

  it('keeps a caller\'s reviewed package invocation for bootstrap and mission guidance', () => {
    const root = tempRepo();
    const commandPrefix = 'npx open-scaffold@0.35.0';
    expect(compileResume(root, { commandPrefix }).summary.next_commands).toEqual([`${commandPrefix} first-run`]);
    writeMission(root, false);
    writePlan(root, '001-needs-mission');
    const { summary, packet } = compileResume(root, { commandPrefix });
    expect(summary.next_bounded_action).toContain(`${commandPrefix} first-run`);
    expect(packet).not.toContain('open-scaffold@latest');
  });

  it.each([600, 601])('retains usable navigation and the complete boundary at %s characters', (maxChars) => {
    const { packet } = compileResume(fixtureRoot, { maxChars });

    expect.soft(packet.length).toBeLessThanOrEqual(maxChars);
    expect.soft(packet).toContain('# Resume Packet\n\nStatus: ');
    expect.soft(packet).toContain('## Active plan: demo-add-greeting\n');
    expect.soft(packet).toContain('## Next actions\n\n1. Greeting history is written to the releases folder as an evidence note on each run.\n');
    expect.soft(packet).toContain('2. `osc plan validate demo-add-greeting --strict`\n');
    expect.soft(packet).toContain('Details/commands omitted; see --json.');
    expect.soft(packet).toMatch(/Boundary: read-only packet compiled from repo truth\. It is not approval and grants no merge, publish, release, or spawn authority\.\n$/);
  });

  it.each(['osc', 'npm run osc --', 'npx open-scaffold@0.35.0'])('keeps whole ordered commands and a detail cue with bulky actions through %s', (commandPrefix) => {
    const root = tempRepo();
    writeMission(root);
    writeBulkyPlan(root, '001-bulky');
    for (const maxChars of [600, 601]) {
      const result = compileResume(root, { maxChars, commandPrefix });
      expectNavigation(result, maxChars);
      expect(result.packet).toContain('1. Action details omitted; see --json.\n');
      expect(result.packet).toContain(`2. \`${commandPrefix} plan validate 001-bulky --strict\`\n`);
      expect(result.packet).toContain('Details/commands omitted; see --json.');
      expect(result.summary.next_bounded_action.length).toBe(1000);
      expect(result.packet).not.toContain('Execute the whole prescribed command');
    }
  });

  it.each([
    [252, 600, 1, 599], [253, 600, 1, 600], [254, 600, 0, 307], [254, 601, 1, 601],
  ])('fits a whole first command atomically with prefix %s at budget %s', (prefixChars, maxChars, commandCount, packetChars) => {
    const root = tempRepo();
    writeMission(root);
    writeBulkyPlan(root, '001-atomic');
    // The specified essential frame is 307 characters here; the command line adds prefix + 34 + 6.
    const result = compileResume(root, { maxChars, commandPrefix: 'x'.repeat(prefixChars) });
    expectNavigation(result, maxChars);
    expect(result.packet.length).toBe(packetChars);
    expect(result.packet.split('\n').filter((line) => /^[2-9]\. /.test(line))).toHaveLength(commandCount);
    expect(result.packet).not.toContain('Run npm test and confirm exit 0.');
    expect(result.packet).toContain('Details/commands omitted; see --json.');
  });

  it('stops at an unfit evidence prerequisite even when the later verify command could fit', () => {
    const root = tempRepo();
    const slug = `001-${'x'.repeat(156)}`;
    writeMission(root);
    writePlan(root, slug);
    const path = join(root, '.osc', 'plans', 'active', `${slug}.md`);
    writeFileSync(path, readFileSync(path, 'utf8').replace('- [ ] Second criterion open.', '- [x] Second criterion open.'), 'utf8');
    const result = compileResume(root, { maxChars: 600 });
    expectNavigation(result, 600);
    expect(result.summary.next_commands).toEqual([
      `osc evidence new ${slug}`, 'osc verify', `osc close ${slug} --message "<what shipped>"`,
    ]);
    expect(result.packet.length + '2. `osc verify`\n'.length).toBeLessThanOrEqual(600);
    expect(result.packet).not.toContain('2. `');
    expect(result.packet).not.toContain('osc verify');
    expect(result.packet).not.toContain('osc close');
    expect(result.packet).toContain('1. Action details omitted; see --json.');
  });

  it.each(['bootstrap', 'undefined-mission', 'no-plan', 'backlog'])('keeps essentials with a pathological invocation in the %s state', (state) => {
    const root = tempRepo();
    if (state !== 'bootstrap') {
      writeMission(root, state !== 'undefined-mission');
      mkdirSync(join(root, '.osc', 'plans', 'active'), { recursive: true });
    }
    if (state === 'undefined-mission') writePlan(root, '001-mission-first');
    if (state === 'backlog') {
      writePlan(root, '001-backlog');
      mkdirSync(join(root, '.osc', 'plans', 'backlog'), { recursive: true });
      renameSync(join(root, '.osc', 'plans', 'active', '001-backlog.md'), join(root, '.osc', 'plans', 'backlog', '001-backlog.md'));
    }
    const commandPrefix = `npm run ${'very-long-reviewed-command-'.repeat(50)} --`;
    for (const maxChars of [600, 601]) {
      const result = compileResume(root, { maxChars, commandPrefix, ambientSession: '../missing-selector' });
      expectNavigation(result, maxChars);
      expect(result.packet).toContain(`Status: ${result.summary.status}\n`);
      expect(result.packet).toContain('Requested ambient session unavailable.');
      expect(result.packet).not.toContain('../missing-selector');
      expect(result.packet).not.toContain('very-long-reviewed-command-');
      expect(result.packet).not.toContain('2. `');
      expect(result.packet).toContain('Details/commands omitted; see --json.');
      if (state === 'bootstrap' || state === 'undefined-mission') expect(result.packet).toContain('1. Action details omitted; see --json.');
    }
  });

  it.each(['osc', 'npm run osc --', 'npx open-scaffold@0.35.0'])('retains a complete bootstrap command through the reviewed %s prefix', (commandPrefix) => {
    const root = tempRepo();
    const result = compileResume(root, { maxChars: 600, commandPrefix });
    expectNavigation(result, 600);
    expect(result.packet).toContain(`2. \`${result.summary.next_commands[0]}\`\n`);
  });

  it.each(['waiting_on_human', 'completed', 'failed'])('retains bound %s run navigation and gate precedence at 600 characters', (state) => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-current-gate');
    writePlan(root, '002-unrelated');
    if (state === 'completed') {
      const planPath = join(root, '.osc', 'plans', 'active', '001-current-gate.md');
      writeFileSync(planPath, readFileSync(planPath, 'utf8').replace('- [ ] Second criterion open.', '- [x] Second criterion open.'), 'utf8');
    }
    const current = createRecordedRun(root, '001-current-gate');
    const unrelated = createRecordedRun(root, '002-unrelated');
    writeRunStatus(current, state, '2026-06-10T10:00:00.000Z', state === 'failed' ? undefined : 'current-gate');
    writeRunStatus(unrelated, 'waiting_on_human', '2026-06-10T11:00:00.000Z', 'unrelated-gate');
    if (state === 'failed') writeRunFeedback(current, 'Restore the missing fixture before retrying.');
    const result = compileResume(root, { maxChars: 600, planSlug: '001-current-gate' });
    expectNavigation(result, 600);
    expect(result.summary.latest_run?.run_id).toBe(current.runId);
    expect(result.packet).toContain(`Run: ${state}; ${state === 'failed' ? 0 : 1} pending gate(s).`);
    expect(result.packet).not.toContain('unrelated-gate');
    expect(result.packet).not.toContain(unrelated.runId);
    expect(result.packet).toContain('2. `osc trace 001-current-gate`\n');
    if (state === 'failed') {
      expect(result.summary.next_bounded_action).toContain('Restore the missing fixture');
      expect(result.summary.next_commands[1]).toBe('osc run .osc/plans/active/001-current-gate.md --dry-run');
    } else {
      expect(result.summary.next_bounded_action).toContain('Record the answer for gate current-gate');
      expect(result.summary.next_commands[1]).toBe('osc evidence new 001-current-gate');
    }
  });

  it.each([600, 601])('keeps maximum plan identity, bounded arbitrary run prose and requested unavailability at %s', (maxChars) => {
    const root = tempRepo();
    const slug = `001-${'x'.repeat(156)}`;
    writeMission(root);
    writePlan(root, slug);
    const run = createRecordedRun(root, slug);
    const state = 'an arbitrary recorded run state '.repeat(30);
    writeRunStatus(run, state, '2026-06-10T10:00:00.000Z', 'pending-human-gate');
    const result = compileResume(root, { maxChars, planSlug: slug, ambientSession: '../missing' });
    expectNavigation(result, maxChars);
    expect(result.summary.active_plan?.slug).toHaveLength(160);
    expect(result.packet).toContain(`## Active plan: ${result.summary.active_plan?.slug}\n`);
    expect(result.summary.latest_run?.state).toBe(state);
    const displayed = result.packet.match(/^Run: (.*); 1 pending gate\(s\)\.$/m)?.[1];
    expect(displayed).toHaveLength(24);
    expect(displayed).toMatch(/…$/);
    expect(result.packet).toContain('Requested ambient session unavailable.');
    expect(result.packet).not.toContain('## Ambient capture');
    expect(result.packet).not.toContain('transcript evidence');
    expect(result.packet).not.toContain('../missing');
    expect(result.packet).toContain('1. Action details omitted; see --json.');
  });

  it.each(['created', 'ready', 'waiting_on_human', 'running', 'completed', 'failed', 'blocked', 'unknown'])('preserves the ordinary %s run display in compact mode', (state) => {
    const root = tempRepo();
    writeMission(root);
    writeBulkyPlan(root, '001-state');
    const run = createRecordedRun(root, '001-state');
    writeRunStatus(run, state, '2026-06-10T10:00:00.000Z');
    const result = compileResume(root, { maxChars: 600, planSlug: '001-state' });
    expectNavigation(result, 600);
    expect(result.packet).toContain(`Run: ${state}; 0 pending gate(s).`);
    expect(result.summary.latest_run?.state).toBe(state);
  });

  it.each(['\u0000\u001b\u007f\u009f', '\u001bsk-proj-abcdefghijklmnopqrstuvwxyz012345 /Users/someone/secrets \u0000'])('sanitizes compact run-state prose without changing its raw JSON value', (state) => {
    const root = tempRepo();
    writeMission(root);
    writeBulkyPlan(root, '001-display');
    const run = createRecordedRun(root, '001-display');
    writeRunStatus(run, state, '2026-06-10T10:00:00.000Z');
    const result = compileResume(root, { maxChars: 600, planSlug: '001-display' });
    expectNavigation(result, 600);
    expect(result.summary.latest_run?.state).toBe(state);
    expect(result.packet).not.toMatch(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/);
    expect(result.packet).not.toContain('/Users/');
    expect(result.packet).not.toContain('abcdefghijklmnopqrstuvwxyz012345');
    const displayed = result.packet.match(/^Run: (.*); 0 pending gate\(s\)\.$/m)?.[1];
    expect(displayed?.length).toBeLessThanOrEqual(24);
    if (state === '\u0000\u001b\u007f\u009f') expect(displayed).toBe('unknown');
  });

  it('retains only the ordered public run allowlist including nullable values', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-public-run');
    const run = createRecordedRun(root, '001-public-run');
    const statusPath = join(run.runDir, 'status.json');
    writeFileSync(statusPath, JSON.stringify({
      runId: run.runId, taskId: 'task:001-public-run', state: 'ready', command: null, updatedAt: null,
      pendingHumanGates: [], extraPrivateMetadata: 'must-not-escape', raw_run_id: 'another-run', attempt_count: 99,
    }), 'utf8');
    const expected = { run_id: run.runId, command: null, state: 'ready', pending_gates: 0, pending_gate_ids: [], updated_at: null };
    for (const maxChars of [600, 601, 4000, 20000]) {
      const { summary } = compileResume(root, { maxChars, planSlug: '001-public-run' });
      expect(Object.keys(summary.latest_run!)).toEqual(publicRunKeys);
      expect(summary.latest_run).toEqual(expected);
      expect(JSON.stringify(summary)).not.toContain('must-not-escape');
      expect(JSON.stringify(summary)).not.toContain('attempt_count');
      expect(JSON.stringify(summary)).not.toContain('raw_run_id');
    }
  });

  it('preserves accepted-base default packet bytes and the entire JSON summary across budgets', () => {
    // Accepted-base captures precede this implementation; these anchors are not generated from candidate output.
    for (const maxChars of [600, 601, 1114, 1115, 1116, 4000, 20000]) {
      const result = compileResume(fixtureRoot, { maxChars });
      expect(sha256(JSON.stringify(result.summary))).toBe('9f81d61830743197df1efcff261787baaed1ae9f6caeab5111e95c9e1702cd1e');
      expectNavigation(result, maxChars);
      if (maxChars >= 1115) {
        expect(result.packet.length).toBe(1115);
        expect(sha256(result.packet)).toBe('c42bf65df6b1fb289bd9e6f106074c8651cc3a4a1187f3fefa7bb4260fd196e7');
      }
    }
  });

  it('preserves accepted-base full, brief and no-ambient fitting bytes at exact and adjacent budgets', () => {
    const root = tempRepo();
    const slug = '001-baseline-legacy';
    writeMission(root);
    writePlan(root, slug);
    const planPath = join(root, '.osc', 'plans', 'active', `${slug}.md`);
    const criteria = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth']
      .map((name, index) => `- [${index === 0 ? 'x' : ' '}] ${name} criterion ${index === 0 ? 'done' : 'open'}.`).join('\n');
    writeFileSync(planPath, readFileSync(planPath, 'utf8').replace('- [x] First criterion done.\n- [ ] Second criterion open.', criteria), 'utf8');
    const lessons = join(root, '.osc', 'improvements', 'applied');
    mkdirSync(lessons, { recursive: true });
    writeFileSync(join(lessons, '001-baseline-lesson.md'), '# Baseline lesson\n\nSynthetic safe test fixture; preserve explicit verification commands.\n', 'utf8');
    for (const [fixture, name, session, mtime] of [
      ['valid-claude-code.json', 'older.json', 'baseline-claude-session', '2026-06-13T10:00:00.000Z'],
      ['valid-codex.json', 'newer.json', 'baseline-codex-session', '2026-06-13T11:00:00.000Z'],
    ]) {
      const dir = join(root, '.osc', 'state', 'ambient');
      mkdirSync(dir, { recursive: true });
      const record = JSON.parse(readFileSync(join(ambientRecordFixtures, fixture), 'utf8'));
      record.runId = session;
      record.boundary = { note: 'Synthetic compatibility fixture: observed evidence only.' };
      const path = join(dir, name);
      writeFileSync(path, JSON.stringify(record, null, 2) + '\n', 'utf8');
      utimesSync(path, new Date(mtime), new Date(mtime));
    }
    for (const [maxChars, chars, packetHash] of [
      [1772, 1772, '46e6a2c0453225321a9339f87f2cc990ab49b0856273cda7e5f7cf64fbcd89d2'],
      [1771, 1236, 'cab1fba915eb027edeadbb9ef0b3e704577b83b4c594094cd5fcf7f8a635b1a5'],
      [1236, 1236, 'cab1fba915eb027edeadbb9ef0b3e704577b83b4c594094cd5fcf7f8a635b1a5'],
      [1235, 706, 'ba88936275a6cebaa83e4ec341a7ecd1e733ad044b12c417ea8f0bb14976d97b'],
      [706, 706, 'ba88936275a6cebaa83e4ec341a7ecd1e733ad044b12c417ea8f0bb14976d97b'],
    ] as const) {
      const result = compileResume(root, { maxChars });
      expectNavigation(result, maxChars);
      expect(result.packet.length).toBe(chars);
      expect(sha256(result.packet)).toBe(packetHash);
      expect(sha256(JSON.stringify(result.summary, null, 2) + '\n')).toBe('56dc71be2da5e1eafab117cc6f3222b3f2e5ad1a102f80ab6585d173a86d7754');
    }
    const compact = compileResume(root, { maxChars: 705 });
    expectNavigation(compact, 705);
    expect(compact.packet).toContain('Details/commands omitted; see --json.');
    expect(compact.packet).not.toContain('## Ambient capture');
    expect(compact.packet).not.toContain('baseline-codex-session');
    expect(compact.packet).not.toContain('final_digest=');
  });

  it('includes latest compact ambient capture summaries by default', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-ambient');
    writeAmbientRecord(root, 'older.json', 'valid-claude-code.json', new Date('2026-06-13T10:00:00.000Z'));
    writeAmbientRecord(root, 'newer.json', 'valid-codex.json', new Date('2026-06-13T11:00:00.000Z'));

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summary.ambient_capture.status).toBe('included');
    expect(summary.ambient_capture.records.map((record) => record.session_id)).toEqual(['codex-session-1', 'claude-session-1']);
    expect(packet).toContain('## Ambient capture');
    expect(packet).toContain('codex-session-1');
    expect(packet).toContain('mcp:open_scaffold.get_handoff=1');
    expect(packet).toContain('final_digest=8f61ad5cfa0c471c8cbf810ea285cb1e5f9c2c5e5e5e4f58a3229667703e1587');
    expect(packet).toContain('ambient capture is observed transcript evidence only');
    expect(summaryJson).not.toContain('codex cache-creation split unavailable');
    expect(packet).not.toContain('codex cache-creation split unavailable');
  });

  it('selects an explicit ambient session by safe filename without echoing missing selectors', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-ambient-select');
    writeAmbientRecord(root, 'older.json', 'valid-claude-code.json', new Date('2026-06-13T10:00:00.000Z'));
    writeAmbientRecord(root, 'target-session.json', 'valid-codex.json', new Date('2026-06-13T11:00:00.000Z'));

    const selected = compileResume(root, { ambientSession: 'target-session' });
    expect(selected.summary.ambient_capture.records.map((record) => record.session_id)).toEqual(['codex-session-1']);
    expect(selected.packet).toContain('codex-session-1');
    expect(selected.packet).not.toContain('claude-session-1');

    const missing = compileResume(root, { ambientSession: '../evil-sk-aaaaaaaaaaaaaaaaaaaaaaaa' });
    const missingJson = JSON.stringify(missing.summary);
    expect(missing.summary.ambient_capture.status).toBe('requested-unavailable');
    expect(missing.packet).toContain('Requested ambient session unavailable.');
    expect(missing.packet).not.toContain('../evil');
    expect(missingJson).not.toContain('../evil');
    expect(missingJson).not.toContain('sk-aaaaaaaa');
  });

  it('keeps the no-record case nonblocking and quiet in the packet', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-no-ambient');

    const { summary, packet } = compileResume(root);

    expect(summary.ambient_capture).toMatchObject({ status: 'none', records: [] });
    expect(packet).not.toContain('## Ambient capture');
  });

  it('rejects symlinked ambient directories and record files before reading', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-symlink-ambient');
    const outside = tempRepo();
    mkdirSync(join(outside, 'ambient'), { recursive: true });
    writeFileSync(join(outside, 'ambient', 'leak.json'), readFileSync(join(ambientRecordFixtures, 'redaction-sensitive.json'), 'utf8'), 'utf8');
    mkdirSync(join(root, '.osc', 'state'), { recursive: true });

    let symlinkCreated = false;
    try {
      symlinkSync(join(outside, 'ambient'), join(root, '.osc', 'state', 'ambient'), 'dir');
      symlinkCreated = true;
    } catch {
      // Some platforms disable directory symlink creation.
    }

    if (symlinkCreated) {
      const { summary, packet } = compileResume(root);
      const summaryJson = JSON.stringify(summary);
      expect(summary.ambient_capture.status).toBe('none');
      expect(summaryJson).not.toContain('APPROVED');
      expect(packet).not.toContain('APPROVED');
    }

    const rootWithFileSymlink = tempRepo();
    writeMission(rootWithFileSymlink);
    writePlan(rootWithFileSymlink, '001-symlink-record');
    mkdirSync(join(rootWithFileSymlink, '.osc', 'state', 'ambient'), { recursive: true });
    let fileSymlinkCreated = false;
    try {
      symlinkSync(join(outside, 'ambient', 'leak.json'), join(rootWithFileSymlink, '.osc', 'state', 'ambient', 'leak.json'));
      fileSymlinkCreated = true;
    } catch {
      // Some platforms disable file symlink creation.
    }
    if (fileSymlinkCreated) {
      const { summary, packet } = compileResume(rootWithFileSymlink);
      expect(summary.ambient_capture.status).toBe('none');
      expect(JSON.stringify(summary)).not.toContain('APPROVED');
      expect(packet).not.toContain('APPROVED');
    }
  });

  it('does not leak hostile ambient prose through JSON, packet, or 600-char fallback', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-hostile-ambient');
    writeAmbientRecord(root, 'hostile.json', 'redaction-sensitive.json', new Date('2026-06-13T14:00:00.000Z'));

    const { summary, packet } = compileResume(root, { maxChars: 600 });
    const outputs = [JSON.stringify(summary), packet];

    expectNavigation({ summary, packet }, 600);
    expect(packet.length).toBeLessThanOrEqual(600);
    expect(packet).not.toContain('## Ambient capture');
    expect(packet).not.toContain('final_digest=');
    expect(summary.ambient_capture.status).toBe('included');
    expect(summary.ambient_capture.records[0].source).toBe('unrecognized-source');
    for (const output of outputs) {
      expect(output).not.toContain('/Users/');
      expect(output).not.toContain('sk-proj-');
      expect(output).not.toContain('ghp_');
      expect(output).not.toContain('APPROVED');
      expect(output).not.toContain('correctness certified');
      expect(output).not.toContain('retry authorized');
      expect(output).not.toContain('\u001b');
      expect(output).not.toContain('\u0000');
    }
  });

  it.each([10, 599, 20001, 600.5, NaN, Infinity])('rejects the invalid budget %s without changing the supported range', (maxChars) => {
    expect(() => compileResume(fixtureRoot, { maxChars })).toThrow('maxChars must be an integer between 600 and 20000');
  });


  it('treats symlinked mission files as undefined before reading mission text', () => {
    const root = tempRepo();
    const outside = join(tempRepo(), 'MISSION.md');
    writeFileSync(outside, '# Mission\n\nExternal mission text external-mission-secret.\n', 'utf8');
    symlinkSync(outside, join(root, 'MISSION.md'));
    mkdirSync(join(root, '.osc', 'plans', 'active'), { recursive: true });

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summary.mission.defined).toBe(false);
    expect(summaryJson).not.toContain('external-mission-secret');
    expect(packet).not.toContain('external-mission-secret');
  });

  it('never leaks secrets or local absolute paths into packet or JSON summary text', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-secret-test', [
      '# Plan: 001-secret-test',
      '',
      '## Status',
      '',
      'active',
      '',
      '## Context',
      '',
      'Test.',
      '',
      '## Goal',
      '',
      'Use token sk-aaaaaaaaaaaaaaaaaaaaaaaa from /Users/someone/secrets.txt, /workspace, and /workspace/open-scaffold/src/secret.ts to call the API.',
      '',
      '## Constraints / Out of scope',
      '',
      '- None.',
      '',
      '## Files to touch',
      '',
      '- `src/x.ts` — x.',
      '',
      '## Acceptance criteria',
      '',
      '- [ ] Confirm sk-aaaaaaaaaaaaaaaaaaaaaaaa never appears in logs under /Users/someone/secrets.txt, /workspace, or /workspace/open-scaffold/src/secret.ts.',
      '',
      '## Verification steps',
      '',
      '1. Run `npm test`.',
      '',
      '## Open questions',
      '',
      '- None.',
      '',
    ].join('\n'));

    const { packet, summary } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(packet).not.toContain('sk-aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(packet).not.toContain('/Users/someone');
    expect(packet).not.toContain('/workspace');
    expect(packet).toContain('sk-[redacted]');
    expect(packet).toContain('local-path');
    expect(summaryJson).not.toContain('sk-aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(summaryJson).not.toContain('/Users/someone');
    expect(summaryJson).not.toContain('/workspace');
    expect(summaryJson).toContain('sk-[redacted]');
    expect(summaryJson).toContain('local-path');
    expect(summary.next_bounded_action).toContain('sk-[redacted]');
    expect(summary.status).toBe('active plan 001-secret-test; 0/1 acceptance criteria complete');
  });

  it('redacts plan identifiers before emitting resume output', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-sk-abcdefghijklmnopqrstuvwxyz012345-plan');

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summaryJson).not.toContain('sk-aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(packet).not.toContain('sk-aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(summary.active_plan?.slug).toContain('sk-[redacted]');
    expect(summary.next_commands.join('\n')).toContain('sk-[redacted]');
    expect(summary.status).toContain('sk-[redacted]');
  });

  it('redacts plan identifiers in missing-plan errors', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-sk-abcdefghijklmnopqrstuvwxyz012345-plan');

    expect(() => compileResume(root, { planSlug: 'missing-sk-abcdefghijklmnopqrstuvwxyz012345' })).toThrow(/sk-\[redacted\]/);
    expect(() => compileResume(root, { planSlug: 'missing-sk-abcdefghijklmnopqrstuvwxyz012345' })).not.toThrow(/sk-abcdefghijklmnopqrstuvwxyz012345/);
  });


  it('ignores symlinked active plan files before parsing plan text', () => {
    const root = tempRepo();
    writeMission(root);
    const outside = join(tempRepo(), 'external-plan.md');
    writeFileSync(outside, [
      '# Plan: external-plan',
      '',
      '## Status',
      '',
      'active',
      '',
      '## Context',
      '',
      'External context.',
      '',
      '## Goal',
      '',
      'Leak external plan text external-plan-secret.',
      '',
      '## Constraints / Out of scope',
      '',
      '- None.',
      '',
      '## Files to touch',
      '',
      '- `src/x.ts` — x.',
      '',
      '## Acceptance criteria',
      '',
      '- [ ] External criterion external-plan-secret.',
      '',
      '## Verification steps',
      '',
      '1. Run `npm test`.',
      '',
      '## Open questions',
      '',
      '- None.',
      '',
    ].join('\n'), 'utf8');
    const activeDir = join(root, '.osc', 'plans', 'active');
    mkdirSync(activeDir, { recursive: true });
    symlinkSync(outside, join(activeDir, '001-symlink-plan.md'));

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summary.active_plan).toBeNull();
    expect(summary.status).toBe('no active plan; 0 backlog plan(s)');
    expect(summaryJson).not.toContain('external-plan-secret');
    expect(packet).not.toContain('external-plan-secret');
  });


  it('ignores symlinked plan stage directories before scanning plan files', () => {
    const root = tempRepo();
    writeMission(root);
    const outsideActive = join(tempRepo(), 'active');
    mkdirSync(outsideActive, { recursive: true });
    writeFileSync(join(outsideActive, '001-external-stage-plan.md'), [
      '# Plan: external-stage-plan',
      '',
      '## Status',
      '',
      'active',
      '',
      '## Context',
      '',
      'External context.',
      '',
      '## Goal',
      '',
      'Leak external stage plan text external-stage-secret.',
      '',
      '## Constraints / Out of scope',
      '',
      '- None.',
      '',
      '## Files to touch',
      '',
      '- `src/x.ts` — x.',
      '',
      '## Acceptance criteria',
      '',
      '- [ ] External stage criterion external-stage-secret.',
      '',
      '## Verification steps',
      '',
      '1. Run `npm test`.',
      '',
      '## Open questions',
      '',
      '- None.',
      '',
    ].join('\n'), 'utf8');
    const plansDir = join(root, '.osc', 'plans');
    mkdirSync(plansDir, { recursive: true });
    symlinkSync(outsideActive, join(plansDir, 'active'), 'dir');

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summary.active_plan).toBeNull();
    expect(summaryJson).not.toContain('external-stage-secret');
    expect(packet).not.toContain('external-stage-secret');
  });


  it('ignores a symlinked .osc root before scanning scaffold state', () => {
    const root = tempRepo();
    writeMission(root);
    const outsideOsc = join(tempRepo(), '.osc');
    mkdirSync(join(outsideOsc, 'plans', 'active'), { recursive: true });
    mkdirSync(join(outsideOsc, 'releases'), { recursive: true });
    mkdirSync(join(outsideOsc, 'runs', 'harness-work-osc-symlink'), { recursive: true });
    mkdirSync(join(outsideOsc, 'improvements', 'applied'), { recursive: true });
    writeFileSync(join(outsideOsc, 'plans', 'active', '001-external-osc-plan.md'), [
      '# Plan: external-osc-plan',
      '',
      '## Status',
      '',
      'active',
      '',
      '## Context',
      '',
      'External context.',
      '',
      '## Goal',
      '',
      'Leak external osc plan text external-osc-secret.',
      '',
      '## Constraints / Out of scope',
      '',
      '- None.',
      '',
      '## Files to touch',
      '',
      '- `src/x.ts` — x.',
      '',
      '## Acceptance criteria',
      '',
      '- [ ] External osc criterion external-osc-secret.',
      '',
      '## Verification steps',
      '',
      '1. Run `npm test`.',
      '',
      '## Open questions',
      '',
      '- None.',
      '',
    ].join('\n'), 'utf8');
    writeFileSync(join(outsideOsc, 'releases', 'external-osc-release-secret.md'), '# External evidence\n', 'utf8');
    writeFileSync(join(outsideOsc, 'improvements', 'applied', 'external-osc-lesson-secret.md'), '# External lesson\n', 'utf8');
    writeFileSync(join(outsideOsc, 'runs', 'harness-work-osc-symlink', 'status.json'), JSON.stringify({
      schema: 'osc.harness-status.v1',
      runId: 'external-osc-run-id',
      command: 'work',
      state: 'waiting_on_human',
      updatedAt: '2026-06-10T10:00:00.000Z',
      pendingHumanGates: [{ id: 'external-osc-gate-id', required: true, status: 'pending' }],
    }), 'utf8');
    symlinkSync(outsideOsc, join(root, '.osc'), 'dir');

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summary.active_plan).toBeNull();
    expect(summary.work_done.evidence).toEqual([]);
    expect(summary.latest_run).toBeNull();
    expect(summaryJson).not.toContain('external-osc-secret');
    expect(summaryJson).not.toContain('external-osc-release-secret');
    expect(summaryJson).not.toContain('external-osc-run-id');
    expect(summaryJson).not.toContain('external-osc-lesson-secret');
    expect(packet).not.toContain('external-osc-secret');
    expect(packet).not.toContain('external-osc-release-secret');
    expect(packet).not.toContain('external-osc-run-id');
    expect(packet).not.toContain('external-osc-lesson-secret');
  });

  it('ignores a symlinked plans root before scanning plan stages', () => {
    const root = tempRepo();
    writeMission(root);
    const outsidePlans = join(tempRepo(), 'plans');
    const outsideActive = join(outsidePlans, 'active');
    mkdirSync(outsideActive, { recursive: true });
    writeFileSync(join(outsideActive, '001-external-root-plan.md'), [
      '# Plan: external-root-plan',
      '',
      '## Status',
      '',
      'active',
      '',
      '## Context',
      '',
      'External context.',
      '',
      '## Goal',
      '',
      'Leak external root plan text external-root-secret.',
      '',
      '## Constraints / Out of scope',
      '',
      '- None.',
      '',
      '## Files to touch',
      '',
      '- `src/x.ts` — x.',
      '',
      '## Acceptance criteria',
      '',
      '- [ ] External root criterion external-root-secret.',
      '',
      '## Verification steps',
      '',
      '1. Run `npm test`.',
      '',
      '## Open questions',
      '',
      '- None.',
      '',
    ].join('\n'), 'utf8');
    mkdirSync(join(root, '.osc'), { recursive: true });
    symlinkSync(outsidePlans, join(root, '.osc', 'plans'), 'dir');

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summary.active_plan).toBeNull();
    expect(summaryJson).not.toContain('external-root-secret');
    expect(packet).not.toContain('external-root-secret');
  });

  it('orders final-slice resume actions as evidence before verify before close', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-complete', [
      '# Plan: 001-complete',
      '',
      '## Status',
      '',
      'active',
      '',
      '## Context',
      '',
      'Test.',
      '',
      '## Goal',
      '',
      'Complete the slice.',
      '',
      '## Constraints / Out of scope',
      '',
      '- None.',
      '',
      '## Files to touch',
      '',
      '- `src/x.ts` — x.',
      '',
      '## Acceptance criteria',
      '',
      '- [x] First criterion done.',
      '- [x] Second criterion done.',
      '',
      '## Verification steps',
      '',
      '1. Run `npm test`.',
      '',
      '## Open questions',
      '',
      '- None.',
      '',
    ].join('\n'));

    const { summary } = compileResume(root);

    expect(summary.next_bounded_action).toContain('record and fill evidence, verify it, and close');
    expect(summary.next_commands).toEqual([
      'osc evidence new 001-complete',
      'osc verify',
      'osc close 001-complete --message "<what shipped>"',
    ]);
  });

  it.each<[string, string[], string]>([
    ['same-day', ['2026-10-08-001-complete.md'], '.osc/releases/2026-10-08-001-complete.md'],
    ['previous-day', ['2020-01-01-001-complete.md'], '.osc/releases/2020-01-01-001-complete.md'],
    ['multiple notes', ['2026-10-08-001-complete.md', '2020-01-01-001-complete.md'], '.osc/releases/2026-10-08-001-complete.md'],
  ])('reviews safely visible %s completed-plan evidence without writing it', (_label, filenames, selected) => {
    const root = tempRepo();
    writeMission(root);
    writeCompletedPlan(root, '001-complete');
    const paths = filenames.map((name) => writeEvidence(root, name));
    const before = paths.map((path) => readFileSync(join(root, path), 'utf8'));
    const result = compileResume(root, { planSlug: '001-complete' });

    expect(result.summary.next_bounded_action).toContain(`inspect and update existing evidence ${selected}`);
    expect(result.summary.next_bounded_action).toContain('existence is not verification or approval');
    expect(result.summary.next_commands).toEqual([
      'osc trace 001-complete', 'osc verify', 'osc close 001-complete --message "<what shipped>"',
    ]);
    expect(paths.map((path) => readFileSync(join(root, path), 'utf8'))).toEqual(before);
    expect(result.packet).not.toContain('Untrusted note:');
    expect(result.summary.boundary).toEqual({ read_only: true, resume_packet_is_not_approval: true, human_owns_merge_publish_release: true });
  });

  it.each([
    [], ['2026-10-08-001-complete-extra.md'], ['2026-10-08-001-complete-amendment-1.md'],
    ['prefix-2026-10-08-001-complete.md'], ['2026-10-08-001-complete.md.bak'],
    ['2026-1-08-001-complete.md'], ['001-complete.md'], ['2026-10-08-001-complete-other.md'],
  ].map((filenames) => [filenames]))('retains creation when only unrelated or noncanonical evidence exists: %j', (filenames) => {
    const root = tempRepo();
    writeMission(root);
    writeCompletedPlan(root, '001-complete');
    for (const name of filenames) writeEvidence(root, name);
    const { summary } = compileResume(root, { planSlug: '001-complete' });
    expect(summary.next_commands).toEqual([
      'osc evidence new 001-complete', 'osc verify', 'osc close 001-complete --message "<what shipped>"',
    ]);
  });

  it('matches the exact requested raw plan slug before display redaction', () => {
    const root = tempRepo();
    writeMission(root);
    writeCompletedPlan(root, '001.complete');
    writeCompletedPlan(root, '002-other');
    writeEvidence(root, '2026-10-08-001Xcomplete.md');
    writeEvidence(root, '2026-10-08-002-other.md');
    expect(compileResume(root, { planSlug: '001.complete' }).summary.next_commands[0]).toBe('osc evidence new 001.complete');
    const selected = writeEvidence(root, '2020-01-01-001.complete.md');
    expect(compileResume(root, { planSlug: '001.complete' }).summary.next_bounded_action).toContain(selected);
    expect(compileResume(root).summary.next_commands[0]).toBe('osc trace 002-other');

    const secretSlug = '003-sk-abcdefghijklmnopqrstuvwxyz012345';
    writeCompletedPlan(root, secretSlug);
    writeEvidence(root, `2026-10-08-${secretSlug}.md`);
    const redacted = compileResume(root, { planSlug: secretSlug });
    expect(redacted.summary.next_commands[0]).toContain('trace');
    expect(JSON.stringify(redacted)).not.toContain('abcdefghijklmnopqrstuvwxyz012345');
    expect(redacted.summary.next_bounded_action).toContain('sk-[redacted]');
  });

  it('ignores an unrelated note body and a different raw slug with the same redacted display', () => {
    const root = tempRepo();
    writeMission(root);
    writeCompletedPlan(root, '001-complete');
    const unrelated = writeEvidence(root, '2026-10-08-unrelated.md');
    writeFileSync(join(root, unrelated), 'Plan: .osc/plans/active/001-complete.md\napproval.status: approved\nAll checks passed.\n');
    expect(compileResume(root, { planSlug: '001-complete' }).summary.next_commands[0]).toBe('osc evidence new 001-complete');
    const selected = '002-sk-abcdefghijklmnopqrstuvwxyz012345';
    const alias = '002-sk-zyxwvutsrqponmlkjihgfedcba012345';
    writeCompletedPlan(root, selected);
    writeCompletedPlan(root, alias);
    writeEvidence(root, `2026-10-08-${alias}.md`);
    const result = compileResume(root, { planSlug: selected });
    expect(result.summary.next_commands[0]).toBe('osc evidence new 002-sk-[redacted]');
    expect(result.summary.next_bounded_action).toContain('record and fill evidence');
  });

  it.each(['leaf-symlink', 'leaf-directory', 'releases-symlink', 'releases-file'])('excludes unsafe %s evidence from the completed branch', (kind) => {
    const root = tempRepo();
    writeMission(root);
    writeCompletedPlan(root, '001-complete');
    const releases = join(root, '.osc', 'releases');
    const outside = tempRepo();
    const external = join(outside, '2026-10-08-001-complete.md');
    writeFileSync(external, 'EXTERNAL SECRET NOTE');
    if (kind === 'releases-symlink') symlinkSync(outside, releases, 'dir');
    else if (kind === 'releases-file') writeFileSync(releases, 'not a directory');
    else {
      mkdirSync(releases);
      if (kind === 'leaf-symlink') symlinkSync(external, join(releases, '2026-10-08-001-complete.md'));
      else mkdirSync(join(releases, '2026-10-08-001-complete.md'));
    }
    const result = compileResume(root, { planSlug: '001-complete' });
    expect(result.summary.next_commands[0]).toBe('osc evidence new 001-complete');
    expect(result.summary.work_done.evidence).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('EXTERNAL SECRET NOTE');
    expect(readFileSync(external, 'utf8')).toBe('EXTERNAL SECRET NOTE');
  });

  it.each(['osc', 'npm run osc --', 'npx open-scaffold@0.35.0'])('preserves %s commands and packet budgets with existing evidence', (commandPrefix) => {
    const root = tempRepo();
    writeMission(root);
    writeCompletedPlan(root, '001-complete');
    const evidence = writeEvidence(root, '2026-10-08-001-complete.md');
    const planPath = join(root, '.osc', 'plans', 'active', '001-complete.md');
    const before = [readFileSync(planPath, 'utf8'), readFileSync(join(root, evidence), 'utf8')];
    for (const maxChars of [600, 601, 900, 4000, 20000]) {
      const result = compileResume(root, { planSlug: '001-complete', commandPrefix, maxChars });
      expectNavigation(result, maxChars);
      expect(result.summary.next_commands).toEqual([
        `${commandPrefix} trace 001-complete`, `${commandPrefix} verify`, `${commandPrefix} close 001-complete --message "<what shipped>"`,
      ]);
    }
    expect([readFileSync(planPath, 'utf8'), readFileSync(join(root, evidence), 'utf8')]).toEqual(before);
  });

  it('keeps unchecked, pending-gate, and failed/blocked actions ahead of existing evidence', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-complete');
    writeEvidence(root, '2026-10-08-001-complete.md');
    expect(compileResume(root).summary.next_commands[0]).toBe('osc plan validate 001-complete --strict');
    writeCompletedPlan(root, '001-complete');
    const run = createRecordedRun(root, '001-complete');
    writeRunStatus(run, 'waiting_on_human', '2026-06-10T10:00:00.000Z', 'owner-answer');
    expect(compileResume(root).summary.next_commands).toEqual(['osc trace 001-complete', 'osc evidence new 001-complete']);
    for (const state of ['failed', 'blocked']) {
      writeRunStatus(run, state, '2026-06-10T11:00:00.000Z');
      expect(compileResume(root).summary.next_commands).toEqual(['osc trace 001-complete', 'osc run .osc/plans/active/001-complete.md --dry-run']);
    }
  });

  it('executes first-run completed handoff guidance through the same pinned source CLI runner', () => {
    if (process.platform === 'win32') return;
    const root = tempRepo();
    const runnerDir = join(root, 'runner');
    mkdirSync(runnerDir);
    const runner = join(runnerDir, 'osc');
    writeFileSync(runner, '#!/bin/sh\nexec "$OSC_TEST_NODE" --import "$OSC_TEST_LOADER" "$OSC_TEST_CLI" "$@"\n');
    chmodSync(runner, 0o755);
    const env = {
      ...process.env, PATH: `${runnerDir}:${process.env.PATH ?? ''}`, npm_command: '', npm_lifecycle_event: '',
      OSC_TEST_NODE: process.execPath, OSC_TEST_LOADER: join(repoRoot, 'node_modules/tsx/dist/loader.mjs'), OSC_TEST_CLI: join(repoRoot, 'src/cli.ts'),
    };
    const cli = (args: string[]) => spawnSync('osc', args, { cwd: root, env, encoding: 'utf8' });
    const first = cli(['first-run', '--non-interactive', '--slug', 'note-contract', '--mission', 'Keep a two-file work record.', '--goal', 'Create status.txt and detail.txt with exact content.']);
    expect(first.status, first.stderr).toBe(0);
    const evidence = first.stdout.match(/\.osc\/releases\/\d{4}-\d{2}-\d{2}-note-contract\.md/)?.[0];
    expect(evidence).toBeDefined();
    const planPath = join(root, '.osc', 'plans', 'active', 'note-contract.md');
    const generated = readFileSync(planPath, 'utf8');
    writeFileSync(planPath, generated.replace(/## Acceptance criteria\n[\s\S]*?(?=## Verification steps)/, [
      '## Acceptance criteria', '', '- [ ] status.txt contains READY and a newline.', '- [ ] detail.txt contains NEXT and a newline.', '', '',
    ].join('\n')));
    writeFileSync(join(root, 'status.txt'), 'READY\n');
    writeFileSync(join(root, 'detail.txt'), 'NEXT\n');
    const check = spawnSync(process.execPath, ['-e', 'const fs = require("node:fs"); if (fs.readFileSync("status.txt", "utf8") !== "READY\\n" || fs.readFileSync("detail.txt", "utf8") !== "NEXT\\n") process.exit(1);'], { cwd: root, encoding: 'utf8' });
    expect(check.status, check.stderr).toBe(0);
    writeFileSync(planPath, readFileSync(planPath, 'utf8').replace(/- \[ \] (status\.txt|detail\.txt)([^\n]*)/g, `- [x] $1$2 | Evidence: ${evidence}`));
    writeFileSync(join(root, evidence!), '# Evidence: note-contract\n\nBoth exact-content checks passed, exit 0. This private fixture grants no approval or correctness certification.\n');
    const before = [readFileSync(planPath, 'utf8'), readFileSync(join(root, evidence!), 'utf8')];
    const handoff = cli(['handoff', '--plan', 'note-contract', '--json']);
    expect(handoff.status, handoff.stderr).toBe(0);
    const summary = JSON.parse(handoff.stdout);
    const suggested = summary.next_commands[0].split(' ');
    expect(suggested.shift()).toBe('osc');
    const executed = cli(suggested);
    expect(executed.status, executed.stderr).toBe(0);
    expect(summary.next_commands[0]).toBe('osc trace note-contract');
    expect(summary.next_bounded_action).toContain(evidence);
    expect(executed.stdout).toContain(evidence!.replace('.osc/releases/', ''));
    expect([readFileSync(planPath, 'utf8'), readFileSync(join(root, evidence!), 'utf8')]).toEqual(before);
    // The private osc wrapper pins this checkout; this does not test an npm-installed binary.
  });

  it('reports a missing scaffold with the first-run bootstrap action', () => {
    const root = tempRepo();
    const { summary, packet } = compileResume(root);

    expect(summary.status).toBe('no scaffold detected');
    expect(summary.next_bounded_action).toContain('first-run');
    expect(packet).toContain('npx open-scaffold@latest first-run');
  });

  it('blocks on an undefined mission before plan work', () => {
    const root = tempRepo();
    writeMission(root, false);
    writePlan(root, '001-early');

    const { summary } = compileResume(root);

    expect(summary.mission.defined).toBe(false);
    expect(summary.status).toBe('mission undefined');
    expect(summary.next_bounded_action).toContain('mission');
  });

  it('points at backlog promotion when no plan is active', () => {
    const root = tempRepo();
    writeMission(root);
    const backlog = join(root, '.osc', 'plans', 'backlog');
    mkdirSync(backlog, { recursive: true });
    writeFileSync(join(backlog, '010-later.md'), '# Plan: 010-later\n\n## Status\n\nbacklog\n', 'utf8');
    mkdirSync(join(root, '.osc', 'plans', 'active'), { recursive: true });

    const { summary } = compileResume(root);

    expect(summary.active_plan).toBeNull();
    expect(summary.status).toBe('no active plan; 1 backlog plan(s)');
    expect(summary.next_commands).toContain('osc plan move <slug> --to active');
  });



  it('skips symlinked accepted-lessons directories during resume', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-lesson-dir-symlink');
    const outsideLessons = join(tempRepo(), 'external-lessons');
    mkdirSync(outsideLessons, { recursive: true });
    writeFileSync(join(outsideLessons, 'external-lesson-secret.md'), '# External lesson\n', 'utf8');
    mkdirSync(join(root, '.osc', 'improvements'), { recursive: true });
    symlinkSync(outsideLessons, join(root, '.osc', 'improvements', 'applied'), 'dir');

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summary.lessons).toEqual({ count: 0, slugs: [] });
    expect(summaryJson).not.toContain('external-lesson-secret');
    expect(packet).not.toContain('external-lesson-secret');
  });


  it('skips symlinked accepted-lessons directories even when the target is inside the repo', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-inrepo-lesson-dir-symlink');
    const docsDir = join(root, 'docs');
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'external-inrepo-lesson-secret.md'), '# Internal docs are not accepted lessons\n', 'utf8');
    mkdirSync(join(root, '.osc', 'improvements'), { recursive: true });
    symlinkSync(docsDir, join(root, '.osc', 'improvements', 'applied'), 'dir');

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summary.lessons).toEqual({ count: 0, slugs: [] });
    expect(summaryJson).not.toContain('external-inrepo-lesson-secret');
    expect(packet).not.toContain('external-inrepo-lesson-secret');
  });

  it('skips symlinked accepted-lesson files during resume', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-lesson-file-symlink');
    const outsideLesson = join(tempRepo(), 'external-lesson-secret.md');
    writeFileSync(outsideLesson, '# External lesson\n', 'utf8');
    const applied = join(root, '.osc', 'improvements', 'applied');
    mkdirSync(applied, { recursive: true });
    symlinkSync(outsideLesson, join(applied, 'external-lesson-secret.md'));

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summary.lessons).toEqual({ count: 0, slugs: [] });
    expect(summaryJson).not.toContain('external-lesson-secret');
    expect(packet).not.toContain('external-lesson-secret');
  });

  it('ignores a symlinked releases directory before listing evidence paths', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-evidence-symlink');
    const outsideReleases = join(tempRepo(), 'external-releases');
    mkdirSync(outsideReleases, { recursive: true });
    writeFileSync(join(outsideReleases, 'external-release-secret.md'), '# External evidence\n', 'utf8');
    mkdirSync(join(root, '.osc'), { recursive: true });
    symlinkSync(outsideReleases, join(root, '.osc', 'releases'), 'dir');

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summary.work_done.evidence).toEqual([]);
    expect(summaryJson).not.toContain('external-release-secret');
    expect(packet).not.toContain('external-release-secret');
  });

  it('prioritizes pending human gates from the latest run', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-gated');
    const runDir = join(root, '.osc', 'runs', 'harness-work-demo-1');
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, 'status.json'), JSON.stringify({
      schema: 'osc.harness-status.v1',
      runId: 'harness-work-demo-1',
      command: 'work',
      state: 'waiting_on_human',
      updatedAt: '2026-06-10T10:00:00.000Z',
      pendingHumanGates: [{ id: 'missing-required-context', required: true, status: 'pending' }],
    }), 'utf8');

    const { summary, packet } = compileResume(root);

    expect(summary.latest_run?.run_id).toBe('harness-work-demo-1');
    expect(summary.latest_run?.pending_gates).toBe(1);
    expect(summary.next_bounded_action).toContain('missing-required-context');
    expect(packet).toContain('Record the answer for gate missing-required-context in evidence or the external coordinator');
  });

  it.each(['blocked', 'waiting_on_human', 'completed'])('does not route plan A through a newer %s run for plan B', (state) => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '002-task-a');
    writePlan(root, '001-task-b');
    const runA = createRecordedRun(root, '002-task-a');
    const runB = createRecordedRun(root, '001-task-b');
    writeRunStatus(runA, 'running', '2026-06-10T10:00:00.000Z');
    writeRunStatus(runB, state, '2026-06-10T11:00:00.000Z', state === 'waiting_on_human' ? 'task-b-approval' : undefined);
    writeRunFeedback(runB, 'Repair task B, not task A.');

    for (const options of [{ planSlug: '002-task-a' }, {}]) {
      const { summary, packet } = compileResume(root, options);
      expect(summary.active_plan?.slug).toBe('002-task-a');
      expect(summary.latest_run).toMatchObject({ run_id: runA.runId, state: 'running', pending_gates: 0 });
      expect(summary.repair_hypothesis).toBeNull();
      expect(summary.next_bounded_action).toBe('Second criterion open.');
      expect(packet).not.toContain(runB.runId);
      expect(packet).not.toContain('task-b-approval');
      expect(packet).not.toContain('Repair task B');
      expect(summary.next_commands).toContain('osc plan validate 002-task-a --strict');
    }
  });

  it('keeps each task\'s repair hypothesis and gate attached to its genuine run packet', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-repair-a');
    writePlan(root, '002-gated-b');
    const olderA = createRecordedRun(root, '001-repair-a');
    const runA = createRecordedRun(root, '001-repair-a');
    const runB = createRecordedRun(root, '002-gated-b');
    writeRunStatus(olderA, 'completed', '2026-06-10T09:00:00.000Z');
    writeRunStatus(runA, 'blocked', '2026-06-10T10:00:00.000Z');
    writeRunFeedback(runA, 'Restore task A\'s missing fixture before retrying.');
    writeRunStatus(runB, 'waiting_on_human', '2026-06-10T11:00:00.000Z', 'approve-task-b');

    const taskA = compileResume(root, { planSlug: '001-repair-a' });
    expect(taskA.summary.latest_run?.run_id).toBe(runA.runId);
    expect(taskA.summary.repair_hypothesis).toBe('Restore task A\'s missing fixture before retrying.');
    expect(taskA.summary.next_bounded_action).toContain('Restore task A');
    expect(taskA.summary.next_commands).toEqual([
      'osc trace 001-repair-a',
      'osc run .osc/plans/active/001-repair-a.md --dry-run',
    ]);
    expect(taskA.packet).not.toContain('approve-task-b');

    const taskB = compileResume(root, { planSlug: '002-gated-b' });
    expect(taskB.summary.latest_run?.run_id).toBe(runB.runId);
    expect(taskB.summary.repair_hypothesis).toBeNull();
    expect(taskB.summary.next_bounded_action).toContain('approve-task-b');
    expect(taskB.summary.next_commands).toEqual(['osc trace 002-gated-b', 'osc evidence new 002-gated-b']);
    expect(taskB.packet).not.toContain('Restore task A');
  });

  it('uses plan criteria when only another plan has run state, even with a newer legacy status', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '002-without-run');
    writePlan(root, '001-unrelated');
    const unrelated = createRecordedRun(root, '001-unrelated');
    writeRunStatus(unrelated, 'blocked', '2026-06-10T10:00:00.000Z');
    const legacyDir = join(root, '.osc', 'runs', 'legacy-unbound');
    mkdirSync(legacyDir, { recursive: true });
    writeRunStatus({ runDir: legacyDir, runId: 'legacy-unbound' }, 'waiting_on_human', '2026-06-10T11:00:00.000Z', 'unbound-gate');

    for (const options of [{ planSlug: '002-without-run' }, {}]) {
      const { summary, packet } = compileResume(root, options);
      expect(summary.latest_run).toBeNull();
      expect(summary.next_bounded_action).toBe('Second criterion open.');
      expect(packet).not.toContain(unrelated.runId);
      expect(packet).not.toContain('unbound-gate');
    }

    mkdirSync(join(root, '.osc', 'plans', 'done'), { recursive: true });
    renameSync(join(root, '.osc', 'plans', 'active', '001-unrelated.md'), join(root, '.osc', 'plans', 'done', '001-unrelated.md'));
    expect(compileResume(root).summary.latest_run).toBeNull();
  });

  it('keeps legacy status-only runs only for an implicit single-plan handoff', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-legacy');
    const runDir = join(root, '.osc', 'runs', 'legacy-run');
    mkdirSync(runDir, { recursive: true });
    writeRunStatus({ runDir, runId: 'legacy-run' }, 'waiting_on_human', '2026-06-10T10:00:00.000Z', 'legacy-gate');

    expect(compileResume(root).summary.next_bounded_action).toContain('legacy-gate');
    expect(compileResume(root, { planSlug: '001-legacy' }).summary.latest_run).toBeNull();
    writePlan(root, '002-another-task');
    expect(compileResume(root).summary.latest_run).toBeNull();
  });

  it('does not revive a finished plan through leftover run state when no plan is active', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-finished');
    const run = createRecordedRun(root, '001-finished');
    writeRunStatus(run, 'blocked', '2026-06-10T10:00:00.000Z');
    writeRunFeedback(run, 'Retry the finished task.');
    mkdirSync(join(root, '.osc', 'plans', 'done'), { recursive: true });
    renameSync(join(root, '.osc', 'plans', 'active', '001-finished.md'), join(root, '.osc', 'plans', 'done', '001-finished.md'));

    const { summary } = compileResume(root);
    expect(summary.active_plan).toBeNull();
    expect(summary.latest_run).toBeNull();
    expect(summary.repair_hypothesis).toBeNull();
    expect(summary.next_bounded_action).toBe('No active plan. Create the next bounded slice.');
  });

  it.each(['plan-path', 'status-run', 'packet-run', 'task-id', 'malformed-packet'])('rejects a %s conflict without falling back to unbound status', (conflict) => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-bound');
    const run = createRecordedRun(root, '001-bound');
    writeRunStatus(run, 'blocked', '2026-06-10T10:00:00.000Z');
    writeRunFeedback(run, 'This conflicting record must not authorize a retry.');
    const packet = JSON.parse(readFileSync(run.manifestPath, 'utf8'));
    const statusPath = join(run.runDir, 'status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf8'));
    if (conflict === 'plan-path') packet.plan.path = '.osc/plans/active/002-other.md';
    if (conflict === 'packet-run') packet.runId = 'another-run';
    if (conflict === 'status-run') status.runId = 'another-run';
    if (conflict === 'task-id') status.taskId = 'another-task';
    writeFileSync(run.manifestPath, conflict === 'malformed-packet' ? '{' : JSON.stringify(packet), 'utf8');
    writeFileSync(statusPath, JSON.stringify(status), 'utf8');

    for (const options of [{ planSlug: '001-bound' }, {}]) {
      const { summary, packet: handoff } = compileResume(root, options);
      expect(summary.latest_run).toBeNull();
      expect(summary.repair_hypothesis).toBeNull();
      expect(summary.next_bounded_action).toBe('Second criterion open.');
      expect(handoff).not.toContain('This conflicting record');
    }
  });

  it('accepts a plan packet made before a stage move and a path-only plan identity', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-promoted');
    const run = createRecordedRun(root, '001-promoted');
    writeRunStatus(run, 'running', '2026-06-10T10:00:00.000Z');
    const packet = JSON.parse(readFileSync(run.manifestPath, 'utf8'));
    delete packet.plan.slug;
    packet.plan.path = '.osc/plans/backlog/001-promoted.md';
    writeFileSync(run.manifestPath, JSON.stringify(packet), 'utf8');

    expect(compileResume(root, { planSlug: '001-promoted' }).summary.latest_run?.run_id).toBe(run.runId);
  });

  it('does not read another task\'s feedback when both local files claim its run ID', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-task-a');
    writePlan(root, '002-task-b');
    const runA = createRecordedRun(root, '001-task-a');
    const runB = createRecordedRun(root, '002-task-b');
    writeRunStatus(runA, 'blocked', '2026-06-10T11:00:00.000Z');
    writeRunFeedback(runB, 'Task B\'s private repair instruction.');
    const packet = JSON.parse(readFileSync(runA.manifestPath, 'utf8'));
    packet.runId = runB.runId;
    writeFileSync(runA.manifestPath, JSON.stringify(packet), 'utf8');
    const statusPath = join(runA.runDir, 'status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf8'));
    status.runId = runB.runId;
    writeFileSync(statusPath, JSON.stringify(status), 'utf8');

    const { summary, packet: handoff } = compileResume(root, { planSlug: '001-task-a' });
    expect(summary.latest_run).toBeNull();
    expect(summary.repair_hypothesis).toBeNull();
    expect(summary.next_bounded_action).toBe('Second criterion open.');
    expect(handoff).not.toContain('Task B\'s private repair');
  });

  it('rejects a symlinked run packet before using its otherwise local status', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-packet-symlink');
    const runDir = join(root, '.osc', 'runs', 'symlink-packet-run');
    mkdirSync(runDir, { recursive: true });
    writeRunStatus({ runDir, runId: 'symlink-packet-run' }, 'waiting_on_human', '2026-06-10T10:00:00.000Z', 'outside-packet-gate');
    const outside = join(tempRepo(), 'run.json');
    writeFileSync(outside, JSON.stringify({ runId: 'symlink-packet-run', plan: { slug: '001-packet-symlink' } }), 'utf8');
    symlinkSync(outside, join(runDir, 'run.json'));

    for (const options of [{ planSlug: '001-packet-symlink' }, {}]) {
      const { summary, packet } = compileResume(root, options);
      expect(summary.latest_run).toBeNull();
      expect(packet).not.toContain('outside-packet-gate');
    }
  });


  it('ignores symlinked run status files instead of reading outside the repo', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-symlink-run');
    const outside = join(tempRepo(), 'external-status.json');
    writeFileSync(outside, JSON.stringify({
      schema: 'osc.harness-status.v1',
      runId: 'external-run-id',
      command: 'work',
      state: 'waiting_on_human',
      updatedAt: '2026-06-10T10:00:00.000Z',
      pendingHumanGates: [{ id: 'external-gate-id', required: true, status: 'pending' }],
    }), 'utf8');
    const runDir = join(root, '.osc', 'runs', 'harness-work-symlink');
    mkdirSync(runDir, { recursive: true });
    symlinkSync(outside, join(runDir, 'status.json'));

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summary.latest_run).toBeNull();
    expect(summaryJson).not.toContain('external-run-id');
    expect(summaryJson).not.toContain('external-gate-id');
    expect(packet).not.toContain('external-run-id');
    expect(packet).not.toContain('external-gate-id');
  });


  it('ignores symlinked run directories before reading status files', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-symlink-run-dir');
    const outsideRunDir = join(tempRepo(), 'external-run');
    mkdirSync(outsideRunDir, { recursive: true });
    writeFileSync(join(outsideRunDir, 'status.json'), JSON.stringify({
      schema: 'osc.harness-status.v1',
      runId: 'external-dir-run-id',
      command: 'work',
      state: 'waiting_on_human',
      updatedAt: '2026-06-10T10:00:00.000Z',
      pendingHumanGates: [{ id: 'external-dir-gate-id', required: true, status: 'pending' }],
    }), 'utf8');
    const runsDir = join(root, '.osc', 'runs');
    mkdirSync(runsDir, { recursive: true });
    symlinkSync(outsideRunDir, join(runsDir, 'harness-work-dir-symlink'), 'dir');

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summary.latest_run).toBeNull();
    expect(summaryJson).not.toContain('external-dir-run-id');
    expect(summaryJson).not.toContain('external-dir-gate-id');
    expect(packet).not.toContain('external-dir-run-id');
    expect(packet).not.toContain('external-dir-gate-id');
  });


  it('ignores a symlinked runs root before scanning run status files', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-symlink-runs-root');
    const outsideRunsDir = join(tempRepo(), 'external-runs');
    const outsideRunDir = join(outsideRunsDir, 'harness-work-root-symlink');
    mkdirSync(outsideRunDir, { recursive: true });
    writeFileSync(join(outsideRunDir, 'status.json'), JSON.stringify({
      schema: 'osc.harness-status.v1',
      runId: 'external-root-run-id',
      command: 'work',
      state: 'waiting_on_human',
      updatedAt: '2026-06-10T10:00:00.000Z',
      pendingHumanGates: [{ id: 'external-root-gate-id', required: true, status: 'pending' }],
    }), 'utf8');
    mkdirSync(join(root, '.osc'), { recursive: true });
    symlinkSync(outsideRunsDir, join(root, '.osc', 'runs'), 'dir');

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summary.latest_run).toBeNull();
    expect(summaryJson).not.toContain('external-root-run-id');
    expect(summaryJson).not.toContain('external-root-gate-id');
    expect(packet).not.toContain('external-root-run-id');
    expect(packet).not.toContain('external-root-gate-id');
  });

  it('redacts sensitive run and gate identifiers before emitting resume output', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-sensitive-run');
    const runId = 'harness-work-sk-abcdefghijklmnopqrstuvwxyz012345';
    const runDir = join(root, '.osc', 'runs', runId);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, 'status.json'), JSON.stringify({
      schema: 'osc.harness-status.v1',
      runId,
      command: 'work',
      state: 'waiting_on_human',
      updatedAt: '2026-06-10T10:00:00.000Z',
      pendingHumanGates: [{ id: 'gate-sk-abcdefghijklmnopqrstuvwxyz012345-/Users/someone/secrets', required: true, status: 'pending' }],
    }), 'utf8');

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summaryJson).not.toContain('sk-aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(summaryJson).not.toContain('/Users/someone');
    expect(packet).not.toContain('sk-aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(packet).not.toContain('/Users/someone');
    expect(summary.latest_run?.run_id).toContain('sk-[redacted]');
    expect(summary.latest_run?.pending_gate_ids[0]).toContain('sk-[redacted]');
    expect(summary.next_commands.join('\n')).not.toContain('/Users/someone');
    expect(summary.next_commands.join('\n')).toContain('osc trace 001-sensitive-run');
  });

  it('routes a failed run to a repair-hypothesis retry', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-failed');
    const runDir = join(root, '.osc', 'runs', 'harness-work-demo-2');
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, 'status.json'), JSON.stringify({
      schema: 'osc.harness-status.v1',
      runId: 'harness-work-demo-2',
      command: 'work',
      state: 'failed',
      updatedAt: '2026-06-10T11:00:00.000Z',
      pendingHumanGates: [],
    }), 'utf8');
    writeFileSync(join(runDir, 'feedback.jsonl'), `${JSON.stringify({
      schema: 'osc.feedback.v1',
      id: 'feedback-1',
      runId: 'harness-work-demo-2',
      recordedAt: '2026-06-10T11:01:00.000Z',
      source: 'runtime',
      verdict: 'retry',
      scope: 'runtime',
      whatHappened: 'Adapter failed closed.',
      whyItMatters: 'Run is not done.',
      repairHypothesis: 'Fix the timeout configuration before retrying.',
      evidencePaths: [],
      nextAction: 'retry',
    })}\n`, 'utf8');

    const { summary, packet } = compileResume(root);

    expect(summary.repair_hypothesis).toBe('Fix the timeout configuration before retrying.');
    expect(summary.next_bounded_action).toContain('Fix the timeout configuration');
    expect(packet).toContain('osc run .osc/plans/active/001-failed.md --dry-run');
  });

  it('selects the highest-numbered active plan and lists the others', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-old');
    writePlan(root, '002-new');

    const { summary } = compileResume(root);

    expect(summary.active_plan?.slug).toBe('002-new');
    expect(summary.other_active_plans).toEqual(['001-old']);

    const explicit = compileResume(root, { planSlug: '001-old' });
    expect(explicit.summary.active_plan?.slug).toBe('001-old');
    expect(() => compileResume(root, { planSlug: 'missing' })).toThrow(/No active plan named missing/);
  });
});
