import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function makeMinimalScaffold(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, '.osc/plans/backlog'), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nDefined.\n');
  writeFileSync(join(root, '.osc/releases/README.md'), '# Evidence notes\n');
  writeFileSync(join(root, 'verify.sh'), readFileSync(join(repoRoot, 'verify.sh')));
  const git = spawnSync('git', ['init'], { cwd: root, encoding: 'utf8' });
  expect(git.status).toBe(0);
  return root;
}

const validPlanBody = `# Plan: malicious filename fixture

## Status

backlog

## Context

Fixture for verifier path handling.

## Goal

Exercise strict verification path handling.

## Constraints / Out of scope

- Fixture only.

## Files to touch

- None.

## Acceptance criteria

- Strict verification completes without executing filename content.

## Verification steps

1. Run verify.

## Open questions

- None.
`;

describe('verification help flags', () => {
  it('prints shell verifier help without running checks', () => {
    const result = spawnSync('bash', ['verify.sh', '--help'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: ./verify.sh [--quick|--standard|--strict] [--quiet] [--help]');
    expect(result.stdout).toContain('Exit codes:');
    expect(result.stdout).not.toContain('Unknown flag');
    expect(result.stdout).not.toContain('open-scaffold compliance check');
  });

  it('prints CLI verifier help without running checks', () => {
    const result = spawnSync(tsx, [cli, 'verify', '--help'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: osc verify');
    expect(result.stdout).toContain('--evidence-chain');
    expect(result.stdout).toContain('--plan <slug>');
    expect(result.stdout).toContain('--json');
    expect(result.stdout).toContain('--strict');
    expect(result.stdout).not.toContain('PASS mission defined');
    expect(result.stdout).not.toContain('WARN ');
  });

  it('rejects unsupported CLI verifier options instead of silently ignoring them', () => {
    const result = spawnSync(tsx, [cli, 'verify', '--json'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('--json is only supported with --evidence-chain');
    expect(result.stderr).toContain('Usage: osc verify');
    expect(result.stderr).not.toContain('PASS mission defined');
  });

  it('does not execute Python source injected through strict plan filenames', () => {
    const root = makeMinimalScaffold('open-scaffold-verify-quoting-');
    try {
      const maliciousName = "001-a',open('PWNED','w').write('x'),'b.md";
      writeFileSync(join(root, '.osc/plans/backlog', maliciousName), validPlanBody);

      const result = spawnSync('bash', ['verify.sh', '--strict'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Plan immutability intact');
      expect(existsSync(join(root, 'PWNED'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('requires strict plan sections by exact front-anchored canonical heading names', () => {
    const root = makeMinimalScaffold('open-scaffold-verify-sections-');
    try {
      const trickyPlan = validPlanBody
        .replace('## Status\n\nbacklog\n\n', '')
        .replace('## Context', '```markdown\n## Context\n```\n\n## My Context Notes');
      writeFileSync(join(root, '.osc/plans/backlog/001-tricky-sections.md'), trickyPlan);

      const result = spawnSync('bash', ['verify.sh', '--strict'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('missing section: Status');
      expect(result.stdout).toContain('missing section: Context');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('accepts CRLF plans without reporting canonical sections as missing', () => {
    const root = makeMinimalScaffold('open-scaffold-verify-crlf-');
    try {
      const crlfPlan = validPlanBody.replace(/\n/g, '\r\n');
      writeFileSync(join(root, '.osc/plans/backlog/001-crlf.md'), crlfPlan);

      const result = spawnSync('bash', ['verify.sh', '--strict'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(result.stdout).not.toContain('missing section:');
      expect(result.stdout).toContain('0 warn');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('requires release note sections by exact canonical heading names', () => {
    const root = makeMinimalScaffold('open-scaffold-verify-release-sections-');
    try {
      writeFileSync(join(root, '.osc/plans/backlog/001-valid.md'), validPlanBody);
      writeFileSync(join(root, '.osc/releases/2026-05-29-tricky.md'), `# Release / Evidence Note

\`\`\`markdown
## Summary
\`\`\`

## My Summary

Substring headings must not satisfy the local shell gate.

## Traceability

- Plan: .osc/plans/backlog/001-valid.md

## Verification

- Local fixture.

## Outcome

Fixture only.
`);

      const result = spawnSync('bash', ['verify.sh', '--strict'], { cwd: root, encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Release note 2026-05-29-tricky.md missing section: Summary');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
