import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

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
