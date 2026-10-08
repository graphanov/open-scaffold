import { describe, expect, it } from 'vitest';
import { compileHandoffPacket, validateHandoffPacket } from '../src/handoff.js';

const sections = ['State', 'Decisions', 'Blockers / Open Questions', 'Evidence refs', 'Next Actions'];
const reducedInput = {
  state: 'The implementation is ready for review, with verification still pending. The implementation is ready for review, with verification still pe',
  blockers: [
    'The downstream integration needs a reviewed packet that retains section names before it can route each summary to the appropriate reader. The downstream integration needs a reviewed packet that retains section names before it can route each summary to the appr',
    'Verification is pending because the integration fixture must finish before the team can assess all acceptance criteria and report completion. Verification is pending because the integration fixture must finish before the team can assess all acceptance criteria',
  ],
  maxChars: 900,
};
const largeInput = {
  state: 'The implementation is ready for review, with verification still pending. '.repeat(8),
  decisions: [
    'Keep the existing public interface and validate behavior before making compatibility claims. '.repeat(3),
    'Record durable evidence references so the downstream reader can verify each stated result. '.repeat(3),
  ],
  blockers: [
    'The downstream integration needs a reviewed packet that retains section names before it can route each summary to the appropriate reader. '.repeat(3),
    'Verification is pending because the integration fixture must finish before the team can assess all acceptance criteria and report completion. '.repeat(3),
  ],
  evidenceRefs: [
    'docs/integration/handoff-packet-contract-and-required-section-routing-for-downstream-reviewers.md',
    'tests/integration/handoff-reader-required-section-preservation-and-bounded-summary-validation.test.ts',
  ],
  nextActions: ['Run the integration verification and retain the output reference.', 'Review the packet before recording completion.'],
};

function expectCompletePacket(input: Parameters<typeof compileHandoffPacket>[0]) {
  const compiled = compileHandoffPacket(input);
  expect(compiled.content.length).toBeLessThanOrEqual(compiled.budget.maxChars);
  expect(compiled.content.split('\n').filter((line) => line.startsWith('## '))).toEqual(sections.map((section) => `## ${section}`));
  expect(compiled.content).toMatch(/\nCompiler reason: .*\n$/);
  expect(compiled.validation).toEqual({
    status: 'pass', missingSections: [], length: compiled.content.length, maxChars: compiled.budget.maxChars, overBudget: false,
  });
  return compiled;
}

describe('handoff compiler', () => {
  it('enforces required sections and a character budget for compact continuation packets', () => {
    const compiled = compileHandoffPacket({
      state: 'Prior work attempted the retired command router and docs, but verification evidence is incomplete. '.repeat(12),
      decisions: [
        'Use handoff/review/gate over recorded facts.',
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

  it('preserves complete sections for the exact reduced S03 input at 900 characters', () => {
    expect(reducedInput.state.length).toBe(139);
    expect(reducedInput.blockers.map((blocker) => blocker.length)).toEqual([260, 260]);
    const compiled = expectCompletePacket(reducedInput);
    expect(compiled.schema).toBe('osc.handoff-compiler.v1');
    expect(compiled.boundary).toEqual({ compact_handoff_only: true, not_raw_log_dump: true, not_approval: true });
  });

  it('preserves complete sections for the initial large S03 input and adjacent budgets', () => {
    for (const maxChars of [899, 900, 901]) {
      const compiled = expectCompletePacket({ ...largeInput, maxChars });
      for (const summary of ['The implementation', 'Keep the existing', 'The downstream integration', 'docs/integration/', 'Run the integration']) {
        expect(compiled.content).toContain(summary);
      }
    }
    for (const field of ['state', 'blocker-one', 'blocker-two']) {
      const input = { ...reducedInput, blockers: [...reducedInput.blockers] };
      if (field === 'state') input.state = input.state.slice(0, -1);
      else input.blockers[field === 'blocker-one' ? 0 : 1] = input.blockers[field === 'blocker-one' ? 0 : 1].slice(0, -1);
      expectCompletePacket(input);
    }
  });

  it('keeps ordinary output and the default 1600-character budget', () => {
    const compiled = expectCompletePacket({ state: 'Ready.' });
    expect(compiled.budget).toEqual({ maxChars: 1600, length: 349 });
    expect(compiled.content).toBe([
      '# Resume Packet', '', 'Compact, token-efficient handoff. Keep evidence refs, not raw logs.', '',
      '## State', 'Ready.', '', '## Decisions', '- No durable decisions recorded yet.', '',
      '## Blockers / Open Questions', '- No known blockers.', '', '## Evidence refs', '- No evidence refs yet.', '',
      '## Next Actions', '- Verify the referenced work before claiming pass.', '', 'Compiler reason: handoff compiler', '',
    ].join('\n'));
    const large = expectCompletePacket(largeInput);
    expect(large.budget).toEqual({ maxChars: 1600, length: 1563 });
    expect(large.content).toContain('## State\nThe implementation is ready for review, with verification still pending. The implementation is ready for review, with verification still pe…\n');
    expect(large.content).toContain('## Next Actions\n- ' + largeInput.nextActions.join('\n- ') + '\n');
  });

  it('fits only redacted content when large bodies require section-aware reduction', () => {
    const token = ['sk', 'abcdefghijklmnopqrstuvwxyz1234567890'].join('-');
    const sensitive = `Keep token ${token} and /Users/danimal/private/project out of the packet. `.repeat(8);
    const compiled = expectCompletePacket({
      state: sensitive, decisions: [sensitive, sensitive], blockers: [sensitive, sensitive],
      evidenceRefs: [sensitive, sensitive], nextActions: [sensitive, sensitive], reason: sensitive, maxChars: 900,
    });
    expect(compiled.content).not.toContain(token);
    expect(compiled.content).not.toContain('/Users/danimal');
    expect(compiled.content).toContain('sk-[redacted]');
    expect(compiled.content).toContain('/[local-path-redacted]');
  });

  it('honestly fails when the complete packet structure cannot fit the requested budget', () => {
    const minimum = [
      '# Resume Packet', '', 'Compact, token-efficient handoff. Keep evidence refs, not raw logs.', '',
      ...sections.flatMap((section) => [`## ${section}`, '']), 'Compiler reason: ', '',
    ].join('\n');
    for (const maxChars of [0, 1, 10, minimum.length - 1]) {
      const compiled = compileHandoffPacket({ ...reducedInput, maxChars });
      expect(compiled.budget.maxChars).toBe(maxChars);
      expect(compiled.validation.status).toBe('fail');
      expect(compiled.validation.overBudget).toBe(true);
      expect(compiled.content).toBe(minimum);
    }
    for (const maxChars of [minimum.length, minimum.length + 1]) expectCompletePacket({ ...reducedInput, maxChars });
  });
});
