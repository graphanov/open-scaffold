import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { computeMetrics, formatMetrics, parseSinceDate } from '../src/metrics.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');
const now = new Date('2026-06-15T00:00:00.000Z');

function tempScaffold(prefix = 'osc-metrics-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  for (const stage of ['active', 'backlog', 'blocked', 'done']) mkdirSync(join(root, `.osc/plans/${stage}`), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nTest metrics.\n\n## Changelog\n\n<!-- append YYYY-MM-DD entries below this line -->\n');
  writeFileSync(join(root, '.osc/releases/README.md'), '# Releases\n');
  return root;
}

function planText(slug: string, status: string) {
  return `# Plan: ${slug}\n\n## Status\n\n${status}\n\n## Context\n\nNeed ${slug}.\n\n## Goal\n\nShip ${slug}.\n\n## Constraints / Out of scope\n\n- Local-only.\n\n## Files to touch\n\n- \`README.md\` — example.\n\n## Acceptance criteria\n\n- [ ] It works.\n\n## Verification steps\n\n1. Run tests.\n\n## Open questions\n\n- None.\n`;
}

function writePlan(root: string, stage: 'active' | 'backlog' | 'blocked' | 'done', slug: string, modifiedAt: string) {
  const path = join(root, `.osc/plans/${stage}/${slug}.md`);
  writeFileSync(path, planText(slug, stage));
  const date = new Date(`${modifiedAt}T00:00:00.000Z`);
  utimesSync(path, date, date);
  return path;
}

function writeEvidence(root: string, date: string, slug: string, approval: string) {
  writeFileSync(join(root, `.osc/releases/${date}-${slug}.md`), [
    `# Release / Evidence Note: ${slug}`,
    '',
    '## Summary',
    '',
    `Evidence for ${slug}.`,
    '',
    '## Outcome',
    '',
    `approval.status: ${approval}`,
    '',
  ].join('\n'));
}

function populatedScaffold() {
  const root = tempScaffold();
  writePlan(root, 'done', '001-done-approved', '2026-04-01');
  writePlan(root, 'done', '002-done-weak', '2026-04-07');
  writePlan(root, 'done', '003-done-rejected', '2026-05-01');
  writePlan(root, 'done', '004-done-no-evidence', '2026-05-20');
  writePlan(root, 'done', '005-done-recent-no-evidence', '2026-06-01');
  writePlan(root, 'active', '006-active-stale', '2026-05-15');
  writePlan(root, 'active', '007-active-boundary', '2026-05-16');
  writePlan(root, 'active', '008-active-recent', '2026-06-10');
  writePlan(root, 'backlog', '009-backlog-old', '2026-04-01');
  writePlan(root, 'backlog', '010-backlog-recent', '2026-06-05');
  writeEvidence(root, '2026-04-08', '001-done-approved', 'approved');
  writeEvidence(root, '2026-04-14', '002-done-weak', 'weak_approved');
  writeEvidence(root, '2026-05-15', '003-done-rejected', 'rejected');
  return root;
}

