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


const embeddedPendingTokens = [
  'pending_gates', 'pending_gate_ids', 'depending', 'not_pending', 'pendingStatus',
  'pending2', 'suspending', 'appending', 'impending', 'pending42', '42pending', '_pending', 'pending_',
];
const standalonePendingTokens = [
  'pending', 'PENDING', 'PeNdInG', 'pending.', '(pending)', 'pending!', 'pending?',
  'pending:', 'pending;', 'pending,', 'pending/', 'pending-issue',
];
const closureEvidence = [
  'PR #42 merged', 'issue #293 closed', 'Tag: v0.35.0',
  'GitHub Release: https://github.com/example/repo/releases/tag/v0.35.0',
];
const pendingCases = [
  ...embeddedPendingTokens.map((token) => ({ token, evidence: 'issue #293 closed', warns: false })),
  ...closureEvidence.flatMap((evidence) => standalonePendingTokens.map((token) => ({ token, evidence, warns: true }))),
  ...[...embeddedPendingTokens, ...standalonePendingTokens].map((token) => ({ token, evidence: 'Local checks only.', warns: false })),
];
const availableLocales = spawnSync('locale', ['-a'], { encoding: 'utf8' }).stdout?.split(/\r?\n/) ?? [];
const utf8Locale = availableLocales.find((locale) => /^en_US[.].*utf.?8$/i.test(locale))
  ?? availableLocales.find((locale) => /utf.?8$/i.test(locale));
const pendingLocales = ['C', ...(utf8Locale ? [utf8Locale] : [])];
const pendingShellWarning = 'Release note 2026-10-08-fixture.md still says pending while citing merged/closed/released evidence';

function pendingShellNote(token: string, evidence: string): string {
  return `# Release / Evidence Note

## Summary

${token}

## Traceability

- Plan: .osc/plans/backlog/001-valid.md

## Verification

- Local fixture.

## Outcome

${evidence}
`;
}

function runShellNote(note: string, locale: string) {
  const root = makeMinimalScaffold('open-scaffold-verify-pending-');
  try {
    writeFileSync(join(root, '.osc/plans/backlog/001-valid.md'), validPlanBody);
    writeFileSync(join(root, '.osc/releases/2026-10-08-fixture.md'), note);
    return spawnSync('bash', ['verify.sh', '--standard'], {
      cwd: root, encoding: 'utf8', env: { ...process.env, LC_ALL: locale },
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('real shell release-note freshness predicate', () => {
  it.each(pendingCases)('$token with $evidence => warning $warns', ({ token, evidence, warns }) => {
    for (const locale of pendingLocales) {
      const result = runShellNote(pendingShellNote(token, evidence), locale);
      expect(result.status, locale).toBe(0); // This freshness diagnostic remains a warning.
      expect(result.stderr, locale).toBe('');
      expect(result.stdout.includes(pendingShellWarning), locale).toBe(warns);
      expect(result.stdout, locale).not.toContain('missing section:');
    }
  });

  it('keeps unrelated release-note section warnings', () => {
    const result = runShellNote(pendingShellNote('pending.', 'issue #293 closed').replace('## Verification', '## Checks'), 'C');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(pendingShellWarning);
    expect(result.stdout).toContain('Release note 2026-10-08-fixture.md missing section: Verification');
  });
});
