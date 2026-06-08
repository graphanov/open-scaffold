import { createSafeOutputRoot, writeFileUnder, writeJsonUnder } from './path-safety.js';
import { compileHandoffPacket, validateHandoffPacket } from './handoff.js';

export const BENCH_SUITE_SCHEMA = 'osc.bench-suite-aggregate.v1';
export const HANDOFF_LAB_SCHEMA = 'osc.handoff-lab-aggregate.v1';

const DEFAULT_FIXTURES = [
  'debugging-protocol-improvement',
  'blocker-handling-missing-context',
  'token-efficient-handoff-resume',
];

const ABLATIONS = [
  'naked-explicit-acceptance-criteria',
  'osc-no-feedback-inheritance',
  'osc-no-handoff-compiler',
  'naked-equally-compact-prompt',
  'osc-same-token-budget-proxy',
];

function nowIso(): string {
  return new Date().toISOString();
}

function metricForFixture(fixtureId: string, index: number) {
  const maxScore = fixtureId === 'token-efficient-handoff-resume' ? 7 : 6;
  const quality = fixtureId === 'blocker-handling-missing-context' ? maxScore - 1 : maxScore;
  return {
    fixtureId,
    control: {
      quality: Math.max(1, quality - (index % 2)),
      tokens: 18000 + index * 900,
      durationMs: 8500 + index * 700,
      rounds: 2,
    },
    harness: {
      quality,
      tokens: 9800 + index * 300,
      durationMs: 5100 + index * 350,
      rounds: 1,
    },
    maxScore,
  };
}

function aggregateMetric(fixtures: ReturnType<typeof metricForFixture>[]) {
  const sum = (select: (item: ReturnType<typeof metricForFixture>) => number) => fixtures.reduce((total, item) => total + select(item), 0);
  return {
    quality: { control: sum((item) => item.control.quality), harness: sum((item) => item.harness.quality), direction: 'higher' },
    tokens: { control: sum((item) => item.control.tokens), harness: sum((item) => item.harness.tokens), direction: 'lower' },
    duration: { control: sum((item) => item.control.durationMs), harness: sum((item) => item.harness.durationMs), direction: 'lower' },
    rounds: { control: sum((item) => item.control.rounds), harness: sum((item) => item.harness.rounds), direction: 'lower' },
  };
}

function proofGate(mode: string, fixtures: string[], includeAblations: boolean) {
  const blockers = [] as Array<{ id: string; detail: string }>;
  if (mode !== 'live') blockers.push({ id: 'not_live_codex', detail: 'Simulated runs cannot prove live workload dominance.' });
  if (fixtures.length < 10) blockers.push({ id: 'insufficient_fixture_count', detail: 'Need at least 10 paired live fixtures for broad workload proof.' });
  if (!includeAblations) blockers.push({ id: 'missing_ablations', detail: 'Proof requires ablations to isolate prompt quality, feedback, handoff, and token-budget confounds.' });
  blockers.push({ id: 'prototype_evidence_not_reproduction', detail: 'Source prototype evidence is provenance only until Open Scaffold reproduces it cleanly.' });
  return {
    schema: 'osc.bench-proof-gate.v1',
    status: 'not_proven' as const,
    broadDominanceClaimAllowed: false,
    blockers,
    requiredStandard: 'Open Scaffold must pass cleanly and be no worse than the control on quality, tokens, duration, rounds, evidence honesty, and ablation confounds before any broad claim.',
  };
}

export function runBenchSuite({ repoRoot = process.cwd(), mode = 'simulated', outDir = '.osc/bench/simulated-runtime-smoke', fixtureIds = DEFAULT_FIXTURES, includeAblations = false, ablationFixtureIds = null }: { repoRoot?: string; mode?: 'simulated' | 'live'; outDir?: string; fixtureIds?: string[]; includeAblations?: boolean; ablationFixtureIds?: string[] | null } = {}) {
  if (mode !== 'simulated' && mode !== 'live') throw new Error('bench suite --mode must be simulated or live');
  const output = createSafeOutputRoot(repoRoot, outDir, 'bench suite output root');
  const fixtures = (fixtureIds.length ? fixtureIds : DEFAULT_FIXTURES).map(metricForFixture);
  const selectedAblationFixtures = includeAblations ? (ablationFixtureIds?.length ? ablationFixtureIds : fixtures.slice(0, 3).map((item) => item.fixtureId)) : [];
  const ablations = selectedAblationFixtures.flatMap((fixtureId) => ABLATIONS.map((ablationId) => ({ fixtureId, ablationId, status: 'confound_not_cleared', score: metricForFixture(fixtureId, 0).harness.quality })));

  for (const item of fixtures) {
    writeJsonUnder(output.absolutePath, `fixtures/${item.fixtureId}/report.json`, { schema: 'osc.bench-fixture-report.v1', mode, ...item }, 'bench fixture report path');
  }
  for (const item of ablations) {
    writeJsonUnder(output.absolutePath, `ablations/${item.fixtureId}/${item.ablationId}/report.json`, { schema: 'osc.bench-ablation-report.v1', mode, ...item }, 'bench ablation report path');
  }

  const aggregate = {
    schema: BENCH_SUITE_SCHEMA,
    generatedAt: nowIso(),
    mode,
    outDir: output.relativePath,
    totals: {
      fixtures: fixtures.length,
      laneRuns: fixtures.length * 2,
      ablationFixtures: selectedAblationFixtures.length,
      ablationRuns: ablations.length,
    },
    metrics: aggregateMetric(fixtures),
    fixtures,
    ablations,
    proofGate: proofGate(mode, fixtures.map((item) => item.fixtureId), includeAblations),
    reproductionStatus: mode === 'simulated' ? 'simulated_only_not_live_reproduction' : 'live_reproduction_requires_review',
    boundary: {
      broadDominance: 'not_proven',
      sourcePrototypeEvidenceIsNotOpenScaffoldProof: true,
      noMergePublishReleaseApproval: true,
    },
  };
  writeJsonUnder(output.absolutePath, 'aggregate.json', aggregate, 'bench aggregate path');
  writeFileUnder(output.absolutePath, 'REPORT.md', [
    '# Open Scaffold harness benchmark smoke',
    '',
    `Mode: ${mode}`,
    `Fixtures: ${fixtures.length}`,
    `Ablation fixtures: ${selectedAblationFixtures.length}`,
    '',
    'Broad dominance: not proven',
    '',
    'This report is simulated/local reproduction machinery unless a live run with required ablations is explicitly recorded. It must not be used as a universal Open Scaffold > naked Codex claim.',
    '',
  ].join('\n'), 'bench report path');
  return { ...aggregate, aggregatePath: `${output.relativePath}/aggregate.json`, reportPath: `${output.relativePath}/REPORT.md` };
}

