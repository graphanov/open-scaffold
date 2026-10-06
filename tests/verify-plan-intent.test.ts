import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const slug = '001-intent.md';
const activePath = `.osc/plans/active/${slug}`;
const donePath = `.osc/plans/done/${slug}`;
const plan = `# Plan: intent fixture

## Status

active

## Context

Record intent separately from completion facts.

## Goal

Keep the original goal.

## Constraints / Out of scope

- Preserve scope.

## Files to touch

- src/example.ts

## Acceptance criteria

- [ ] The original requirement passes.
- [ ] The second requirement passes.

## Verification steps

1. Run the focused check.

## Open questions

- None.
`;

function git(root: string, ...args: string[]): void {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
}

function commit(root: string): void {
  git(root, 'add', '.');
  git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Fixture snapshot');
}

type GitLayout = 'root' | 'nested' | 'linked-nested';

function withRepo(run: (root: string) => void, body = plan, path = activePath, layout: GitLayout = 'root'): void {
  const fixtureDir = mkdtempSync(join(tmpdir(), 'open-scaffold-plan-intent-'));
  const gitRoot = layout === 'root' ? fixtureDir : join(fixtureDir, 'repository');
  const root = layout === 'root' ? gitRoot : join(gitRoot, 'subproject');
  try {
    mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
    mkdirSync(join(root, '.osc/plans/backlog'), { recursive: true });
    mkdirSync(join(root, '.osc/plans/done'), { recursive: true });
    mkdirSync(join(root, '.osc/releases'), { recursive: true });
    writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nDefined.\n');
    writeFileSync(join(root, '.osc/releases/README.md'), '# Evidence\n');
    writeFileSync(join(root, 'verify.sh'), readFileSync(join(repoRoot, 'verify.sh')));
    writeFileSync(join(root, path), body);
    git(gitRoot, 'init', '-q');
    commit(gitRoot);
    if (layout === 'linked-nested') {
      const linkedRoot = join(fixtureDir, 'linked-worktree');
      git(gitRoot, 'worktree', 'add', '--detach', linkedRoot, 'HEAD');
      run(join(linkedRoot, 'subproject'));
    } else {
      run(root);
    }
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
}

function verify(root: string): string {
  const result = spawnSync('bash', ['verify.sh', '--strict'], { cwd: root, encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe('');
  return result.stdout;
}

describe('shell verifier committed plan intent', () => {
  it('allows committed stage moves, checkbox completion, and trailing evidence facts', () => {
    withRepo((root) => {
      git(root, 'mv', activePath, donePath);
      writeFileSync(join(root, donePath), plan
        .replace('\nactive\n', '\ndone\n')
        .replace('- [ ] The original requirement passes.', '- [x] The original requirement passes. | Evidence: `.osc/releases/proof.md`, `tests/example.test.ts`'));
      commit(root);

      const output = verify(root);
      expect(output).toContain('Plan immutability intact (committed intent unchanged)');
      expect(output).not.toContain('intent was modified');
    });
  });

  it('allows real legacy stage metadata and unfenced blank-line formatting during close', () => {
    // Plans 031 and 050–059 originally used this stage-plus-metadata format.
    const legacyBody = plan.replace('\nactive\n', '\nbacklog — blocked on npm publication; implementation starts after release.\n');
    const legacyPath = `.osc/plans/backlog/${slug}`;
    withRepo((root) => {
      git(root, 'mv', legacyPath, donePath);
      writeFileSync(join(root, donePath), legacyBody
        .replace('backlog — blocked on npm publication; implementation starts after release.', 'done')
        .replace(/\n\n/g, '\n \t\n\n'));
      commit(root);

      expect(verify(root)).toContain('Plan immutability intact');
    }, legacyBody, legacyPath);
  });

  it('allows validator-compatible case-insensitive Status tokens with preserved metadata', () => {
    const originalPlan = plan.replace('\nactive\n', '\nACTIVE: factual lifecycle metadata\n');
    withRepo((root) => {
      git(root, 'mv', activePath, donePath);
      writeFileSync(join(root, donePath), originalPlan.replace('ACTIVE: factual lifecycle metadata', 'done: factual lifecycle metadata'));
      commit(root);
      expect(verify(root)).toContain('Plan immutability intact');
    }, originalPlan);
  });

  it('checks uncommitted stage moves against the original committed slug', () => {
    withRepo((root) => {
      git(root, 'mv', activePath, donePath);
      writeFileSync(join(root, donePath), plan.replace('\nactive\n', '\ndone\n'));
      expect(verify(root)).toContain('Plan immutability intact');

      writeFileSync(join(root, donePath), plan
        .replace('\nactive\n', '\ndone\n')
        .replace('Keep the original goal.', 'Replace the original goal.'));
      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);
    });
  });

  it('detects a committed stage move with a rewrite too large for Git rename matching', () => {
    const originalGoal = 'Keep every original goal requirement.\n'.repeat(120).trimEnd();
    const changedGoal = 'Discard the original goal and substitute new scope.\n'.repeat(120).trimEnd();
    const originalPlan = plan.replace('Keep the original goal.', originalGoal);
    withRepo((root) => {
      git(root, 'mv', activePath, donePath);
      writeFileSync(join(root, donePath), originalPlan
        .replace('\nactive\n', '\ndone\n')
        .replace(originalGoal, changedGoal));
      commit(root);

      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);
    }, originalPlan);
  });

  it('warns on a working-tree intent edit before it is committed', () => {
    withRepo((root) => {
      writeFileSync(join(root, activePath), plan.replace('Keep the original goal.', 'Replace the original goal.'));
      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);
    });
  });

  it('checks the staged intent even when the working tree restores the original text', () => {
    withRepo((root) => {
      writeFileSync(join(root, activePath), plan.replace('Keep the original goal.', 'Replace the original goal.'));
      git(root, 'add', activePath);
      writeFileSync(join(root, activePath), plan);
      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);
    });
  });

  it.each(['nested', 'linked-nested'] as const)('checks staged intent in a %s Git layout after the working text is restored', (layout) => {
    withRepo((root) => {
      expect(verify(root)).toContain('Plan immutability intact');
      writeFileSync(join(root, activePath), plan.replace('Keep the original goal.', 'Replace the original goal.'));
      git(root, 'add', activePath);
      writeFileSync(join(root, activePath), plan);

      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);
    }, plan, activePath, layout);
  });

  it('retains warnings for a committed intent edit that a later commit reverted', () => {
    withRepo((root) => {
      writeFileSync(join(root, activePath), plan.replace('Keep the original goal.', 'Replace the original goal.'));
      commit(root);
      writeFileSync(join(root, activePath), plan);
      commit(root);
      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);
    });
  });

  it.each([
    ['rewritten requirement', plan.replace('The original requirement passes.', 'A weaker requirement passes.')],
    ['added requirement', plan.replace('## Verification steps', '- [ ] A new requirement passes.\n\n## Verification steps')],
    ['removed requirement', plan.replace('- [ ] The second requirement passes.\n', '')],
    ['changed Status prose', plan.replace('\nactive\n', '\nactive\n\nNew scope belongs here.\n')],
  ])('warns on %s rather than dropping the section body', (_name, changedPlan) => {
    withRepo((root) => {
      writeFileSync(join(root, activePath), changedPlan);
      commit(root);
      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);
    });
  });

  it.each(['```', '~~~'])('preserves goal content under a fenced fake Status heading (%s)', (fence) => {
    const fencedPlan = plan.replace('Keep the original goal.', `Keep the original goal.\n\n${fence}markdown\n## Status\nactive\n${fence}`);
    withRepo((root) => {
      writeFileSync(join(root, activePath), fencedPlan.replace(`## Status\nactive\n${fence}`, `## Status\nblocked\n${fence}`));
      commit(root);
      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);
    }, fencedPlan);
  });

  it('preserves blank lines and capitalization inside fenced goal content', () => {
    const fencedPlan = plan.replace('Keep the original goal.', '```text\nKeep the original goal.\n\nSecond line.\n```');
    withRepo((root) => {
      writeFileSync(join(root, activePath), fencedPlan.replace('goal.\n\nSecond', 'goal.\nSecond'));
      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);

      writeFileSync(join(root, activePath), fencedPlan.replace('Second line.', 'second line.'));
      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);
    }, fencedPlan);
  });

  it('preserves code-fenced acceptance examples and ordinary Evidence wording', () => {
    const examplePlan = plan.replace('- [ ] The second requirement passes.', '- [ ] The display says Evidence: was captured.\n\n```markdown\n- [ ] Example requirement. Evidence: `.osc/releases/proof.md`\n```');
    withRepo((root) => {
      writeFileSync(join(root, activePath), examplePlan.replace('Evidence: was captured.', 'Evidence: was lost.'));
      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);

      writeFileSync(join(root, activePath), examplePlan.replace('- [ ] Example requirement.', '- [x] Example requirement.'));
      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);
    }, examplePlan);
  });

  it.each([
    'The help text includes Evidence: report.md as a usage example.',
    'The help text includes | Evidence: report.md as a usage example.',
    'The literal is `text | Evidence: `report.md`',
    'The literal is `` | Evidence: `report.md` ``.',
  ])('does not erase requirement prose or inline-code examples: %s', (criterion) => {
    const originalPlan = plan.replace('The original requirement passes.', criterion);
    withRepo((root) => {
      writeFileSync(join(root, activePath), originalPlan.replace('report.md', 'different.md'));
      commit(root);
      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);
    }, originalPlan);
  });

  it('allows a reserved reference-only suffix after a requirement containing inline code', () => {
    const originalPlan = plan.replace('The original requirement passes.', 'The `Evidence: report.md` usage example works.');
    withRepo((root) => {
      writeFileSync(join(root, activePath), originalPlan.replace(
        '- [ ] The `Evidence: report.md` usage example works.',
        '- [x] The `Evidence: report.md` usage example works. | Evidence: `.osc/releases/proof.md`, https://example.invalid/proof, PR #123',
      ));
      commit(root);
      expect(verify(root)).toContain('Plan immutability intact');
    }, originalPlan);
  });

  it.each([
    ' | Evidence: `.osc/releases/proof.md` confirms success',
    ' | Evidence: `.osc/releases/proof.md`,',
    ' | Evidence: `.osc/releases/proof.md`, `',
    ' | Evidence: `.osc/releases/proof.md`; `tests/example.test.ts`',
    ' Evidence: `.osc/releases/proof.md`',
  ])('keeps malformed, prose-bearing, or unreserved annotation text significant: %s', (suffix) => {
    withRepo((root) => {
      writeFileSync(join(root, activePath), plan.replace('The original requirement passes.', `The original requirement passes.${suffix}`));
      commit(root);
      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);
    });
  });

  it('follows historical flat plan paths through subsequent stage moves', () => {
    const legacyPath = `.osc/plans/${slug}`;
    withRepo((root) => {
      git(root, 'mv', legacyPath, activePath);
      commit(root);
      git(root, 'mv', activePath, donePath);
      writeFileSync(join(root, donePath), plan.replace('\nactive\n', '\ndone\n'));
      commit(root);
      expect(verify(root)).toContain('Plan immutability intact');

      writeFileSync(join(root, donePath), plan
        .replace('\nactive\n', '\ndone\n')
        .replace('Preserve scope.', 'Expand scope.'));
      commit(root);
      expect(verify(root)).toContain(`Plan ${slug} intent was modified after initial commit`);
    }, plan, legacyPath);
  });
});
