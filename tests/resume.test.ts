import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compileResume } from '../src/resume.js';

const repoRoot = resolve(import.meta.dirname, '..');
const fixtureRoot = join(repoRoot, 'examples', 'resume-demo');

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

  it('stays within the character budget and degrades gracefully', () => {
    const { packet } = compileResume(fixtureRoot, { maxChars: 600 });

    expect(packet.length).toBeLessThanOrEqual(600);
    expect(packet).toContain('# Resume Packet');
  });

  it('rejects out-of-range budgets', () => {
    expect(() => compileResume(fixtureRoot, { maxChars: 10 })).toThrow(/maxChars/);
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
      'Use token sk-abcdefghijklmnopqrstuvwxyz012345 from /Users/someone/secrets.txt to call the API.',
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
      '- [ ] Confirm sk-proj-abcdefghijklmnopqrstuvwxyz012345 never appears in logs under /Users/someone/secrets.txt.',
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

    expect(packet).not.toContain('sk-proj-abcdefghijklmnopqrstuvwxyz012345');
    expect(packet).not.toContain('/Users/someone');
    expect(packet).toContain('sk-[redacted]');
    expect(packet).toContain('local-path');
    expect(summaryJson).not.toContain('sk-proj-abcdefghijklmnopqrstuvwxyz012345');
    expect(summaryJson).not.toContain('/Users/someone');
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

    expect(summaryJson).not.toContain('sk-abcdefghijklmnopqrstuvwxyz012345');
    expect(packet).not.toContain('sk-abcdefghijklmnopqrstuvwxyz012345');
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
    expect(packet).toContain('osc harness answer harness-work-demo-1 --gate missing-required-context');
  });

  it('redacts sensitive run and gate identifiers before emitting resume output', () => {
    const root = tempRepo();
    writeMission(root);
    writePlan(root, '001-sensitive-run');
    const runDir = join(root, '.osc', 'runs', 'harness-work-sensitive');
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, 'status.json'), JSON.stringify({
      schema: 'osc.harness-status.v1',
      runId: 'harness-work-sk-abcdefghijklmnopqrstuvwxyz012345-/Users/someone/secrets',
      command: 'work',
      state: 'waiting_on_human',
      updatedAt: '2026-06-10T10:00:00.000Z',
      pendingHumanGates: [{ id: 'gate-sk-abcdefghijklmnopqrstuvwxyz012345-/Users/someone/secrets', required: true, status: 'pending' }],
    }), 'utf8');

    const { summary, packet } = compileResume(root);
    const summaryJson = JSON.stringify(summary);

    expect(summaryJson).not.toContain('sk-abcdefghijklmnopqrstuvwxyz012345');
    expect(summaryJson).not.toContain('/Users/someone');
    expect(packet).not.toContain('sk-abcdefghijklmnopqrstuvwxyz012345');
    expect(packet).not.toContain('/Users/someone');
    expect(summary.latest_run?.run_id).toContain('sk-[redacted]');
    expect(summary.latest_run?.pending_gate_ids[0]).toContain('sk-[redacted]');
    expect(summary.next_commands.join('\n')).toContain('sk-[redacted]');
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
    expect(packet).toContain('--retry-of harness-work-demo-2');
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
