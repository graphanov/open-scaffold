import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempDir(prefix = 'osc-plan-authoring-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function initializedScaffold() {
  const target = tempDir();
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });
  return target;
}

function requiredPlanHeadings() {
  return [
    'Status',
    'Context',
    'Goal',
    'Constraints / Out of scope',
    'Files to touch',
    'Acceptance criteria',
    'Verification steps',
    'Open questions',
  ];
}

describe('plan authoring templates', () => {
  it('initializes shipped templates and creates a plan from a core template', () => {
    const target = initializedScaffold();

    expect(existsSync(join(target, '.osc/plans/templates/bug-fix.md'))).toBe(true);
    expect(existsSync(join(target, '.osc/plans/templates/README.md'))).toBe(true);

    const output = execFileSync(tsx, [cli, 'plan', 'new', '010-fix-login', '--stage', 'backlog', '--from-template', 'bug-fix'], {
      cwd: target,
      encoding: 'utf8',
    });

    const planPath = join(target, '.osc/plans/backlog/010-fix-login.md');
    const text = readFileSync(planPath, 'utf8');
    expect(output).toContain('Created plan: .osc/plans/backlog/010-fix-login.md');
    expect(output).toContain('Template: bug-fix');
    expect(text).toContain('# Plan: 010-fix-login');
    expect(text).toContain('## Status\n\nbacklog');
    for (const heading of requiredPlanHeadings()) expect(text).toContain(`## ${heading}`);
    expect(text).toContain('Expected vs actual behavior');
    expect(text).toContain('<affected command or user flow>');
    expect(text).not.toContain('TODO:');
    expect(text).not.toContain('REPLACE_ME:');
  });

  it('lists core templates without requiring a plan slug and rejects missing templates', () => {
    const target = initializedScaffold();

    const list = execFileSync(tsx, [cli, 'plan', 'new', '--from-template', 'list'], { cwd: target, encoding: 'utf8' });
    expect(list).toContain('bug-fix');
    expect(list).toContain('new-feature');
    expect(list).toContain('dependency-upgrade');
    expect(existsSync(join(target, '.osc/plans/active/list.md'))).toBe(false);

    const missing = spawnSync(tsx, [cli, 'plan', 'new', '011-missing', '--stage', 'active', '--from-template', 'custom-missing'], {
      cwd: target,
      encoding: 'utf8',
    });
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("Template not found: custom-missing");
  });

  it('uses project-local custom templates after validating their plan structure', () => {
    const target = initializedScaffold();
    writeFileSync(join(target, '.osc/plans/templates/custom-acme.md'), [
      '# Plan: custom-acme',
      '',
      '## Status',
      '',
      'backlog',
      '',
      '## Context',
      '',
      'REPLACE_ME: Acme-specific context for a customer-safe slice.',
      '',
      '## Goal',
      '',
      'REPLACE_ME: Deliver one Acme-specific outcome.',
      '',
      '## Constraints / Out of scope',
      '',
      '- Do not include private customer data.',
      '',
      '## Files to touch',
      '',
      '- `<path>` — replace with the real path.',
      '',
      '## Acceptance criteria',
      '',
      '- [ ] The Acme-specific outcome is verifiable.',
      '',
      '## Verification steps',
      '',
      '1. Run the Acme verification command.',
      '',
      '## Open questions',
      '',
      '- None.',
      '',
    ].join('\n'));

    execFileSync(tsx, [cli, 'plan', 'new', '012-acme-work', '--stage', 'active', '--from-template', 'custom-acme'], {
      cwd: target,
      encoding: 'utf8',
    });

    const text = readFileSync(join(target, '.osc/plans/active/012-acme-work.md'), 'utf8');
    expect(text).toContain('# Plan: 012-acme-work');
    expect(text).toContain('## Status\n\nactive');
    expect(text).toContain('Acme-specific context');
    expect(text).not.toContain('REPLACE_ME:');
  });
});

describe('plan validation CLI', () => {
  it('returns zero for a clean plan and JSON issues for a broken plan', () => {
    const target = initializedScaffold();
    execFileSync(tsx, [cli, 'plan', 'new', '020-clean', '--stage', 'active', '--from-template', 'bug-fix'], { cwd: target, encoding: 'utf8' });

    const clean = execFileSync(tsx, [cli, 'plan', 'validate', '020-clean'], { cwd: target, encoding: 'utf8' });
    expect(clean).toContain('0 issues found');

    const brokenPath = join(target, '.osc/plans/backlog/021-broken.md');
    writeFileSync(brokenPath, [
      '# Plan: 021-broken',
      '',
      '## Status',
      '',
      'active',
      '',
      '## Context',
      '',
      'TODO: explain context.',
      '',
      '## Goal',
      '',
      'Improve.',
      '',
      '## Constraints / Out of scope',
      '',
      '',
      '## Files to touch',
      '',
      '- `src/example.ts` — example.',
      '',
      '## Acceptance criteria',
      '',
      '',
      '## Verification steps',
      '',
      '1. Run tests.',
      '',
      '## Open questions',
      '',
      '- Can this ship? ',
      '',
    ].join('\n'));

    const broken = spawnSync(tsx, [cli, 'plan', 'validate', '021-broken', '--json', '--strict'], { cwd: target, encoding: 'utf8' });
    expect(broken.status).toBe(1);
    const issues = JSON.parse(broken.stdout) as Array<{ severity: string; line: number; rule: string; message: string; suggestion: string }>;
    expect(issues.some((issue) => issue.rule === 'no-todos' && issue.line > 0 && issue.severity === 'error')).toBe(true);
    expect(issues.some((issue) => issue.rule === 'status-stage-consistency' && issue.message.includes('backlog'))).toBe(true);
    expect(issues.some((issue) => issue.rule === 'non-empty-ac')).toBe(true);
    expect(issues.some((issue) => issue.rule === 'no-vague-goal')).toBe(true);
    expect(issues.some((issue) => issue.rule === 'blocking-questions-tagged')).toBe(true);
    expect(issues.every((issue) => issue.suggestion.length > 0)).toBe(true);
  });

  it('reports heading-order and missing-section errors with actionable text output', () => {
    const target = initializedScaffold();
    const path = join(target, '.osc/plans/active/022-missing.md');
    writeFileSync(path, [
      '# Plan: 022-missing',
      '',
      '## Goal',
      '',
      'Ship a measurable thing.',
      '',
      '## Status',
      '',
      'active',
      '',
      '## Context',
      '',
      'Context exists.',
      '',
      '## Constraints / Out of scope',
      '',
      '- Keep scope small.',
      '',
      '## Files to touch',
      '',
      '- `src/example.ts` — example.',
      '',
      '## Verification steps',
      '',
      '1. Run tests.',
      '',
      '## Open questions',
      '',
      '- None.',
      '',
    ].join('\n'));

    const result = spawnSync(tsx, [cli, 'plan', 'validate', path], { cwd: target, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('error required-sections');
    expect(result.stdout).toContain('warning heading-order');
    expect(result.stdout).toContain('Add the missing ## Acceptance criteria section');
  });
});
