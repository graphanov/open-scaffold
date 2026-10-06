import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const marker = '<!-- open-scaffold:stale-active-plans:v1 -->';
const body = `${marker}\n\nCurrent stale plans.\n`;
const temporaryDirectories: string[] = [];

interface Issue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: { type: string; login?: string };
  pull_request?: object;
}

function issue(overrides: Partial<Issue> = {}): Issue {
  return { number: 280, title: 'Stale active plans', body, state: 'open', user: { type: 'Bot', login: 'github-actions[bot]' }, ...overrides };
}

// Execute the deployed workflow's Python, replacing only its subprocess
// boundary. These checks cannot contact GitHub or mutate real issues.
function synchronize(pages: Issue[][], stale = true, desiredBody = body) {
  const workflow = readFileSync('.github/workflows/stale-plans.yml', 'utf8');
  const step = workflow.split('- name: Synchronize the owned stale-plan reminder')[1];
  const embedded = step?.match(/python3 <<'PY'\n([\s\S]*?)\n {10}PY/)?.[1];
  expect(embedded, 'owned reminder synchronization step').toBeDefined();
  const script = embedded!.replace(/^ {10}/gm, '');
  const directory = mkdtempSync(join(tmpdir(), 'osc-stale-reminder-'));
  temporaryDirectories.push(directory);
  writeFileSync(join(directory, 'stale-issue.md'), desiredBody);
  writeFileSync(join(directory, 'stale-plans.json'), JSON.stringify(stale ? [{ path: '.osc/plans/active/task.md' }] : []));

  const preamble = `import json, subprocess\n` +
    `pages = json.loads(${JSON.stringify(JSON.stringify(pages))})\n` +
    `calls = []\n` +
    `class Result:\n    stdout = ''\n` +
    `def mocked_run(args, **kwargs):\n` +
    `    calls.append(args)\n` +
    `    result = Result()\n` +
    `    result.stdout = json.dumps(pages) if args[:2] == ['gh', 'api'] else ''\n` +
    `    return result\n` +
    `subprocess.run = mocked_run\n`;
  // finally captures calls even when the workflow intentionally exits early.
  const wrapped = `try:\n${script.replace(/^/gm, '    ')}\nfinally:\n    print('CALLS:' + json.dumps(calls))\n`;
  const result = spawnSync('python3', ['-c', preamble + wrapped], {
    cwd: directory,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_REPOSITORY: 'example/project' },
  });
  const serializedCalls = result.stdout.split('\n').find(line => line.startsWith('CALLS:'));
  expect(serializedCalls, result.stderr).toBeDefined();
  const calls = JSON.parse(serializedCalls!.slice(6)) as string[][];
  return { status: result.status, stderr: result.stderr, calls, mutations: calls.filter(args => args[1] === 'issue') };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('stale active-plan reminder lifecycle', () => {
  it('keeps reminder contents stable as the same plans age another week', () => {
    const workflow = readFileSync('.github/workflows/stale-plans.yml', 'utf8');
    const step = workflow.split('- name: Detect stale active plans')[1];
    const embedded = step.match(/python3 <<'PY'\n([\s\S]*?)\n {10}PY/)![1].replace(/^ {10}/gm, '');
    const directory = mkdtempSync(join(tmpdir(), 'osc-stale-detection-'));
    temporaryDirectories.push(directory);
    mkdirSync(join(directory, '.osc/plans/active'), { recursive: true });
    writeFileSync(join(directory, '.osc/plans/active/001-task.md'), '# Plan\n');
    const bodies: string[] = [];
    const ages: number[] = [];
    for (const date of ['2026-10-06', '2026-10-13']) {
      const preamble = `import datetime, subprocess\n` +
        `RealDatetime = datetime.datetime\n` +
        `class Clock(RealDatetime):\n` +
        `    @classmethod\n` +
        `    def now(cls, tz=None):\n        return cls.fromisoformat('${date}T00:00:00+00:00')\n` +
        `datetime.datetime = Clock\n` +
        `class Result:\n    returncode = 0\n    stdout = '1780272000'\n` +
        `subprocess.run = lambda *args, **kwargs: Result()\n`;
      const result = spawnSync('python3', ['-c', preamble + embedded], {
        cwd: directory, encoding: 'utf8', env: { ...process.env, STALE_DAYS: '30' },
      });
      expect(result.status, result.stderr).toBe(0);
      bodies.push(readFileSync(join(directory, 'stale-issue.md'), 'utf8'));
      ages.push(JSON.parse(readFileSync(join(directory, 'stale-plans.json'), 'utf8'))[0].age_days);
    }
    expect(ages[1] - ages[0]).toBe(7);
    expect(bodies[1]).toBe(bodies[0]);
    expect(bodies[0]).toContain('`.osc/plans/active/001-task.md`');
    expect(bodies[0]).toContain(marker);
  });

  it('reuses a marker-owned issue from any API page without unchanged weekly notifications', () => {
    const result = synchronize([[issue({ number: 281, body: null })], [issue()]]);
    expect(result.status).toBe(0);
    expect(result.mutations).toEqual([]);
    expect(result.calls[0]).toEqual([
      'gh', 'api', '--paginate', '--slurp', 'repos/example/project/issues',
      '--method', 'GET', '-f', 'state=all', '-f', 'per_page=100',
    ]);
  });

  it('creates one issue without claiming human/foreign-bot issues, quoted markers, or PRs', () => {
    const result = synchronize([[
      issue({ user: { type: 'User' } }),
      issue({ number: 281, body: `Quoted below:\n${marker}` }),
      issue({ number: 282, pull_request: {} }),
      issue({ number: 283, user: { type: 'Bot', login: 'dependabot[bot]' } }),
    ]]);
    expect(result.status).toBe(0);
    expect(result.mutations.map(args => args[2])).toEqual(['create']);
    expect(result.mutations[0]).toContain('example/project');
    expect(result.mutations[0]).toContain('Stale active plans');
  });

  it('updates and comments once when the stale plan list changes', () => {
    const result = synchronize([[issue({ body: `${marker}\n\nPrevious stale plans.\n` })]]);
    expect(result.status).toBe(0);
    expect(result.mutations.map(args => args[2])).toEqual(['edit', 'comment']);
    for (const args of result.mutations) expect(args.slice(3, 6)).toEqual(['280', '--repo', 'example/project']);
  });

  it('closes only the owned reminder when stale work is resolved', () => {
    const result = synchronize([[issue({ number: 281, user: { type: 'User' } }), issue()]], false, `${marker}\n\nNo stale plans.\n`);
    expect(result.status).toBe(0);
    expect(result.mutations.map(args => args[2])).toEqual(['edit', 'comment', 'close']);
    for (const args of result.mutations) expect(args[3]).toBe('280');
  });

  it('reopens the same owned reminder when stale work returns', () => {
    const result = synchronize([[issue({ state: 'closed', body: `${marker}\n\nNo stale plans.\n` })]]);
    expect(result.status).toBe(0);
    expect(result.mutations.map(args => args[2])).toEqual(['edit', 'reopen', 'comment']);
  });

  it('keeps resolved or absent reminders quiet when no stale work exists', () => {
    for (const pages of [[], [issue({ state: 'closed' })]]) {
      const result = synchronize([pages], false);
      expect(result.status).toBe(0);
      expect(result.mutations).toEqual([]);
    }
  });

  it('fails without mutation if multiple exact owned reminders need reconciliation', () => {
    const result = synchronize([[issue(), issue({ number: 281 })]]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Multiple marker-owned stale-plan reminders');
    expect(result.mutations).toEqual([]);
  });
});
