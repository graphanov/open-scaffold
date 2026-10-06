import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compileResume } from '../src/resume.js';
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

  it('stays within the character budget and degrades gracefully', () => {
    const { packet } = compileResume(fixtureRoot, { maxChars: 600 });

    expect(packet.length).toBeLessThanOrEqual(600);
    expect(packet).toContain('# Resume Packet');
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

    expect(packet.length).toBeLessThanOrEqual(600);
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

  it('rejects out-of-range budgets', () => {
    expect(() => compileResume(fixtureRoot, { maxChars: 10 })).toThrow(/maxChars/);
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
