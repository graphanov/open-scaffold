import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { formatDashboardText, loadDashboardData, stalenessLevel } from '../src/dashboard.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempScaffold(): string {
  const root = mkdtempSync(join(tmpdir(), 'osc-dashboard-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/backlog'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/blocked'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/done'), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nKeep AI work reviewable.\n');
  writeFileSync(join(root, 'package.json'), '{"name":"dashboard-project"}\n');
  return root;
}

function writePlan(root: string, stage: 'active' | 'backlog' | 'blocked' | 'done', slug: string, goal = 'Show project state.'): string {
  const path = join(root, `.osc/plans/${stage}/${slug}.md`);
  writeFileSync(path, `# Plan: ${slug}

## Status

${stage}

## Context

Dashboard test plan.

## Goal

${goal}

## Constraints / Out of scope

- Read only.

## Files to touch

- src/dashboard.ts

## Acceptance criteria

- [ ] Dashboard shows active plans.
- [ ] Dashboard shows evidence.

## Verification steps

1. Run the dashboard test.

## Open questions

None.
`);
  return path;
}

describe('dashboard data and formatting', () => {
  it('classifies active plan staleness by modified age', () => {
    expect(stalenessLevel(0)).toBe('green');
    expect(stalenessLevel(6.9)).toBe('green');
    expect(stalenessLevel(7)).toBe('yellow');
    expect(stalenessLevel(30)).toBe('yellow');
    expect(stalenessLevel(30.1)).toBe('red');
  });

  it('loads active plans, counts, recent evidence, goal, and acceptance summary', () => {
    const root = tempScaffold();
    const activePath = writePlan(root, 'active', '001-dashboard', 'Make terminal state visible.');
    writePlan(root, 'backlog', '002-next');
    writePlan(root, 'blocked', '003-blocked');
    writePlan(root, 'done', '004-done');
    writeFileSync(join(root, '.osc/releases/2026-05-25-dashboard.md'), '# Dashboard evidence\n\nVerified.\n');
    const now = new Date('2026-05-25T12:00:00Z');
    const modified = new Date('2026-05-20T12:00:00Z');
    utimesSync(activePath, modified, modified);

    const data = loadDashboardData(root, { runVerify: false, now });

    expect(data.projectName).toBe('dashboard-project');
    expect(data.mission.defined).toBe(true);
    expect(data.counts).toMatchObject({ active: 1, backlog: 1, blocked: 1, done: 1 });
    expect(data.activePlans[0]).toMatchObject({ slug: '001-dashboard', staleness: 'green', goal: 'Make terminal state visible.' });
    expect(data.activePlans[0].acceptanceSummary).toContain('Dashboard shows active plans.');
    expect(data.recentEvidence[0]).toMatchObject({ title: 'Dashboard evidence' });
  });

  it('formats an empty active-plan state with dashboard shortcuts', () => {
    const root = tempScaffold();
    const data = loadDashboardData(root, { runVerify: false, now: new Date('2026-05-25T12:00:00Z') });

    const text = formatDashboardText(data, { selectedIndex: 0, expanded: false, color: false, rows: 24, columns: 80 });

    expect(text).toContain('Open Scaffold dashboard');
    expect(text).toContain('Mission: defined');
    expect(text).toContain('No active plans. Create one with `osc plan new <slug> --stage active`');
    expect(text).toContain('q quit');
    expect(text).toContain('r refresh');
  });

  it('prints a static dashboard in non-interactive CLI mode and aliases status --dashboard', () => {
    const root = tempScaffold();
    writePlan(root, 'active', '001-dashboard', 'Show cockpit state.');

    const dashboardOutput = execFileSync(tsx, [cli, 'dashboard'], { cwd: root, encoding: 'utf8' });
    const aliasOutput = execFileSync(tsx, [cli, 'status', '--dashboard'], { cwd: root, encoding: 'utf8' });

    expect(dashboardOutput).toContain('Open Scaffold dashboard');
    expect(dashboardOutput).toContain('001-dashboard');
    expect(aliasOutput).toContain('Open Scaffold dashboard');
  });

  it('mentions dashboard commands in help', () => {
    const output = execFileSync(tsx, [cli, '--help'], { encoding: 'utf8' });

    expect(output).toContain('osc dashboard [--watch] [--interval <seconds>]');
    expect(output).toContain('osc status [--json|--dashboard]');
  });
});
