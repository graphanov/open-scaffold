import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { collectWebDashboardData, renderWebDashboard, serveDashboard } from '../src/dashboard-web.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempScaffold() {
  const root = mkdtempSync(join(tmpdir(), 'osc-web-dashboard-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/backlog'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/blocked'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/done'), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), `# Mission

Build a traceable project cockpit.

## Goals

- Keep source truth in git.
- Show status to people who do not live in a terminal.
`);
  writeFileSync(join(root, 'ROADMAP.md'), '# Roadmap\n');
  return root;
}

const plan = `# Plan: 001-dashboard

## Status

active

## Context

Need a browser dashboard.

## Goal

Ship a dashboard page.

## Constraints / Out of scope

- No external dependencies.

## Files to touch

- \`src/dashboard-web.ts\` — dashboard renderer

## Acceptance criteria

- [x] Shows plan columns.
- [ ] Has no <script src="https://cdn.example/app.js"> dependency.

## Verification steps

1. Run tests.

## Open questions

- Should the dashboard auto-open?
`;

describe('web dashboard', () => {
  it('renders scaffold state into a self-contained dashboard without external refs in the source', () => {
    const root = tempScaffold();
    writeFileSync(join(root, '.osc/plans/active/001-dashboard.md'), plan);
    writeFileSync(join(root, '.osc/releases/2026-05-25-001-dashboard.md'), `# Release / Evidence Note: 001-dashboard

## Summary

Dashboard evidence exists.
`);
    writeFileSync(join(root, '.osc/releases/README.md'), `# Release notes

PR: https://github.com/example/repo/pull/999
`);

    const data = collectWebDashboardData(root, new Date('2026-05-25T12:00:00Z'));
    const html = renderWebDashboard(data);

    expect(data.evidence.map((note) => note.file)).toEqual(['2026-05-25-001-dashboard.md']);
    expect(data.identityChain.prs).toBe(0);
    expect(html).toContain('Open Scaffold Dashboard');
    expect(html).toContain('001-dashboard');
    expect(html).toContain('Dashboard evidence exists.');
    expect(html).toContain('href="');
    expect(html).toContain('releases/2026-05-25-001-dashboard.md');
    expect(html).not.toMatch(/<link\b/i);
    expect(html).not.toMatch(/<script\s+[^>]*\bsrc=/i);
    expect(html).not.toMatch(/(?:href|src)=["']https?:\/\//i);
    expect(html).not.toContain('https://cdn.example');
  });

  it('shows an empty plan state without crashing', () => {
    const root = tempScaffold();

    const html = renderWebDashboard(collectWebDashboardData(root));

    expect(html).toContain('No plans yet.');
  });

  it('writes the default dashboard file through the CLI', () => {
    const root = tempScaffold();
    writeFileSync(join(root, '.osc/plans/backlog/001-dashboard.md'), plan.replace('active', 'backlog'));

    const output = execFileSync(tsx, [cli, 'dashboard', '--web'], { cwd: root, encoding: 'utf8' });

    expect(output).toContain('Generated web dashboard: .osc/dashboard.html');
    expect(existsSync(join(root, '.osc/dashboard.html'))).toBe(true);
  }, 20_000);

  it('serves the dashboard over localhost', async () => {
    const root = tempScaffold();
    writeFileSync(join(root, '.osc/plans/active/001-dashboard.md'), plan);
    writeFileSync(join(root, '.osc/releases/2026-05-25-001-dashboard.md'), `# Release / Evidence Note: 001-dashboard

## Summary

Dashboard evidence exists.
`);
    writeFileSync(join(root, '.osc/releases/README.md'), '# Release notes\n');
    const handle = await serveDashboard({ root, port: 0, now: new Date('2026-05-25T12:00:00Z') });
    try {
      const response = await fetch(handle.url);
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(html).toContain('Open Scaffold Dashboard');
      expect(handle.url).toMatch(/^http:\/\/localhost:\d+$/);

      const evidenceResponse = await fetch(`${handle.url}/releases/2026-05-25-001-dashboard.md`);
      expect(evidenceResponse.status).toBe(200);
      expect(await evidenceResponse.text()).toContain('Dashboard evidence exists.');

      const readmeResponse = await fetch(`${handle.url}/releases/README.md`);
      expect(readmeResponse.status).toBe(404);
    } finally {
      await handle.close();
    }
  });
});
