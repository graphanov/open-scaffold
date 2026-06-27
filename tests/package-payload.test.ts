import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
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
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const commandOptions = process.platform === 'win32' ? { shell: true } : {};
const npmCache = join(tmpdir(), 'open-scaffold-npm-cache');
const npmEnv = { ...process.env, npm_config_cache: npmCache, NPM_CONFIG_CACHE: npmCache };

describe('npm package payload', () => {
  it('ships package/template assets without product dogfood plan and release history', () => {
    const output = execFileSync(npm, ['pack', '--cache', npmCache, '--dry-run', '--json'], {
      cwd: repoRoot,
      env: npmEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...commandOptions,
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
  }, 90_000);

  it('ships compare-demo, resume-demo, and proof-harness example fixtures in the published package', () => {
    const output = execFileSync(npm, ['pack', '--cache', npmCache, '--dry-run', '--json'], {
      cwd: repoRoot,
      env: npmEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...commandOptions,
    });
    const [pack] = JSON.parse(output) as PackResult[];
    const paths = pack.files.map((file) => file.path).sort();

    // compare-demo inputs must ship so `npx open-scaffold compare` works from a fresh install
    expect(paths).toContain('examples/attempt-compare/attempt-a/ac-status.json');
    expect(paths).toContain('examples/attempt-compare/attempt-a/diff.patch');
    expect(paths).toContain('examples/attempt-compare/attempt-a/rationale.txt');
    expect(paths).toContain('examples/attempt-compare/attempt-a/transcript.md');
    expect(paths).toContain('examples/attempt-compare/attempt-b/ac-status.json');
    expect(paths).toContain('examples/attempt-compare/attempt-b/diff.patch');
    expect(paths).toContain('examples/attempt-compare/attempt-b/rationale.txt');
    expect(paths).toContain('examples/attempt-compare/attempt-b/transcript.md');

    // capture hooks must ship because docs/CAPTURE.md includes copy-paste registrations.
    expect(paths).toContain('examples/hooks/ambient-hook.mjs');
    expect(paths).toContain('examples/hooks/codex-notify.mjs');
    expect(paths).toContain('examples/hooks/codex-notify.md');

    // proof harness fixture must ship so `npx open-scaffold prove compare ...` has an inspectable bounded result
    expect(paths).toContain('examples/proof/scaffold-vs-naked-codex/manifest.json');
    expect(paths).toContain('examples/proof/scaffold-vs-naked-codex/receipts/aggregate.json');
    expect(paths).toContain('examples/proof/scaffold-vs-naked-codex/prompts/scaffolded-compact-prompt.md');
    expect(paths).toContain('examples/proof/codex-token-efficient-resume/manifest.json');
    expect(paths).toContain('examples/proof/codex-token-efficient-resume/receipts/aggregate.json');
    expect(paths).toContain('examples/proof/codex-token-efficient-resume/prompts/scaffolded-resume-capsule-prompt.md');
    expect(paths).toContain('examples/proof/codex-token-efficient-resume/evidence/human-reviewer-replication-boundary.md');
    expect(paths).toContain('examples/proof/codex-token-efficient-resume/evidence/controlled-ablations-boundary.md');

    // resume-demo fixture must ship so the zero-context-resume demo works from a fresh install
    if (existsSync(join(repoRoot, 'examples', 'resume-demo'))) {
      expect(paths).toContain('examples/resume-demo/MISSION.md');
      expect(paths).toContain('examples/resume-demo/.osc/plans/active/demo-add-greeting.md');
      expect(paths).toContain('examples/resume-demo/.osc/plans/active/demo-add-greeting-amendment-1.md');
      expect(paths).toContain('examples/resume-demo/.osc/plans/done/scaffold-init.md');
      expect(paths).toContain('examples/resume-demo/.osc/releases/2026-05-10-scaffold-init.md');
      expect(paths).toContain('examples/resume-demo/expected-resume-summary.json');
    }
  }, 90_000);

  it('runs compare demo from an extracted npm tarball while invoked from a fresh external cwd', () => {
    const packDir = mkdtempSync(join(tmpdir(), 'open-scaffold-pack-'));
    const extractDir = mkdtempSync(join(tmpdir(), 'open-scaffold-extract-'));
    const freshCwd = mkdtempSync(join(tmpdir(), 'open-scaffold-fresh-cwd-'));

    try {
      const output = execFileSync(npm, ['pack', '--cache', npmCache, '--json', '--pack-destination', packDir], {
        cwd: repoRoot,
        env: npmEnv,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        ...commandOptions,
      });
      const [pack] = JSON.parse(output) as PackResult[];
      const tarball = resolve(packDir, pack.filename);

      execFileSync('tar', ['-xzf', tarball, '-C', extractDir], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const packageDir = join(extractDir, 'package');
      const compareOutput = execFileSync('node', [
        join(packageDir, 'dist/cli.js'),
        'compare',
        'examples/attempt-compare/attempt-a',
        'examples/attempt-compare/attempt-b',
      ], {
        cwd: freshCwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      expect(compareOutput).toContain('# Attempt comparison: attempt-a → attempt-b');
      expect(compareOutput).toContain('This command reads local files only. It does not spawn runtimes, promote a frontier, or approve work.');

      const proofOutput = execFileSync('node', [
        join(packageDir, 'dist/cli.js'),
        'prove',
        'compare',
        '--format',
        'markdown',
        'examples/proof/scaffold-vs-naked-codex/manifest.json',
      ], {
        cwd: freshCwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      expect(proofOutput).toContain('Bounded proof verdict: PASS');
      expect(proofOutput).toContain('usage.prompt_payload_bytes');

      const tokenProofOutput = execFileSync('node', [
        join(packageDir, 'dist/cli.js'),
        'prove',
        'compare',
        '--format',
        'markdown',
        'examples/proof/codex-token-efficient-resume/manifest.json',
      ], {
        cwd: freshCwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      expect(tokenProofOutput).toContain('Bounded proof verdict: PASS');
      expect(tokenProofOutput).toContain('usage.codex_reported_total_tokens_median');
      expect(tokenProofOutput).toContain('4.330033x');
    } finally {
      rmSync(packDir, { recursive: true, force: true });
      rmSync(extractDir, { recursive: true, force: true });
      rmSync(freshCwd, { recursive: true, force: true });
    }
  }, 90_000);

  it('runs init successfully from an extracted npm tarball', () => {
    const packDir = mkdtempSync(join(tmpdir(), 'open-scaffold-pack-'));
    const extractDir = mkdtempSync(join(tmpdir(), 'open-scaffold-extract-'));
    const target = mkdtempSync(join(tmpdir(), 'open-scaffold-init-'));

    try {
      const output = execFileSync(npm, ['pack', '--cache', npmCache, '--json', '--pack-destination', packDir], {
        cwd: repoRoot,
        env: npmEnv,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        ...commandOptions,
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

      const codexSetupOutput = execFileSync('node', [
        join(packageDir, 'dist/cli.js'),
        'capture',
        'setup',
        'codex',
        '--dry-run',
        '--json',
        '--codex-config',
        join(target, 'codex-config.toml'),
      ], {
        cwd: packageDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const codexSetup = JSON.parse(codexSetupOutput);
      const packagedCodexHook = realpathSync.native(join(packageDir, 'examples/hooks/codex-notify.mjs'));
      expect(codexSetup.results[0].hookPath).toBe(packagedCodexHook);
      expect(codexSetup.results[0].stanza).toContain(packagedCodexHook);

      const claudeSetupOutput = execFileSync('node', [
        join(packageDir, 'dist/cli.js'),
        'capture',
        'setup',
        'claude-code',
        '--dry-run',
        '--json',
        '--claude-settings',
        join(target, '.claude/settings.local.json'),
      ], {
        cwd: packageDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const claudeSetup = JSON.parse(claudeSetupOutput);
      const packagedClaudeHook = realpathSync.native(join(packageDir, 'examples/hooks/ambient-hook.mjs'));
      expect(claudeSetup.results[0].hookPath).toBe(packagedClaudeHook);
      expect(claudeSetup.results[0].command).toContain(packagedClaudeHook);

      const ignore = readFileSync(join(target, '.osc/.gitignore'), 'utf8');
      expect(ignore).toContain('tasks.db*');
      expect(ignore).toContain('cockpit.json');
      expect(existsSync(join(target, '.osc/cockpit.example.json'))).toBe(true);
    } finally {
      rmSync(packDir, { recursive: true, force: true });
      rmSync(extractDir, { recursive: true, force: true });
      rmSync(target, { recursive: true, force: true });
    }
  }, 90_000);
});
