import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const node = process.execPath;
const cli = resolve(repoRoot, 'src/cli.ts');
const cliArgs = ['--import', 'tsx', cli];

type HelpCase = {
  name: string;
  args: string[];
  expected: string;
  forbidden?: string;
};

const topLevelHelpSections = [
  'First-read demo:',
  'Stable core protocol:',
  'Handoff and run packages:',
  'Lab and experimental:',
  'Diagnostics and advanced:',
];

const topLevelHelpCommands = [
  'osc init --tier <min|standard|max> --target <dir> [--force]',
  'osc init --from-existing --tier min --target <dir> [--force]',
  'osc init --min|--standard|--max --target <dir> [--force]',
  'osc status [--json|--dashboard]',
  'osc plan <plan-path>',
  'osc plan new <slug> --stage <active|backlog|blocked> [--from-template <name>]',
  'osc plan new --from-template list',
  'osc plan validate <slug-or-path> [--json] [--strict]',
  'osc plan wizard <slug> [--stage <active|backlog|blocked>] [--non-interactive --answers <answers.json>]',
  'osc plan move <slug> --to <active|backlog|blocked>',
  'osc plan graph [--format <ascii|mermaid|json>] [--stage <active|backlog|all>] [--direction <downstream|upstream|both>] [--plan <slug>]',
  'osc plan stats [--json]',
  'osc amend <plan-slug> [--message <text>]',
  'osc evidence new <slug>',
  'osc evidence collect <slug> [--ci] [--dry-run] [--verbose]',
  'osc close <plan-slug> [--message <text>]',
  'osc trace <plan-slug> [--json] [--include-unverified]',
  'osc verify [--evidence-chain [--plan <slug>] [--json] [--strict]]',
  'osc start <plan-slug-or-path> --runtime <codex|omx|plain|human|custom>',
  'osc delegate <plan-path> [run binding options]',
  'osc run <plan-path> [--dry-run] [--json] [run binding options]',
  'osc dispatch <run-json> --adapter <adapter-id>',
  'osc work <task-description> --runtime <preset> --dry-run [--json] [--adapter <adapter-id>]',
  'osc review <plan-path> [run binding options]',
  'osc ultrareview <plan-path> [run binding options]',
  'osc task new <title> [--priority <high|medium|low>] [--plan <slug>]',
  'osc task list [--status <status>] [--priority <priority>] [--plan <slug>] [--json]',
  'osc task show <task-id>',
  'osc task claim|start|complete|cancel <task-id>',
  'osc task block <task-id> --reason <text>',
  'osc task comment <task-id> <comment>',
  'osc task link <task-id> --plan <slug>',
  'osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]',
  'osc eval init <run-or-plan> [--out <path>]',
  'osc eval import <run-or-plan> --adapter 2000m-v1 --scorer <scorer-json> [--out <path>]',
  'osc eval check <evaluation-path>',
  'osc audit init <run-or-plan> [--artifact <role> <path>]... [--out <path>]',
  'osc audit check <audit-manifest-path>',
  'osc evolve init <run-or-plan> [--out <dir>] [--strategy <manual|greedy|tournament|novelty|map_elites|custom>]',
  'osc evolve record <loop-dir> --run <run-packet> [--evaluation <evaluation-json>] [--receipt <dispatch-receipt.json>] [--evidence <path>]... --decision <promote|reject|retry|block> [--score <0..1>] --rationale <text>',
  'osc evolve compare <loop-dir> [--a <attempt-id|run-id|frontier>] [--b <attempt-id|run-id|frontier>] [--format <terminal|markdown|json>] [--out <path>]',
  'osc evolve analyze <loop-dir> [--format <terminal|markdown|json>] [--out <path>] [--plateau-threshold <n>]',
  'osc evolve check <loop-dir>',
  'osc cockpit config',
  'osc cockpit test [--dry-run]',
  'osc cockpit post --event <event> [--message <text>] [--run-id <id>] [--plan <slug>] [--task-id <id>] [--pr <url>] [--evidence-path <path>] [--dry-run]',
  'osc dashboard [--watch] [--interval <seconds>]',
  'osc dashboard --web [--out <path>]',
  'osc dashboard --serve [--port <port>] [--open]',
  'osc mcp serve [--repo <path>] [--allow-write] [--validate]',
  'osc metrics [--json] [--since <date>] [--lookback <weeks>] [--table] [--verbose]',
  'osc doctor [--fix] [--dry-run] [--severity <info|warn|error>] [--check <name>]',
  'osc runtimes list [--json]',
  'osc runtimes show <id>',
];

const cases: HelpCase[] = [
  {
    name: 'plan root',
    args: ['plan', '--help'],
    expected: 'Usage: osc plan <plan-path>',
    forbidden: 'ENOENT',
  },
  {
    name: 'plan new',
    args: ['plan', 'new', '--help'],
    expected: 'Usage: osc plan new <slug> --stage <active|backlog|blocked>',
    forbidden: 'Missing required option',
  },
  {
    name: 'plan validate',
    args: ['plan', 'validate', '--help'],
    expected: 'Usage: osc plan validate <slug-or-path> [--json] [--strict]',
    forbidden: 'Missing required argument',
  },
  {
    name: 'plan wizard',
    args: ['plan', 'wizard', '--help'],
    expected: 'Usage: osc plan wizard <slug>',
    forbidden: 'Missing required argument',
  },
  {
    name: 'plan move',
    args: ['plan', 'move', '--help'],
    expected: 'Usage: osc plan move <slug> --to <active|backlog|blocked>',
    forbidden: 'Missing required option',
  },
  {
    name: 'plan stats',
    args: ['plan', 'stats', '--help'],
    expected: 'Usage: osc plan stats [--json]',
    forbidden: 'Unknown option',
  },
  {
    name: 'amend',
    args: ['amend', '--help'],
    expected: 'Usage: osc amend <plan-slug> [--message <text>]',
    forbidden: 'Unsafe slug',
  },
  {
    name: 'close',
    args: ['close', '--help'],
    expected: 'Usage: osc close <plan-slug> [--message <text>]',
    forbidden: 'Unsafe slug',
  },
  {
    name: 'trace',
    args: ['trace', '--help'],
    expected: 'Usage: osc trace <plan-slug> [--json] [--include-unverified]',
    forbidden: 'Missing required argument',
  },
];

describe('top-level help', () => {
  it('groups commands without hiding representative coverage', () => {
    const result = spawnSync(node, [...cliArgs, '--help'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('MISSION.md → plan → run packet/amendment → evidence → verification → close');

    for (const section of topLevelHelpSections) {
      expect(result.stdout).toContain(section);
    }

    const sectionPositions = topLevelHelpSections.map((section) => result.stdout.indexOf(section));
    expect(sectionPositions.every((position) => position >= 0)).toBe(true);
    expect(sectionPositions).toEqual([...sectionPositions].sort((a, b) => a - b));
    expect(result.stdout.indexOf('osc compare <attempt-a-dir>')).toBeLessThan(
      result.stdout.indexOf('Stable core protocol:'),
    );

    for (const command of topLevelHelpCommands) {
      expect(result.stdout).toContain(command);
    }
  });
});

describe('plan lifecycle help flags', () => {
  for (const item of cases) {
    it(`prints help for ${item.name}`, () => {
      const result = spawnSync(node, [...cliArgs, ...item.args], { cwd: repoRoot, encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain(item.expected);
      if (item.forbidden) expect(result.stdout + result.stderr).not.toContain(item.forbidden);
    });
  }
});
