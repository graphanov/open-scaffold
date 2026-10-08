import { describe, expect, it, onTestFinished } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { splitSections } from '../src/scaffold.js';
import { validatePlanFile, type PlanValidationIssue } from '../src/plan-validate.js';
import { validateScaffold, type ValidationIssue } from '../src/validation.js';

const repoRoot = resolve(import.meta.dirname, '..');
const fixtureRoot = join(import.meta.dirname, 'fixtures/section-parser-corpus');
const hashBytes = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const hash = (value: unknown) => hashBytes(JSON.stringify(value));
const planOutcomesHash = '28947bb75314e49864005b6e2e1cae558a3ececf4d0d3b50ac2a771379a4fdef';
const releaseOutcomesHash = '7674094b90e6b7f39e09036331fa03c7304d383b4f275fce0a1b44b851aa24a6';

interface InputDocument {
  path: string;
  sha256: string;
  markdown: string;
}

interface SectionDocument extends InputDocument {
  sections: Array<[string, string]>;
}

interface DiagnosticRows {
  plans: Array<{ path: string; issues: PlanValidationIssue[] }>;
  releases: Array<{ path: string; warnings: ValidationIssue[] }>;
}

interface CorpusOutcomes extends DiagnosticRows {
  failures: ValidationIssue[];
}

// These independent pins also protect the expected data, not just the parser output.
const qualifiedProvenance = {
  commit: '6140a7bb1d40ecd226e7dcce07bbd6a49c613f16',
  tree: '192509906ee59789d534f6ec8deaa8a0d8d5ed9d',
  sourceFiles: [
    { path: 'src/scaffold.ts', sha256: 'fbf0e081bd80c52e4403d40ff85d6f2f24f5a84597763197808215e80797dca5' },
    { path: 'src/plan-validate.ts', sha256: 'b19873d2cf2b786c62f85381a381709cf379aa5a7aa143c8cf69898f41e70523' },
    { path: 'src/validation.ts', sha256: '45a8ef1fa24468f15f823f7cbf77c2af349f81bb742fa772e7551938e030928b' },
    { path: 'tests/section-parser.test.ts', sha256: '728bfa9a58122a80ad9c7dbdd34aa29fbe0bcaec4440c174e863ff505d3bc25d' },
  ],
  counts: { documents: 356, plans: 184, releases: 133 },
  rawDocumentBytes: 1369930,
  membershipSha256: 'fd09ffc17e11c3fd015a2b72eab4a1ef4db71ef33927f059049de33ef9dc490c',
  inputsSha256: 'b4bc814589b485450f4597faf2599ece32657a6fc914b90f1200fa61fa5043b6',
  sectionsSha256: '9055184009866859edc65971a928dd510fd247d23c69cead54c48d918110fe2f',
  planOutcomesSha256: planOutcomesHash,
  releaseOutcomesSha256: releaseOutcomesHash,
};

interface HistoricalCorpus {
  schema: string;
  provenance: typeof qualifiedProvenance;
  context: InputDocument[];
  documents: SectionDocument[];
  outcomes: CorpusOutcomes;
}

const corpus: HistoricalCorpus = JSON.parse(readFileSync(join(fixtureRoot, 'v1/corpus.json'), 'utf8'));
const liveDiagnostics: DiagnosticRows & { schema: string } = JSON.parse(readFileSync(join(fixtureRoot, 'live-diagnostics.json'), 'utf8'));

function legacySplitSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = markdown.split(/\r?\n/);
  let current: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (current) sections.set(current, buffer.join('\n').trim());
    buffer = [];
  };
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      flush();
      current = match[1].trim().replace(/\s+/g, ' ');
    } else if (current) {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

function markdownFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(path);
  }
  return out.sort();
}

function realPlanFiles(root: string): string[] {
  return markdownFiles(join(root, '.osc/plans')).filter((path) => {
    const name = basename(path);
    return !['README.md', 'WORKFLOW.md', 'handoff-template.md'].includes(name) && !name.includes('-amendment-');
  });
}

