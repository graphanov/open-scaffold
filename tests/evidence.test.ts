import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { collectEvidence, type CommandRunner } from '../src/evidence';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');
const CLI_TEST_TIMEOUT_MS = 20_000;

function tempDir(prefix = 'osc-evidence-collect-', base = tmpdir()) {
  return mkdtempSync(join(base, prefix));
}

function defineMission(target: string) {
  writeFileSync(join(target, 'MISSION.md'), [
    '# Mission',
    '',
    'Test project mission.',
    '',
    '## Goals',
    '',
    '- Test evidence collection.',
    '',
    '## Non-Goals',
    '',
    '- Do not perform runtime work.',
    '',
    '## Changelog',
    '',
    '<!-- append YYYY-MM-DD entries below this line -->',
    '',
  ].join('\n'));
}

function initializedScaffold() {
  const target = tempDir();
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });
  defineMission(target);
  execFileSync(tsx, [cli, 'plan', 'new', '001-first-task', '--stage', 'active'], { cwd: target, encoding: 'utf8' });
  execFileSync(tsx, [cli, 'evidence', 'new', '001-first-task'], { cwd: target, encoding: 'utf8' });
  return target;
}

function evidencePath(target: string) {
  const file = execFileSync('node', ['-e', "const fs=require('fs'); const f=fs.readdirSync('.osc/releases').find(x=>x.endsWith('-001-first-task.md')); console.log(f)"], { cwd: target, encoding: 'utf8' }).trim();
  return join(target, '.osc/releases', file);
}

function initGitRepo(target: string) {
  execFileSync('git', ['init'], { cwd: target, encoding: 'utf8' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: target, encoding: 'utf8' });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: target, encoding: 'utf8' });
  execFileSync('git', ['add', '.'], { cwd: target, encoding: 'utf8' });
  execFileSync('git', ['commit', '-m', 'initial scaffold'], { cwd: target, encoding: 'utf8' });
  writeFileSync(join(target, 'README.md'), '# Test\n\nChanged.\n');
  execFileSync('git', ['add', 'README.md'], { cwd: target, encoding: 'utf8' });
  execFileSync('git', ['commit', '-m', 'change readme'], { cwd: target, encoding: 'utf8' });
}

