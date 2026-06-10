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
  expectedStatus?: number;
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
  'osc resume [--json] [--plan <slug>] [--max-chars <n>]',
  'osc status [--json]',
  'osc plan <plan-path>',
  'osc plan new <slug> --stage <active|backlog|blocked> [--from-template <name>]',
  'osc plan new --from-template list',
  'osc plan validate <slug-or-path> [--json] [--strict]',
  'osc plan move <slug> --to <active|backlog|blocked>',
  'osc amend <plan-slug> [--message <text>]',
  'osc evidence new <slug>',
  'osc evidence collect <slug> [--ci] [--dry-run] [--verbose]',
  'osc close <plan-slug> [--message <text>]',
  'osc trace <plan-slug> [--json] [--include-unverified]',
  'osc verify [--evidence-chain [--plan <slug>] [--json] [--strict] [--online-github]]',
  'osc pr check <plan-slug> [--format <markdown|json>] [--online-github]',
  'osc adapter check <adapter-id>',
  'osc adapter trust <adapter-id>',
  'osc adapter list --trusted',
  'osc schemas list [--json]',
  'osc schemas show <schema-id>',
  'osc start <plan-slug-or-path> --runtime <codex|omx|plain|human|custom>',
  'osc delegate <plan-path> [run binding options]',
  'osc run <plan-path> [--dry-run] [--json] [run binding options]',
  'osc dispatch <run-json> --adapter <adapter-id>',
  'osc review <plan-path> [run binding options]',
  'osc ultrareview <plan-path> [run binding options]',
  'osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]',
  'osc eval init <plan-path> [--out <path>]',
  'osc audit init <run-or-plan> [--artifact <role> <path>]... [--out <path>]',
  'osc audit check <audit-manifest-path>',
  'osc prove compare <manifest.json> [--format <terminal|markdown|json>] [--out <path>]',
  'osc prove check <manifest.json>',
  'osc evolve init <run-or-plan> [--out <dir>] [--strategy <manual|greedy|tournament|novelty|map_elites|custom>]',
  'osc evolve record <loop-dir> --run <run-packet> [--evaluation <evaluation-json>] [--receipt <dispatch-receipt.json>] [--evidence <path>]... --decision <promote|reject|retry|block> [--score <0..1>] --rationale <text> [--repair-hypothesis <text>] [--target-metric <name>] [--expected-gain <number>] [--actual-delta <number>] [--tokens-total <integer>] [--estimated-usd <number>] [--usage-source <source>] [--usage-unavailable-reason <text>]',
  'osc evolve compare <loop-dir> [--a <attempt-id|run-id|frontier>] [--b <attempt-id|run-id|frontier>] [--format <terminal|markdown|json>] [--out <path>]',
  'osc evolve analyze <loop-dir> [--format <terminal|markdown|json>] [--out <path>] [--plateau-threshold <n>]',
  'osc evolve check <loop-dir>',
  'osc cockpit config',
  'osc cockpit test [--dry-run]',
  'osc cockpit post --event <event> [--message <text>] [--run-id <id>] [--plan <slug>] [--task-id <id>] [--pr <url>] [--evidence-path <path>] [--dry-run]',
  'osc mcp serve [--repo <path>] [--allow-write] [--validate]',
  'osc runtimes list [--json]',
  'osc runtimes show <id>',
  'osc doctor --check secret-scan',
  'migration notes: docs/STABILITY.md#command-maturity',
  'removed/repositioned: osc plan wizard',
  'removed/repositioned: osc plan graph',
  'removed/repositioned: osc plan stats',
  'removed/repositioned: osc evidence compact',
  'removed/repositioned: osc task new/list/show/claim/start/complete/cancel/block/comment/link',
  'removed/repositioned: osc eval import/check',
  'removed/repositioned: osc status --dashboard',
  'removed/repositioned: osc work, osc dashboard, osc metrics, osc study, osc ab, broad osc doctor checks',
];

const coreHelpSections = ['Start:', 'Work (the four verbs):', 'Record:', 'More:'];

const coreHelpCommands = [
  'osc first-run',
  'osc init --tier <min|standard|max> --target <dir>',
  'osc resume [--json] [--plan <slug>] [--max-chars <n>]',
  "osc harness '$interview \"clarify the work\"'",
  "osc harness '$work ... --adapter <id> --allow-spawn'",
  'osc harness status <run-id> | osc harness answer <run-id> --gate <id> --answer <text>',
  'osc status [--json]',
  'osc plan new <slug> --stage <active|backlog|blocked>',
  'osc amend <plan-slug> [--message <text>]',
  'osc evidence new <slug>',
  'osc verify [--evidence-chain]',
  'osc close <plan-slug> [--message <text>]',
  'osc help --all',
];

