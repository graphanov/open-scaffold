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
});
