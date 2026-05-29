import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { inspectScaffold, parsePlanFile, parseChecklist } from './scaffold.js';
import { buildTrace } from './trace.js';

export interface ResumeSummary {
  schema: 'open-scaffold.resume.v1';
  mission: { defined: boolean };
  active_plan: {
    slug: string;
    stage: 'active';
    status: string;
    goal: string;
    acceptance_criteria: Array<{ text: string; checked: boolean }>;
  };
  amendments: { count: number; ids: string[] };
  work_done: {
    done_slices: string[];
    evidence: string[];
  };
  status: string;
  next_bounded_action: string | null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildResumeSummary(root: string): ResumeSummary {
  const scaffold = inspectScaffold(root);

  if (scaffold.plans.active.length !== 1) {
    throw new Error(
      `Resume composer requires exactly one active plan; found ${scaffold.plans.active.length}.`
    );
  }

  const planSummary = scaffold.plans.active[0];
  const plan = parsePlanFile(join(root, planSummary.path));
  const acSection = plan.sections.get('Acceptance criteria') ?? '';
  const checklist = parseChecklist(acSection);

  const planDir = join(root, '.osc', 'plans', planSummary.stage);
  const amendmentRe = new RegExp(`^${escapeRegex(planSummary.slug)}-amendment-(\\d+)\\.md$`);
  const amendmentIds = readdirSync(planDir)
    .filter((f) => amendmentRe.test(f))
    .sort()
    .map((f) => f.slice(0, -3));

  const doneSlices = scaffold.plans.done.map((p) => p.slug).sort();
  const evidenceSet = new Set<string>();
  for (const doneSlug of doneSlices) {
    try {
      const report = buildTrace(root, doneSlug);
      for (const link of report.links) {
        if (
          (link.type === 'release_note' || link.type === 'evidence_reference') &&
          link.status === 'local'
        ) {
          evidenceSet.add(link.reference);
        }
      }
    } catch {
      // skip done slices whose trace fails
    }
  }
  const evidence = [...evidenceSet].sort();

  const checkedCount = checklist.filter((c) => c.checked).length;
  const totalCount = checklist.length;
  const firstUnchecked = checklist.find((c) => !c.checked) ?? null;

  return {
    schema: 'open-scaffold.resume.v1',
    mission: { defined: scaffold.mission.defined },
    active_plan: {
      slug: planSummary.slug,
      stage: 'active',
      status: plan.status,
      goal: plan.goal,
      acceptance_criteria: checklist.map((c) => ({ text: c.text, checked: c.checked })),
    },
    amendments: { count: amendmentIds.length, ids: amendmentIds },
    work_done: { done_slices: doneSlices, evidence },
    status: `active plan ${planSummary.slug}; ${checkedCount}/${totalCount} acceptance criteria complete`,
    next_bounded_action: firstUnchecked?.text ?? null,
  };
}
