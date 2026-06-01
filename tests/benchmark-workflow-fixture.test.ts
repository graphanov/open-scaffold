import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const fixtureRoot = join(repoRoot, 'docs/examples/benchmark-v2-workflow');

interface ScenarioTrack {
  id: string;
  weight: number;
  measures: string[];
  must_not_measure: string[];
}

interface ScenarioPhase {
  id: string;
  generation: number;
  workflow_value_under_test: string[];
  evidence_required: string[];
  expected_decision: string;
}

interface WorkflowScenario {
  schema: string;
  scenario_id: string;
  benchmark_owner: { repo: string; owns: string[] };
  non_claims: string[];
  conditions: Array<{ id: string; allowed_inputs: string[] }>;
  tracks: ScenarioTrack[];
  phases: ScenarioPhase[];
  open_scaffold_surfaces: string[];
  success_gate: { requires: string[]; rejects: string[] };
}

function loadScenario(): WorkflowScenario {
  return JSON.parse(readFileSync(join(fixtureRoot, 'workflow-value-scenario.json'), 'utf8')) as WorkflowScenario;
}

function loadSchema(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(fixtureRoot, 'scenario.schema.json'), 'utf8')) as Record<string, unknown>;
}

function allText(value: unknown): string {
  if (Array.isArray(value)) return value.map(allText).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(allText).join(' ');
  return typeof value === 'string' ? value : '';
}

describe('benchmark v2 workflow-value fixture', () => {
  it('declares a machine-readable scenario schema and concrete fixture', () => {
    const schema = loadSchema();
    const scenario = loadScenario();

    expect(schema.$id).toContain('scenario.schema.json');
    expect(scenario.schema).toBe('open-scaffold.workflow-benchmark-scenario.v1');
    expect(scenario.scenario_id).toBe('2000m-v2-workflow-value');
    expect(scenario.benchmark_owner.repo).toBe('graphanov/2000m');
    expect(scenario.benchmark_owner.owns.join(' ')).toMatch(/scorer|harness|seed|reviewer|viewer/i);
  });

  it('starts as a two-repo protocol fixture, not an Open Scaffold-owned benchmark implementation', () => {
    const scenario = loadScenario();

    expect(scenario.benchmark_owner.owns).toEqual(expect.arrayContaining([
      'v2 scorer and harness implementation',
      'context-wipe execution mechanics',
      'reviewer-injection fixtures',
    ]));
    expect(scenario.open_scaffold_surfaces).toEqual(expect.arrayContaining([
      'osc evolve analyze',
      'osc eval import --adapter 2000m-v1',
      'osc evidence compact',
    ]));
  });

  it('requires the workflow pain points that v1 failed to test', () => {
    const scenario = loadScenario();
    const phaseIds = scenario.phases.map((phase) => phase.id);
    const phaseText = allText(scenario.phases);

    expect(phaseIds).toEqual(expect.arrayContaining([
      'staged-requirement-change',
      'reviewer-injection',
      'regression-trap',
      'context-wipe-handoff',
      'impossible-or-stale-requirement',
    ]));
    expect(phaseText).toMatch(/fresh-agent recovery/i);
    expect(phaseText).toMatch(/stop-condition correctness/i);
    expect(phaseText).toMatch(/scorer inspection/i);
  });

  it('separates workflow, handoff, artifact, and mechanical tracks instead of score-only ranking', () => {
    const scenario = loadScenario();
    const tracks = new Map(scenario.tracks.map((track) => [track.id, track]));

    expect([...tracks.keys()]).toEqual(expect.arrayContaining([
      'mechanical_conformance',
      'artifact_quality',
      'process_control',
      'handoff_recovery',
    ]));
    expect(tracks.get('mechanical_conformance')?.weight).toBeLessThanOrEqual(0.35);
    expect(tracks.get('process_control')?.measures.join(' ')).toMatch(/plateau|stop|redesign|scorer/i);
    expect(tracks.get('handoff_recovery')?.measures.join(' ')).toMatch(/fresh-agent|criterion|blocker|next-action/i);
  });

  it('keeps public claim boundaries explicit', () => {
    const scenario = loadScenario();
    const text = allText(scenario);

    expect(scenario.non_claims).toEqual(expect.arrayContaining([
      'does_not_claim_open_scaffold_improved_2000m_v1_raw_score',
      'does_not_claim_model_intelligence_gain',
      'does_not_claim_adoption_or_market_proof',
      'does_not_claim_benchmark_win_from_evidence_quality',
    ]));
    expect(text).toMatch(/single aggregate score presented as benchmark win/i);
    expect(text).toMatch(/private transcript or local path access/i);
  });
});