function writeDocument(path: string, body: string) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, body);
}

function relativePath(root: string, path: string): string {
  return relative(root, path).replace(/\\/g, '/');
}

function collectOutcomes(root: string): CorpusOutcomes {
  const planFiles = realPlanFiles(root);
  expect(planFiles.every((path) => statSync(path).isFile())).toBe(true);
  const plans = planFiles.map((path) => ({ path: relativePath(root, path), issues: validatePlanFile(path).issues }));
  const scaffold = validateScaffold(root);
  // Keep the original release-only warning scope; other scaffold warnings can depend on mtime.
  const releaseWarnings = scaffold.warnings.filter((warning) => warning.path?.startsWith('.osc/releases/'));
  const releases = markdownFiles(join(root, '.osc/releases'))
    .filter((path) => basename(path) !== 'README.md')
    .map((path) => {
      const rel = relativePath(root, path);
      return { path: rel, warnings: releaseWarnings.filter((warning) => warning.path === rel) };
    });
  return { plans, releases, failures: scaffold.failures };
}

function assertCorpusIntegrity(fixture: HistoricalCorpus): void {
  expect(fixture.schema).toBe('open-scaffold.section-parser-corpus.v1');
  expect(fixture.provenance).toEqual(qualifiedProvenance);
  expect(fixture.context.map(({ path }) => path)).toEqual(['MISSION.md', 'ROADMAP.md']);
  expect(fixture.documents).toHaveLength(356);
  expect(hash(fixture.documents.map(({ path }) => path))).toBe(qualifiedProvenance.membershipSha256);
  expect(fixture.documents.reduce((bytes, document) => bytes + Buffer.byteLength(document.markdown, 'utf8'), 0)).toBe(qualifiedProvenance.rawDocumentBytes);
  for (const document of [...fixture.context, ...fixture.documents]) {
    expect(hashBytes(Buffer.from(document.markdown, 'utf8')), document.path).toBe(document.sha256);
  }
  expect(hash([...fixture.context, ...fixture.documents].map(({ path, sha256 }) => ({ path, sha256 })))).toBe(qualifiedProvenance.inputsSha256);
  expect(hash(fixture.documents.map(({ path, sections }) => ({ path, sections })))).toBe(qualifiedProvenance.sectionsSha256);
  expect(fixture.outcomes.plans).toHaveLength(184);
  expect(fixture.outcomes.releases).toHaveLength(133);
  expect(fixture.outcomes.failures).toEqual([]);
  expect(hash(fixture.outcomes.plans)).toBe(planOutcomesHash);
  expect(hash({ failures: fixture.outcomes.failures, releases: fixture.outcomes.releases })).toBe(releaseOutcomesHash);
}

function assertHistoricalSections(fixture: HistoricalCorpus, parser = splitSections): void {
  for (const document of fixture.documents) {
    expect([...parser(document.markdown)], document.path).toEqual(document.sections);
  }
}