const advancedOnlyCommands = ['osc evolve', 'osc dispatch', 'osc cockpit', 'osc bench', 'osc prove', 'osc audit', 'osc mcp serve'];

const cases: HelpCase[] = [
  {
    name: 'resume',
    args: ['resume', '--help'],
    expected: 'Usage: osc resume [--json] [--plan <slug>] [--max-chars <n>]',
    forbidden: 'Unknown option',
  },
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
    expected: 'osc plan wizard was removed/repositioned',
    expectedStatus: 2,
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
    expected: 'osc plan stats was removed/repositioned',
    expectedStatus: 2,
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
  {
    name: 'evidence compact',
    args: ['evidence', 'compact', '--help'],
    expected: 'osc evidence compact was removed/repositioned',
    expectedStatus: 2,
    forbidden: 'Missing required argument',
  },
];

describe('top-level help', () => {
  it('renders the core surface on one screen by default', () => {
    const result = spawnSync(node, [...cliArgs, '--help'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('The harness loop: $interview -> $plan -> $work or $team');

    for (const section of coreHelpSections) {
      expect(result.stdout).toContain(section);
    }
    for (const command of coreHelpCommands) {
      expect(result.stdout).toContain(command);
    }
    for (const advanced of advancedOnlyCommands) {
      expect(result.stdout).not.toContain(advanced);
    }

    expect(result.stdout.trimEnd().split('\n').length).toBeLessThanOrEqual(35);
  });

  it('keeps the full surface reachable behind help --all', () => {
    for (const invocation of [['help', '--all'], ['--help', '--all']]) {
      const result = spawnSync(node, [...cliArgs, ...invocation], { cwd: repoRoot, encoding: 'utf8' });

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
    }
  });

  it('points unknown commands at the core help', () => {
    const result = spawnSync(node, [...cliArgs, 'bogus-command'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Unknown command: bogus-command');
    expect(result.stderr).toContain('osc help --all');
  });
});

describe('plan lifecycle help flags', () => {
  for (const item of cases) {
    it(`prints help for ${item.name}`, () => {
      const result = spawnSync(node, [...cliArgs, ...item.args], { cwd: repoRoot, encoding: 'utf8' });

      expect(result.status).toBe(item.expectedStatus ?? 0);
      if (item.expectedStatus && item.expectedStatus !== 0) {
        expect(result.stderr).toContain(item.expected);
        if (item.expected.includes('removed/repositioned')) {
          expect(result.stderr).toContain('docs/STABILITY.md#command-maturity');
          expect(result.stderr).not.toContain('.osc/runs/');
        }
      } else {
        expect(result.stderr).toBe('');
        expect(result.stdout).toContain(item.expected);
      }
      if (item.forbidden) expect(result.stdout + result.stderr).not.toContain(item.forbidden);
    });
  }
});


describe('removed/repositioned command shims', () => {
  it('treats missing amend/close operands as errors, not help', () => {
    for (const command of ['amend', 'close']) {
      const result = spawnSync(node, [...cliArgs, command], { cwd: repoRoot, encoding: 'utf8' });

      expect(result.status).toBe(2);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain(`Usage: osc ${command} <plan-slug>`);
    }
  });

  it('rejects the retired status dashboard option explicitly', () => {
    const result = spawnSync(node, [...cliArgs, 'status', '--dashboard'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('osc status --dashboard was removed/repositioned');
    expect(result.stderr).toContain('docs/STABILITY.md#command-maturity');
    expect(result.stderr).not.toContain('.osc/runs/');
  });

  it('rejects unknown status options instead of ignoring them', () => {
    const result = spawnSync(node, [...cliArgs, 'status', '--bogus'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Unknown option for status: --bogus');
  });

  it('rejects removed broad doctor options instead of running secret scan', () => {
    for (const args of [['--fix'], ['--dry-run'], ['--severity', 'high']]) {
      const result = spawnSync(node, [...cliArgs, 'doctor', ...args], { cwd: repoRoot, encoding: 'utf8' });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain(`Unknown option for doctor: ${args[0]}`);
      expect(result.stdout).not.toContain('PASS secret-scan');
    }
  });
});