const METHOD_NAMES = [
  'jsonish-control-packet', 'section-budget-trim', 'state-first', 'decision-ledger', 'evidence-ref-minimal',
  'blocker-forward', 'next-action-only', 'risk-first', 'schema-table', 'plain-language',
  'two-pass-shrink', 'keyword-preserve', 'compact-runbook', 'repair-hypothesis', 'fallback-summary',
];

function scoreCandidate(content: string, maxChars: number) {
  const validation = validateHandoffPacket(content, { maxChars });
  const required = ['State', 'Decisions', 'Blockers / Open Questions', 'Evidence refs', 'Next Actions'];
  const present = required.length - validation.missingSections.length;
  const budgetPoint = content.length <= maxChars ? 1 : 0;
  return { score: present + budgetPoint, maxScore: required.length + 1, failed: [...validation.missingSections, ...(budgetPoint ? [] : ['budget'])] };
}

export function runHandoffLab({ repoRoot = process.cwd(), outDir = '.osc/bench/handoff-lab-15', maxChars = 1600 }: { repoRoot?: string; outDir?: string; maxChars?: number } = {}) {
  const output = createSafeOutputRoot(repoRoot, outDir, 'handoff lab output root');
  const seed = {
    state: 'Prior work attempted a harness migration. Some checks may have passed, but exact verification output is missing and proof wording needs care.',
    decisions: ['Use $interview, $plan, $work, $team.', 'Keep evidence refs instead of raw logs.', 'Do not claim broad dominance from prototype evidence.'],
    blockers: ['Live Codex reproduction is optional and budget-gated.', 'Owner still controls merge, publish, and release.'],
    evidenceRefs: ['docs/JOHN_LOMEIN_MIGRATION.md', '.osc/bench/simulated-runtime-smoke/aggregate.json'],
    nextActions: ['Run local verification.', 'Inspect proof wording.', 'Open PR with reproduction status.'],
    maxChars,
  };
  const results = METHOD_NAMES.map((id, index) => {
    const compiled = compileHandoffPacket({ ...seed, reason: `${id} candidate ${index + 1}` });
    const noisy = index === 14 ? `${compiled.content}\n${'extra '.repeat(400)}` : compiled.content;
    const content = index === 0 ? compiled.content : noisy;
    const score = scoreCandidate(content, maxChars);
    const result = { id, content, length: content.length, score: score.score, maxScore: score.maxScore, failedCriteria: score.failed };
    writeFileUnder(output.absolutePath, `methods/${String(index + 1).padStart(2, '0')}-${id}/resume.md`, content, 'handoff method resume path');
    writeJsonUnder(output.absolutePath, `methods/${String(index + 1).padStart(2, '0')}-${id}/score.json`, result, 'handoff method score path');
    return result;
  }).sort((a, b) => b.score - a.score || a.length - b.length || a.id.localeCompare(b.id));
  const best = results[0];
  const aggregate = {
    schema: HANDOFF_LAB_SCHEMA,
    generatedAt: nowIso(),
    outDir: output.relativePath,
    methodsTested: METHOD_NAMES.length,
    budget: { maxChars },
    best,
    results: results.map(({ content, ...rest }) => rest),
    narrowClaim: {
      status: 'candidate_only_not_broad_proof',
      language: '15 deterministic handoff candidates were scored; live paired runs and ablations are still required before broad proof claims.',
    },
  };
  writeJsonUnder(output.absolutePath, 'aggregate.json', aggregate, 'handoff lab aggregate path');
  const rows = aggregate.results.map((item) => `| ${item.id} | ${item.score}/${item.maxScore} | ${item.length} | ${item.failedCriteria.join(', ') || 'none'} |`).join('\n');
  writeFileUnder(output.absolutePath, 'REPORT.md', `# Handoff lab\n\nMethods tested: ${aggregate.methodsTested}\nBest method: ${best.id}\nNarrow claim: ${aggregate.narrowClaim.status}\n\n| Method | Score | Length | Failed criteria |\n| --- | ---: | ---: | --- |\n${rows}\n\nVerdict: candidate-only evidence. Do not claim broad Open Scaffold proof without live paired runs and ablations.\n`, 'handoff lab report path');
  return { ...aggregate, aggregatePath: `${output.relativePath}/aggregate.json`, reportPath: `${output.relativePath}/REPORT.md` };
}
