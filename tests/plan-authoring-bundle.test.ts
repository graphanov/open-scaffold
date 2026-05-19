import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { validatePlanFile } from '../src/plan-validate.js';

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

    const exampleMentionPath = join(target, '.osc/plans/active/020-doc-todo-example.md');
    writeFileSync(exampleMentionPath, [
      '# Plan: 020-doc-todo-example',
      '',
      '## Status',
      '',
      'active',
      '',
      '## Context',
      '',
      'This plan documents the literal `TODO:` marker without leaving an unfinished placeholder.',
      '',
      '## Goal',
      '',
      'Document placeholder wording without blocking plan validation.',
      '',
      '## Constraints / Out of scope',
      '',
      '- Do not add real placeholder work.',
      '',
      '## Files to touch',
      '',
      '- `docs/example.md` — example documentation path.',
      '',
      '## Acceptance criteria',
      '',
      '- [ ] The plan can mention placeholder syntax without failing validation.',
      '',
      '## Verification steps',
      '',
      '1. Run `osc plan validate 020-doc-todo-example --strict`.',
      '',
      '## Open questions',
      '',
      '- Should examples mention placeholder wording?',
      '',
    ].join('\n'));
    const exampleMention = spawnSync(tsx, [cli, 'plan', 'validate', '020-doc-todo-example', '--strict'], { cwd: target, encoding: 'utf8' });
    expect(exampleMention.status).toBe(0);
    expect(exampleMention.stdout).toContain('0 issues found');

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
      '- Does this block release? ',
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

    const inactivePath = join(target, '.osc/plans/active/022-inactive.md');
    writeFileSync(inactivePath, readFileSync(brokenPath, 'utf8').replace('# Plan: 021-broken', '# Plan: 022-inactive').replace('## Status\n\nactive', '## Status\n\ninactive'));
    const inactive = spawnSync(tsx, [cli, 'plan', 'validate', '022-inactive', '--json'], { cwd: target, encoding: 'utf8' });
    expect(inactive.status).toBe(1);
    const inactiveIssues = JSON.parse(inactive.stdout) as Array<{ rule: string; message: string }>;
    expect(inactiveIssues.some((issue) => issue.rule === 'status-stage-consistency' && issue.message.includes('inactive'))).toBe(true);

    const prefixedPath = join(target, '.osc/plans/backlog/023-prefixed.md');
    const validPrefixedPlan = readFileSync(brokenPath, 'utf8')
      .replace('# Plan: 021-broken', '# Plan: 023-prefixed')
      .replace('## Status\n\nactive', '## Status\n\nbacklog — queued for a later release')
      .replace('TODO: explain context.', 'Context exists.')
      .replace('Improve.', 'Accept status text that starts with the correct stage token.')
      .replace('## Constraints / Out of scope\n\n\n## Files to touch', '## Constraints / Out of scope\n\n- Keep scope small.\n\n## Files to touch')
      .replace('## Acceptance criteria\n\n\n## Verification steps', '## Acceptance criteria\n\n- [ ] Stage-prefixed status text validates when the folder stage matches.\n\n## Verification steps')
      .replace('- Does this block release? ', '- None.');
    writeFileSync(prefixedPath, validPrefixedPlan);
    expect(validatePlanFile(prefixedPath).issues).toEqual([]);

    const backloggedPath = join(target, '.osc/plans/backlog/024-backlogged.md');
    writeFileSync(backloggedPath, validPrefixedPlan
      .replace('# Plan: 023-prefixed', '# Plan: 024-backlogged')
      .replace('backlog — queued for a later release', 'backlogged'));
    expect(validatePlanFile(backloggedPath).issues.some((issue) => issue.rule === 'status-stage-consistency' && issue.message.includes('backlogged'))).toBe(true);
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
