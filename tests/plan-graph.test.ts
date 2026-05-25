import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  buildPlanGraph,
  extractDependencyReferences,
  renderPlanGraphAscii,
  renderPlanGraphMermaid,
  type PlanGraphEdge,
} from '../src/plan-graph.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

type Stage = 'active' | 'backlog' | 'blocked' | 'done';

function tempScaffold(prefix = 'osc-plan-graph-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  for (const stage of ['active', 'backlog', 'blocked', 'done']) mkdirSync(join(root, `.osc/plans/${stage}`), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nTest graph.\n');
  return root;
}

function planText(slug: string, stage: Stage, context = '', openQuestions = '- None.') {
  return `# Plan: ${slug}\n\n## Status\n\n${stage}\n\n## Context\n\n${context || `Context for ${slug}.`}\n\n## Goal\n\nShip ${slug}.\n\n## Constraints / Out of scope\n\n- Read-only.\n\n## Files to touch\n\n- \`src/example.ts\` — example.\n\n## Acceptance criteria\n\n- [ ] It works.\n\n## Verification steps\n\n1. Run tests.\n\n## Open questions\n\n${openQuestions}\n`;
}

function writePlan(root: string, stage: Stage, slug: string, context = '', openQuestions = '- None.') {
  writeFileSync(join(root, `.osc/plans/${stage}/${slug}.md`), planText(slug, stage, context, openQuestions));
}

function edgeKey(edge: PlanGraphEdge) {
  return `${edge.from}->${edge.to}:${edge.relationship}`;
}

describe('plan dependency graph', () => {
  it('extracts explicit dependency references from supported plan text patterns', () => {
    const text = [
      'depends on: 002-refactor, 003-package-sync',
      'blocks: 004-web-dashboard',
      'follows: 005-base-architecture',
      'blocked by: 006-owner-gate',
      'Use `osc task link T-001 --plan 007-task-bridge` after implementation.',
      'See plan 008-public-docs before updating README.',
      'inherits from: .osc/plans/done/009-parent-plan.md',
    ].join('\n');

    expect(extractDependencyReferences(text).map((edge) => edgeKey(edge))).toEqual([
      'source->002-refactor:depends_on',
      'source->003-package-sync:depends_on',
      'source->004-web-dashboard:blocks',
      'source->005-base-architecture:follows',
      'source->006-owner-gate:depends_on',
      'source->007-task-bridge:follows',
      'source->008-public-docs:follows',
      'source->009-parent-plan:follows',
    ]);
  });

  it('builds a stage-filtered DAG with found dependency nodes, standalone nodes, unresolved warnings, and cycle warnings', () => {
    const root = tempScaffold();
    writePlan(root, 'active', '001-feature', 'depends on: 002-refactor\nblocks: 003-docs\ndepends on: missing-plan');
    writePlan(root, 'backlog', '002-refactor', 'follows: 004-foundation');
    writePlan(root, 'backlog', '003-docs');
    writePlan(root, 'done', '004-foundation', 'follows: 002-refactor');
    writePlan(root, 'active', '005-standalone');

    const graph = buildPlanGraph({ root, stage: 'active' });

    expect(graph.nodes.map((node) => `${node.slug}:${node.stage}`)).toEqual([
      '001-feature:active',
      '002-refactor:backlog',
      '003-docs:backlog',
      '004-foundation:done',
      '005-standalone:active',
    ]);
    expect(graph.edges.map(edgeKey)).toEqual([
      '001-feature->002-refactor:depends_on',
      '001-feature->003-docs:blocks',
      '001-feature->missing-plan:depends_on',
      '002-refactor->004-foundation:follows',
      '004-foundation->002-refactor:follows',
    ]);
    expect(graph.warnings).toContain('Unresolved dependency: 001-feature references missing-plan');
    expect(graph.warnings.some((warning) => warning.includes('Circular dependency detected'))).toBe(true);
  });

  it('renders ASCII and Mermaid graphs without external dependencies', () => {
    const root = tempScaffold();
    writePlan(root, 'active', '001-feature', 'depends on: 002-refactor');
    writePlan(root, 'backlog', '002-refactor');

    const graph = buildPlanGraph({ root });
    const ascii = renderPlanGraphAscii(graph);
    const mermaid = renderPlanGraphMermaid(graph);

    expect(ascii).toContain('Plan dependency graph');
    expect(ascii).toContain('- 001-feature [active] Ship 001-feature.');
    expect(ascii).toContain('depends_on -> 002-refactor [backlog]');
    expect(mermaid).toContain('flowchart TD');
    expect(mermaid).toContain('-->|depends_on|');
    expect(mermaid).not.toContain('<script');
    expect(mermaid).not.toContain('http://');
    expect(mermaid).not.toContain('https://');
  });

  it('prints machine-readable JSON from the CLI and filters focused upstream/downstream neighborhoods', () => {
    const root = tempScaffold();
    writePlan(root, 'active', '001-feature', 'depends on: 002-refactor');
    writePlan(root, 'backlog', '002-refactor', 'blocks: 003-docs');
    writePlan(root, 'backlog', '003-docs');

    const json = spawnSync(tsx, [cli, 'plan', 'graph', '--format', 'json', '--stage', 'all'], { cwd: root, encoding: 'utf8' });
    expect(json.status).toBe(0);
    expect(json.stderr).toBe('');
    const parsed = JSON.parse(json.stdout);
    expect(parsed.schema).toBe('open-scaffold.plan-graph.v1');
    expect(parsed.edges.map(edgeKey)).toEqual([
      '001-feature->002-refactor:depends_on',
      '002-refactor->003-docs:blocks',
    ]);

    const downstream = spawnSync(tsx, [cli, 'plan', 'graph', '--format', 'json', '--plan', '001-feature', '--direction', 'downstream'], { cwd: root, encoding: 'utf8' });
    expect(JSON.parse(downstream.stdout).edges.map(edgeKey)).toEqual(['001-feature->002-refactor:depends_on']);

    const blockedDownstream = spawnSync(tsx, [cli, 'plan', 'graph', '--format', 'json', '--plan', '003-docs', '--direction', 'downstream'], { cwd: root, encoding: 'utf8' });
    expect(JSON.parse(blockedDownstream.stdout).edges.map(edgeKey)).toEqual(['002-refactor->003-docs:blocks']);

    const upstream = spawnSync(tsx, [cli, 'plan', 'graph', '--format', 'json', '--plan', '002-refactor', '--direction', 'upstream'], { cwd: root, encoding: 'utf8' });
    expect(JSON.parse(upstream.stdout).edges.map(edgeKey)).toEqual([
      '001-feature->002-refactor:depends_on',
      '002-refactor->003-docs:blocks',
    ]);
  });

  it('prints an empty-state message when no plans exist', () => {
    const root = tempScaffold();

    const result = spawnSync(tsx, [cli, 'plan', 'graph'], { cwd: root, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('No plans found');
    expect(result.stderr).toBe('');
  });
});
