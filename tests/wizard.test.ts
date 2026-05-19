import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { assertWizardReady, mapAnswersToTemplate, validateAnswers, type PlanWizardAnswers } from '../src/wizard.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempDir(prefix = 'osc-wizard-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function initializedScaffold(options: { defineMission?: boolean } = { defineMission: true }) {
  const target = tempDir();
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });
  if (options.defineMission !== false) {
    writeFileSync(join(target, 'MISSION.md'), [
      '# Mission',
      '',
      'Test project mission.',
      '',
      '## Goals',
      '',
      '- Exercise the plan wizard.',
      '',
      '## Non-Goals',
      '',
      '- Do not spawn agents.',
      '',
      '## Changelog',
      '',
      '<!-- append YYYY-MM-DD entries below this line -->',
      '',
    ].join('\n'));
  }
  return target;
}

const completeAnswers: PlanWizardAnswers = {
  goal: 'Build a CLI cache',
  context: 'Cache misses were slow',
  constraints: ['Do not change API'],
  filesToTouch: ['src/cache.ts', 'tests/cache.test.ts'],
  acceptanceCriteria: ['Cache hit rate above 90%', 'Response under 10ms'],
  verificationSteps: ['Run npm test'],
  openQuestions: ['Depends on PR #42'],
};

describe('plan wizard template rendering', () => {
  it('exposes a mission preflight so callers can refuse before collecting answers', () => {
    const target = initializedScaffold({ defineMission: false });

    expect(() => assertWizardReady(target)).toThrow('Mission is not yet defined');
  });

  it('maps answers to a complete seven-section plan without TODO markers', () => {
    const text = mapAnswersToTemplate('test-wizard', 'active', completeAnswers);

    expect(text).toContain('# Plan: test-wizard');
    expect(text).toContain('## Status\n\nactive');
    expect(text).toContain('Build a CLI cache');
    expect(text).toContain('Cache misses were slow');
    expect(text).toContain('- Do not change API');
    expect(text).toContain('- `src/cache.ts`');
    expect(text).toContain('- [ ] Cache hit rate above 90%');
    expect(text).toContain('1. Run npm test');
    expect(text).toContain('- Depends on PR #42');
    expect(text).not.toContain('TODO:');
  });

  it('keeps skipped answers explicit without breaking plan structure', () => {
    const text = mapAnswersToTemplate('test-skip', 'backlog', {});

    for (const heading of ['Context', 'Goal', 'Constraints / Out of scope', 'Files to touch', 'Acceptance criteria', 'Verification steps', 'Open questions']) {
      expect(text).toContain(`## ${heading}`);
    }
    expect(text).toContain('## Status\n\nbacklog');
    expect(text).toContain('_not specified_');
    expect(text).not.toContain('TODO:');
  });

  it('normalizes scalar and array values from JSON answers', () => {
    const validated = validateAnswers({
      goal: 'Ship a thing',
      constraints: 'Do not touch secrets',
      filesToTouch: 'src/index.ts, tests/index.test.ts',
      acceptanceCriteria: ['First criterion', '', 'Second criterion'],
    });

    expect(validated.goal).toBe('Ship a thing');
    expect(validated.constraints).toEqual(['Do not touch secrets']);
    expect(validated.filesToTouch).toEqual(['src/index.ts', 'tests/index.test.ts']);
    expect(validated.acceptanceCriteria).toEqual(['First criterion', 'Second criterion']);
  });
});

describe('osc plan wizard CLI', () => {
  it('creates a non-interactive plan from JSON answers in the requested stage', () => {
    const target = initializedScaffold();
    const answersPath = join(repoRoot, 'tests/fixtures/wizard-answers.json');

    const output = execFileSync(tsx, [cli, 'plan', 'wizard', 'test-json', '--stage', 'backlog', '--non-interactive', '--answers', answersPath], { cwd: target, encoding: 'utf8' });

    const planPath = join(target, '.osc/plans/backlog/test-json.md');
    const text = readFileSync(planPath, 'utf8');
    expect(output).toContain('Created plan: .osc/plans/backlog/test-json.md');
    expect(text).toContain('## Status\n\nbacklog');
    expect(text).toContain('Build a CLI cache');
    expect(text).not.toContain('TODO:');
  }, 20_000);

  it('asks interactive questions and writes provided answers', () => {
    const target = initializedScaffold();
    const input = [
      'Build a CLI cache',
      'Cache misses were slow',
      'Do not change API',
      'src/cache.ts, tests/cache.test.ts',
      'Cache hit rate above 90%',
      'Response under 10ms',
      '',
      'Run npm test',
      'Depends on PR #42',
      '',
    ].join('\n');

    const result = spawnSync(tsx, [cli, 'plan', 'wizard', 'test-interactive'], { cwd: target, input, encoding: 'utf8' });

    expect(result.status).toBe(0);
    const planPath = join(target, '.osc/plans/active/test-interactive.md');
    const text = readFileSync(planPath, 'utf8');
    expect(text).toContain('- [ ] Cache hit rate above 90%');
    expect(text).toContain('- [ ] Response under 10ms');
    expect(text).toContain('1. Run npm test');
    expect(text).not.toContain('TODO:');
  }, 20_000);

  it('refuses to run when the mission is unset', () => {
    const target = initializedScaffold({ defineMission: false });
    const answersPath = join(repoRoot, 'tests/fixtures/wizard-answers.json');

    const result = spawnSync(tsx, [cli, 'plan', 'wizard', 'blocked-plan', '--non-interactive', '--answers', answersPath], { cwd: target, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Mission is not yet defined');
    expect(existsSync(join(target, '.osc/plans/active/blocked-plan.md'))).toBe(false);
  }, 20_000);
});