describe('osc evidence collect', () => {
  it('prints collect-specific help instead of treating --help as a slug', () => {
    const result = spawnSync(tsx, [cli, 'evidence', 'collect', '--help'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: osc evidence collect <slug> [--ci] [--dry-run] [--verbose]');
  });

  it('prints a dry-run collection block without modifying the evidence note', () => {
    const target = initializedScaffold();
    initGitRepo(target);
    const notePath = evidencePath(target);
    const before = readFileSync(notePath, 'utf8');
    const beforeMtime = statSync(notePath).mtimeMs;

    const output = execFileSync(tsx, [cli, 'evidence', 'collect', '001-first-task', '--dry-run'], { cwd: target, encoding: 'utf8' });

    expect(output).toContain('### Collected');
    expect(output).toContain('#### Verification');
    expect(output).toContain('Command: `./verify.sh --standard`');
    expect(output).toContain('#### Git context');
    expect(output).toContain('- Branch:');
    expect(output).toContain('README.md');
    expect(output).toContain('No files were written.');
    expect(readFileSync(notePath, 'utf8')).toBe(before);
    expect(statSync(notePath).mtimeMs).toBe(beforeMtime);
  }, CLI_TEST_TIMEOUT_MS);

  it('appends collected evidence while preserving existing note content and no-git context', () => {
    const target = initializedScaffold();
    const notePath = evidencePath(target);
    const before = readFileSync(notePath, 'utf8');

    const output = execFileSync(tsx, [cli, 'evidence', 'collect', '001-first-task'], { cwd: target, encoding: 'utf8' });
    const after = readFileSync(notePath, 'utf8');

    expect(output).toContain('Collected evidence: .osc/releases/');
    expect(after).toContain(before.trim());
    expect(after).toContain('### Collected');
    expect(after).toContain('no git repository detected — git context skipped');
    expect(after).toContain('PR/CI checks skipped by default');
  });

  it('reports a missing evidence skeleton before writing', () => {
    const target = tempDir();
    execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });
    defineMission(target);
    execFileSync(tsx, [cli, 'plan', 'new', '001-first-task', '--stage', 'active'], { cwd: target, encoding: 'utf8' });

    const result = spawnSync(tsx, [cli, 'evidence', 'collect', '001-first-task'], { cwd: target, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Evidence note skeleton not found for 001-first-task');
    expect(result.stderr).toContain('osc evidence new 001-first-task');
  });

  it('uses gh pr checks JSON fields supported by the GitHub CLI', () => {
    const target = initializedScaffold();
    let checksFields = '';
    const runner: CommandRunner = (command, args) => {
      const printable = [command, ...args].join(' ');
      if (command.endsWith('verify.sh')) return { commandLine: './verify.sh --standard', status: 0, stdout: 'verify pass\n', stderr: '' };
      if (command === 'git' && args[0] === 'rev-parse') return { commandLine: printable, status: 0, stdout: 'true\n', stderr: '' };
      if (command === 'git' && args[0] === 'branch') return { commandLine: printable, status: 0, stdout: 'feature/evidence\n', stderr: '' };
      if (command === 'git' && args[0] === 'log') return { commandLine: printable, status: 0, stdout: 'abc123 test\n', stderr: '' };
      if (command === 'git' && args[0] === 'diff') return { commandLine: printable, status: 0, stdout: '', stderr: '' };
      if (command === 'git' && args[0] === 'ls-files') return { commandLine: printable, status: 0, stdout: '', stderr: '' };
      if (command === 'gh' && args[0] === '--version') return { commandLine: printable, status: 0, stdout: 'gh version 2.0.0\n', stderr: '' };
      if (command === 'gh' && args[0] === 'pr' && args[1] === 'list') return { commandLine: printable, status: 0, stdout: '[]\n', stderr: '' };
      if (command === 'gh' && args[0] === 'pr' && args[1] === 'checks') {
        checksFields = args.at(-1) ?? '';
        return { commandLine: printable, status: 0, stdout: '[{"name":"ci","state":"SUCCESS","bucket":"pass"}]\n', stderr: '' };
      }
      return { commandLine: printable, status: 0, stdout: '', stderr: '' };
    };

    const result = collectEvidence('001-first-task', target, { ci: true, dryRun: true, runner });

    expect(checksFields).toBe('name,state,bucket,workflow,link,startedAt,completedAt');
    expect(checksFields).not.toContain('conclusion');
    expect(result.block).toContain('"bucket":"pass"');
  });

  it('records missing gh gracefully when CI collection is requested', () => {
    const target = initializedScaffold();
    const runner: CommandRunner = (command, args) => {
      const printable = [command, ...args].join(' ');
      if (command.endsWith('verify.sh')) return { commandLine: './verify.sh --standard', status: 0, stdout: 'verify pass\n', stderr: '' };
      if (command === 'git' && args[0] === 'rev-parse') return { commandLine: printable, status: 0, stdout: 'true\n', stderr: '' };
      if (command === 'git' && args[0] === 'branch') return { commandLine: printable, status: 0, stdout: 'feature/evidence\n', stderr: '' };
      if (command === 'git' && args[0] === 'log') return { commandLine: printable, status: 0, stdout: 'abc123 test\n', stderr: '' };
      if (command === 'git' && args[0] === 'diff') return { commandLine: printable, status: 0, stdout: 'M\tREADME.md\n', stderr: '' };
      if (command === 'gh') return { commandLine: printable, status: null, stdout: '', stderr: '', error: 'spawn gh ENOENT' };
      return { commandLine: printable, status: 0, stdout: '', stderr: '' };
    };

    const result = collectEvidence('001-first-task', target, {
      ci: true,
      dryRun: true,
      now: new Date('2026-05-20T12:00:00.000Z'),
      runner,
    });

    expect(result.written).toBe(false);
    expect(result.block).toContain('### Collected 2026-05-20T12:00:00.000Z');
    expect(result.block).toContain('gh CLI not available — PR and CI checks skipped');
    expect(result.block).toContain('M\tREADME.md');
  });

  it('records unauthenticated gh without dumping auth prompts into evidence', () => {
    const target = initializedScaffold();
    const runner: CommandRunner = (command, args) => {
      const printable = [command, ...args].join(' ');
      if (command.endsWith('verify.sh')) return { commandLine: './verify.sh --standard', status: 0, stdout: 'verify pass\n', stderr: '' };
      if (command === 'git' && args[0] === 'rev-parse') return { commandLine: printable, status: 0, stdout: 'true\n', stderr: '' };
      if (command === 'git' && args[0] === 'branch') return { commandLine: printable, status: 0, stdout: 'feature/evidence\n', stderr: '' };
      if (command === 'git' && args[0] === 'log') return { commandLine: printable, status: 0, stdout: 'abc123 test\n', stderr: '' };
      if (command === 'git' && args[0] === 'diff') return { commandLine: printable, status: 0, stdout: '', stderr: '' };
      if (command === 'git' && args[0] === 'ls-files') return { commandLine: printable, status: 0, stdout: '', stderr: '' };
      if (command === 'git' && args[0] === 'remote') return { commandLine: printable, status: 0, stdout: 'https://github.com/example/project.git\n', stderr: '' };
      if (command === 'gh' && args[0] === '--version') return { commandLine: printable, status: 0, stdout: 'gh version 2.0.0\n', stderr: '' };
      if (command === 'gh' && args[0] === 'auth') {
        return {
          commandLine: printable,
          status: 1,
          stdout: '',
          stderr: 'To get started with GitHub CLI, please run: gh auth login\n',
        };
      }
      throw new Error(`unexpected command: ${printable}`);
    };

    const result = collectEvidence('001-first-task', target, { ci: true, dryRun: true, runner });

    expect(result.block).toContain('gh CLI installed but not authenticated for github.com — PR and CI checks skipped');
    expect(result.block).toContain('gh auth login --hostname github.com');
    expect(result.block).not.toContain('To get started with GitHub CLI');
  });

  it('checks gh auth against the current remote host before collecting PR and CI data', () => {
    const target = initializedScaffold();
    let authArgs: string[] = [];
    const runner: CommandRunner = (command, args) => {
      const printable = [command, ...args].join(' ');
      if (command.endsWith('verify.sh')) return { commandLine: './verify.sh --standard', status: 0, stdout: 'verify pass\n', stderr: '' };
      if (command === 'git' && args[0] === 'rev-parse') return { commandLine: printable, status: 0, stdout: 'true\n', stderr: '' };
      if (command === 'git' && args[0] === 'branch') return { commandLine: printable, status: 0, stdout: 'feature/evidence\n', stderr: '' };
      if (command === 'git' && args[0] === 'log') return { commandLine: printable, status: 0, stdout: 'abc123 test\n', stderr: '' };
      if (command === 'git' && args[0] === 'diff') return { commandLine: printable, status: 0, stdout: '', stderr: '' };
      if (command === 'git' && args[0] === 'ls-files') return { commandLine: printable, status: 0, stdout: '', stderr: '' };
      if (command === 'git' && args[0] === 'remote') return { commandLine: printable, status: 0, stdout: 'git@github.enterprise.test:owner/repo.git\n', stderr: '' };
      if (command === 'gh' && args[0] === '--version') return { commandLine: printable, status: 0, stdout: 'gh version 2.0.0\n', stderr: '' };
      if (command === 'gh' && args[0] === 'auth') {
        authArgs = args;
        return { commandLine: printable, status: 0, stdout: 'authenticated\n', stderr: '' };
      }
      if (command === 'gh' && args[0] === 'pr' && args[1] === 'list') return { commandLine: printable, status: 0, stdout: '[{"number":1,"state":"OPEN"}]\n', stderr: '' };
      if (command === 'gh' && args[0] === 'pr' && args[1] === 'checks') return { commandLine: printable, status: 0, stdout: '[{"name":"ci","state":"SUCCESS","bucket":"pass"}]\n', stderr: '' };
      throw new Error(`unexpected command: ${printable}`);
    };

    const result = collectEvidence('001-first-task', target, { ci: true, dryRun: true, runner });

    expect(authArgs).toEqual(['auth', 'status', '--hostname', 'github.enterprise.test']);
    expect(result.block).toContain('"number":1');
    expect(result.block).toContain('"bucket":"pass"');
  });

  it('refuses unsafe slugs and missing plans', () => {
    const target = initializedScaffold();

    expect(() => collectEvidence('../outside', target, { dryRun: true })).toThrow(/Unsafe slug/);
    expect(() => collectEvidence('999-missing', target, { dryRun: true })).toThrow(/Plan not found/);
    expect(existsSync(join(dirname(target), 'outside.md'))).toBe(false);
  });
});
