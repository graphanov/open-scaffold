import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, readdirSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { splitSections } from '../src/scaffold.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');
const slug = '001-shell-close';
const activePath = `.osc/plans/active/${slug}.md`;
const donePath = `.osc/plans/done/${slug}.md`;
const mission = '# Mission\n\nVerify shell lifecycle parity.\n\n## Changelog\n\n<!-- append YYYY-MM-DD entries below this line -->\n';
const plan = `# Plan: ${slug}

## Status

active

## Context

Keep the supported shell lifecycle consistent with generated plans.

## Goal

Close the plan with a done Status without rewriting its goal or acceptance criteria.

## Constraints / Out of scope

- Preserve all committed requirement wording.

## Files to touch

- close.sh — maintain the shell lifecycle.

## Acceptance criteria

- [ ] The closed plan has a done Status and its original goal.

## Verification steps

1. Run the shell close helper and strict plan validation.

## Open questions

- None.
`;

function withScaffold(run: (root: string) => void, body = plan, stage = 'active'): void {
  const root = mkdtempSync(join(tmpdir(), 'osc-shell-close-'));
  try {
    mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
    mkdirSync(join(root, '.osc/plans/done'), { recursive: true });
    mkdirSync(join(root, '.osc/releases'), { recursive: true });
    writeFileSync(join(root, 'MISSION.md'), mission);
    writeFileSync(join(root, 'close.sh'), readFileSync(join(repoRoot, 'close.sh')));
    writeFileSync(join(root, `.osc/plans/${stage}/${slug}.md`), body);
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function close(root: string, ...flags: string[]) {
  return spawnSync('/bin/bash', ['close.sh', slug, ...flags], { cwd: root, encoding: 'utf8' });
}

function assertRejectedWithoutMutation(root: string, before: string): void {
  const result = close(root);
  expect(result.status).toBe(1);
  expect(readFileSync(join(root, activePath), 'utf8')).toBe(before);
  expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(mission);
  expect(existsSync(join(root, donePath))).toBe(false);
  expect(readdirSync(join(root, '.osc/plans')).some((name) => name.includes('.status.'))).toBe(false);
}

describe('supported shell close fallback', () => {
  it('closes an actual generated plan with a done Status that passes strict CLI validation', () => {
    withScaffold((root) => {
      rmSync(join(root, activePath));
      execFileSync(tsx, [cli, 'plan', 'new', slug, '--stage', 'active'], { cwd: root, encoding: 'utf8' });
      const filled = readFileSync(join(root, activePath), 'utf8')
        .replace('TODO: explain why this plan exists now.', 'Verify the supported shell lifecycle for a generated plan.')
        .replace('TODO: state one observable outcome that defines done.', 'Close the generated plan with a done Status and preserved acceptance criteria.')
        .replace('TODO: list what this plan will not do.', 'Do not change the goal or acceptance-criterion wording.')
        .replace('TODO: `path/to/file.ext` — why this file changes.', '`close.sh` — maintain the shell lifecycle.')
        .replace('TODO: replace with a testable acceptance criterion before implementation.', 'The closed plan has a done Status.')
        .replace('TODO: command or check — expected pass signal.', 'Run strict plan validation — expect 0 issues.')
        .replace('TODO: unresolved decision or assumption, or write `None.` after review.', 'None.');
      writeFileSync(join(root, activePath), filled);
      writeFileSync(join(root, `.osc/plans/active/${slug}-amendment-1.md`), '# Amendment 1\n');

      const result = close(root, '--message', 'verified shell close');
      expect(result.status, result.stderr).toBe(0);
      const closed = readFileSync(join(root, donePath), 'utf8');
      expect(splitSections(closed).get('Status')).toBe('done');
      expect(splitSections(closed).get('Goal')).toBe(splitSections(filled).get('Goal'));
      expect(splitSections(closed).get('Acceptance criteria')).toBe(splitSections(filled).get('Acceptance criteria'));
      expect(existsSync(join(root, `.osc/plans/done/${slug}-amendment-1.md`))).toBe(true);
      const validation = execFileSync(tsx, [cli, 'plan', 'validate', donePath, '--strict'], { cwd: root, encoding: 'utf8' });
      expect(validation).toContain('0 issues found');
    });
  });

  it.each(['\n', '\r\n'])('preserves genuine Status notes, fenced fake headings, and all other text with %j endings', (ending) => {
    const original = plan
      .replace('## Status\n\nactive', '## Status ###\n\nACTIVE: factual lifecycle metadata\n\nPreserve this Status note.\n\n```markdown\n## Status\nblocked\n```')
      .replace('Close the plan with a done Status without rewriting its goal or acceptance criteria.', 'Close the plan with a done Status without rewriting its goal or acceptance criteria.\n\n~~~markdown\n## Status\nactive\n~~~')
      .replace(/\n/g, ending);
    withScaffold((root) => {
      const result = close(root);
      expect(result.status, result.stderr).toBe(0);
      expect(readFileSync(join(root, donePath), 'utf8')).toBe(original.replace('ACTIVE: factual lifecycle metadata', 'done: factual lifecycle metadata'));
    }, original);
  });

  it('repairs already-done stale Status without another mission stamp and is idempotent', () => {
    withScaffold((root) => {
      const beforeMission = readFileSync(join(root, 'MISSION.md'), 'utf8');
      const first = close(root);
      expect(first.status, first.stderr).toBe(0);
      expect(first.stdout).toContain('already in done/');
      expect(readFileSync(join(root, donePath), 'utf8')).toBe(plan.replace('\nactive\n', '\ndone\n'));
      const second = close(root);
      expect(second.status, second.stderr).toBe(0);
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(beforeMission);
    }, plan, 'done');
  });

  it('retains legacy compatibility without inventing a Status section or changing final-newline shape', () => {
    const legacy = plan.replace('## Status\n\nactive\n\n', '').trimEnd();
    withScaffold((root) => {
      const result = close(root);
      expect(result.status, result.stderr).toBe(0);
      expect(readFileSync(join(root, donePath), 'utf8')).toBe(legacy);
    }, legacy);
  });

  it.each([
    ['empty', plan.replace('\nactive\n', '\n')],
    ['invalid', plan.replace('\nactive\n', '\nunapproved\n')],
    ['duplicate', `${plan}\n## Status\n\nactive\n`],
  ])('rejects a present %s Status before moving files or stamping the mission', (_label, body) => {
    withScaffold((root) => assertRejectedWithoutMutation(root, body), body);
  });

  it('refuses to overwrite an existing done parent before changing the active parent or mission', () => {
    withScaffold((root) => {
      const existingDone = '# Earlier completed record\n';
      writeFileSync(join(root, donePath), existingDone);
      const result = close(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('refusing to overwrite');
      expect(readFileSync(join(root, donePath), 'utf8')).toBe(existingDone);
      expect(readFileSync(join(root, activePath), 'utf8')).toBe(plan);
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(mission);
    });
  });

  it('preflights amendment collisions before moving the parent', () => {
    withScaffold((root) => {
      const amendment = `${slug}-amendment-1.md`;
      writeFileSync(join(root, '.osc/plans/active', amendment), '# Active amendment\n');
      writeFileSync(join(root, '.osc/plans/done', amendment), '# Existing amendment\n');
      assertRejectedWithoutMutation(root, plan);
      expect(readFileSync(join(root, '.osc/plans/done', amendment), 'utf8')).toBe('# Existing amendment\n');
      expect(readFileSync(join(root, '.osc/plans/active', amendment), 'utf8')).toBe('# Active amendment\n');
    });
  });
});


const anchor = '<!-- append YYYY-MM-DD entries below this line -->';

function shellDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function withShellNavigation(stage: string, run: (root: string, oldPath: string, amendment: string, parent: string) => void) {
  withScaffold((root) => {
    expect(spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root }).status).not.toBe(0);
    for (const folder of ['backlog', 'blocked']) mkdirSync(join(root, '.osc/plans', folder));
    writeFileSync(join(root, 'amend.sh'), readFileSync(join(repoRoot, 'amend.sh')));
    const prefix = stage === 'root' ? '.osc/plans/' : `.osc/plans/${stage === 'prior-stage' ? 'active' : stage}/`;
    if (stage !== 'active' && stage !== 'prior-stage') renameSync(join(root, activePath), join(root, `${prefix}${slug}.md`));
    const amended = spawnSync('/bin/bash', ['amend.sh', slug, '--message', '  Scope changed  '], { cwd: root, encoding: 'utf8' });
    expect(amended.status, amended.stderr).toBe(0);
    const oldPath = `${prefix}${slug}-amendment-1.md`;
    const amendment = readFileSync(join(root, oldPath), 'utf8');
    if (stage === 'prior-stage') execFileSync(tsx, [cli, 'plan', 'move', slug, '--to', 'blocked'], { cwd: root });
    const parentPath = stage === 'prior-stage' ? `.osc/plans/blocked/${slug}.md` : `${prefix}${slug}.md`;
    run(root, oldPath, amendment, readFileSync(join(root, parentPath), 'utf8'));
  });
}

function installMissionObject(root: string, before: string, kind: string, mode: number) {
  const path = join(root, 'MISSION.md');
  const shared = join(root, 'shared-mission.md');
  rmSync(path);
  if (kind === 'symlink') { writeFileSync(shared, before); symlinkSync('shared-mission.md', path); }
  else { writeFileSync(path, before); if (kind === 'hardlink') linkSync(path, shared); }
  chmodSync(path, mode);
  return { path, shared, object: statSync(path), entry: lstatSync(path) };
}

function assertMissionIdentity(file: ReturnType<typeof installMissionObject>, kind: string, mode: number) {
  const object = statSync(file.path);
  const entry = lstatSync(file.path);
  expect([object.dev, object.ino, object.mode & 0o777]).toEqual([file.object.dev, file.object.ino, mode]);
  expect([entry.dev, entry.ino, entry.isSymbolicLink()]).toEqual([file.entry.dev, file.entry.ino, kind === 'symlink']);
  if (kind === 'symlink') expect(readlinkSync(file.path)).toBe('shared-mission.md');
  if (kind !== 'regular') {
    expect(readFileSync(file.shared)).toEqual(readFileSync(file.path));
    expect([statSync(file.shared).dev, statSync(file.shared).ino]).toEqual([file.object.dev, file.object.ino]);
  }
  if (kind === 'hardlink') expect(object.nlink).toBe(file.object.nlink);
}

describe('shell generated terminal navigation', () => {
  it.each(['active', 'backlog', 'blocked', 'root', 'prior-stage'].flatMap((stage) => ['\n', '\r\n'].map((ending) => ({ stage, ending }))))(
    'repairs supported $stage paths with $ending and leaves excluded fields intact', ({ stage, ending }) => {
      withShellNavigation(stage, (root, oldPath, amendment, parent) => {
        const name = `${slug}-amendment-1.md`;
        const parentOld = oldPath.replace('-amendment-1', '');
        const sourceStage = stage === 'root' ? '' : `${stage === 'prior-stage' ? 'blocked' : stage}/`;
        const otherStage = stage === 'backlog' ? 'active' : 'backlog';
        const second = `${slug}-amendment-2.md`;
        writeFileSync(join(root, `.osc/plans/${sourceStage}${second}`), 'Second amendment.\r\n');
        const alias = `.osc/plans/${otherStage}/${name}`;
        const directoryAlias = `.osc/plans/${otherStage}/${slug}.md`;
        const dangling = `.osc/plans/${otherStage}/${second}`;
        writeFileSync(join(root, alias), 'Surviving alias.\n');
        mkdirSync(join(root, directoryAlias));
        symlinkSync('absent.md', join(root, dangling));
        const rows = [
          `- 2026-10-01: Amendment — see ${oldPath}\t  `,
          `- 2026-10-02: Parent — see ${parentOld}`,
          `- 2026-10-03: Prior alias — see .osc/plans/blocked/${second}`,
        ];
        const excluded = [
          `- 2026-10-04: Basename — see ${name}`,
          `- 2026-10-04: Prose recorded ${oldPath} at the time.`,
          `- 2026-10-04: External — see https://example.invalid/${oldPath}`,
          `- 2026-10-04: Unmoved — see .osc/plans/active/002-other.md`,
          ...['.bak', '?view=1', '#detail', ' for the old location.'].map((suffix) => `- 2026-10-04: Suffix — see ${oldPath}${suffix}`),
          `- 2026-10-04: Inline — see \`${oldPath}\``,
          `- 2026-10-04: Alias — see ${alias}`,
          `- 2026-10-04: Directory — see ${directoryAlias}`,
          `- 2026-10-04: Dangling — see ${dangling}`,
          `- 2026-10-04: Longer filename — see ${oldPath.replace('.md', '-extra.md')}`,
        ];
        const outside = `- 2026-09-30: Outside — see ${oldPath}`;
        const before = ['# Mission', 'Navigation fixture.', outside, '~~~~markdown', '## Changelog', outside, '~~~~~',
          '## Changelog ###', anchor, '## \t  ', ...rows, ...excluded,
          '````markdown', outside, '```', '## Fenced heading', outside, '~~~~', '```` prose', outside, '`````', '## Later', outside].join(ending);
        writeFileSync(join(root, 'MISSION.md'), before);
        const repaired = before.replace(rows[0], rows[0].replace(oldPath, `.osc/plans/done/${name}`))
          .replace(rows[1], rows[1].replace(parentOld, donePath))
          .replace(rows[2], rows[2].replace(`.osc/plans/blocked/${second}`, `.osc/plans/done/${second}`));
        const result = close(root, '--message', '  shipped  ');
        expect(result.status, result.stderr).toBe(0);
        expect(result.stdout).toContain(`Moved to done/: ${slug}.md ${name} ${second}`);
        expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(repaired.replace(`${anchor}${ending}`, `${anchor}${ending}- ${shellDate()}: closed ${slug} —   shipped  \n`));
        expect(readFileSync(join(root, `.osc/plans/done/${name}`), 'utf8')).toBe(amendment);
        expect(readFileSync(join(root, `.osc/plans/done/${second}`), 'utf8')).toBe('Second amendment.\r\n');
        expect(readFileSync(join(root, donePath), 'utf8')).toBe(parent.replace(/^(active|backlog|blocked)$/m, 'done'));
        const after = readFileSync(join(root, 'MISSION.md'), 'utf8');
        expect(close(root, '--message', 'repeat').status).toBe(0);
        expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(after);
      });
    },
  );

  it('keeps moved symlinks in the complete lexical list without retargeting their fields', () => {
    withShellNavigation('active', (root) => {
      const ten = `${slug}-amendment-10.md`;
      const two = `${slug}-amendment-2.md`;
      writeFileSync(join(root, `.osc/plans/active/${ten}`), 'Regular.\n');
      writeFileSync(join(root, 'target.md'), 'Link target.\n');
      symlinkSync(join(root, 'target.md'), join(root, `.osc/plans/active/${two}`));
      const regular = `- 2026-10-02: Regular — see .osc/plans/active/${ten}`;
      const excluded = `- 2026-10-03: Symlink — see .osc/plans/active/${two}`;
      const before = `# Mission\nFixture.\n## Changelog\n${anchor}\n${regular}\n${excluded}\n`;
      writeFileSync(join(root, 'MISSION.md'), before);
      const result = close(root);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain(`Moved to done/: ${slug}.md ${slug}-amendment-1.md ${ten} ${two}`);
      expect(lstatSync(join(root, `.osc/plans/done/${two}`)).isSymbolicLink()).toBe(true);
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(before.replace(regular, regular.replace('/active/', '/done/')).replace(`${anchor}\n`, `${anchor}\n- ${shellDate()}: closed ${slug}\n`));
    });
  });

  it.each(['\n', '\r\n'])('keeps duplicate anchors, EOF-anchor separation and fenced-only Changelog with %j', (ending) => {
    withScaffold((root) => {
      const pointer = `- 2026-10-02: Fenced — see ${activePath}`;
      const before = ['# Mission', 'Fixture.', '```markdown', '## Changelog', pointer, '```', anchor, anchor].join(ending);
      writeFileSync(join(root, 'MISSION.md'), before);
      expect(close(root).status).toBe(0);
      const entry = `- ${shellDate()}: closed ${slug}\n`;
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(before.replace(`${anchor}${ending}`, `${anchor}${ending}${entry}`).replace(new RegExp(`${anchor}$`), `${anchor}\n${entry}`));
    });
  });

  it.each(['regular', 'symlink', 'hardlink'].flatMap((kind) => [false, true].map((repair) => ({ kind, repair }))))(
    'retains no-anchor $kind metadata and shared content with repair $repair', ({ kind, repair }) => {
      for (const mode of [0o644, 0o600, 0o755]) withScaffold((root) => {
        const historical = repair ? `- 2026-10-02: History — see ${activePath}\t  ` : 'Historical prose.\t  ';
        const before = `# Mission\r\nFixture.\r\n## Changelog\r\n${historical}`;
        const file = installMissionObject(root, before, kind, mode);
        const result = close(root);
        expect(result.status, result.stderr).toBe(0);
        expect(readFileSync(file.path, 'utf8')).toBe(`${repair ? before.replace(activePath, donePath) : before}\n- ${shellDate()}: closed ${slug}\n`);
        assertMissionIdentity(file, kind, mode);
      });
    },
  );

  it('keeps shell readiness ahead of collisions and then refuses the first lexical collision', () => {
    withScaffold((root) => {
      for (const name of [`${slug}-amendment-10.md`, `${slug}-amendment-2.md`]) {
        writeFileSync(join(root, `.osc/plans/active/${name}`), 'Active.\n');
        writeFileSync(join(root, `.osc/plans/done/${name}`), 'Existing.\n');
      }
      writeFileSync(join(root, 'MISSION.md'), '# Mission\nmission:unset\n');
      const unready = close(root);
      expect(unready.status).toBe(1);
      expect(unready.stderr).toBe('Error: MISSION.md must exist and define the mission before closing a plan.\n');
      writeFileSync(join(root, 'MISSION.md'), mission);
      const collision = close(root);
      expect(collision.status).toBe(1);
      expect(collision.stderr).toBe(`Error: refusing to overwrite existing done plan file: ${slug}-amendment-10.md\n`);
      expect(readFileSync(join(root, activePath), 'utf8')).toBe(plan);
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(mission);
    });
  });
});

// Deterministic command-boundary faults in disposable fixtures, not physical
// ENOSPC or atomic recovery tests. Plans have moved before history staging.
const faultHook = String.raw`mktemp() {
  if [ "$#" -gt 0 ]; then /usr/bin/mktemp "$@"; return $?; fi
  case "$CLOSE_FAULT" in
    temp) builtin printf 'temp\n' >> "$CLOSE_LOG"; return 75 ;;
    output) builtin printf 'output\n' >> "$CLOSE_LOG"; builtin printf '%s\n' "$CLOSE_DIRECTORY" ;;
    input) local result; result=$(/usr/bin/mktemp) || return; chmod 000 "$CLOSE_MISSION"; builtin printf 'input\n' >> "$CLOSE_LOG"; builtin printf '%s\n' "$result" ;;
    *) /usr/bin/mktemp ;;
  esac
}
printf() {
  local fmt="$1"; local text=""
  if [ "$#" -ge 2 ]; then text="$2"; fi
  if [ "$fmt" = -- ]; then fmt="$2"; text="$3"; fi
  if { [ "$CLOSE_FAULT" = history ] && [ "$fmt" = '%s%s' ] && [[ "$text" == *FAULT-HISTORY* ]]; } ||
     { [ "$CLOSE_FAULT" = separator ] && [ "$fmt" = '\n' ]; } ||
     { [ "$CLOSE_FAULT" = entry ] && [ "$fmt" = '- %s\n' ]; }; then
    builtin printf '%s\n' "$CLOSE_FAULT" >> "$CLOSE_LOG"
    builtin printf 'PARTIAL-RENDER'
    return 74
  fi
  if [ "$fmt" = '\n- %s\n' ]; then builtin printf 'append\n' >> "$CLOSE_LOG"; fi
  builtin printf "$@"
}
cat() {
  builtin printf 'copy\n' >> "$CLOSE_LOG"
  if [ "$CLOSE_FAULT" = copy ]; then return 73; fi
  if [ "$CLOSE_FAULT" = partial-copy ]; then builtin printf 'PARTIAL-COPY'; return 73; fi
  /bin/cat "$@"
}
`;

const stagingFaults = [
  { fault: 'history', anchored: false, repair: true },
  { fault: 'history', anchored: true, repair: true },
  { fault: 'history', anchored: false, repair: false },
  { fault: 'history', anchored: true, repair: false },
  { fault: 'separator', anchored: true, repair: false },
  { fault: 'entry', anchored: true, repair: true },
  ...['input', 'output', 'temp'].flatMap((fault) => [
    { fault, anchored: false, repair: true },
    { fault, anchored: true, repair: true },
    { fault, anchored: false, repair: false },
  ]),
];

describe('shell refuses incomplete historical staging within partial-close boundaries', () => {
  it.each([
    ...stagingFaults.map((test) => ({ ...test, kind: 'regular' })),
    ...['regular', 'symlink', 'hardlink'].flatMap((kind) => ['copy', 'partial-copy'].map((fault) => ({ kind, fault, anchored: false, repair: true }))),
  ])('refuses $fault for $kind, anchor $anchored, repair $repair', ({ kind, fault, anchored, repair }) => {
    withScaffold((root) => {
      const row = repair ? `- 2026-10-02: FAULT-HISTORY — see ${activePath}\t  ` : 'FAULT-HISTORY prose.\t  ';
      const before = `# Mission\r\nFault fixture.\r\n## Changelog\r\n${anchored ? anchor : ''}${fault === 'separator' ? '' : `${anchored ? '\r\n' : ''}${row}`}`;
      const file = installMissionObject(root, before, kind, 0o755);
      const hook = join(root, 'fault.sh');
      const log = join(root, 'fault.log');
      writeFileSync(hook, faultHook);
      writeFileSync(log, '');
      const result = spawnSync('/bin/bash', ['close.sh', slug, '--message', '  raw message  '], {
        cwd: root, encoding: 'utf8',
        env: { ...process.env, TMPDIR: root, BASH_ENV: hook, CLOSE_FAULT: fault, CLOSE_LOG: log, CLOSE_DIRECTORY: join(root, '.osc/plans'), CLOSE_MISSION: file.path },
      });
      // The input-open hook changes fixture permission after readiness. Restore
      // it only to inspect bytes; this is fixture cleanup, not source recovery.
      if (fault === 'input') chmodSync(file.path, 0o755);
      const expected = fault === 'partial-copy' ? 'PARTIAL-COPY' : fault === 'copy' ? '' : before;
      expect.soft(result.status, result.stderr).toBe(1);
      expect.soft(result.stdout).not.toMatch(/Closed:|Stamped:/);
      expect.soft(readFileSync(file.path, 'utf8')).toBe(expected);
      expect.soft(readFileSync(log, 'utf8')).toBe(['copy', 'partial-copy'].includes(fault) ? 'copy\n' : `${fault}\n`);
      expect.soft(readFileSync(join(root, donePath), 'utf8')).toBe(plan.replace('\nactive\n', '\ndone\n'));
      expect.soft(existsSync(join(root, activePath))).toBe(false);
      assertMissionIdentity(file, kind, 0o755);
    });
  });
});


describe('Windows helper navigation portable close', () => {
  it('repairs uniform terminal fields for actual moved regular files and preserves other raw history', () => {
    withShellNavigation('prior-stage', (root, oldPath, amendment, parent) => {
      const name = `${slug}-amendment-1.md`;
      const windows = (path: string) => path.replace(/\//g, '\\');
      const paths = ['active/', 'backlog/', 'blocked/', ''].map((stage) => windows(`.osc/plans/${stage}${name}`));
      const link = `${slug}-amendment-2.md`;
      const directory = `${slug}-amendment-3.md`;
      writeFileSync(join(root, 'target.md'), 'Target remains.\n');
      symlinkSync(join(root, 'target.md'), join(root, `.osc/plans/blocked/${link}`));
      mkdirSync(join(root, `.osc/plans/blocked/${directory}`));
      const rows = [oldPath, ...paths].map((path, index) => `- 2026-10-02: History ${index} — see ${path}\t  `);
      const rejected = [
        `.osc/plans\\active\\${name}`, `.osc\\plans/active\\${name}`, `.osc\\plans\\active/${name}`,
        `C:\\${paths[0]}`, `\\\\host\\${paths[0]}`, `/${oldPath}`, `.osc\\plans\\..\\${name}`,
        `.osc\\plans\\active\\002-unmoved.md`, `.osc/plans/active/${slug}-amendment-1\\literal.md`,
        windows(`.osc/plans/blocked/${link}`), windows(`.osc/plans/blocked/${directory}`),
      ].map((path) => `- 2026-10-03: Excluded — see ${path}`);
      rejected.push(`- 2026-10-03: Inline — see \`${paths[0]}\``, `- 2026-10-03: Suffix — see ${paths[0]}#detail`, `- 2026-10-03: URL — see https://example.invalid/${paths[0]}`);
      const fenced = `- 2026-10-01: Fenced or outside — see ${paths[0]}`;
      const before = ['# Mission', 'Fixture.', fenced, '~~~~markdown', '## Changelog', fenced, '~~~~~',
        '## Changelog ###', anchor, '## \t  ', ...rows, ...rejected,
        '````markdown', fenced, '```', fenced, '`````', '## Later', fenced].join('\r\n');
      writeFileSync(join(root, 'MISSION.md'), before);
      let expected = before;
      for (const row of rows) expected = expected.replace(row, row.replace(/ — see .*?(?=[\t ]*$)/, ` — see .osc/plans/done/${name}`));
      const result = close(root, '--message', '  win shipped  ');
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain(`Moved to done/: ${slug}.md ${name} ${link}`);
      expect(existsSync(join(root, `.osc/plans/blocked/${directory}`))).toBe(true);
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(expected.replace(`${anchor}\r\n`, `${anchor}\r\n- ${shellDate()}: closed ${slug} —   win shipped  \n`));
      expect(readFileSync(join(root, `.osc/plans/done/${name}`), 'utf8')).toBe(amendment);
      expect(readFileSync(join(root, `.osc/plans/done/${slug}.md`), 'utf8')).toBe(parent.replace(/^(active|backlog|blocked)$/m, 'done'));
      const after = readFileSync(join(root, 'MISSION.md'), 'utf8');
      expect(close(root, '--message', 'repeat').status).toBe(0);
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(after);
    });
  });

  it('preserves Windows aliases and repairs an actual moved POSIX literal filename despite an unrelated normalized nested alias', () => {
    withShellNavigation('active', (root, oldPath) => {
      const rows = [`- 2026-10-02: Regular — see ${oldPath.replace(/\//g, '\\')}\t  `];
      for (const [index, kind] of ['file', 'directory', 'dangling', 'file', 'directory', 'dangling'].entries()) {
        const name = `${slug}-amendment-${index + 2}.md`;
        writeFileSync(join(root, `.osc/plans/active/${name}`), `Amendment ${index + 2}.\n`);
        const path = `.osc\\plans\\backlog\\${name}`;
        const alias = join(root, index < 3 ? path : path.replace(/\\/g, '/'));
        if (kind === 'directory') mkdirSync(alias);
        else if (kind === 'dangling') symlinkSync('absent.md', alias);
        else writeFileSync(alias, 'Surviving entry.\n');
        rows.push(`- 2026-10-03: ${kind} alias ${index} — see ${path}\t  `);
      }
      const literal = `.osc/plans/active/${slug}-amendment-8\\literal.md`;
      writeFileSync(join(root, literal), 'Literal POSIX filename.\n');
      rows.push(`- 2026-10-03: Literal — see ${literal}\t  `);
      const nestedAlias = literal.replace(/\\/g, '/');
      mkdirSync(join(root, nestedAlias, '..'));
      writeFileSync(join(root, nestedAlias), 'Unrelated nested POSIX entry.\n');
      const unrelated = '.osc/plans/active/002-unrelated\\literal.md';
      writeFileSync(join(root, unrelated), 'Unrelated literal filename.\n');
      rows.push(`- 2026-10-03: Unrelated — see ${unrelated}\t  `);
      const before = ['# Mission', 'Fixture.', '## Changelog', ...rows].join('\n');
      const object = installMissionObject(root, before, 'symlink', 0o755);
      const repaired = before.replace(rows[0], rows[0].replace(oldPath.replace(/\//g, '\\'), `.osc/plans/done/${slug}-amendment-1.md`))
        .replace(literal, `.osc/plans/done/${slug}-amendment-8\\literal.md`);
      const result = close(root);
      expect(result.status, result.stderr).toBe(0);
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(`${repaired}\n- ${shellDate()}: closed ${slug}\n`);
      expect(readFileSync(join(root, `.osc/plans/done/${slug}-amendment-8\\literal.md`), 'utf8')).toBe('Literal POSIX filename.\n');
      expect(result.stdout).toContain(`Moved to done/: ${slug}.md ${slug}-amendment-1.md ${slug}-amendment-2.md ${slug}-amendment-3.md ${slug}-amendment-4.md ${slug}-amendment-5.md ${slug}-amendment-6.md ${slug}-amendment-7.md ${slug}-amendment-8\\literal.md\n`);
      expect(readFileSync(join(root, nestedAlias), 'utf8')).toBe('Unrelated nested POSIX entry.\n');
      expect(readFileSync(join(root, unrelated), 'utf8')).toBe('Unrelated literal filename.\n');
      assertMissionIdentity(object, 'symlink', 0o755);
      const after = readFileSync(join(root, 'MISSION.md'));
      expect(close(root).status).toBe(0);
      expect(readFileSync(join(root, 'MISSION.md'))).toEqual(after);
      assertMissionIdentity(object, 'symlink', 0o755);
    });
  });

  it.each(['file', 'directory', 'dangling'])('preserves a surviving raw POSIX literal filename alias of kind %s', (kind) => {
    withShellNavigation('active', (root) => {
      const name = `${slug}-amendment-9\\literal.md`;
      const old = `.osc/plans/backlog/${name}`;
      writeFileSync(join(root, `.osc/plans/active/${name}`), 'Actual moved literal filename.\n');
      if (kind === 'directory') mkdirSync(join(root, old));
      else if (kind === 'dangling') symlinkSync('absent.md', join(root, old));
      else writeFileSync(join(root, old), 'Surviving raw POSIX alias.\n');
      const before = `# Mission\nFixture.\n## Changelog\n${anchor}\n- 2026-10-03: Raw alias — see ${old}\t  `;
      writeFileSync(join(root, 'MISSION.md'), before);
      const result = close(root);
      expect(result.status, result.stderr).toBe(0);
      expect(readFileSync(join(root, 'MISSION.md'), 'utf8')).toBe(before.replace(`${anchor}\n`, `${anchor}\n- ${shellDate()}: closed ${slug}\n`));
      expect(readFileSync(join(root, `.osc/plans/done/${name}`), 'utf8')).toBe('Actual moved literal filename.\n');
      const entry = lstatSync(join(root, old));
      expect([entry.isFile(), entry.isDirectory(), entry.isSymbolicLink()]).toEqual([kind === 'file', kind === 'directory', kind === 'dangling']);
      if (kind === 'file') expect(readFileSync(join(root, old), 'utf8')).toBe('Surviving raw POSIX alias.\n');
      if (kind === 'dangling') expect(readlinkSync(join(root, old))).toBe('absent.md');
    });
  });
});
