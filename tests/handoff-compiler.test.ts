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

  it('reports missing required sections instead of treating vague handoffs as valid', () => {
    const validation = validateHandoffPacket('# Resume\n\nContinue from before.\n', { maxChars: 1600 });

    expect(validation.status).toBe('fail');
    expect(validation.missingSections).toContain('State');
    expect(validation.missingSections).toContain('Next Actions');
  });
});
