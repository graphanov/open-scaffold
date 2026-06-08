import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempScaffold(prefix = 'osc-cli-harness-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', root], { encoding: 'utf8' });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nCLI harness test repo.\n', 'utf8');
  return root;
}

describe('CLI harness backend', () => {
  it('top-level help presents $interview, $plan, $work, and $team as the primary harness UX', () => {
    const result = spawnSync(tsx, [cli, '--help'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Harness command surface');
    for (const command of ['$interview', '$plan', '$work', '$team']) {
      expect(result.stdout).toContain(command);
    }
    expect(result.stdout).toContain('osc harness');
  });

  it('invokes the router safely through quoted $commands for shell/CI tests', () => {
    const root = tempScaffold();
    const result = spawnSync(tsx, [cli, 'harness', '$work "CLI smoke" --context "repo truth"', '--json'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const parsed = JSON.parse(result.stdout);
    expect(parsed.command).toBe('work');
    expect(parsed.status.state).toBe('ready');
    expect(existsSync(join(root, `.osc/runs/${parsed.runId}/run.json`))).toBe(true);
  });

  it('records and analyzes feedback through backend commands', () => {
    const root = tempScaffold();
    const work = JSON.parse(execFileSync(tsx, [cli, 'harness', '$work "feedback smoke" --context "repo truth"', '--json'], { cwd: root, encoding: 'utf8' }));

    const record = JSON.parse(execFileSync(tsx, [
      cli, 'feedback', 'record', work.runId,
      '--source', 'reviewer',
      '--verdict', 'retry',
      '--scope', 'run',
      '--what-happened', 'Reviewer found unsupported proof wording.',
      '--why-it-matters', 'Docs must not overclaim benchmark proof.',
      '--repair-hypothesis', 'Downgrade proof wording and cite aggregate paths.',
      '--evidence-path', `.osc/runs/${work.runId}/run.json`,
      '--next-action', 'retry',
      '--json',
    ], { cwd: root, encoding: 'utf8' }));
    expect(record.record.source).toBe('reviewer');

    const analysis = JSON.parse(execFileSync(tsx, [cli, 'feedback', 'analyze', work.runId, '--json'], { cwd: root, encoding: 'utf8' }));
    expect(analysis.repairHypotheses[0].hypothesis).toContain('proof wording');
  });

  it('runs simulated benchmark and handoff-lab backend smokes', () => {
    const root = tempScaffold();
    const suite = spawnSync(tsx, [cli, 'bench', 'suite', '--mode', 'simulated', '--out', '.osc/bench/simulated-runtime-smoke'], { cwd: root, encoding: 'utf8' });
    expect(suite.status).toBe(0);
    expect(suite.stdout).toContain('.osc/bench/simulated-runtime-smoke/aggregate.json');
    expect(existsSync(join(root, '.osc/bench/simulated-runtime-smoke/aggregate.json'))).toBe(true);

    const lab = spawnSync(tsx, [cli, 'bench', 'handoff-lab', '--out', '.osc/bench/handoff-lab-15'], { cwd: root, encoding: 'utf8' });
    expect(lab.status).toBe(0);
    expect(lab.stdout).toContain('15');
    expect(existsSync(join(root, '.osc/bench/handoff-lab-15/aggregate.json'))).toBe(true);
    expect(readFileSync(join(root, '.osc/bench/handoff-lab-15/REPORT.md'), 'utf8')).toContain('candidate-only evidence');
  });
});
