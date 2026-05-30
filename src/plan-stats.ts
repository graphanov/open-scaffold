import { statSync } from 'node:fs';
import { join } from 'node:path';
import { findScaffoldRoot, inspectScaffold, PLAN_STAGES, type PlanStage } from './scaffold.js';

export type PlanStageCounts = Record<PlanStage, number>;

export interface OldestActivePlan {
  slug: string;
  path: string;
  modifiedMs: number;
  modifiedIso: string;
}

export interface PlanStats {
  counts: PlanStageCounts;
  total: number;
  oldestActive: OldestActivePlan | null;
}

/**
 * Portfolio summary of the plans under .osc/plans/. Counts are read from the
 * real stage folders via inspectScaffold (which already filters READMEs,
 * WORKFLOW.md, the handoff template, and amendment files), so they are never
 * hardcoded. "Oldest active" means the active plan with the smallest
 * filesystem modification time — the least recently touched in-flight work.
 */
export function computePlanStats(start = process.cwd()): PlanStats {
  const root = findScaffoldRoot(start) ?? start;
  const state = inspectScaffold(root);

  const counts: PlanStageCounts = { active: 0, backlog: 0, blocked: 0, done: 0 };
  let total = 0;
  for (const stage of PLAN_STAGES) {
    counts[stage] = state.plans[stage].length;
    total += counts[stage];
  }

  // inspectScaffold returns active plans sorted by filename; the strict `<`
  // comparison keeps the first-by-name plan on an mtime tie, so the result is
  // deterministic.
  let oldestActive: OldestActivePlan | null = null;
  for (const plan of state.plans.active) {
    const modifiedMs = Math.round(statSync(join(state.root, plan.path)).mtimeMs);
    if (!oldestActive || modifiedMs < oldestActive.modifiedMs) {
      oldestActive = { slug: plan.slug, path: plan.path, modifiedMs, modifiedIso: new Date(modifiedMs).toISOString() };
    }
  }

  return { counts, total, oldestActive };
}

export function formatPlanStats(stats: PlanStats): string {
  const lines = [
    'Plan portfolio stats',
    '',
    `active:  ${stats.counts.active}`,
    `backlog: ${stats.counts.backlog}`,
    `blocked: ${stats.counts.blocked}`,
    `done:    ${stats.counts.done}`,
    `total:   ${stats.total}`,
    '',
  ];
  if (stats.oldestActive) {
    lines.push(`Oldest active plan: ${stats.oldestActive.slug} (least recently modified ${stats.oldestActive.modifiedIso.slice(0, 10)})`);
  } else {
    lines.push('Oldest active plan: none (no active plans)');
  }
  return lines.join('\n');
}
