import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
