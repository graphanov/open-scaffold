import { describe, expect, it } from 'vitest';
import { compileHandoffPacket, validateHandoffPacket } from '../src/handoff.js';

describe('handoff compiler', () => {
  it('enforces required sections and a character budget for compact continuation packets', () => {
    const compiled = compileHandoffPacket({
      state: 'Prior work attempted the harness router and docs, but verification evidence is incomplete. '.repeat(12),
      decisions: [
        'Use four commands only: $interview, $plan, $work, $team.',
        'Keep evidence refs instead of raw logs.',
      ],
      blockers: ['Exact live Codex reproduction is not available in this smoke.'],
      evidenceRefs: ['.osc/runs/run-1/status.json', '.osc/bench/simulated-runtime-smoke/aggregate.json'],
      nextActions: ['Run verification.', 'Fix any proof overclaim wording.'],
      maxChars: 900,
      reason: 'test budget',
    });

    expect(compiled.schema).toBe('osc.handoff-compiler.v1');
    expect(compiled.content.length).toBeLessThanOrEqual(900);
    for (const section of ['State', 'Decisions', 'Blockers / Open Questions', 'Evidence refs', 'Next Actions']) {
      expect(compiled.content).toContain(section);
    }
    expect(compiled.validation.status).toBe('pass');
  });

  it('redacts local paths and token-like secrets from compact packets', () => {
    const token = ['sk', 'abcdefghijklmnopqrstuvwxyz1234567890'].join('-');
    const compiled = compileHandoffPacket({
      state: `The worker inspected /Users/danimal/private/project and saw token ${token}.`,
      decisions: ['Keep /private/tmp/raw-log.txt out of the handoff.'],
      evidenceRefs: ['.osc/runs/run-1/status.json'],
      nextActions: ['Continue without leaking local files.'],
      maxChars: 900,
    });

    expect(compiled.content).not.toContain('/Users/danimal');
    expect(compiled.content).not.toContain('/private/tmp/raw-log.txt');
    expect(compiled.content).not.toContain(token);
    expect(compiled.content).toMatch(/local-path omitted|secret omitted/);
    expect(compiled.validation.status).toBe('pass');
  });

  it('reports missing required sections instead of treating vague handoffs as valid', () => {
    const validation = validateHandoffPacket('# Resume\n\nContinue from before.\n', { maxChars: 1600 });

    expect(validation.status).toBe('fail');
    expect(validation.missingSections).toContain('State');
    expect(validation.missingSections).toContain('Next Actions');
  });
});
