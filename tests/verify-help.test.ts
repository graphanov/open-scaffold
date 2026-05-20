import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

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
    expect(result.stdout).toBe('Usage: osc verify\n');
    expect(result.stdout).not.toContain('PASS mission defined');
    expect(result.stdout).not.toContain('WARN ');
  });

  it('rejects unsupported CLI verifier options instead of silently ignoring them', () => {
    const result = spawnSync(tsx, [cli, 'verify', '--json'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Unknown option for verify: --json');
    expect(result.stderr).toContain('Usage: osc verify');
    expect(result.stderr).not.toContain('PASS mission defined');
  });
});
