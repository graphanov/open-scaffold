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

  it('checks out workflows without repository token credentials', () => {
    for (const workflowPath of [
      '.github/workflows/ci.yml',
      '.github/workflows/plan-validate.yml',
      '.github/workflows/evidence-validate.yml',
      '.github/workflows/publish-npm.yml',
      '.github/workflows/stale-plans.yml',
    ]) {
      const workflow = read(workflowPath);

      expect(workflow).not.toContain('actions/checkout');
      expect(workflow).toContain("GIT_TERMINAL_PROMPT=0 git -c credential.helper= fetch --no-tags --prune origin '+refs/heads/*:refs/remotes/origin/*' '+refs/tags/*:refs/tags/*'");
      expect(workflow).toContain('refs/pull/${{ github.event.pull_request.number }}/merge:refs/remotes/pull/${{ github.event.pull_request.number }}/merge');
      expect(workflow).toContain('git checkout --force "$GITHUB_SHA"');
    }
  });
});
