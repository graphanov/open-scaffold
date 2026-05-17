import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

interface PackedFile {
  path: string;
}

interface PackResult {
  files: PackedFile[];
}

const repoRoot = resolve(process.cwd());

describe('npm package payload', () => {
  it('ships package/template assets without product dogfood plan and release history', () => {
    const output = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const [pack] = JSON.parse(output) as PackResult[];
    const paths = pack.files.map((file) => file.path).sort();

    expect(paths).toContain('.osc/RULES.md');
    expect(paths).toContain('.osc/plans/WORKFLOW.md');
    expect(paths).toContain('.osc/plans/README.md');
    expect(paths).toContain('.osc/plans/handoff-template.md');
    expect(paths).toContain('.osc/releases/README.md');
    expect(paths).toContain('dist/cli.js');
    expect(paths).toContain('README.md');

    const forbidden = paths.filter((path) =>
      path.startsWith('.osc/plans/active/') ||
      path.startsWith('.osc/plans/backlog/') ||
      path.startsWith('.osc/plans/done/') ||
      path.startsWith('.osc/plans/blocked/') ||
      /^\.osc\/releases\/2026-/.test(path)
    );

    expect(forbidden).toEqual([]);
  }, 20_000);
});
