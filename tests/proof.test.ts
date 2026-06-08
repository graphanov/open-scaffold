import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  PROOF_COMPARISON_SCHEMA,
  compareProofManifest,
  renderProofComparison,
  validateProofManifestFile,
} from '../src/compare.js';

const repoRoot = resolve(import.meta.dirname, '..');

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'osc-proof-'));
  mkdirSync(join(root, 'evidence'), { recursive: true });
  writeFileSync(join(root, 'evidence/control.json'), '{"arm":"control"}\n');
  writeFileSync(join(root, 'evidence/scaffolded.json'), '{"arm":"scaffolded"}\n');
  return root;
}

function manifest(root: string, overrides: Record<string, unknown> = {}) {
  const base = {
    schema: PROOF_COMPARISON_SCHEMA,
    comparison_id: 'scaffold-vs-naked-codex-test',
    title: 'Scaffolded Codex vs naked Codex fixture',
    question: 'Does Open Scaffold improve this bounded cold-resume AI work fixture?',
    arms: {
      control: { id: 'naked-codex', label: 'Naked Codex', runtime: 'codex' },
      scaffolded: { id: 'open-scaffold-codex', label: 'Open Scaffold + Codex', runtime: 'codex' },
    },
    metrics: [
      {
        id: 'quality.acceptance_passes',
        label: 'Accepted criteria passed',
        category: 'quality',
        unit: 'criteria',
        direction: 'higher',
        control: 2,
        scaffolded: 5,
        source_refs: ['evidence/control.json', 'evidence/scaffolded.json'],
      },
      {
        id: 'usage.total_tokens',
        label: 'Codex tokens used',
        category: 'tokens',
        unit: 'tokens',
        direction: 'lower',
        control: 18450,
        scaffolded: 12200,
        source_refs: ['evidence/control.json', 'evidence/scaffolded.json'],
      },
      {
        id: 'speed.wall_seconds',
        label: 'Wall-clock run time',
        category: 'speed',
        unit: 'seconds',
        direction: 'lower',
        control: 91.3,
        scaffolded: 74.2,
        source_refs: ['evidence/control.json', 'evidence/scaffolded.json'],
      },
      {
        id: 'evolution.frontier_delta',
        label: 'Loop frontier improvement',
        category: 'evolution',
        unit: 'accepted criteria delta',
        direction: 'higher',
        control: 0,
        scaffolded: 3,
        source_refs: ['evidence/scaffolded.json'],
      },
    ],
    caveats: [
      'Bounded fixture proof only; not a universal benchmark.',
      'Receipts are source-labeled instead of inferred.',
    ],
  };
  const merged = { ...base, ...overrides };
  const path = join(root, 'manifest.json');
  writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`);
  return path;
}

describe('proof comparison harness', () => {
  it('compares quality, token, speed, and evolution-loop metrics from source-labeled receipts', () => {
    const root = fixtureRoot();
    const result = compareProofManifest(manifest(root));

    expect(result.schema).toBe('open-scaffold.proof-comparison-result.v1');
    expect(result.comparisonId).toBe('scaffold-vs-naked-codex-test');
    expect(result.metrics).toHaveLength(4);
    expect(result.metrics.map((metric) => [metric.id, metric.winner])).toEqual([
      ['quality.acceptance_passes', 'scaffolded'],
      ['usage.total_tokens', 'scaffolded'],
      ['speed.wall_seconds', 'scaffolded'],
      ['evolution.frontier_delta', 'scaffolded'],
    ]);
    expect(result.summary.scaffoldedWins).toBe(4);
    expect(result.summary.controlWins).toBe(0);
    expect(result.summary.categories.quality).toBe('improved');
    expect(result.summary.categories.tokens).toBe('improved');
    expect(result.summary.categories.speed).toBe('improved');
    expect(result.summary.categories.evolution).toBe('improved');
    expect(result.summary.boundedProof).toBe(true);
    expect(result.summary.verdict).toContain('bounded');
  });

  it('renders an honest markdown report with source refs and non-universal caveats', () => {
    const root = fixtureRoot();
    const result = compareProofManifest(manifest(root));
    const markdown = renderProofComparison(result, 'markdown');

    expect(markdown).toContain('# Scaffolded Codex vs naked Codex fixture');
    expect(markdown).toContain('Bounded proof verdict: PASS');
    expect(markdown).toContain('quality.acceptance_passes');
    expect(markdown).toContain('evidence/control.json');
    expect(markdown).toContain('evidence/scaffolded.json');
    expect(markdown).toContain('not a universal benchmark');
    expect(markdown).not.toMatch(/universally better|proves.*anything/i);
  });

  it('fails validation when required categories or source refs are missing', () => {
    const root = fixtureRoot();
    const missingSpeed = manifest(root, {
      metrics: [
        {
          id: 'quality.acceptance_passes',
          label: 'Accepted criteria passed',
          category: 'quality',
          unit: 'criteria',
          direction: 'higher',
          control: 2,
          scaffolded: 5,
          source_refs: ['evidence/control.json'],
        },
      ],
    });
    const missingSpeedFailures = validateProofManifestFile(missingSpeed).failures.map((failure) => failure.code);
    const missingRef = manifest(root, {
      metrics: [
        {
          id: 'quality.acceptance_passes',
          label: 'Accepted criteria passed',
          category: 'quality',
          unit: 'criteria',
          direction: 'higher',
          control: 2,
          scaffolded: 5,
          source_refs: ['evidence/does-not-exist.json'],
        },
        {
          id: 'usage.total_tokens',
          label: 'Codex tokens used',
          category: 'tokens',
          unit: 'tokens',
          direction: 'lower',
          control: 10,
          scaffolded: 9,
          source_refs: ['evidence/control.json'],
        },
        {
          id: 'speed.wall_seconds',
          label: 'Wall-clock run time',
          category: 'speed',
          unit: 'seconds',
          direction: 'lower',
          control: 10,
          scaffolded: 9,
          source_refs: ['evidence/control.json'],
        },
        {
          id: 'evolution.frontier_delta',
          label: 'Loop frontier improvement',
          category: 'evolution',
          unit: 'accepted criteria delta',
          direction: 'higher',
          control: 0,
          scaffolded: 1,
          source_refs: ['evidence/control.json'],
        },
      ],
    });

    expect(missingSpeedFailures).toContain('missing-required-category');
    expect(validateProofManifestFile(missingRef).failures.map((failure) => failure.code)).toContain('missing-source-ref');

    const remoteRef = manifest(root);
    const remoteManifest = JSON.parse(readFileSync(remoteRef, 'utf8')) as { metrics: Array<{ source_refs: string[] }> };
    for (const privateRef of ['https://example.invalid/not-committed.json', '.osc/runs/run.json', '.osc-dev/local.json', '.omx/log.json', '.claude/transcript.md']) {
      remoteManifest.metrics[0].source_refs = [privateRef];
      writeFileSync(remoteRef, `${JSON.stringify(remoteManifest, null, 2)}\n`);
      expect(validateProofManifestFile(remoteRef).failures.map((failure) => failure.code)).toContain('private-source-ref');
    }
  });

  it('exposes prove compare and prove check through the CLI', () => {
    const root = fixtureRoot();
    const manifestPath = manifest(root);

    const compare = execFileSync('npx', ['tsx', 'src/cli.ts', 'prove', 'compare', '--format', 'markdown', manifestPath], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    expect(compare).toContain('Bounded proof verdict: PASS');
    expect(compare).toContain('usage.total_tokens');

    const check = execFileSync('npx', ['tsx', 'src/cli.ts', 'prove', 'check', manifestPath], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    expect(check).toContain('PASS proof comparison manifest valid');

    const trailing = spawnSync('npx', ['tsx', 'src/cli.ts', 'prove', 'check', manifestPath, 'extra'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    expect(trailing.status).toBe(2);
    expect(trailing.stderr).toContain('Usage: osc prove check <manifest.json>');
  });
});
