import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { inspectScaffold, parsePlanFile, parseChecklist, splitSections } from './scaffold.js';
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

function amendmentKeepsAcceptanceCriteriaUnchanged(markdown: string): boolean {
  const sections = splitSections(markdown);
  const impact = (sections.get('Impact on acceptance criteria') ?? '').trim();
  if (!impact) return false;
  if (/\bnone\b/i.test(impact) && /\bunchanged\b|\bno\s+change\b|\bdoes\s+not\s+change\b/i.test(impact)) {
    return true;
  }
  if (/acceptance criteria remain unchanged/i.test(impact)) return true;
  return false;
}

function assertAmendmentsDoNotChangeAcceptanceCriteria(planDir: string, amendmentFiles: string[]): void {
  for (const file of amendmentFiles) {
    const text = readFileSync(join(planDir, file), 'utf8');
    if (!amendmentKeepsAcceptanceCriteriaUnchanged(text)) {
      throw new Error(
        `Resume composer does not support amendments that change or supersede acceptance criteria: ${file}. ` +
        'Fold amendment impacts into a future resume schema before deriving next_bounded_action.'
      );
    }
  }
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
  const amendmentFiles = readdirSync(planDir)
    .filter((f) => amendmentRe.test(f))
    .sort();
  assertAmendmentsDoNotChangeAcceptanceCriteria(planDir, amendmentFiles);
  const amendmentIds = amendmentFiles.map((f) => f.slice(0, -3));

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
