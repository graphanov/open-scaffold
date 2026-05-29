import { describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

  it('fails loudly when an amendment changes acceptance criteria', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'osc-resume-amendment-'));
    try {
      cpSync(fixtureRoot, tempRoot, { recursive: true });
      const amendmentPath = join(tempRoot, '.osc', 'plans', 'active', 'demo-add-greeting-amendment-1.md');
      const amendment = readFileSync(amendmentPath, 'utf8').replace(
        'None — all acceptance criteria remain unchanged. The observable behavior (greet function returns "Hello, <name>!", history written to releases, tests pass) is unaffected by the internal factory pattern change.',
        'Criterion 1 is superseded: the greeting must return "Hi, <name>!" instead of the original text.'
      );
      writeFileSync(amendmentPath, amendment, 'utf8');

      expect(() => buildResumeSummary(tempRoot)).toThrow(/amendments that change or supersede acceptance criteria/);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
