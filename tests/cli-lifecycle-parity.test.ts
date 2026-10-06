import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempDir(prefix = 'osc-cli-lifecycle-', base = tmpdir()) {
  return mkdtempSync(join(base, prefix));
}

function initializedScaffold() {
  const target = tempDir();
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });
  defineMission(target);
  execFileSync(tsx, [cli, 'plan', 'new', '001-first-task', '--stage', 'active'], { cwd: target, encoding: 'utf8' });
  return target;
}

function fillPlan(target: string): string {
  const path = join(target, '.osc/plans/active/001-first-task.md');
  const text = readFileSync(path, 'utf8')
    .replace('TODO: explain why this plan exists now.', 'Closing a plan must keep its recorded stage consistent.')
    .replace('TODO: state one observable outcome that defines done.', 'Retain this goal and its checked criterion after closing.')
    .replace('- TODO: list what this plan will not do.', '- Change lifecycle records only.')
    .replace('- TODO: `path/to/file.ext` — why this file changes.', '- `src/demo.ts` — bounded example.')
    .replace('- [ ] TODO: replace with a testable acceptance criterion before implementation.', '- [x] The lifecycle fixture is checked.')
    .replace('1. TODO: command or check — expected pass signal.', '1. Run `node --version` and expect a version string.')
    .replace('- TODO: unresolved decision or assumption, or write `None.` after review.', '- None.');
  writeFileSync(path, text, 'utf8');
  return text;
}

