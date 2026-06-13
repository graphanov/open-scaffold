import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { redactPacketText } from './handoff.js';
import { loadAcceptedImprovements, readFeedback } from './feedback.js';
import { inspectScaffold, parseChecklist, parsePlanFile, type ChecklistItem, type PlanSummary } from './scaffold.js';

export const RESUME_SCHEMA = 'open-scaffold.resume.v1';
export const DEFAULT_RESUME_MAX_CHARS = 4000;
export const MIN_RESUME_MAX_CHARS = 600;
export const MAX_RESUME_MAX_CHARS = 20000;

export interface ResumeOptions {
  planSlug?: string;
  maxChars?: number;
}

export interface ResumeAcceptanceCriterion {
  text: string;
  checked: boolean;
}

export interface ResumeActivePlan {
  slug: string;
  stage: string;
  status: string;
  goal: string;
  acceptance_criteria: ResumeAcceptanceCriterion[];
}

export interface ResumeLatestRun {
  run_id: string;
  command: string | null;
  state: string;
  pending_gates: number;
  pending_gate_ids: string[];
  updated_at: string | null;
}

export interface ResumeSummary {
  schema: typeof RESUME_SCHEMA;
  mission: { defined: boolean };
  active_plan: ResumeActivePlan | null;
  amendments: { count: number; ids: string[] };
  work_done: { done_slices: string[]; evidence: string[] };
  status: string;
  next_bounded_action: string;
  other_active_plans: string[];
  latest_run: ResumeLatestRun | null;
  repair_hypothesis: string | null;
  lessons: { count: number; slugs: string[] };
  next_commands: string[];
  boundary: {
    read_only: true;
    resume_packet_is_not_approval: true;
    human_owns_merge_publish_release: true;
  };
}

export interface ResumeResult {
  summary: ResumeSummary;
  packet: string;
}

interface InternalResumeLatestRun extends ResumeLatestRun {
  raw_run_id: string;
}

interface RunStatusFile {
  runId?: string;
  command?: string;
  state?: string;
  updatedAt?: string;
  pendingHumanGates?: Array<{ id?: string }>;
}

function planNumber(slug: string): number {
  const match = slug.match(/^(\d+)-/);
  return match ? Number(match[1]) : -1;
}

function pickActivePlan(actives: PlanSummary[], requested?: string): { picked: PlanSummary | null; others: string[] } {
  if (!actives.length) return { picked: null, others: [] };
  if (requested) {
    const found = actives.find((plan) => plan.slug === requested);
    if (!found) {
      const safeActivePlans = actives.map((plan) => redactPacketText(plan.slug, 160)).join(', ');
      throw new Error(`No active plan named ${redactPacketText(requested, 160)}. Active plans: ${safeActivePlans}`);
    }
    return { picked: found, others: actives.filter((plan) => plan.slug !== requested).map((plan) => plan.slug) };
  }
  const sorted = [...actives].sort((a, b) => planNumber(b.slug) - planNumber(a.slug) || a.slug.localeCompare(b.slug));
  return { picked: sorted[0], others: sorted.slice(1).map((plan) => plan.slug) };
}

