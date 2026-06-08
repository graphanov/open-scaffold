import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(process.cwd());

function read(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

function firstLines(text: string, count: number): string {
  return text.split('\n').slice(0, count).join('\n');
}

describe('public work-record positioning', () => {
  it('leads the README with the repo-native work-record promise', () => {
    const firstScreen = firstLines(read('README.md'), 80);

    expect(firstScreen).toContain("Your AI agent's work belongs in your repo, not its chat history.");
    expect(firstScreen).toContain('repo-native work record');
    expect(firstScreen).toContain('goal');
    expect(firstScreen).toContain('plan');
    expect(firstScreen).toContain('handoff');
    expect(firstScreen).toContain('evidence');
    expect(firstScreen).toContain('approval');
    expect(firstScreen).toContain('lessons');

    expect(firstScreen).not.toMatch(/agent OS|control plane|compliance-grade|operating system|tamper-proof/i);
  });

  it('documents auditability as evidence substrate, not a compliance program', () => {
    const auditability = read('docs/AUDITABILITY.md');

    expect(auditability).toContain('evidence substrate');
    expect(auditability).toContain('does not prove the work is correct');
    expect(auditability).toContain('human approval');
    expect(auditability).toContain('compliance program');
    expect(auditability).toContain('project materials');
    expect(auditability).not.toMatch(/compliance-grade|tamper-proof|certif(y|ies|ied)/i);
    expect(auditability).not.toMatch(/close to the code|beside the code it describes/i);
  });

  it('keeps roadmap and system ontology entrypoints off operating-system framing', () => {
    const entrypoints = [
      ['ROADMAP.md', firstLines(read('ROADMAP.md'), 20)],
      ['docs/OPEN_SCAFFOLD_SYSTEM.md', firstLines(read('docs/OPEN_SCAFFOLD_SYSTEM.md'), 20)],
    ] as const;

    for (const [path, text] of entrypoints) {
      expect(text, path).not.toMatch(/repo-native operating system|agent OS|control plane|compliance-grade/i);
      expect(text, path).toMatch(/repo-native work record|repository protocol|repo protocol/i);
    }
  });

  it('keeps public wiki concept pages off legacy OS titles and filenames', () => {
    const conceptFiles = readdirSync(join(repoRoot, 'docs/wiki/concepts'));
    expect(conceptFiles.join('\n')).not.toMatch(/operating-system/i);

    const workRecord = read('docs/wiki/concepts/repo-native-work-record.md');
    expect(workRecord).toContain('title: Repo-Native Work Record');
    expect(workRecord).toContain('# Repo-Native Work Record');
    expect(firstLines(workRecord, 20)).not.toMatch(/Agent Operating System|operating system/i);
  });

  it('keeps the tracked dashboard snapshot mission excerpt aligned with work-record framing', () => {
    const dashboard = read('.osc/dashboard.html');
    const [, rawData] = dashboard.match(/<script id="osc-dashboard-data" type="application\/json">([^<]+)<\/script>/) ?? [];
    expect(rawData).toBeTruthy();

    const data = JSON.parse(rawData) as { mission: { excerpt: string } };
    expect(data.mission.excerpt).toContain('repo-native work record');
    expect(data.mission.excerpt).not.toMatch(/repo-native operating system|agent OS|control plane|compliance-grade/i);
  });

  it('keeps the wiki log append-only while recording the work-record rename', () => {
    const log = read('docs/wiki/log.md');

    expect(log).toContain('repo-native agent operating system');
    expect(log).toContain('## [2026-05-27] rename | Repo-native work record concept');
    expect(log).toContain('`docs/wiki/concepts/repo-native-work-record.md`');
  });

  it('does not define Open Scaffold as software-only in first-touch public docs', () => {
    const firstTouchDocs = [
      'README.md',
      'MISSION.md',
      'AGENTS.md',
      'CLAUDE.md',
      'ROADMAP.md',
      'SECURITY.md',
      'docs/AUDITABILITY.md',
      'docs/COMPARISON.md',
      'docs/wiki/concepts/repo-native-work-record.md',
      'docs/wiki/queries/what-is-open-scaffold-for.md',
    ];

    for (const path of firstTouchDocs) {
      const text = read(path);
      expect(text, path).not.toMatch(/AI-assisted software|software work|software project|software projects|software development|build software|building software/i);
    }
  });

  it('keeps the release evidence summary off software-only framing', () => {
    const evidence = read('.osc/releases/2026-05-27-108-public-work-record-positioning.md');
    const summary = evidence.split('## Traceability')[0];

    expect(summary).toContain('AI-assisted work');
    expect(summary).not.toMatch(/AI-assisted software|software work|software project|software projects|software development|build software|building software/i);
  });

  it('documents evidence-chain verification as structural, not certification', () => {
    const closeProtocol = read('docs/SLICE_CLOSE_PROTOCOL.md');
    const section = closeProtocol.split('## Evidence chain verification')[1]?.split('## Slice states')[0] ?? '';

    expect(section).toContain('osc verify --evidence-chain');
    expect(section).toContain('links together structurally');
    expect(section).toContain('does not judge evidence quality');
    expect(section).toContain('retrieve context');
    expect(section).toContain('anchor evidence externally');
    expect(section).toContain('Incremental evidence-chain mode');
    expect(section).not.toMatch(/trusted|compliance-grade|tamper-proof|trust score/i);
  });

  it('documents trace as read-only replay, not verification or certification', () => {
    const trace = read('docs/TRACE.md');

    expect(trace).toContain('osc trace <plan-slug>');
    expect(trace).toContain('read-only work-record replay');
    expect(trace).toContain('osc verify --evidence-chain');
    expect(trace).toContain('does not call GitHub');
    expect(trace).toContain('does not spawn runtimes');
    expect(trace).toContain('does not judge correctness, evidence quality, or readiness');
    expect(trace).not.toMatch(/trust score|compliance-grade|tamper-proof|certif(y|ies|ied)/i);
  });

  it('keeps efficiency positioning benchmark-neutral and artifact-measured while exposing bounded proof receipts', () => {
    const readme = read('README.md');
    const evolution = read('docs/EVOLUTION_LOOP.md');
    const methodology = read('docs/EVIDENCE_METHODOLOGY.md');
    const faq = read('docs/FAQ.md');
    const proof = read('docs/PROOF_HARNESS.md');
    const combined = [readme, evolution, methodology, faq, proof].join('\n');

    expect(combined).toContain('does not make models smarter');
    expect(combined).toContain('is not benchmark proof');
    expect(combined).toContain('workflow control');
    expect(combined).toContain('before/after artifact');
    expect(combined).toContain('diagnostic');
    expect(combined).toContain('experimental');
    expect(evolution).toContain('osc evolve analyze .osc/evolution/demo-loop --efficiency');
    expect(methodology).toContain('output bytes per useful decision field');
    expect(methodology).toContain('osc prove compare');
    expect(proof).toContain('Bounded fixture proof only');
    expect(proof).toContain('not a universal benchmark');
    expect(proof).toContain('15,225 bytes');
    expect(proof).toContain('31,635');
    expect(readme).toContain('docs/PROOF_HARNESS.md');
    expect(faq).toContain('token/cost savings require receipts');
  });

  it('positions comparison tools as adjacent layers rather than enemies', () => {
    const comparison = read('docs/COMPARISON.md');

    expect(comparison).toContain('adjacent layers');
    expect(comparison).toContain('not enemies');
    expect(comparison).toContain('repo record layer');
    expect(comparison).toContain('durable notebook next to the code');
  });
});