function extractAmendmentDate(text: string): string {
  const match = text.match(/## Date\n\n(\d{4}-\d{2}-\d{2})/);
  expect(match, 'amendment date').not.toBeNull();
  return match?.[1] ?? '';
}

function defineMission(target: string) {
  writeFileSync(join(target, 'MISSION.md'), [
    '# Mission',
    '',
    'Test project mission.',
    '',
    '## Goals',
    '',
    '- Test the lifecycle helper path.',
    '',
    '## Non-Goals',
    '',
    '- Do not perform runtime work.',
    '',
    '## Changelog',
    '',
    '<!-- append YYYY-MM-DD entries below this line -->',
    '',
  ].join('\n'));
}

describe('osc lifecycle parity helper CLI', () => {
  it('creates an amendment skeleton beside the parent plan and stamps the mission changelog', () => {
    const target = initializedScaffold();

    const output = execFileSync(tsx, [cli, 'amend', '001-first-task', '--message', 'Scope changed'], { cwd: target, encoding: 'utf8' });

    const amendmentPath = join(target, '.osc/plans/active/001-first-task-amendment-1.md');
    const text = readFileSync(amendmentPath, 'utf8');
    const amendmentDate = extractAmendmentDate(text);
    const mission = readFileSync(join(target, 'MISSION.md'), 'utf8');
    expect(output).toContain('Created amendment: .osc/plans/active/001-first-task-amendment-1.md');
    expect(output).toContain('Next: fill in the TODO sections');
    expect(text).toContain('# Amendment 1: 001-first-task');
    expect(text).toContain('## Parent\n\n001-first-task');
    expect(text).toContain(`## Date\n\n${amendmentDate}`);
    expect(text).toContain('TODO: what changed and why');
    expect(text).toContain('TODO: the revised goal or criteria');
    expect(text).toContain('TODO: which acceptance criterion numbers change');
    expect(text).not.toContain('Accepted.');
    expect(text).not.toContain('Verified.');
    expect(mission).toContain(`${amendmentDate}: Scope changed — see .osc/plans/active/001-first-task-amendment-1.md`);
  });

  it('closes a plan and its amendments into done while stamping the mission changelog', () => {
    const target = initializedScaffold();
    const original = fillPlan(target);
    execFileSync(tsx, [cli, 'amend', '001-first-task', '--message', 'Scope changed'], { cwd: target, encoding: 'utf8' });
    const amendment = readFileSync(join(target, '.osc/plans/active/001-first-task-amendment-1.md'), 'utf8');

    const output = execFileSync(tsx, [cli, 'close', '001-first-task', '--message', 'first task shipped'], { cwd: target, encoding: 'utf8' });

    expect(output).toContain('Closed: 001-first-task');
    expect(output).toContain('Moved to done/: 001-first-task.md, 001-first-task-amendment-1.md');
    expect(existsSync(join(target, '.osc/plans/active/001-first-task.md'))).toBe(false);
    expect(existsSync(join(target, '.osc/plans/active/001-first-task-amendment-1.md'))).toBe(false);
    expect(existsSync(join(target, '.osc/plans/done/001-first-task.md'))).toBe(true);
    expect(existsSync(join(target, '.osc/plans/done/001-first-task-amendment-1.md'))).toBe(true);
    expect(readFileSync(join(target, '.osc/plans/done/001-first-task.md'), 'utf8')).toBe(original.replace('## Status\n\nactive', '## Status\n\ndone'));
    expect(readFileSync(join(target, '.osc/plans/done/001-first-task-amendment-1.md'), 'utf8')).toBe(amendment);
    const validation = execFileSync(tsx, [cli, 'plan', 'validate', '001-first-task', '--strict'], { cwd: target, encoding: 'utf8' });
    expect(validation).toContain('0 issues found');
    expect(readFileSync(join(target, 'MISSION.md'), 'utf8')).toMatch(/\d{4}-\d{2}-\d{2}: closed 001-first-task — first task shipped/);
  });

  it('repairs stale status on an already-done plan without another mission stamp or amendment edit', () => {
    const target = initializedScaffold();
    const original = fillPlan(target);
    execFileSync(tsx, [cli, 'amend', '001-first-task', '--message', 'Scope changed'], { cwd: target, encoding: 'utf8' });
    execFileSync(tsx, [cli, 'close', '001-first-task', '--message', 'first task shipped'], { cwd: target, encoding: 'utf8' });
    const donePath = join(target, '.osc/plans/done/001-first-task.md');
    // Reproduce the record left by historical versions of osc close.
    writeFileSync(donePath, original, 'utf8');
    const mission = readFileSync(join(target, 'MISSION.md'), 'utf8');
    const amendment = readFileSync(join(target, '.osc/plans/done/001-first-task-amendment-1.md'), 'utf8');

    const output = execFileSync(tsx, [cli, 'close', '001-first-task', '--message', 'must not stamp twice'], { cwd: target, encoding: 'utf8' });
    expect(output).toContain('already in done/');
    expect(readFileSync(donePath, 'utf8')).toBe(original.replace('## Status\n\nactive', '## Status\n\ndone'));
    expect(execFileSync(tsx, [cli, 'plan', 'validate', '001-first-task', '--strict'], { cwd: target, encoding: 'utf8' })).toContain('0 issues found');
    expect(readFileSync(join(target, 'MISSION.md'), 'utf8')).toBe(mission);
    expect(readFileSync(join(target, '.osc/plans/done/001-first-task-amendment-1.md'), 'utf8')).toBe(amendment);
    execFileSync(tsx, [cli, 'close', '001-first-task'], { cwd: target, encoding: 'utf8' });
    expect(readFileSync(join(target, 'MISSION.md'), 'utf8')).toBe(mission);
  });

  it.each(['\n', '\r\n'])('updates canonical status headings while preserving notes, fences, and %j line endings', (newline) => {
    const target = initializedScaffold();
    const path = join(target, '.osc/plans/active/001-first-task.md');
    const original = fillPlan(target).replace('## Status\n\nactive', [
      '## Status ###',
      '',
      'active — retain this lifecycle note.',
      '',
      '```markdown',
      '## Status',
      'blocked — example only.',
      '```',
    ].join('\n')).replace(/\n/g, newline);
    writeFileSync(path, original, 'utf8');

    execFileSync(tsx, [cli, 'close', '001-first-task'], { cwd: target, encoding: 'utf8' });
    const donePath = join(target, '.osc/plans/done/001-first-task.md');
    const doneText = original.replace('active — retain this lifecycle note.', 'done — retain this lifecycle note.');
    expect(readFileSync(donePath, 'utf8')).toBe(doneText);
    expect(execFileSync(tsx, [cli, 'plan', 'validate', '001-first-task', '--strict'], { cwd: target, encoding: 'utf8' })).toContain('0 issues found');
    execFileSync(tsx, [cli, 'close', '001-first-task'], { cwd: target, encoding: 'utf8' });
    expect(readFileSync(donePath, 'utf8')).toBe(doneText);
  });

  it('keeps legacy plans without a Status section closable without inventing plan content', () => {
    const target = initializedScaffold();
    const original = fillPlan(target).replace('## Status\n\nactive\n\n', '');
    writeFileSync(join(target, '.osc/plans/active/001-first-task.md'), original, 'utf8');

    execFileSync(tsx, [cli, 'close', '001-first-task'], { cwd: target, encoding: 'utf8' });
    const donePath = join(target, '.osc/plans/done/001-first-task.md');
    expect(readFileSync(donePath, 'utf8')).toBe(original);
    const mission = readFileSync(join(target, 'MISSION.md'), 'utf8');
    execFileSync(tsx, [cli, 'close', '001-first-task'], { cwd: target, encoding: 'utf8' });
    expect(readFileSync(donePath, 'utf8')).toBe(original);
    expect(readFileSync(join(target, 'MISSION.md'), 'utf8')).toBe(mission);
  });

  it.each(['empty', 'invalid', 'duplicate'])('refuses %s Status before moving or stamping any records', (kind) => {
    const target = initializedScaffold();
    execFileSync(tsx, [cli, 'amend', '001-first-task', '--message', 'Scope changed'], { cwd: target, encoding: 'utf8' });
    const original = fillPlan(target);
    const malformed = kind === 'empty'
      ? original.replace('## Status\n\nactive', '## Status\n\n')
      : kind === 'invalid'
        ? original.replace('## Status\n\nactive', '## Status\n\nunknown')
        : `${original}\n## Status\n\nblocked\n`;
    const planPath = join(target, '.osc/plans/active/001-first-task.md');
    const amendmentPath = join(target, '.osc/plans/active/001-first-task-amendment-1.md');
    writeFileSync(planPath, malformed, 'utf8');
    const mission = readFileSync(join(target, 'MISSION.md'), 'utf8');
    const amendment = readFileSync(amendmentPath, 'utf8');

    const result = spawnSync(tsx, [cli, 'close', '001-first-task'], { cwd: target, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Refusing to close');
    expect(readFileSync(planPath, 'utf8')).toBe(malformed);
    expect(readFileSync(amendmentPath, 'utf8')).toBe(amendment);
    expect(readFileSync(join(target, 'MISSION.md'), 'utf8')).toBe(mission);
    expect(existsSync(join(target, '.osc/plans/done/001-first-task.md'))).toBe(false);
  });

  it('creates a missing done folder before closing for older or manual scaffolds', () => {
    const target = initializedScaffold();
    rmSync(join(target, '.osc/plans/done'), { recursive: true, force: true });

    const output = execFileSync(tsx, [cli, 'close', '001-first-task', '--message', 'first task shipped'], { cwd: target, encoding: 'utf8' });

    expect(output).toContain('Closed: 001-first-task');
    expect(existsSync(join(target, '.osc/plans/done/001-first-task.md'))).toBe(true);
    expect(readFileSync(join(target, 'MISSION.md'), 'utf8')).toMatch(/\d{4}-\d{2}-\d{2}: closed 001-first-task — first task shipped/);
  });

  it('refuses unsafe slugs, missing parents, missing roots, and unsupported options', () => {
    const target = initializedScaffold();

    const unsafeAmend = spawnSync(tsx, [cli, 'amend', '../outside'], { cwd: target, encoding: 'utf8' });
    expect(unsafeAmend.status).toBe(2);
    expect(unsafeAmend.stderr).toContain('Unsafe slug');
    expect(existsSync(join(dirname(target), 'outside-amendment-1.md'))).toBe(false);

    const missingParent = spawnSync(tsx, [cli, 'amend', '999-missing'], { cwd: target, encoding: 'utf8' });
    expect(missingParent.status).toBe(1);
    expect(missingParent.stderr).toContain('Parent plan not found');

    const unsupportedOption = spawnSync(tsx, [cli, 'close', '001-first-task', '--stage', 'done'], { cwd: target, encoding: 'utf8' });
    expect(unsupportedOption.status).toBe(2);
    expect(unsupportedOption.stderr).toContain('Unknown option for close');

    const noRoot = tempDir('osc-cli-no-root-', tmpdir());
    const missingRoot = spawnSync(tsx, [cli, 'close', '001-first-task'], { cwd: noRoot, encoding: 'utf8' });
    expect(missingRoot.status).toBe(1);
    expect(missingRoot.stderr).toContain('No Open Scaffold root found');
  });
});