describe('osc metrics', () => {
  it('reports an empty scaffold without crashing', () => {
    const root = tempScaffold('osc-metrics-empty-');

    const metrics = computeMetrics({ root, now });
    const rendered = formatMetrics(metrics);

    expect(metrics.summary.total_plans).toBe(0);
    expect(metrics.summary.by_stage).toEqual({ active: 0, backlog: 0, blocked: 0, done: 0 });
    expect(metrics.cycle_time.mean_days).toBeNull();
    expect(metrics.stale.count).toBe(0);
    expect(rendered).toContain('No plans found in scaffold — run `osc plan new` to create your first plan.');
  });

  it('computes local-only plan distribution, stale plans, evidence completeness, approvals, cycle time, and velocity', () => {
    const root = populatedScaffold();

    const metrics = computeMetrics({ root, now, lookbackWeeks: 4 });

    expect(metrics.summary.total_plans).toBe(10);
    expect(metrics.summary.by_stage).toEqual({ active: 3, backlog: 2, blocked: 0, done: 5 });
    expect(metrics.stale.count).toBe(1);
    expect(metrics.stale.plans.map((plan) => plan.slug)).toEqual(['006-active-stale']);
    expect(metrics.evidence.done_plan_count).toBe(5);
    expect(metrics.evidence.with_evidence_count).toBe(3);
    expect(metrics.evidence.completeness_percentage).toBe(60);
    expect(metrics.approval.distribution).toEqual({ approved: 1, weak_approved: 1, rejected: 1, blocked: 0, unknown: 2 });
    expect(metrics.cycle_time.sample_size).toBe(5);
    expect(metrics.cycle_time.insufficient_data_count).toBe(0);
    expect(metrics.cycle_time.mean_days).toBeCloseTo(5.6, 2);
    expect(metrics.cycle_time.median_days).toBe(7);
    expect(metrics.cycle_time.p90_days).toBe(14);
    expect(metrics.velocity.lookback_weeks).toBe(4);
    expect(metrics.velocity.closed_count).toBe(2);
    expect(metrics.velocity.plans_per_week).toBe(0.5);
    expect(metrics.warnings).toContain('git not available — using file modification times for cycle time calculation');
  });

  it('filters all calculations by creation date with --since semantics', () => {
    const root = populatedScaffold();

    const metrics = computeMetrics({ root, now, since: parseSinceDate('2026-06-01', now), lookbackWeeks: 4 });

    expect(metrics.summary.total_plans).toBe(3);
    expect(metrics.summary.by_stage).toEqual({ active: 1, backlog: 1, blocked: 0, done: 1 });
    expect(metrics.evidence.done_plan_count).toBe(1);
    expect(metrics.evidence.with_evidence_count).toBe(0);
    expect(metrics.stale.count).toBe(0);
  });

  it('parses relative dates and rejects ambiguous date formats', () => {
    expect(parseSinceDate('30 days ago', now).toISOString()).toBe('2026-05-16T00:00:00.000Z');
    expect(parseSinceDate('last month', now).toISOString()).toBe('2026-05-15T00:00:00.000Z');
    expect(parseSinceDate('last month', new Date('2026-03-31T12:00:00.000Z')).toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(parseSinceDate('last month', new Date('2024-03-31T12:00:00.000Z')).toISOString()).toBe('2024-02-29T00:00:00.000Z');
    expect(parseSinceDate('last month', new Date('2026-01-31T12:00:00.000Z')).toISOString()).toBe('2025-12-31T00:00:00.000Z');
    expect(() => parseSinceDate('01/02/2026', now)).toThrow(/Ambiguous date/);
  });

  it('does not attach evidence notes from longer slug substrings', () => {
    const root = tempScaffold('osc-metrics-exact-evidence-');
    writePlan(root, 'done', 'foo', '2026-04-30');
    writePlan(root, 'done', '001-foo', '2026-05-01');
    writePlan(root, 'done', '001-foo-bar', '2026-05-02');
    writeEvidence(root, '2026-05-09', '001-foo', 'weak_approved');
    writeEvidence(root, '2026-05-10', '001-foo-bar', 'approved');

    const metrics = computeMetrics({ root, now });
    const unprefixed = metrics.plans.find((plan) => plan.slug === 'foo');
    const shorter = metrics.plans.find((plan) => plan.slug === '001-foo');
    const longer = metrics.plans.find((plan) => plan.slug === '001-foo-bar');

    expect(unprefixed?.has_evidence).toBe(false);
    expect(unprefixed?.evidence_note).toBeNull();
    expect(shorter?.has_evidence).toBe(true);
    expect(shorter?.evidence_note).toBe('.osc/releases/2026-05-09-001-foo.md');
    expect(longer?.has_evidence).toBe(true);
    expect(longer?.evidence_note).toBe('.osc/releases/2026-05-10-001-foo-bar.md');
  });

  it('prints CLI JSON and table output', () => {
    const root = populatedScaffold();

    const defaultTable = spawnSync(tsx, [cli, 'metrics'], { cwd: root, encoding: 'utf8' });
    expect(defaultTable.status).toBe(0);
    expect(defaultTable.stderr).toBe('');
    expect(defaultTable.stdout).toContain('Plan distribution');
    expect(defaultTable.stdout).toContain('Evidence completeness');

    const json = spawnSync(tsx, [cli, 'metrics', '--json', '--lookback', '4'], { cwd: root, encoding: 'utf8' });
    expect(json.status).toBe(0);
    expect(json.stderr).toBe('');
    expect(JSON.parse(json.stdout).summary.total_plans).toBe(10);

    const table = spawnSync(tsx, [cli, 'metrics', '--lookback', '4', '--table'], { cwd: root, encoding: 'utf8' });
    expect(table.status).toBe(0);
    expect(table.stderr).toBe('');
    expect(table.stdout).toContain('Plan distribution');
    expect(table.stdout).toContain('Evidence completeness');
    expect(table.stdout).toContain('5 plans closed but only 3 have evidence notes (60%)');
  });

  it('documents metrics flags in command help', () => {
    const result = spawnSync(tsx, [cli, 'metrics', '--help'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: osc metrics');
    expect(result.stdout).toContain('--json');
    expect(result.stdout).toContain('--since');
    expect(result.stdout).toContain('--lookback');
    expect(result.stdout).toContain('--verbose');
  });
});
