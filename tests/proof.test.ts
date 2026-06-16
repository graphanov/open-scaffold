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
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const commandOptions = process.platform === 'win32' ? { shell: true } : {};

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

  it('keeps shipped raw quality ties from becoming quality wins', () => {
    const result = compareProofManifest(resolve(repoRoot, 'examples/proof/scaffold-vs-naked-codex/manifest.json'));

    expect(result.summary.categories.quality).toBe('tied');
    expect(result.summary.categories.tokens).toBe('improved');
    expect(result.summary.boundedProof).toBe(true);
    expect(result.summary.verdict).toContain('preserves decision quality');
  });

  it('passes the Codex cold-resume fixture only because the declared 2x token threshold is met', () => {
    const result = compareProofManifest(resolve(repoRoot, 'examples/proof/codex-token-efficient-resume/manifest.json'));
    const qualityMetric = result.metrics.find((metric) => metric.id === 'quality.decision_score_median');
    const tokenMetric = result.metrics.find((metric) => metric.id === 'usage.codex_reported_total_tokens_median');

    expect(result.summary.boundedProof).toBe(true);
    expect(result.summary.thresholdsPass).toBe(true);
    expect(result.summary.categories.quality).toBe('tied');
    expect(qualityMetric?.label).toBe('Median human-facing decision quality score');
    expect(qualityMetric?.notes).toContain('reader-usability checks');
    expect(tokenMetric?.improvementRatio).toBe(4.330033);
    expect(tokenMetric?.minimumRatio).toBe(2);
    expect(tokenMetric?.minimumRatioPassed).toBe(true);
  });

  it('records the Codex fixture quality score as a human-facing reader-usability rubric', () => {
    const fixture = resolve(repoRoot, 'examples/proof/codex-token-efficient-resume');
    const aggregate = JSON.parse(readFileSync(resolve(fixture, 'receipts/aggregate.json'), 'utf8')) as {
      quality_rubric: { id: string; kind: string; note: string; criteria: Array<{ id: string; label: string }> };
      arms: { control: { receipts: string[] }; scaffolded: { receipts: string[] } };
    };
    const expectedCriteria = [
      'reader_action_is_plain',
      'reader_reasons_explain_decision',
      'reader_resume_pointer_is_unambiguous',
      'reader_acceptance_and_remaining_work_are_clear',
      'reader_next_fields_and_evidence_are_traceable',
      'reader_boundary_is_plain',
    ];
    const aggregateBoundary = JSON.stringify(aggregate);

    expect(aggregate.quality_rubric.id).toBe('deterministic-human-facing-decision-rubric-v1');
    expect(aggregate.quality_rubric.kind).toBe('deterministic reader-usability proxy');
    expect(aggregate.quality_rubric.note).toContain('human reader can understand and act');
    expect(aggregate.quality_rubric.criteria.map((criterion) => criterion.id)).toEqual(expectedCriteria);
    expect(aggregate.quality_rubric.criteria.find((criterion) => criterion.id === 'reader_next_fields_and_evidence_are_traceable')?.label).toContain('at least one direct evidence reference');
    expect(aggregateBoundary).toContain('Original per-replicate codex exec --json turn.completed usage');

    const ignoredRefreshInputs = [
      'examples/proof/codex-token-efficient-resume/raw-events/control-r1.jsonl',
      'examples/proof/codex-token-efficient-resume/receipts/control-r1-meta.json',
    ];
    for (const ignoredPath of ignoredRefreshInputs) {
      const ignored = spawnSync('git', ['check-ignore', '-v', ignoredPath], { cwd: repoRoot, encoding: 'utf8' });
      expect(ignored.status, ignored.stdout + ignored.stderr).toBe(0);
      expect(ignored.stdout).toContain('examples/proof/codex-token-efficient-resume/.gitignore');
    }

    for (const receiptPath of [...aggregate.arms.control.receipts, ...aggregate.arms.scaffolded.receipts]) {
      const receipt = JSON.parse(readFileSync(resolve(fixture, receiptPath), 'utf8')) as {
        quality: { rubric: string; human_facing: boolean; score: number; total: number; checks: Array<{ id: string; label: string; pass: boolean }> };
        source: {
          local_codex_json_event_log: string;
          usage_wall_time_provenance: {
            origin: string;
            usage_source: string;
            wall_time_source: string;
            raw_event_log_committed: boolean;
            raw_event_log_policy: string;
            recomputed_from_raw_events_this_invocation: boolean;
            preserved_during_rubric_rescore: boolean;
          };
          quality_score_source: string;
        };
      };
      expect(receipt.quality.rubric).toBe(aggregate.quality_rubric.id);
      expect(receipt.quality.human_facing).toBe(true);
      expect(receipt.quality.score).toBe(6);
      expect(receipt.quality.total).toBe(6);
      expect(receipt.quality.checks.map((check) => check.id)).toEqual(expectedCriteria);
      expect(receipt.quality.checks.every((check) => check.pass && check.label.length > 0)).toBe(true);
      expect(receipt.source.local_codex_json_event_log).toContain('original measurement came from this live Codex event log');
      expect(receipt.source.usage_wall_time_provenance.origin).toBe('original live codex-cli exec / gpt-5.5 run');
      expect(receipt.source.usage_wall_time_provenance.usage_source).toBe('Codex CLI --json turn.completed usage event');
      expect(receipt.source.usage_wall_time_provenance.wall_time_source).toContain('live Codex invocation');
      expect(receipt.source.usage_wall_time_provenance.raw_event_log_committed).toBe(false);
      expect(receipt.source.usage_wall_time_provenance.raw_event_log_policy).toContain('local runtime residue');
      expect(receipt.source.usage_wall_time_provenance.recomputed_from_raw_events_this_invocation).toBe(false);
      expect(receipt.source.usage_wall_time_provenance.preserved_during_rubric_rescore).toBe(true);
      expect(receipt.source.quality_score_source).toContain('committed answer JSON re-scored');
      expect(receipt.source).not.toHaveProperty('usage_wall_time_reused_from_committed_receipt');
    }
  });

  it('enforces declared minimum improvement ratios before passing a bounded proof', () => {
    const root = fixtureRoot();
    const passing = compareProofManifest(manifest(root, {
      metrics: [
        {
          id: 'quality.acceptance_passes',
          label: 'Accepted criteria passed',
          category: 'quality',
          unit: 'criteria',
          direction: 'higher',
          control: 5,
          scaffolded: 5,
          source_refs: ['evidence/control.json', 'evidence/scaffolded.json'],
        },
        {
          id: 'usage.total_tokens',
          label: 'Codex tokens used',
          category: 'tokens',
          unit: 'tokens',
          direction: 'lower',
          control: 100000,
          scaffolded: 50000,
          minimum_ratio: 2,
          source_refs: ['evidence/control.json', 'evidence/scaffolded.json'],
        },
        {
          id: 'speed.wall_seconds',
          label: 'Wall-clock run time',
          category: 'speed',
          unit: 'seconds',
          direction: 'lower',
          control: 12,
          scaffolded: 10,
          source_refs: ['evidence/control.json', 'evidence/scaffolded.json'],
        },
        {
          id: 'evolution.frontier_delta',
          label: 'Loop frontier improvement',
          category: 'evolution',
          unit: 'accepted criteria delta',
          direction: 'higher',
          control: 0,
          scaffolded: 1,
          source_refs: ['evidence/scaffolded.json'],
        },
      ],
    }));

    expect(passing.summary.thresholdsPass).toBe(true);
    expect(passing.summary.thresholdViolations).toEqual([]);
    expect(passing.summary.boundedProof).toBe(true);
    expect(passing.metrics.find((metric) => metric.id === 'usage.total_tokens')?.minimumRatioPassed).toBe(true);

    const failing = compareProofManifest(manifest(root, {
      metrics: [
        {
          id: 'quality.acceptance_passes',
          label: 'Accepted criteria passed',
          category: 'quality',
          unit: 'criteria',
          direction: 'higher',
          control: 5,
          scaffolded: 5,
          source_refs: ['evidence/control.json', 'evidence/scaffolded.json'],
        },
        {
          id: 'usage.total_tokens',
          label: 'Codex tokens used',
          category: 'tokens',
          unit: 'tokens',
          direction: 'lower',
          control: 100000,
          scaffolded: 60000,
          minimum_ratio: 2,
          source_refs: ['evidence/control.json', 'evidence/scaffolded.json'],
        },
        {
          id: 'speed.wall_seconds',
          label: 'Wall-clock run time',
          category: 'speed',
          unit: 'seconds',
          direction: 'lower',
          control: 12,
          scaffolded: 10,
          source_refs: ['evidence/control.json', 'evidence/scaffolded.json'],
        },
        {
          id: 'evolution.frontier_delta',
          label: 'Loop frontier improvement',
          category: 'evolution',
          unit: 'accepted criteria delta',
          direction: 'higher',
          control: 0,
          scaffolded: 1,
          source_refs: ['evidence/scaffolded.json'],
        },
      ],
    }));

    expect(failing.summary.thresholdsPass).toBe(false);
    expect(failing.summary.boundedProof).toBe(false);
    expect(failing.summary.thresholdViolations[0]).toMatchObject({ metricId: 'usage.total_tokens', required: 2 });
    expect(failing.summary.thresholdViolations[0].actual).toBeCloseTo(1.6666666666666667);

    const nearThresholdPath = manifest(root);
    const nearThresholdManifest = JSON.parse(readFileSync(nearThresholdPath, 'utf8')) as { metrics: Array<{ id: string; control: number; scaffolded: number; minimum_ratio?: number }> };
    for (const metric of nearThresholdManifest.metrics) {
      if (metric.id === 'usage.total_tokens') { metric.control = 19999996; metric.scaffolded = 10000000; metric.minimum_ratio = 2; }
    }
    writeFileSync(nearThresholdPath, `${JSON.stringify(nearThresholdManifest, null, 2)}\n`);
    const nearThreshold = compareProofManifest(nearThresholdPath);
    const nearThresholdTokenMetric = nearThreshold.metrics.find((metric) => metric.id === 'usage.total_tokens');
    expect(nearThresholdTokenMetric?.improvementRatio).toBe(2);
    expect(nearThreshold.summary.thresholdsPass).toBe(false);
    expect(nearThreshold.summary.thresholdViolations[0].actual).toBeCloseTo(1.9999996);

    const controlWinnerPath = manifest(root);
    const controlWinnerManifest = JSON.parse(readFileSync(controlWinnerPath, 'utf8')) as { metrics: Array<{ id: string; control: number; scaffolded: number; minimum_ratio?: number }> };
    for (const metric of controlWinnerManifest.metrics) {
      if (metric.id === 'usage.total_tokens') { metric.control = 50; metric.scaffolded = 100; metric.minimum_ratio = 2; }
    }
    writeFileSync(controlWinnerPath, `${JSON.stringify(controlWinnerManifest, null, 2)}\n`);
    const controlWinner = compareProofManifest(controlWinnerPath);
    const controlWinnerTokenMetric = controlWinner.metrics.find((metric) => metric.id === 'usage.total_tokens');
    expect(controlWinnerTokenMetric).toMatchObject({ winner: 'control', improvementRatio: 0.5, minimumRatioPassed: false });
    expect(controlWinner.summary.thresholdViolations[0].actual).toBe(0.5);

    const zeroThresholdPath = manifest(root);
    const zeroThresholdManifest = JSON.parse(readFileSync(zeroThresholdPath, 'utf8')) as { metrics: Array<{ id: string; control: number; scaffolded: number; minimum_ratio?: number }> };
    for (const metric of zeroThresholdManifest.metrics) {
      if (metric.id === 'usage.total_tokens') { metric.control = 10; metric.scaffolded = 0; metric.minimum_ratio = 100; }
      if (metric.id === 'evolution.frontier_delta') { metric.control = 0; metric.scaffolded = 1; metric.minimum_ratio = 100; }
    }
    writeFileSync(zeroThresholdPath, `${JSON.stringify(zeroThresholdManifest, null, 2)}\n`);
    const zeroThreshold = compareProofManifest(zeroThresholdPath);
    expect(zeroThreshold.summary.thresholdsPass).toBe(true);
    expect(zeroThreshold.summary.boundedProof).toBe(true);
    expect(zeroThreshold.metrics.find((metric) => metric.id === 'usage.total_tokens')).toMatchObject({ improvementRatio: 'unbounded', minimumRatioPassed: true });
    expect(zeroThreshold.metrics.find((metric) => metric.id === 'evolution.frontier_delta')).toMatchObject({ improvementRatio: 'unbounded', minimumRatioPassed: true });
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

    const compare = execFileSync(npx, ['tsx', 'src/cli.ts', 'prove', 'compare', '--format', 'markdown', manifestPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      ...commandOptions,
    });
    expect(compare).toContain('Bounded proof verdict: PASS');
    expect(compare).toContain('usage.total_tokens');

    const check = execFileSync(npx, ['tsx', 'src/cli.ts', 'prove', 'check', manifestPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      ...commandOptions,
    });
    expect(check).toContain('PASS proof comparison manifest valid');

    const trailing = spawnSync(npx, ['tsx', 'src/cli.ts', 'prove', 'check', manifestPath, 'extra'], {
      cwd: repoRoot,
      encoding: 'utf8',
      ...commandOptions,
    });
    expect(trailing.status).toBe(2);
    expect(trailing.stderr).toContain('Usage: osc prove check <manifest.json>');
  }, 60_000);
});
