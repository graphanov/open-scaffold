import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('GitHub Actions workflow templates', () => {
  it('validates changed plan files without treating amendments as full plans', () => {
    const workflow = read('.github/workflows/plan-validate.yml');

    expect(workflow).toContain("'.osc/plans/active/*.md'");
    expect(workflow).toContain('*-amendment-[0-9]*.md) continue ;;');
    expect(workflow).toContain('node dist/cli.js plan validate "$plan"');
  });

  it('detects non-numbered plan slugs for structural PR checks', () => {
    const workflow = read('.github/workflows/open-scaffold-pr-check.yml');

    expect(workflow).toContain('123-my-slice or first-work-record');
    expect(workflow).toContain("grep -E '^\\.osc/plans/(active|backlog|blocked|done)/[A-Za-z0-9][A-Za-z0-9._-]*\\.md$'");
    expect(workflow).not.toContain("grep -E '^\\.osc/plans/(active|backlog|blocked|done)/[0-9]+-[^/]+\\.md$'");
    expect(workflow).toContain("grep -v -- '-amendment-'");
  });

  it('keeps the stale active plans workflow on maintained CLI surfaces', () => {
    const workflow = read('.github/workflows/stale-plans.yml');

    expect(workflow).toContain('node dist/cli.js status --json > scaffold-status.json');
    expect(workflow).not.toContain('node dist/cli.js metrics');
    expect(workflow).not.toContain('scaffold-metrics.json');
  });

  it('checks out workflows with authenticated fetch and public fallback', () => {
    for (const workflowPath of [
      '.github/workflows/ci.yml',
      '.github/workflows/plan-validate.yml',
      '.github/workflows/evidence-validate.yml',
      '.github/workflows/publish-npm.yml',
      '.github/workflows/stale-plans.yml',
    ]) {
      const workflow = read(workflowPath);

      expect(workflow).not.toContain('actions/checkout');
      expect(workflow).toContain('server_url="${GITHUB_SERVER_URL:-https://github.com}"');
      expect(workflow).toContain('git remote add origin "${server_url}/${GITHUB_REPOSITORY}.git"');
      expect(workflow).toContain('GITHUB_TOKEN: ${{ github.token }}');
      expect(workflow).toContain('http.${server_url}/.extraheader=AUTHORIZATION: basic ${auth_header}');
      expect(workflow).toContain('falling back to public unauthenticated fetch');
      expect(workflow).toContain("fetch_with_fallback repository --no-tags --prune origin '+refs/heads/*:refs/remotes/origin/*' '+refs/tags/*:refs/tags/*'");
      expect(workflow).toContain('refs/pull/${{ github.event.pull_request.number }}/merge:refs/remotes/pull/${{ github.event.pull_request.number }}/merge');
      expect(workflow).toContain('git checkout --force "$GITHUB_SHA"');
    }
  });
});


const repoRoot = resolve(import.meta.dirname, '..');
const evidenceWorkflow = join(repoRoot, '.github/workflows/evidence-validate.yml');
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
  ...embeddedPendingTokens.map((token) => ({ token, evidence: 'issue #293 closed', fails: false })),
  ...closureEvidence.flatMap((evidence) => standalonePendingTokens.map((token) => ({ token, evidence, fails: true }))),
  ...[...embeddedPendingTokens, ...standalonePendingTokens].map((token) => ({ token, evidence: 'Local checks only.', fails: false })),
];
const fixturePath = '.osc/releases/2026-10-08-fixture.md';
const pendingCiFailure = `${fixturePath}: says pending while citing merged/closed/released evidence`;

function extractEvidenceChecker(): string {
  const workflow = readFileSync(evidenceWorkflow, 'utf8');
  const blocks = [...workflow.matchAll(/^          python3 <<'PY'\r?\n([\s\S]*?)^          PY\r?$/gm)];
  expect(blocks).toHaveLength(1);
  return blocks[0][1].replace(/^ {10}/gm, '');
}

function runEvidenceChecker(notes: Record<string, string>, changedPaths = Object.keys(notes)) {
  const checker = extractEvidenceChecker();
  const root = mkdtempSync(join(tmpdir(), 'open-scaffold-evidence-checker-'));
  try {
    for (const [path, note] of Object.entries(notes)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), note);
    }
    writeFileSync(join(root, 'changed-evidence.txt'), `${changedPaths.join('\n')}\n`);
    return spawnSync('python3', ['-'], { cwd: root, encoding: 'utf8', input: checker });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function pendingCiNote(token: string, evidence: string): string {
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

describe('actual changed-evidence workflow Python checker', () => {
  it.each(pendingCases)('$token with $evidence => failure $fails', ({ token, evidence, fails }) => {
    const result = runEvidenceChecker({ [fixturePath]: pendingCiNote(token, evidence) });
    expect(result.status).toBe(fails ? 1 : 0);
    expect(result.stderr).toBe(fails ? `${pendingCiFailure}\n` : '');
    expect(result.stdout).toBe(fails ? '' : 'Changed evidence notes passed section/freshness checks.\n');
  });

  it('accepts the actual 189 and 191 publication notes', () => {
    const paths = [
      '.osc/releases/2026-10-08-189-stable-handoff-budget.md',
      '.osc/releases/2026-10-08-191-evidence-pending-token.md',
    ];
    const result = runEvidenceChecker(Object.fromEntries(paths.map((path) => [path, readFileSync(join(repoRoot, path), 'utf8')])));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('Changed evidence notes passed section/freshness checks.\n');
  });

  it('keeps missing sections as failures alongside genuine stale-work evidence', () => {
    const note = pendingCiNote('pending.', 'issue #293 closed').replace('## Verification', '## Checks');
    const result = runEvidenceChecker({ [fixturePath]: note });
    expect(result.status).toBe(1);
    expect(result.stderr).toBe(`${fixturePath}: missing ## Verification\n${pendingCiFailure}\n`);
    expect(result.stdout).toBe('');
  });

  it('keeps README, blank and absent changed paths skipped', () => {
    const result = runEvidenceChecker({ '.osc/releases/README.md': 'pending. issue #293 closed' }, [
      '', '.osc/releases/README.md', '.osc/releases/removed.md',
    ]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
