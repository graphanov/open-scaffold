import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

interface PackedFile {
  path: string;
}

interface PackResult {
  filename: string;
  files: PackedFile[];
}

const repoRoot = resolve(process.cwd());

describe('npm package payload', () => {
  it('ships package/template assets without product dogfood plan and release history', () => {
    const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const [pack] = JSON.parse(output) as PackResult[];
    const paths = pack.files.map((file) => file.path).sort();

    expect(paths).toContain('.osc/.gitignore');
    expect(paths).toContain('.osc/cockpit.example.json');
    expect(paths).toContain('.osc/RULES.md');
    expect(paths).toContain('.osc/plans/WORKFLOW.md');
    expect(paths).toContain('.osc/plans/README.md');
    expect(paths).toContain('.osc/plans/handoff-template.md');
    expect(paths).toContain('.osc/releases/README.md');
    expect(paths).toContain('.devcontainer/devcontainer.json');
    expect(paths).toContain('.devcontainer/Dockerfile');
    expect(paths).toContain('.devcontainer/README.md');
    expect(paths).toContain('dist/cli.js');
    expect(paths).toContain('dist/mcp-cli.js');
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

  it('runs init successfully from an extracted npm tarball', () => {
    const packDir = mkdtempSync(join(tmpdir(), 'open-scaffold-pack-'));
    const extractDir = mkdtempSync(join(tmpdir(), 'open-scaffold-extract-'));
    const target = mkdtempSync(join(tmpdir(), 'open-scaffold-init-'));

    try {
      const output = execFileSync('npm', ['pack', '--json', '--pack-destination', packDir], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const [pack] = JSON.parse(output) as PackResult[];
      const tarball = resolve(packDir, pack.filename);

      execFileSync('tar', ['-xzf', tarball, '-C', extractDir], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const packageDir = join(extractDir, 'package');
      expect(existsSync(join(packageDir, '.osc/.gitignore')) || existsSync(join(packageDir, '.osc/.npmignore'))).toBe(true);

      execFileSync('node', [join(packageDir, 'dist/cli.js'), 'init', '--tier', 'min', '--target', target], {
        cwd: packageDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const ignore = readFileSync(join(target, '.osc/.gitignore'), 'utf8');
      expect(ignore).toContain('tasks.db*');
      expect(ignore).toContain('cockpit.json');
      expect(existsSync(join(target, '.osc/cockpit.example.json'))).toBe(true);
    } finally {
      rmSync(packDir, { recursive: true, force: true });
      rmSync(extractDir, { recursive: true, force: true });
      rmSync(target, { recursive: true, force: true });
    }
  }, 40_000);
});
