import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildResumeSummary } from '../src/resume.js';

const fixtureRoot = join(resolve(process.cwd()), 'examples/resume-demo');

function loadGolden() {
  return JSON.parse(readFileSync(join(fixtureRoot, 'expected-resume-summary.json'), 'utf8'));
}

describe('resume-snapshot', () => {
  it('matches the committed golden file', () => {
    const summary = buildResumeSummary(fixtureRoot);
    expect(summary).toEqual(loadGolden());
  });

  it('is deterministic — second call equals first', () => {
    expect(buildResumeSummary(fixtureRoot)).toEqual(buildResumeSummary(fixtureRoot));
  });

  it('next_bounded_action is a member of acceptance_criteria', () => {
    const { next_bounded_action, active_plan } = buildResumeSummary(fixtureRoot);
    expect(next_bounded_action).not.toBeNull();
    const acTexts = active_plan.acceptance_criteria.map((c) => c.text);
    expect(acTexts).toContain(next_bounded_action);
  });

  it('reports exactly the fixture active plan slug', () => {
    expect(buildResumeSummary(fixtureRoot).active_plan.slug).toBe('demo-add-greeting');
  });

  it('composer throws when active plan count != 1', () => {
    expect(() => buildResumeSummary(join(fixtureRoot, '.osc', 'plans', 'active'))).toThrow(
      /exactly one active plan/
    );
  });

  it('reports amendments count 1 and correct id', () => {
    const { amendments } = buildResumeSummary(fixtureRoot);
    expect(amendments.count).toBe(1);
    expect(amendments.ids).toContain('demo-add-greeting-amendment-1');
  });

  it('reports done slices and evidence links', () => {
    const { work_done } = buildResumeSummary(fixtureRoot);
    expect(work_done.done_slices).toContain('scaffold-init');
    expect(work_done.evidence).toContain('.osc/releases/2026-05-10-scaffold-init.md');
  });
});
