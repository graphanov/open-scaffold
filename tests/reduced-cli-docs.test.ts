import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');

const currentFacingDocs = [
  'README.md',
  'ROADMAP.md',
  'docs/WORKFLOW.md',
  'docs/EVOLUTION_LOOP.md',
  'docs/GLASS_COCKPIT_PROTOCOL.md',
  'docs/RUNTIME_ADOPTION_WORKFLOW.md',
  'docs/STABILITY.md',
  'docs/index.html',
  'docs/TASKS.md',
  'docs/OPEN_SCAFFOLD_SYSTEM.md',
  'docs/COMMAND_MATURITY.md',
  'docs/RESUME_WALKTHROUGH.md',
  'docs/SLICE_CLOSE_PROTOCOL.md',
  'docs/wiki/log.md',
  'docs/wiki/concepts/implementation-architecture-lens.md',
  'docs/EVIDENCE_METHODOLOGY.md',
  'docs/EVIDENCE_SELF_STUDY.md',
  'docs/AB_COMPARISON_PROTOCOL.md',
  'docs/AB_COMPARISON_PILOT.md',
  'docs/examples/ab-comparison/README.md',
  'docs/examples/ab-comparison/pre-registration.md',
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
  /osc commands(?=\s|`|<|"|$)/g,
  /src\/command-maturity\.ts/g,
  /src\/resume\.ts/g,
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

  it('keeps the removed work replacement recipe dispatchable', () => {
    const readme = readFileSync(resolve(repoRoot, 'README.md'), 'utf8');

    expect(readme).toContain('osc run .osc/plans/active/<slug>.md --runtime codex --workflow plan');
    expect(readme).toContain('Use `osc run ... --dry-run` only to preview the run packet');
    expect(readme).not.toContain('osc run .osc/plans/active/<slug>.md --dry-run --runtime codex --workflow plan\nosc dispatch .osc/runs/RUN_ID/run.json');
  });
});