function missionDigest(root: string): string {
  const path = join(root, 'MISSION.md');
  if (!existsSync(path)) return '';
  try { if (!lstatSync(path).isFile()) return ''; } catch { return ''; }
  const body = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter((line) => !/^#/.test(line.trim()))
    .join('\n');
  const paragraph = body.split(/\n\s*\n/).map((part) => part.trim()).find(Boolean) ?? '';
  return redactPacketText(paragraph, 320);
}

function listAmendments(root: string, plan: PlanSummary | null): string[] {
  if (!plan) return [];
  const dir = join(root, dirname(plan.path));
  if (!existsSync(dir)) return [];
  const pattern = new RegExp(`^${plan.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-amendment-(\\d+)\\.md$`);
  return readdirSync(dir)
    .map((name) => ({ name, match: name.match(pattern) }))
    .filter((entry): entry is { name: string; match: RegExpMatchArray } => Boolean(entry.match))
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
    .map((entry) => entry.name.replace(/\.md$/, ''));
}

function listEvidence(root: string): string[] {
  if (existsSync(join(root, '.osc')) && !lstatSync(join(root, '.osc')).isDirectory()) return [];
  const dir = join(root, '.osc', 'releases');
  if (!existsSync(dir)) return [];
  try { if (!lstatSync(dir).isDirectory()) return []; } catch { return []; }
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .filter((name) => {
      try { return lstatSync(join(dir, name)).isFile(); } catch { return false; }
    })
    .sort()
    .map((name) => `.osc/releases/${name}`);
}

function planAcceptanceCriteria(root: string, plan: PlanSummary): { parsed: ReturnType<typeof parsePlanFile>; criteria: ChecklistItem[] } {
  const parsed = parsePlanFile(join(root, plan.path));
  const section = parsed.sections.get('Acceptance criteria') ?? '';
  const checklist = parseChecklist(section);
  const criteria = checklist.length
    ? checklist
    : parsed.acceptanceCriteria.map((text) => ({ text, checked: false }));
  return { parsed, criteria };
}

function latestHarnessRun(root: string): InternalResumeLatestRun | null {
  if (existsSync(join(root, '.osc')) && !lstatSync(join(root, '.osc')).isDirectory()) return null;
  const dir = join(root, '.osc', 'runs');
  if (!existsSync(dir)) return null;
  try { if (!lstatSync(dir).isDirectory()) return null; } catch { return null; }
  let best: InternalResumeLatestRun | null = null;
  for (const name of readdirSync(dir).sort()) {
    const runDir = join(dir, name);
    try {
      if (!lstatSync(runDir).isDirectory()) continue;
      const statusPath = join(runDir, 'status.json');
      if (!existsSync(statusPath)) continue;
      if (!lstatSync(statusPath).isFile()) continue;
      const parsed = JSON.parse(readFileSync(statusPath, 'utf8')) as RunStatusFile;
      const rawRunId = typeof parsed.runId === 'string' ? parsed.runId : name;
      const gates = Array.isArray(parsed.pendingHumanGates) ? parsed.pendingHumanGates : [];
      const candidate: InternalResumeLatestRun = {
        raw_run_id: rawRunId,
        run_id: redactPacketText(rawRunId, 160),
        command: typeof parsed.command === 'string' ? redactPacketText(parsed.command, 80) : null,
        state: typeof parsed.state === 'string' ? parsed.state : 'unknown',
        pending_gates: gates.length,
        pending_gate_ids: gates.map((gate) => redactPacketText(typeof gate?.id === 'string' ? gate.id : 'unknown', 120)).slice(0, 5),
        updated_at: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      };
      if (!best || (candidate.updated_at ?? '') >= (best.updated_at ?? '')) best = candidate;
    } catch {
      continue;
    }
  }
  return best;
}

function latestRepairHypothesis(root: string, run: InternalResumeLatestRun | null): string | null {
  if (!run) return null;
  if (!['failed', 'blocked', 'waiting_on_human'].includes(run.state)) return null;
  try {
    const records = readFeedback({ repoRoot: root, runId: run.raw_run_id });
    const newest = [...records].reverse().find((record) => record.repairHypothesis);
    return newest?.repairHypothesis ? redactPacketText(newest.repairHypothesis, 300) : null;
  } catch {
    return null;
  }
}

interface NextAction {
  action: string;
  commands: string[];
}

function deriveNextAction(input: {
  scaffoldPresent: boolean;
  missionDefined: boolean;
  plan: ResumeActivePlan | null;
  backlogCount: number;
  run: ResumeLatestRun | null;
  repairHypothesis: string | null;
  verificationSteps: string[];
}): NextAction {
  if (!input.scaffoldPresent) {
    return {
      action: 'Run npx open-scaffold@latest first-run to create the minimum work record.',
      commands: ['npx open-scaffold@latest first-run'],
    };
  }
  if (!input.missionDefined) {
    return {
      action: 'Define the mission before any work: run osc first-run (guided) or fill in MISSION.md.',
      commands: ['osc first-run'],
    };
  }
  if (input.run && input.run.pending_gates > 0) {
    const gateId = input.run.pending_gate_ids[0] ?? '<gate-id>';
    return {
      action: `Record the answer for gate ${gateId} in evidence or the external coordinator, then continue from repo truth.`,
      commands: [
        `osc trace ${input.plan?.slug ?? '<plan-slug>'}`,
        `osc evidence new ${input.plan?.slug ?? '<plan-slug>'}`,
      ],
    };
  }
  if (input.run && (input.run.state === 'failed' || input.run.state === 'blocked')) {
    return {
      action: input.repairHypothesis
        ? `Retry run ${input.run.run_id} with the recorded repair hypothesis: ${input.repairHypothesis}`
        : `Inspect why run ${input.run.run_id} is ${input.run.state}, record feedback with a repair hypothesis, then retry.`,
      commands: [
        `osc trace ${input.plan?.slug ?? '<plan-slug>'}`,
        `osc run .osc/plans/active/${input.plan?.slug ?? '<plan-slug>'}.md --dry-run`,
      ],
    };
  }
  if (input.plan) {
    const unchecked = input.plan.acceptance_criteria.filter((item) => !item.checked);
    if (unchecked.length) {
      return {
        action: unchecked[0].text,
        commands: [
          `osc plan validate ${input.plan.slug} --strict`,
          ...input.verificationSteps.slice(0, 2),
        ].filter(Boolean),
      };
    }
    return {
      action: `All acceptance criteria are checked for ${input.plan.slug}: record and fill evidence, verify it, and close the slice.`,
      commands: [
        `osc evidence new ${input.plan.slug}`,
        'osc verify',
        `osc close ${input.plan.slug} --message "<what shipped>"`,
      ],
    };
  }
  if (input.backlogCount > 0) {
    return {
      action: `No active plan. Promote one of the ${input.backlogCount} backlog plan(s) or create a new one.`,
      commands: ['osc plan move <slug> --to active', 'osc plan new <slug> --stage active'],
    };
  }
  return {
    action: 'No active plan. Create the next bounded slice.',
    commands: ['osc plan new <slug> --stage active'],
  };
}

function statusLine(input: { scaffoldPresent: boolean; missionDefined: boolean; plan: ResumeActivePlan | null; backlogCount: number }): string {
  if (!input.scaffoldPresent) return 'no scaffold detected';
  if (!input.missionDefined) return 'mission undefined';
  if (!input.plan) return `no active plan; ${input.backlogCount} backlog plan(s)`;
  const total = input.plan.acceptance_criteria.length;
  const checked = input.plan.acceptance_criteria.filter((item) => item.checked).length;
  return `active plan ${input.plan.slug}; ${checked}/${total} acceptance criteria complete`;
}

function renderPacket(summary: ResumeSummary, extras: { missionText: string; verificationSteps: string[]; acCap: number; includeLessons: boolean }): string {
  const lines: string[] = ['# Resume Packet', '', `Status: ${summary.status}`, ''];

  lines.push('## Mission', '');
  lines.push(summary.mission.defined ? (extras.missionText || 'Mission is defined in MISSION.md.') : 'Mission is not defined yet.');
  lines.push('');

  if (summary.active_plan) {
    const plan = summary.active_plan;
    lines.push(`## Active plan: ${plan.slug}`, '');
    if (plan.goal) lines.push(`Goal: ${redactPacketText(plan.goal, 280)}`, '');
    const total = plan.acceptance_criteria.length;
    const checked = plan.acceptance_criteria.filter((item) => item.checked).length;
    lines.push(`Acceptance criteria (${checked}/${total} complete):`);
    const ordered = [...plan.acceptance_criteria.filter((item) => !item.checked), ...plan.acceptance_criteria.filter((item) => item.checked)];
    for (const item of ordered.slice(0, extras.acCap)) {
      lines.push(`- [${item.checked ? 'x' : ' '}] ${redactPacketText(item.text, 200)}`);
    }
    if (ordered.length > extras.acCap) lines.push(`- (+${ordered.length - extras.acCap} more in the plan file)`);
    if (summary.amendments.count > 0) lines.push('', `Amendments (read in order after the plan): ${summary.amendments.ids.join(', ')}`);
    if (summary.other_active_plans.length) lines.push('', `Also active: ${summary.other_active_plans.join(', ')}`);
    lines.push('');
  } else {
    lines.push('## Active plan', '', 'None.', '');
  }

  if (summary.latest_run) {
    const run = summary.latest_run;
    lines.push('## Latest run', '');
    lines.push(`${run.run_id} — ${run.state}; ${run.pending_gates} pending gate(s)`);
    if (summary.repair_hypothesis) lines.push(`Repair hypothesis: ${summary.repair_hypothesis}`);
    lines.push('');
  }

  if (extras.includeLessons && summary.lessons.count > 0) {
    lines.push(`## Lessons to inherit (${summary.lessons.count})`, '');
    for (const slug of summary.lessons.slugs.slice(0, 5)) lines.push(`- .osc/improvements/applied/${slug}.md`);
    lines.push('');
  }

  lines.push('## Next actions', '');
  lines.push(`1. ${summary.next_bounded_action}`);
  let step = 2;
  for (const command of summary.next_commands.slice(0, 4)) {
    lines.push(`${step}. \`${command}\``);
    step += 1;
  }
  lines.push('');
  lines.push('Boundary: read-only packet compiled from repo truth. It is not approval and grants no merge, publish, release, or spawn authority.');
  return `${lines.join('\n')}\n`;
}

function compileHasRealScaffold(root: string): boolean {
  try {
    return lstatSync(join(root, '.osc')).isDirectory() && lstatSync(join(root, '.osc', 'plans')).isDirectory();
  } catch {
    return false;
  }
}

function safeAcceptedLessons(root: string): ReturnType<typeof loadAcceptedImprovements> {
  try {
    const improvementsDir = join(root, '.osc', 'improvements');
    if (existsSync(improvementsDir) && !lstatSync(improvementsDir).isDirectory()) return [];
    const appliedDir = join(improvementsDir, 'applied');
    if (existsSync(appliedDir) && !lstatSync(appliedDir).isDirectory()) return [];
    return loadAcceptedImprovements({ repoRoot: root });
  } catch {
    return [];
  }
}

export function compileResume(root = process.cwd(), options: ResumeOptions = {}): ResumeResult {
  const maxChars = options.maxChars ?? DEFAULT_RESUME_MAX_CHARS;
  if (!Number.isInteger(maxChars) || maxChars < MIN_RESUME_MAX_CHARS || maxChars > MAX_RESUME_MAX_CHARS) {
    throw new Error(`maxChars must be an integer between ${MIN_RESUME_MAX_CHARS} and ${MAX_RESUME_MAX_CHARS}`);
  }
  const scaffoldPresent = compileHasRealScaffold(root);
  const scaffold = inspectScaffold(root);
  const { picked, others } = pickActivePlan(scaffold.plans.active ?? [], options.planSlug);
  const publicOtherActivePlans = others.map((slug) => redactPacketText(slug, 160));

  let activePlan: ResumeActivePlan | null = null;
  let verificationSteps: string[] = [];
  if (picked) {
    const { parsed, criteria } = planAcceptanceCriteria(root, picked);
    verificationSteps = parsed.verificationSteps.map((stepText) => redactPacketText(stepText.replace(/`/g, ''), 160));
    activePlan = {
      slug: redactPacketText(picked.slug, 160),
      stage: picked.stage,
      status: parsed.status || picked.stage,
      goal: redactPacketText(parsed.goal, 1000),
      acceptance_criteria: criteria.map((item) => ({ text: redactPacketText(item.text, 1000), checked: item.checked })),
    };
  }

  const run = latestHarnessRun(root);
  const repairHypothesis = latestRepairHypothesis(root, run);
  const publicRun: ResumeLatestRun | null = run
    ? {
        run_id: run.run_id,
        command: run.command,
        state: run.state,
        pending_gates: run.pending_gates,
        pending_gate_ids: run.pending_gate_ids,
        updated_at: run.updated_at,
      }
    : null;
  const lessonsList = scaffoldPresent ? safeAcceptedLessons(root) : [];
  const amendments = listAmendments(root, picked).map((id) => redactPacketText(id, 180));
  const next = deriveNextAction({
    scaffoldPresent,
    missionDefined: scaffold.mission.defined,
    plan: activePlan,
    backlogCount: scaffold.plans.backlog?.length ?? 0,
    run,
    repairHypothesis,
    verificationSteps,
  });

  const summary: ResumeSummary = {
    schema: RESUME_SCHEMA,
    mission: { defined: scaffold.mission.defined },
    active_plan: activePlan,
    amendments: { count: amendments.length, ids: amendments },
    work_done: {
      done_slices: (scaffold.plans.done ?? []).map((plan) => redactPacketText(plan.slug, 160)),
      evidence: listEvidence(root).map((evidencePath) => redactPacketText(evidencePath, 220)),
    },
    status: statusLine({ scaffoldPresent, missionDefined: scaffold.mission.defined, plan: activePlan, backlogCount: scaffold.plans.backlog?.length ?? 0 }),
    next_bounded_action: next.action,
    other_active_plans: publicOtherActivePlans,
    latest_run: publicRun,
    repair_hypothesis: repairHypothesis,
    lessons: { count: lessonsList.length, slugs: lessonsList.map((lesson) => redactPacketText(lesson.slug, 160)) },
    next_commands: next.commands,
    boundary: {
      read_only: true,
      resume_packet_is_not_approval: true,
      human_owns_merge_publish_release: true,
    },
  };

  const missionText = scaffold.mission.defined ? missionDigest(root) : '';
  let packet = renderPacket(summary, { missionText, verificationSteps, acCap: 8, includeLessons: true });
  if (packet.length > maxChars) packet = renderPacket(summary, { missionText, verificationSteps, acCap: 5, includeLessons: false });
  if (packet.length > maxChars) packet = `${packet.slice(0, maxChars - 2).trimEnd()}…\n`;

  return { summary, packet };
}
