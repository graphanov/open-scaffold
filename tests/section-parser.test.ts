import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { splitSections } from '../src/scaffold.js';
import { validatePlanFile } from '../src/plan-validate.js';
import { validateScaffold } from '../src/validation.js';

const repoRoot = resolve(import.meta.dirname, '..');

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

function mapToObject(map: Map<string, string>): Record<string, string> {
  return Object.fromEntries(map.entries());
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

function realPlanFiles(): string[] {
  return markdownFiles(join(repoRoot, '.osc/plans')).filter((path) => {
    const name = basename(path);
    return !['README.md', 'WORKFLOW.md', 'handoff-template.md'].includes(name) && !name.includes('-amendment-');
  });
}

function writePlan(path: string, body: string) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, body);
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
    const planPath = join(root, '.osc/plans/active/001-fenced-heading.md');
    writePlan(planPath, `# Plan: 001-fenced-heading

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

  it('characterizes the live corpus and permits only the known fenced-heading correction', () => {
    const allowedCorrection = '.osc/releases/2026-05-22-092-evolution-loop-visibility-v1.md';
    const diffs: Array<{ path: string; legacy: string[]; canonical: string[] }> = [];

    for (const path of [...markdownFiles(join(repoRoot, '.osc/plans')), ...markdownFiles(join(repoRoot, '.osc/releases'))]) {
      const rel = relative(repoRoot, path).replace(/\\/g, '/');
      const text = readFileSync(path, 'utf8');
      const legacy = legacySplitSections(text);
      const canonical = splitSections(text);
      if (JSON.stringify(mapToObject(legacy)) === JSON.stringify(mapToObject(canonical))) continue;
      if (rel === allowedCorrection) {
        expect(legacy.has('Acceptance criteria delta')).toBe(true);
        expect(canonical.has('Acceptance criteria delta')).toBe(false);
        expect(canonical.get('Outcome')).toContain('## Acceptance criteria delta');
        continue;
      }
      diffs.push({ path: rel, legacy: [...legacy.keys()], canonical: [...canonical.keys()] });
    }

    expect(diffs).toEqual([]);
  });

  it('pins full plan-validation and tracked release-note outcome sets for the live corpus', () => {
    const planIssueSnapshot = realPlanFiles()
      .map((path) => ({
        path: relative(repoRoot, path).replace(/\\/g, '/'),
        issues: validatePlanFile(path).issues,
      }));

    const scaffold = validateScaffold(repoRoot);
    const trackedReleaseWarnings = scaffold.warnings
      .filter((warning) => warning.path?.startsWith('.osc/releases/'));
    const releaseOutcomeSnapshot = markdownFiles(join(repoRoot, '.osc/releases'))
      .filter((path) => basename(path) !== 'README.md')
      .map((path) => {
        const rel = relative(repoRoot, path).replace(/\\/g, '/');
        return { path: rel, warnings: trackedReleaseWarnings.filter((warning) => warning.path === rel) };
      });

    const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

    expect(hash(planIssueSnapshot)).toBe('886ece880780f8d26c3dfed36d3ef494a9f95d964d547301c0321203bb807234');
    expect(scaffold.failures).toEqual([]);
    expect(hash({ failures: scaffold.failures, releases: releaseOutcomeSnapshot })).toBe('967d7321c554b640d7b1bee28308bab0289cb6eb6b3236ba8c4d0db128639276');
    expect(realPlanFiles().every((path) => statSync(path).isFile())).toBe(true);
  });
});