function withHistoricalRoot(action: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'osc-section-corpus-'));
  try {
    for (const document of [...corpus.context, ...corpus.documents]) {
      writeDocument(join(root, document.path), document.markdown);
    }
    action(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function assertLiveCorpus(root: string, expected: DiagnosticRows = liveDiagnostics): CorpusOutcomes {
  const outcomes = collectOutcomes(root);
  const errors = outcomes.plans.filter(({ issues }) => issues.some((issue) => issue.severity === 'error'));
  expect(errors, `Live plan errors:\n${JSON.stringify(errors, null, 2)}`).toEqual([]);
  expect(outcomes.failures, 'Live scaffold failures').toEqual([]);
  // Exclude only empty rows. Every diagnostic field and its document path stays in the equality.
  expect(outcomes.plans.filter(({ issues }) => issues.length > 0), 'Live plan diagnostics').toEqual(expected.plans);
  expect(outcomes.releases.filter(({ warnings }) => warnings.length > 0), 'Live release diagnostics').toEqual(expected.releases);
  return outcomes;
}

const addedPlanPath = '.osc/plans/done/999-corpus-extension.md';
const addedReleasePath = '.osc/releases/2099-01-01-999-corpus-extension.md';
const concreteGoal = 'Demonstrate that an additional structurally valid plan changes only aggregate corpus membership.';
const fencedExample = '\n\n```markdown\n## Hidden fixture heading\nThis remains a fenced example.\n```';

function syntheticPlan(status = 'done', example = ''): string {
  return `# Plan: 999-corpus-extension

## Status

${status}

## Context

Disposable synthetic input for parser characterization controls.

## Goal

${concreteGoal}${example}

## Constraints / Out of scope

- Synthetic fixture only; no real repository work or publication.

## Files to touch

- \`synthetic-only.txt\` — a disposable fixture path.

## Acceptance criteria

- [x] The synthetic plan produces no validation issues.

## Verification steps

1. Run the parser and validators in the disposable fixture root.

## Open questions

- None.
`;
}

function syntheticRelease(example = ''): string {
  return `# Release / Evidence Note: synthetic corpus extension

## Summary

A disposable synthetic evidence note exercises corpus membership without a product change.${example}

## Traceability

- Parser regression context: \`.osc/plans/done/130-section-parser-canonical-contract.md\`.
- No PR: synthetic temporary fixture only; no publication occurred.

## Verification

The parser and validators read this synthetic fixture in a disposable root.

## Outcome

The note supplies every required section and an explicit synthetic publication rationale.
`;
}

function canonicalCrLf(markdown: string): string {
  return markdown.replace(/^## (.+)$/gm, '## $1 ##').replace(/\n/g, '\r\n');
}

describe('canonical markdown section parser', () => {
  it('ignores section-looking headings inside fenced code blocks', () => {
    const sections = splitSections(`# Plan: fenced fixture

## Status

active

## Goal

Explain the behavior.

\`\`\`markdown
## Example
This is a code sample, not a document section.
\`\`\`

Continue the goal body.

## Acceptance criteria

- [ ] Goal body keeps the fenced sample without creating an Example section.
`);

    expect([...sections.keys()]).toEqual(['Status', 'Goal', 'Acceptance criteria']);
    expect(sections.has('Example')).toBe(false);
    expect(sections.get('Goal')).toContain('## Example');
    expect(sections.get('Goal')).toContain('Continue the goal body.');
  });

  it('locks the dependency-free heading recognition contract', () => {
    const sections = splitSections([
      '# Document',
      ' ## Indented is not a section',
      '## Goal ##',
      'Body.',
      '### Subheading is not a section',
      '## Files\tto    touch ###',
      'Paths.',
      '##',
      '##    ',
      '## lowercase',
      'Lowercase stays distinct and case-sensitive.',
    ].join('\n'));

    expect([...sections.keys()]).toEqual(['Goal', 'Files to touch', 'lowercase']);
    expect(sections.get('Goal')).toContain('### Subheading is not a section');
  });

  it('tracks backtick and tilde fences by marker and length', () => {
    const sections = splitSections([
      '## Goal',
      'Before.',
      '```ts # info string with #',
      '## Hidden in three-backtick fence',
      '````',
      '## After backtick fence',
      'Four-backtick-or-longer close is accepted for a three-backtick open.',
      '~~~~',
      '```',
      '## Hidden in tilde fence',
      '~~~',
      'Still hidden because a three-tilde line is too short for a four-tilde open.',
      '~~~~~',
      '## After tilde fence',
      'Done.',
    ].join('\n'));

    expect([...sections.keys()]).toEqual(['Goal', 'After backtick fence', 'After tilde fence']);
    expect(sections.has('Hidden in three-backtick fence')).toBe(false);
    expect(sections.has('Hidden in tilde fence')).toBe(false);
  });

  it('tolerates CRLF headings and fenced block delimiters', () => {
    const sections = splitSections([
      '## Status',
      '',
      'active',
      '',
      '## Goal ##',
      '',
      'Before.',
      '```markdown',
      '## Hidden on CRLF',
      '```',
      'After.',
      '',
      '## Verification steps',
      '',
      '1. Run tests.',
    ].join('\r\n'));

    expect([...sections.keys()]).toEqual(['Status', 'Goal', 'Verification steps']);
    expect(sections.has('Hidden on CRLF')).toBe(false);
    expect(sections.get('Goal')).toContain('## Hidden on CRLF');
  });

  it('keeps fenced headings out of plan heading-order checks and line-number reports', () => {
    const root = mkdtempSync(join(tmpdir(), 'osc-section-lines-'));
    onTestFinished(() => rmSync(root, { recursive: true, force: true }));
    const planPath = join(root, '.osc/plans/active/001-fenced-heading.md');
    writeDocument(planPath, `# Plan: 001-fenced-heading

## Status

active

## Context

Context exists.

## Goal

Deliver a measurable parser hardening fixture for validation line numbers.

\`\`\`markdown
## Acceptance criteria
This sample must not count as the real section.
\`\`\`

## Constraints / Out of scope

- Fixture only.

## Files to touch

- \`src/scaffold.ts\` — parser.

## Acceptance criteria

## Verification steps

1. Run tests.

## Open questions

- None.
`);

    const lines = readFileSync(planPath, 'utf8').split(/\r?\n/);
    const actualAcceptanceCriteriaLine = lines.reduce((line, value, index) => (value === '## Acceptance criteria' ? index + 1 : line), 1);
    const issues = validatePlanFile(planPath).issues;

    expect(issues.some((issue) => issue.rule === 'heading-order')).toBe(false);
    expect(issues.find((issue) => issue.rule === 'non-empty-ac')?.line).toBe(actualAcceptanceCriteriaLine);
  });

  it('pins complete historical membership, raw bytes, provenance and expected data', () => {
    assertCorpusIntegrity(corpus);
  });

  it('characterizes every ordered historical section body and only the known legacy correction', () => {
    assertHistoricalSections(corpus);
    const allowedCorrection = '.osc/releases/2026-05-22-092-evolution-loop-visibility-v1.md';
    const diffs: Array<{ path: string; legacy: string[]; canonical: string[] }> = [];
    for (const document of corpus.documents) {
      const legacy = legacySplitSections(document.markdown);
      const canonical = splitSections(document.markdown);
      if (JSON.stringify([...legacy]) === JSON.stringify([...canonical])) continue;
      if (document.path === allowedCorrection) {
        expect(legacy.has('Acceptance criteria delta')).toBe(true);
        expect(canonical.has('Acceptance criteria delta')).toBe(false);
        expect(canonical.get('Outcome')).toContain('## Acceptance criteria delta');
        continue;
      }
      diffs.push({ path: document.path, legacy: [...legacy.keys()], canonical: [...canonical.keys()] });
    }
    expect(diffs).toEqual([]);
  });

  it('pins full historical validation outcomes in their original scaffold context', () => {
    withHistoricalRoot((root) => {
      const outcomes = collectOutcomes(root);
      expect(outcomes.plans.flatMap(({ issues }) => issues).filter((issue) => issue.severity === 'error')).toEqual([]);
      expect(outcomes).toEqual(corpus.outcomes);
      expect(hash(outcomes.plans)).toBe(planOutcomesHash);
      expect(outcomes.failures).toEqual([]);
      expect(hash({ failures: outcomes.failures, releases: outcomes.releases })).toBe(releaseOutcomesHash);
    });
  });

  it('detects omitted inputs, byte tampering and reordered or lost expected section bodies', () => {
    const omitted = structuredClone(corpus);
    omitted.documents.pop();
    expect(() => assertCorpusIntegrity(omitted)).toThrow();
    const tampered = structuredClone(corpus);
    tampered.documents[0].markdown += '\nChanged input.\n';
    expect(() => assertCorpusIntegrity(tampered)).toThrow();
    const lostBody = structuredClone(corpus);
    lostBody.documents.find(({ sections }) => sections.length > 0)!.sections[0][1] = '';
    expect(() => assertCorpusIntegrity(lostBody)).toThrow();
    const reordered = structuredClone(corpus);
    reordered.documents.find(({ sections }) => sections.length > 1)!.sections.reverse();
    expect(() => assertCorpusIntegrity(reordered)).toThrow();
    const changedOutcome = structuredClone(corpus);
    changedOutcome.outcomes.plans.find(({ issues }) => issues.length > 0)!.issues[0].suggestion += ' Changed.';
    expect(() => assertCorpusIntegrity(changedOutcome)).toThrow();
  });

  it('detects fence regressions and section-body loss even for an otherwise clean document', () => {
    const path = '.osc/releases/2026-05-22-092-evolution-loop-visibility-v1.md';
    expect(corpus.outcomes.releases.find((row) => row.path === path)?.warnings).toEqual([]);
    expect(corpus.outcomes.failures).toEqual([]);
    expect(() => assertHistoricalSections(corpus, legacySplitSections)).toThrow();
    const loseFencedBody = (markdown: string) => {
      const sections = splitSections(markdown);
      const body = sections.get('Outcome');
      if (body?.includes('## Acceptance criteria delta')) {
        sections.set('Outcome', body.split('```')[0].trim());
      }
      return sections;
    };
    expect(() => assertHistoricalSections(corpus, loseFencedBody)).toThrow();
  });

  it('validates every live document and compares complete nonempty diagnostic rows', () => {
    expect(liveDiagnostics.schema).toBe('open-scaffold.section-parser-live-diagnostics.v1');
    assertLiveCorpus(repoRoot);
  });

  it.each([
    ['plan', true, false],
    ['evidence', false, true],
    ['both', true, true],
  ] as const)('accepts a valid %s addition without changing expected data', (_label, addPlan, addRelease) => {
    withHistoricalRoot((root) => {
      if (addPlan) writeDocument(join(root, addedPlanPath), syntheticPlan());
      if (addRelease) writeDocument(join(root, addedReleasePath), syntheticRelease());
      const outcomes = assertLiveCorpus(root);
      if (addPlan) expect(outcomes.plans.find(({ path }) => path === addedPlanPath)?.issues).toEqual([]);
      if (addRelease) expect(outcomes.releases.find(({ path }) => path === addedReleasePath)?.warnings).toEqual([]);
    });
  });

  it('accepts a clean status-aligned plan closure without changing expected data', () => {
    withHistoricalRoot((root) => {
      const activePath = addedPlanPath.replace('/done/', '/active/');
      writeDocument(join(root, activePath), syntheticPlan('active'));
      expect(assertLiveCorpus(root).plans.find(({ path }) => path === activePath)?.issues).toEqual([]);
      renameSync(join(root, activePath), join(root, addedPlanPath));
      writeDocument(join(root, addedPlanPath), syntheticPlan('done'));
      const outcomes = assertLiveCorpus(root);
      expect(outcomes.plans.some(({ path }) => path === activePath)).toBe(false);
      expect(outcomes.plans.find(({ path }) => path === addedPlanPath)?.issues).toEqual([]);
    });
  });

  it('accepts new canonical fenced, ATX-closed and CRLF plans and evidence', () => {
    withHistoricalRoot((root) => {
      const plan = canonicalCrLf(syntheticPlan('done', fencedExample));
      const release = canonicalCrLf(syntheticRelease(fencedExample));
      for (const markdown of [plan, release]) {
        expect(splitSections(markdown).has('Hidden fixture heading')).toBe(false);
        expect([...legacySplitSections(markdown)]).not.toEqual([...splitSections(markdown)]);
      }
      writeDocument(join(root, addedPlanPath), plan);
      writeDocument(join(root, addedReleasePath), release);
      const outcomes = assertLiveCorpus(root);
      expect(outcomes.plans.find(({ path }) => path === addedPlanPath)?.issues).toEqual([]);
      expect(outcomes.releases.find(({ path }) => path === addedReleasePath)?.warnings).toEqual([]);
    });
  });

  it.each([
    ['a missing required heading', '## Context', '## Situation', 'required-sections', 'Live plan errors'],
    ['a status/stage mismatch', '\n\ndone\n', '\n\nactive\n', 'status-stage-consistency', 'Live plan errors'],
    ['a vague-goal warning', concreteGoal, 'Fix code.', 'no-vague-goal', 'Live plan diagnostics'],
  ])('rejects %s on a previously clean live plan', (_label, before, after, rule, failure) => {
    withHistoricalRoot((root) => {
      writeDocument(join(root, addedPlanPath), syntheticPlan());
      assertLiveCorpus(root);
      writeDocument(join(root, addedPlanPath), syntheticPlan().replace(before, after));
      const issues = collectOutcomes(root).plans.find(({ path }) => path === addedPlanPath)?.issues;
      expect(issues?.some((issue) => issue.rule === rule)).toBe(true);
      expect(() => assertLiveCorpus(root)).toThrow(failure);
    });
  });

  it('rejects a new missing-section release warning on a previously clean note', () => {
    withHistoricalRoot((root) => {
      writeDocument(join(root, addedReleasePath), syntheticRelease());
      assertLiveCorpus(root);
      writeDocument(join(root, addedReleasePath), syntheticRelease().replace('## Summary', '## Details'));
      const warnings = collectOutcomes(root).releases.find(({ path }) => path === addedReleasePath)?.warnings;
      expect(warnings).toEqual([{
        level: 'warn',
        code: 'release_note.missing_section',
        message: 'Release note is missing ## Summary',
        path: addedReleasePath,
      }]);
      expect(() => assertLiveCorpus(root)).toThrow('Live release diagnostics');
    });
  });

  it('rejects a scaffold failure and removal of a known publication warning', () => {
    withHistoricalRoot((root) => {
      writeDocument(join(root, 'MISSION.md'), '<!-- mission:unset -->');
      expect(() => assertLiveCorpus(root)).toThrow('Live scaffold failures');
    });
    withHistoricalRoot((root) => {
      const path = '.osc/releases/2026-10-08-184-john-six-day-maintainer.md';
      const file = join(root, path);
      writeDocument(file, readFileSync(file, 'utf8') + '\nNo PR: synthetic warning-removal control only.\n');
      expect(collectOutcomes(root).releases.find((row) => row.path === path)?.warnings).toEqual([]);
      expect(() => assertLiveCorpus(root)).toThrow('Live release diagnostics');
    });
  });

  it.each(['severity', 'line', 'rule', 'message', 'suggestion', 'path'] as const)('compares the complete live plan diagnostic %s field', (field) => {
    withHistoricalRoot((root) => {
      const changed = structuredClone(liveDiagnostics);
      const row = changed.plans[0];
      if (field === 'path') row.path += '.changed';
      else if (field === 'line') row.issues[0].line += 1;
      else if (field === 'severity') row.issues[0].severity = 'note';
      else row.issues[0][field] += ' Changed.';
      expect(() => assertLiveCorpus(root, changed)).toThrow('Live plan diagnostics');
    });
  });

  it.each(['level', 'code', 'message', 'path', 'diagnostic path'] as const)('compares the complete live release warning %s field', (field) => {
    withHistoricalRoot((root) => {
      const changed = structuredClone(liveDiagnostics);
      const row = changed.releases[0];
      if (field === 'path') row.path += '.changed';
      else if (field === 'diagnostic path') row.warnings[0].path = `${row.warnings[0].path}.changed`;
      else if (field === 'level') row.warnings[0].level = 'fail';
      else row.warnings[0][field] += ' Changed.';
      expect(() => assertLiveCorpus(root, changed)).toThrow('Live release diagnostics');
    });
  });
});
