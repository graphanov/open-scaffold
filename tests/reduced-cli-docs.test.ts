import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');

const currentFacingDocs = [
  'README.md',
  'ROADMAP.md',
  'docs/WORKFLOW.md',
  'docs/EVOLUTION_LOOP.md',
  'docs/STABILITY.md',
  'docs/index.html',
  'docs/OPEN_SCAFFOLD_SYSTEM.md',
  'docs/RESUME_WALKTHROUGH.md',
  'docs/SLICE_CLOSE_PROTOCOL.md',
  'docs/wiki/log.md',
  'docs/wiki/concepts/implementation-architecture-lens.md',
];

const removedCommandPatterns = [
  /osc eval import/g,
  /osc eval check/g,
  /osc evidence compact/g,
  /osc status --dashboard/g,
  /osc plan wizard/g,
  /osc plan graph/g,
  /osc plan stats/g,
  /osc task(?=\s|`|<|"|$)/g,
  /osc work(?=\s|`|<|"|$)/g,
  /osc dashboard(?=\s|`|<|"|$)/g,
  /osc metrics(?=\s|`|<|"|$)/g,
  /osc study(?=\s|`|<|"|$)/g,
  /osc ab(?=\s|`|<|"|$)/g,
  /osc doctor --fix/g,
  /osc harness(?=\s|`|<|\"|$)/g,
  /osc dispatch(?=\s|`|<|\"|$)/g,
  /osc adapter(?=\s|`|<|\"|$)/g,
  /osc commands(?=\s|`|<|"|$)/g,
  /src\/command-maturity\.ts/g,
  /tests\/resume-snapshot\.test\.ts/g,
  /\.osc\/tasks\.db/g,
  /open-scaffold\.compact-evidence\.v1/g,
];

const migrationContext = /historical|repositioned|removed|retired|migration|future|backlog|previous|previously|earlier|no longer|not live|not a live|outside the reduced|reduced maintained CLI|not current/i;
const fileLevelMigrationContext = /Status: historical\/repositioned|Historical\/repositioned|historical\/repositioned .*document|historical\/repositioned .*protocol/i;

describe('reduced CLI documentation coherence', () => {
  it('marks references to removed commands as historical, migration, or future context', () => {
    const unmarked: string[] = [];

    for (const path of currentFacingDocs) {
      const text = readFileSync(resolve(repoRoot, path), 'utf8');
      const wholeFileIsMigrationContext = fileLevelMigrationContext.test(text.slice(0, 1000));
      for (const pattern of removedCommandPatterns) {
        pattern.lastIndex = 0;
        for (const match of text.matchAll(pattern)) {
          const index = match.index ?? 0;
          const context = text.slice(Math.max(0, index - 800), Math.min(text.length, index + 800));
          if (!wholeFileIsMigrationContext && !migrationContext.test(context)) unmarked.push(`${path}: ${match[0]}`);
        }
      }
    }

    expect(unmarked).toEqual([]);
  });

  it('keeps the removed work replacement recipe packet-only', () => {
    // 168: dispatch/adapter execution left the maintained CLI. The migration
    // recipe now stops at a reviewable run packet for an external worker.
    const stability = readFileSync(resolve(repoRoot, 'docs/STABILITY.md'), 'utf8');

    expect(stability).toContain('osc run .osc/plans/active/<slug>.md --runtime codex --workflow plan');
    expect(stability).toContain('Use `osc run ... --dry-run` only to preview the run packet');
    expect(stability).not.toContain('osc dispatch .osc/runs/RUN_ID/run.json');
  });
});
