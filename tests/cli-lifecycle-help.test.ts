import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

type HelpCase = {
  name: string;
  args: string[];
  expected: string;
  forbidden?: string;
};

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
];

describe('plan lifecycle help flags', () => {
  for (const item of cases) {
    it(`prints help for ${item.name}`, () => {
      const result = spawnSync(tsx, [cli, ...item.args], { cwd: repoRoot, encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain(item.expected);
      if (item.forbidden) expect(result.stdout + result.stderr).not.toContain(item.forbidden);
    });
  }
});
