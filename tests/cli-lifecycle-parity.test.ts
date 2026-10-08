import { describe, expect, it, vi } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { closePlan, createPlanAmendment, movePlan } from '../src/scaffold.js';

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


const navigationSlug = '001-first-task';
const navigationAnchor = '<!-- append YYYY-MM-DD entries below this line -->';
const fixedDate = new Date(2026, 9, 8);

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function withNavigation(stage: string, run: (root: string, oldPath: string, amendment: string, parent: string) => void) {
  const root = initializedScaffold();
  try {
    expect(spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root }).status).not.toBe(0);
    fillPlan(root);
    if (stage === 'root') renameSync(join(root, `.osc/plans/active/${navigationSlug}.md`), join(root, `.osc/plans/${navigationSlug}.md`));
    else if (stage === 'backlog' || stage === 'blocked') movePlan(navigationSlug, stage, root);
    execFileSync(tsx, [cli, 'amend', navigationSlug, '--message', '  Scope changed  '], { cwd: root, encoding: 'utf8' });
    const prefix = stage === 'root' ? '.osc/plans/' : `.osc/plans/${stage === 'prior-stage' ? 'active' : stage}/`;
    const oldPath = `${prefix}${navigationSlug}-amendment-1.md`;
    const amendment = readFileSync(join(root, oldPath), 'utf8');
    if (stage === 'prior-stage') movePlan(navigationSlug, 'blocked', root);
    const parentPath = stage === 'prior-stage' ? `.osc/plans/blocked/${navigationSlug}.md` : `${prefix}${navigationSlug}.md`;
    run(root, oldPath, amendment, readFileSync(join(root, parentPath), 'utf8'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('close generated terminal navigation', () => {
  it.each(['active', 'backlog', 'blocked', 'root', 'prior-stage'].flatMap((stage) => ['\n', '\r\n'].map((ending) => ({ stage, ending }))))(
    'retargets supported $stage navigation with $ending while preserving excluded history', ({ stage, ending }) => {
      withNavigation(stage, (root, oldPath, amendment, parent) => {
        const name = `${navigationSlug}-amendment-1.md`;
        const parentOld = oldPath.replace('-amendment-1', '');
        const sourceStage = stage === 'root' ? '' : `${stage === 'prior-stage' ? 'blocked' : stage}/`;
        const otherStage = stage === 'backlog' ? 'active' : 'backlog';
        const alias = `.osc/plans/${otherStage}/${name}`;
        writeFileSync(join(root, alias), 'Surviving same-basename record.\n');
        const directoryAlias = `.osc/plans/${otherStage}/${navigationSlug}.md`;
        mkdirSync(join(root, directoryAlias));
        const second = `${navigationSlug}-amendment-2.md`;
        writeFileSync(join(root, `.osc/plans/${sourceStage}${second}`), 'Second amendment.\r\n');
        const dangling = `.osc/plans/${otherStage}/${second}`;
        symlinkSync('missing.md', join(root, dangling));
        const rows = [
          `- 2026-10-01: Amendment — see ${oldPath}\t  `,
          `- 2026-10-02: Parent — see ${parentOld}`,
          `- 2026-10-03: Absent prior alias — see .osc/plans/blocked/${second}`,
        ];
        const excluded = [
          `- 2026-10-04: Basename — see ${name}`,
          `- 2026-10-04: Prose recorded ${oldPath} at the time.`,
          `- 2026-10-04: External — see https://example.invalid/${oldPath}`,
          `- 2026-10-04: Unmoved — see .osc/plans/active/002-other.md`,
          ...['.bak', '?view=1', '#detail', ' for the old location.', '`'].map((suffix) => `- 2026-10-04: Suffix — see ${oldPath}${suffix}`),
          `- 2026-10-04: Inline — see \`${oldPath}\``,
          `- 2026-10-04: Alias — see ${alias}`,
          `- 2026-10-04: Directory — see ${directoryAlias}`,
          `- 2026-10-04: Dangling — see ${dangling}`,
          `- 2026-10-04: Longer filename — see ${oldPath.replace('.md', '-extra.md')}`,
        ];
        const outside = `- 2026-09-30: Outside — see ${oldPath}`;
        const before = ['# Mission', '', 'Lifecycle navigation fixture.', outside,
          '~~~~markdown', '## Changelog', outside, '~~~~~',
          '## Changelog ###', navigationAnchor, '## \t  ', ...rows, ...excluded,
          '````markdown', outside, '```', '## Fenced heading', outside, '~~~~', '```` prose', outside, '`````',
          '## Later', outside].join(ending);
        writeFileSync(join(root, 'MISSION.md'), before);
        const repaired = before.replace(rows[0], rows[0].replace(oldPath, `.osc/plans/done/${name}`))
          .replace(rows[1], rows[1].replace(parentOld, `.osc/plans/done/${navigationSlug}.md`))
          .replace(rows[2], rows[2].replace(`.osc/plans/blocked/${second}`, `.osc/plans/done/${second}`));
        const output = execFileSync(tsx, [cli, 'close', navigationSlug, '--message', '  shipped  '], { cwd: root, encoding: 'utf8' });
        expect(output).toContain(`Moved to done/: ${navigationSlug}.md, ${name}, ${second}`);
        expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(repaired.replace(`${navigationAnchor}${ending}`, `${navigationAnchor}${ending}- ${today()}: closed ${navigationSlug} — shipped${ending}`));
        expect(readFileSync(join(root, `.osc/plans/done/${name}`), 'utf8')).toBe(amendment);
        expect(readFileSync(join(root, `.osc/plans/done/${second}`), 'utf8')).toBe('Second amendment.\r\n');
        expect(readFileSync(join(root, `.osc/plans/done/${navigationSlug}.md`), 'utf8')).toBe(parent.replace(/^(active|backlog|blocked)$/m, 'done'));
        const after = readFileSync(join(root, 'MISSION.md'), 'utf8');
        execFileSync(tsx, [cli, 'close', navigationSlug, '--message', 'repeat'], { cwd: root });
        expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(after);
      });
    },
  );

  it.each(['symlink', 'directory'])('excludes moved %s destinations while returning the complete lexical list', (kind) => {
    withNavigation('active', (root) => {
      const ten = `${navigationSlug}-amendment-10.md`;
      const two = `${navigationSlug}-amendment-2.md`;
      writeFileSync(join(root, `.osc/plans/active/${ten}`), 'Ten unchanged.\r\n');
      if (kind === 'directory') mkdirSync(join(root, `.osc/plans/active/${two}`));
      else { writeFileSync(join(root, 'target.md'), 'Unrelated.\n'); symlinkSync(join(root, 'target.md'), join(root, `.osc/plans/active/${two}`)); }
      const regular = `- 2026-10-02: Regular — see .osc/plans/active/${ten}`;
      const excluded = `- 2026-10-03: Nonregular — see .osc/plans/active/${two}`;
      const before = `# Mission\nFixture.\n## Changelog\n${navigationAnchor}\n${regular}\n${excluded}\n`;
      writeFileSync(join(root, 'MISSION.md'), before);
      const result = closePlan(navigationSlug, root, '', fixedDate);
      expect(result).toMatchObject({ movedFiles: [`${navigationSlug}.md`, `${navigationSlug}-amendment-1.md`, ten, two], fromStage: 'active', alreadyDone: false, changelogStamped: true });
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(before.replace(regular, regular.replace('/active/', '/done/')).replace(`${navigationAnchor}\n`, `${navigationAnchor}\n- 2026-10-08: closed ${navigationSlug}\n`));
    });
  });

  it.each(['\n', '\r\n'].flatMap((ending) => [true, false].map((anchored) => ({ ending, anchored }))))(
    'preserves anchored raw EOF or legacy fallback trimming with $ending, anchor $anchored', ({ ending, anchored }) => {
      withNavigation('active', (root, oldPath) => {
        const before = ['# Mission', 'Fixture.', '## Changelog', ...(anchored ? [navigationAnchor] : []), `- 2026-10-02: History — see ${oldPath}\t  `].join(ending);
        writeFileSync(join(root, 'MISSION.md'), before);
        closePlan(navigationSlug, root, '', fixedDate);
        const repaired = before.replace(oldPath, `.osc/plans/done/${navigationSlug}-amendment-1.md`);
        const entry = `- 2026-10-08: closed ${navigationSlug}`;
        expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(anchored ? repaired.replace(`${navigationAnchor}${ending}`, `${navigationAnchor}${ending}${entry}${ending}`) : `${repaired.trimEnd()}\n\n${entry}\n`);
      });
    },
  );

  it('retains duplicate/EOF anchor insertion and ignores fenced-only Changelog', () => {
    withNavigation('active', (root, oldPath) => {
      const before = `# Mission\nFixture.\n\`\`\`markdown\n## Changelog\n- 2026-10-01: Fenced — see ${oldPath}\n\`\`\`\n${navigationAnchor}\n${navigationAnchor}`;
      writeFileSync(join(root, 'MISSION.md'), before);
      closePlan(navigationSlug, root, '', fixedDate);
      const entry = `- 2026-10-08: closed ${navigationSlug}`;
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(before.replace(`${navigationAnchor}\n`, `${navigationAnchor}\n${entry}\n`).replace(new RegExp(`${navigationAnchor}$`), `${navigationAnchor}\n${entry}`));
    });
  });

  it('keeps default/trimmed amendment messages and non-done movement semantics', () => {
    withNavigation('active', (root) => {
      createPlanAmendment(navigationSlug, root, '', fixedDate);
      createPlanAmendment(navigationSlug, root, '  adjusted  ', fixedDate);
      const before = readFileSync(join(root, 'MISSION.md'), 'utf8');
      expect(before).toContain(`2026-10-08: amendment 2 to ${navigationSlug} — see .osc/plans/active/${navigationSlug}-amendment-2.md`);
      expect(before).toContain(`2026-10-08: adjusted — see .osc/plans/active/${navigationSlug}-amendment-3.md`);
      writeFileSync(join(root, `.osc/plans/active/${navigationSlug}-amendment-10.md`), 'Ten.\n');
      const moved = movePlan(navigationSlug, 'blocked', root);
      expect(moved).toMatchObject({ fromStage: 'active', toStage: 'blocked', alreadyInStage: false, movedFiles: [`${navigationSlug}.md`, `${navigationSlug}-amendment-1.md`, `${navigationSlug}-amendment-10.md`, `${navigationSlug}-amendment-2.md`, `${navigationSlug}-amendment-3.md`] });
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(before);
      expect(movePlan(navigationSlug, 'blocked', root).alreadyInStage).toBe(true);
    });
  });

  it.each(['close', 'move'].flatMap((operation) => [true, false].map((parentCollision) => ({ operation, parentCollision }))))(
    'retains exact first $operation collision and readiness order, parent $parentCollision', ({ operation, parentCollision }) => {
      withNavigation('active', (root, oldPath, amendment, parent) => {
        const destination = operation === 'close' ? 'done' : 'blocked';
        const names = [`${navigationSlug}-amendment-10.md`, `${navigationSlug}-amendment-2.md`];
        for (const name of names) { writeFileSync(join(root, `.osc/plans/active/${name}`), 'Active.\n'); writeFileSync(join(root, `.osc/plans/${destination}/${name}`), 'Existing.\n'); }
        if (parentCollision) writeFileSync(join(root, `.osc/plans/${destination}/${navigationSlug}.md`), 'Existing parent.\n');
        const unset = '# Mission\nmission:unset\n';
        writeFileSync(join(root, 'MISSION.md'), unset);
        const first = parentCollision ? `${navigationSlug}.md` : names[0];
        expect(() => operation === 'close' ? closePlan(navigationSlug, root) : movePlan(navigationSlug, 'blocked', root)).toThrow(`Refusing to overwrite existing ${operation === 'close' ? 'done plan' : 'plan'} file: .osc/plans/${destination}/${first}`);
        expect(readFileSync(join(root, `.osc/plans/active/${navigationSlug}.md`), 'utf8')).toBe(parent);
        expect(readFileSync(join(root, oldPath), 'utf8')).toBe(amendment);
        expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(unset);
      });
    },
  );
});


describe('Windows helper navigation portable serializer', () => {
  it('canonicalizes only amendment history under an isolated actual win32.relative mock', async () => {
    const root = initializedScaffold();
    let calls = 0;
    try {
      vi.resetModules();
      vi.doMock('node:path', async (importOriginal) => {
        const actual = await importOriginal<typeof import('node:path')>();
        return { ...actual, relative: (from: string, to: string) => {
          calls += 1;
          return actual.win32.relative('C:\\fixture', `C:\\fixture\\${actual.relative(from, to).replace(/\//g, '\\')}`);
        } };
      });
      // All filesystem functions and all other path functions stay native POSIX.
      const isolated = await import('../src/scaffold.js');
      const result = isolated.createPlanAmendment(navigationSlug, root, '  serialized  ', fixedDate);
      expect(calls).toBe(1);
      expect(result.relativePath).toBe(`.osc\\plans\\active\\${navigationSlug}-amendment-1.md`);
      expect(result.path).toBe(join(root, `.osc/plans/active/${navigationSlug}-amendment-1.md`));
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toContain(`2026-10-08: serialized — see .osc/plans/active/${navigationSlug}-amendment-1.md`);
      expect(isolated.closePlan(navigationSlug, root, '', fixedDate).movedFiles).toEqual([`${navigationSlug}.md`, `${navigationSlug}-amendment-1.md`]);
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toContain(`serialized — see .osc/plans/done/${navigationSlug}-amendment-1.md`);
    } finally {
      vi.doUnmock('node:path');
      vi.resetModules();
      rmSync(root, { recursive: true, force: true });
    }
    const control = initializedScaffold();
    try {
      const native = await import('../src/scaffold.js');
      expect(native.createPlanAmendment(navigationSlug, control, '', fixedDate).relativePath).toBe(`.osc/plans/active/${navigationSlug}-amendment-1.md`);
    } finally {
      rmSync(control, { recursive: true, force: true });
    }
  });
});


describe('Windows helper navigation portable close', () => {
  it('repairs uniform terminal fields for actual moved regular files and preserves other raw history', () => {
    withNavigation('prior-stage', (root, oldPath, amendment, parent) => {
      const name = `${navigationSlug}-amendment-1.md`;
      const windows = (path: string) => path.replace(/\//g, '\\');
      const paths = ['active/', 'backlog/', 'blocked/', ''].map((stage) => windows(`.osc/plans/${stage}${name}`));
      const link = `${navigationSlug}-amendment-2.md`;
      const directory = `${navigationSlug}-amendment-3.md`;
      writeFileSync(join(root, 'target.md'), 'Target remains.\n');
      symlinkSync(join(root, 'target.md'), join(root, `.osc/plans/blocked/${link}`));
      mkdirSync(join(root, `.osc/plans/blocked/${directory}`));
      const rows = [oldPath, ...paths].map((path, index) => `- 2026-10-02: History ${index} — see ${path}\t  `);
      const rejected = [
        `.osc/plans\\active\\${name}`, `.osc\\plans/active\\${name}`, `.osc\\plans\\active/${name}`,
        `C:\\${paths[0]}`, `\\\\host\\${paths[0]}`, `/${oldPath}`, `.osc\\plans\\..\\${name}`,
        `.osc\\plans\\active\\002-unmoved.md`, `.osc/plans/active/${navigationSlug}-amendment-1\\literal.md`,
        windows(`.osc/plans/blocked/${link}`), windows(`.osc/plans/blocked/${directory}`),
      ].map((path) => `- 2026-10-03: Excluded — see ${path}`);
      rejected.push(`- 2026-10-03: Inline — see \`${paths[0]}\``, `- 2026-10-03: Suffix — see ${paths[0]}#detail`, `- 2026-10-03: URL — see https://example.invalid/${paths[0]}`);
      const fenced = `- 2026-10-01: Fenced or outside — see ${paths[0]}`;
      const before = ['# Mission', 'Fixture.', fenced, '~~~~markdown', '## Changelog', fenced, '~~~~~',
        '## Changelog ###', navigationAnchor, '## \t  ', ...rows, ...rejected,
        '````markdown', fenced, '```', fenced, '`````', '## Later', fenced].join('\r\n');
      writeFileSync(join(root, 'MISSION.md'), before);
      let expected = before;
      for (const row of rows) expected = expected.replace(row, row.replace(/ — see .*?(?=[\t ]*$)/, ` — see .osc/plans/done/${name}`));
      const output = execFileSync(tsx, [cli, 'close', navigationSlug, '--message', '  win shipped  '], { cwd: root, encoding: 'utf8' });
      expect(output).toContain(`Moved to done/: ${navigationSlug}.md, ${name}, ${link}, ${directory}`);
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(expected.replace(`${navigationAnchor}\r\n`, `${navigationAnchor}\r\n- ${today()}: closed ${navigationSlug} — win shipped\r\n`));
      expect(readFileSync(join(root, `.osc/plans/done/${name}`), 'utf8')).toBe(amendment);
      expect(readFileSync(join(root, `.osc/plans/done/${navigationSlug}.md`), 'utf8')).toBe(parent.replace(/^(active|backlog|blocked)$/m, 'done'));
      const after = readFileSync(join(root, 'MISSION.md'), 'utf8');
      execFileSync(tsx, [cli, 'close', navigationSlug, '--message', 'repeat'], { cwd: root });
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(after);
    });
  });

  it('preserves surviving raw and normalized file, directory and dangling aliases plus literal POSIX backslashes', () => {
    withNavigation('active', (root, oldPath) => {
      const rows = [`- 2026-10-02: Regular — see ${oldPath.replace(/\//g, '\\')}\t  `];
      for (const [index, kind] of ['file', 'directory', 'dangling', 'file', 'directory', 'dangling'].entries()) {
        const name = `${navigationSlug}-amendment-${index + 2}.md`;
        writeFileSync(join(root, `.osc/plans/active/${name}`), `Amendment ${index + 2}.\n`);
        const path = `.osc\\plans\\backlog\\${name}`;
        const alias = join(root, index < 3 ? path : path.replace(/\\/g, '/'));
        if (kind === 'directory') mkdirSync(alias);
        else if (kind === 'dangling') symlinkSync('absent.md', alias);
        else writeFileSync(alias, 'Surviving entry.\n');
        rows.push(`- 2026-10-03: ${kind} alias ${index} — see ${path}\t  `);
      }
      const literal = `.osc/plans/active/${navigationSlug}-amendment-8\\literal.md`;
      writeFileSync(join(root, literal), 'Literal POSIX filename.\n');
      rows.push(`- 2026-10-03: Literal — see ${literal}\t  `);
      const before = ['# Mission', 'Fixture.', '## Changelog', ...rows].join('\n');
      writeFileSync(join(root, 'MISSION.md'), before);
      const repaired = before.replace(rows[0], rows[0].replace(oldPath.replace(/\//g, '\\'), `.osc/plans/done/${navigationSlug}-amendment-1.md`));
      execFileSync(tsx, [cli, 'close', navigationSlug], { cwd: root });
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(`${repaired.trimEnd()}\n\n- ${today()}: closed ${navigationSlug}\n`);
      expect(readFileSync(join(root, literal), 'utf8')).toBe('Literal POSIX filename.\n');
    });
  });
});
