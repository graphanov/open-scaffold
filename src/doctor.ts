import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, relative } from 'node:path';
import { OSC_NAMESPACE, PLAN_STAGES, splitSections, type PlanStage } from './scaffold.js';

export type DoctorSeverity = 'info' | 'warn' | 'error';
export type DoctorCheckName = 'status-alignment' | 'changelog-gap' | 'paired-view' | 'stale-plan' | 'release-readme';

export interface DoctorOptions {
  fix?: boolean;
  dryRun?: boolean;
  severity?: DoctorSeverity;
  check?: DoctorCheckName;
  now?: Date;
  staleDays?: number;
}

export interface DoctorDiagnosis {
  check: DoctorCheckName;
  severity: DoctorSeverity;
  path?: string;
  message: string;
  fixable: boolean;
  fixDescription?: string;
  repair?: () => void;
}

export interface DoctorRunResult {
  root: string;
  diagnoses: DoctorDiagnosis[];
  applied: DoctorDiagnosis[];
  dryRun: boolean;
}

const DEFAULT_STALE_DAYS = 30;
const SEVERITY_RANK: Record<DoctorSeverity, number> = { info: 0, warn: 1, error: 2 };

interface PlanFile {
  stage: PlanStage;
  name: string;
  path: string;
  relativePath: string;
}

function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

function writeText(path: string, text: string): void {
  writeFileSync(path, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
}

function today(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isPlanFile(name: string): boolean {
  return name.endsWith('.md') && !name.endsWith('-amendment-1.md') && !/-amendment-\d+\.md$/.test(name) && !['README.md', 'WORKFLOW.md', 'handoff-template.md'].includes(name);
}

function listStageFiles(root: string): PlanFile[] {
  const files: PlanFile[] = [];
  for (const stage of PLAN_STAGES) {
    const dir = join(root, OSC_NAMESPACE, 'plans', stage);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (!isPlanFile(name) || !statSync(path).isFile()) continue;
      files.push({ stage, name, path, relativePath: relative(root, path) });
    }
  }
  return files;
}

function listAmendmentFiles(root: string): PlanFile[] {
  const files: PlanFile[] = [];
  for (const stage of PLAN_STAGES) {
    const dir = join(root, OSC_NAMESPACE, 'plans', stage);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (!/-amendment-\d+\.md$/.test(name) || !statSync(path).isFile()) continue;
      files.push({ stage, name, path, relativePath: relative(root, path) });
    }
  }
  return files;
}

function statusText(markdown: string): string | null {
  const sections = splitSections(markdown);
  return sections.get('Status') ?? null;
}

function statusMatchesStage(status: string, stage: PlanStage): boolean {
  return status.trim().toLowerCase().startsWith(stage);
}

function replaceStatus(markdown: string, stage: PlanStage): string {
  const statusPattern = /(^## Status[^\S\r\n]*\r?\n)(?:[^\S\r\n]*\r?\n)?([\s\S]*?)(?=\r?\n##\s+|$)/m;
  if (!statusPattern.test(markdown)) throw new Error('missing ## Status section');
  return markdown.replace(statusPattern, `$1\n${stage}\n`);
}

function statusAlignmentDiagnoses(root: string): DoctorDiagnosis[] {
  const out: DoctorDiagnosis[] = [];
  for (const file of listStageFiles(root).filter((item) => item.stage !== 'done')) {
    const markdown = readText(file.path);
    const status = statusText(markdown);
    if (status === null) {
      out.push({
        check: 'status-alignment',
        severity: 'error',
        path: file.relativePath,
        message: `Plan is in ${file.stage}/ but has no ## Status section.`,
        fixable: false,
      });
      continue;
    }
    if (statusMatchesStage(status, file.stage)) continue;
    out.push({
      check: 'status-alignment',
      severity: 'warn',
      path: file.relativePath,
      message: `Plan is in ${file.stage}/ but ## Status says ${JSON.stringify(status.trim())}.`,
      fixable: true,
      fixDescription: `update ${file.relativePath} ## Status to ${file.stage}`,
      repair: () => writeText(file.path, replaceStatus(readText(file.path), file.stage)),
    });
  }
  return out;
}

function insertChangelogEntry(mission: string, entry: string): string {
  const anchor = '<!-- append YYYY-MM-DD entries below this line -->';
  if (mission.includes(anchor)) {
    const lines = mission.split(/\r?\n/);
    const output: string[] = [];
    for (const line of lines) {
      output.push(line);
      if (line.includes(anchor)) output.push(entry);
    }
    return output.join('\n');
  }

  const changelog = mission.match(/^##\s+Changelog\b.*$/im);
  if (!changelog || changelog.index === undefined) {
    throw new Error('MISSION.md has no ## Changelog section');
  }
  const afterHeading = changelog.index + changelog[0].length;
  const nextHeading = mission.slice(afterHeading).search(/^##\s+/m);
  if (nextHeading === -1) return `${mission.replace(/\s*$/, '')}\n${entry}\n`;
  const insertionIndex = afterHeading + nextHeading;
  return `${mission.slice(0, insertionIndex).replace(/\s*$/, '')}\n${entry}\n\n${mission.slice(insertionIndex)}`;
}

function changelogGapDiagnoses(root: string, now: Date): DoctorDiagnosis[] {
  const missionPath = join(root, 'MISSION.md');
  const relMission = relative(root, missionPath);
  if (!existsSync(missionPath)) {
    return [{ check: 'changelog-gap', severity: 'error', path: relMission, message: 'MISSION.md is missing.', fixable: false }];
  }
  const mission = readText(missionPath);
  const out: DoctorDiagnosis[] = [];
  for (const amendment of listAmendmentFiles(root)) {
    if (mission.includes(amendment.name) || mission.includes(amendment.relativePath)) continue;
    const entry = `- ${today(now)}: backfilled missing changelog for ${basename(amendment.name, '.md')} — see ${amendment.relativePath}`;
    out.push({
      check: 'changelog-gap',
      severity: 'warn',
      path: relMission,
      message: `MISSION.md changelog does not cite ${amendment.relativePath}.`,
      fixable: true,
      fixDescription: `add changelog entry for ${amendment.relativePath}`,
      repair: () => {
        const current = readText(missionPath);
        if (current.includes(amendment.name) || current.includes(amendment.relativePath)) return;
        writeText(missionPath, insertChangelogEntry(current, entry));
      },
    });
  }
  return out;
}

interface MarkdownSection {
  heading: string;
  body: string;
}

function topSections(text: string): MarkdownSection[] {
  const lines = text.split(/\r?\n/);
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      if (current) sections.push(current);
      current = { heading: match[1].trim(), body: '' };
      continue;
    }
    if (current) current.body += `${line}\n`;
  }
  if (current) sections.push(current);
  return sections;
}

function normalizeSectionBody(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function appendSection(path: string, section: MarkdownSection): void {
  const current = readText(path).replace(/\s*$/, '');
  writeText(path, `${current}\n\n## ${section.heading}\n${section.body.trimEnd()}\n`);
}

function pairedViewDiagnoses(root: string): DoctorDiagnosis[] {
  const agentsPath = join(root, 'AGENTS.md');
  const claudePath = join(root, 'CLAUDE.md');
  if (!existsSync(agentsPath) || !existsSync(claudePath)) return [];

  const agentsSections = topSections(readText(agentsPath));
  const claudeSections = topSections(readText(claudePath));
  const agentsByHeading = new Map(agentsSections.map((section) => [section.heading, section]));
  const claudeByHeading = new Map(claudeSections.map((section) => [section.heading, section]));
  const missingInAgents = claudeSections.filter((section) => !agentsByHeading.has(section.heading));
  const missingInClaude = agentsSections.filter((section) => !claudeByHeading.has(section.heading));
  const missingTotal = missingInAgents.length + missingInClaude.length;

  // AGENTS.md and CLAUDE.md are native paired views, not byte-identical mirrors. Avoid
  // auto-mutating intentionally different large structures; only repair narrow section
  // drops where one or two top-level sections are absent.
  if (missingTotal > 2) return [];

  const out: DoctorDiagnosis[] = [];
  for (const section of missingInAgents) {
    out.push({
      check: 'paired-view',
      severity: 'warn',
      path: 'AGENTS.md',
      message: `AGENTS.md is missing paired section ## ${section.heading} from CLAUDE.md.`,
      fixable: true,
      fixDescription: `append ## ${section.heading} to AGENTS.md from CLAUDE.md`,
      repair: () => appendSection(agentsPath, section),
    });
  }
  for (const section of missingInClaude) {
    out.push({
      check: 'paired-view',
      severity: 'warn',
      path: 'CLAUDE.md',
      message: `CLAUDE.md is missing paired section ## ${section.heading} from AGENTS.md.`,
      fixable: true,
      fixDescription: `append ## ${section.heading} to CLAUDE.md from AGENTS.md`,
      repair: () => appendSection(claudePath, section),
    });
  }

  if (missingTotal === 0) {
    for (const [heading, agentsSection] of Array.from(agentsByHeading.entries())) {
      const claudeSection = claudeByHeading.get(heading);
      if (!claudeSection) continue;
      if (normalizeSectionBody(agentsSection.body) === normalizeSectionBody(claudeSection.body)) continue;
      out.push({
        check: 'paired-view',
        severity: 'warn',
        path: 'AGENTS.md / CLAUDE.md',
        message: `Paired section ## ${heading} exists in both files but differs; manual review required.`,
        fixable: false,
      });
    }
  }

  return out;
}

function loadConfiguredStaleDays(root: string): number {
  const configPath = join(root, OSC_NAMESPACE, 'config.json');
  if (!existsSync(configPath)) return DEFAULT_STALE_DAYS;
  try {
    const parsed = JSON.parse(readText(configPath)) as { doctor?: { staleThresholdDays?: unknown } };
    const value = parsed.doctor?.staleThresholdDays;
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  } catch {
    return DEFAULT_STALE_DAYS;
  }
  return DEFAULT_STALE_DAYS;
}

function moveStalePlanToBlocked(root: string, plan: PlanFile, now: Date, ageDays: number, threshold: number): void {
  const activeDir = join(root, OSC_NAMESPACE, 'plans', 'active');
  const blockedDir = join(root, OSC_NAMESPACE, 'plans', 'blocked');
  mkdirSync(blockedDir, { recursive: true });
  const slug = basename(plan.name, '.md');
  const amendmentPattern = new RegExp(`^${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-amendment-\\d+\\.md$`);
  const names = [plan.name, ...readdirSync(activeDir).filter((name) => amendmentPattern.test(name)).sort()];
  for (const name of names) {
    const destination = join(blockedDir, name);
    if (existsSync(destination)) throw new Error(`Refusing to overwrite ${relative(root, destination)}`);
  }
  const annotation = `<!-- blocked: moved by osc doctor --fix on ${today(now)} after ${ageDays} days stale (threshold ${threshold}). -->\n\n`;
  const updated = `${annotation}${replaceStatus(readText(plan.path), 'blocked')}`;
  writeText(plan.path, updated);
  for (const name of names) renameSync(join(activeDir, name), join(blockedDir, name));
}

function stalePlanDiagnoses(root: string, now: Date, staleDays: number): DoctorDiagnosis[] {
  const out: DoctorDiagnosis[] = [];
  const nowMs = now.getTime();
  for (const plan of listStageFiles(root).filter((file) => file.stage === 'active')) {
    const ageDays = Math.floor((nowMs - statSync(plan.path).mtimeMs) / 86_400_000);
    if (ageDays <= staleDays) continue;
    out.push({
      check: 'stale-plan',
      severity: 'warn',
      path: plan.relativePath,
      message: `Active plan ${basename(plan.name, '.md')} is stale (${ageDays} days; threshold ${staleDays}).`,
      fixable: true,
      fixDescription: `move ${plan.relativePath} to .osc/plans/blocked/ with a blocked annotation`,
      repair: () => moveStalePlanToBlocked(root, plan, now, ageDays, staleDays),
    });
  }
  return out;
}

function releaseReadmeDiagnoses(root: string): DoctorDiagnosis[] {
  const releasesDir = join(root, OSC_NAMESPACE, 'releases');
  const readme = join(releasesDir, 'README.md');
  if (!existsSync(releasesDir)) {
    return [{ check: 'release-readme', severity: 'error', path: relative(root, releasesDir), message: '.osc/releases/ directory is missing.', fixable: false }];
  }
  if (existsSync(readme)) return [];
  return [
    {
      check: 'release-readme',
      severity: 'warn',
      path: relative(root, readme),
      message: '.osc/releases/README.md is missing.',
      fixable: true,
      fixDescription: 'create .osc/releases/README.md with evidence-note guidance',
      repair: () => writeText(readme, '# Release / evidence notes\n\nThis directory stores scaffold-native release and evidence notes for meaningful product slices.\n'),
    },
  ];
}

function allDiagnoses(root: string, options: DoctorOptions): DoctorDiagnosis[] {
  const now = options.now ?? new Date();
  const staleDays = options.staleDays ?? loadConfiguredStaleDays(root);
  const groups: Record<DoctorCheckName, () => DoctorDiagnosis[]> = {
    'status-alignment': () => statusAlignmentDiagnoses(root),
    'changelog-gap': () => changelogGapDiagnoses(root, now),
    'paired-view': () => pairedViewDiagnoses(root),
    'stale-plan': () => stalePlanDiagnoses(root, now, staleDays),
    'release-readme': () => releaseReadmeDiagnoses(root),
  };
  const selected = options.check ? [options.check] : (Object.keys(groups) as DoctorCheckName[]);
  const severity = options.severity ?? 'info';
  return selected
    .flatMap((name) => groups[name]())
    .filter((diagnosis) => SEVERITY_RANK[diagnosis.severity] >= SEVERITY_RANK[severity]);
}

export function runDoctor(root = process.cwd(), options: DoctorOptions = {}): DoctorRunResult {
  let diagnoses = allDiagnoses(root, options);
  const applied: DoctorDiagnosis[] = [];
  if (options.fix && !options.dryRun) {
    for (const diagnosis of diagnoses) {
      if (!diagnosis.fixable || !diagnosis.repair) continue;
      diagnosis.repair();
      applied.push(diagnosis);
    }
    diagnoses = allDiagnoses(root, options);
  }
  return { root, diagnoses, applied, dryRun: Boolean(options.dryRun) };
}

export function formatDoctorReport(result: DoctorRunResult, options: DoctorOptions = {}): string {
  const lines: string[] = [];
  if (result.applied.length > 0) {
    lines.push(`Doctor: applied ${result.applied.length} fix(es).`);
    for (const item of result.applied) lines.push(`FIXED ${item.check}${item.path ? ` ${item.path}` : ''}: ${item.fixDescription ?? item.message}`);
  }

  if (options.fix && options.dryRun) {
    const fixable = result.diagnoses.filter((item) => item.fixable);
    lines.push(`Doctor dry-run: ${fixable.length} fix(es) would be applied.`);
    for (const item of fixable) lines.push(`DRY-RUN ${item.check}${item.path ? ` ${item.path}` : ''}: would ${item.fixDescription ?? item.message}`);
  }

  if (result.diagnoses.length === 0) {
    lines.push('Doctor: no issues found.');
    return `${lines.join('\n')}\n`;
  }

  lines.push(`Doctor: ${result.diagnoses.length} issue(s) found.`);
  for (const item of result.diagnoses) {
    const fixability = item.fixable ? 'fixable' : 'unfixable';
    lines.push(`${item.severity.toUpperCase()} ${fixability} ${item.check}${item.path ? ` ${item.path}` : ''}: ${item.message}`);
    if (item.fixable && item.fixDescription) lines.push(`  fix: ${item.fixDescription}`);
  }
  return `${lines.join('\n')}\n`;
}

export function doctorExitCode(result: DoctorRunResult, options: DoctorOptions = {}): number {
  if (options.fix && !options.dryRun) {
    return result.diagnoses.some((item) => !item.fixable || item.severity === 'error') ? 1 : 0;
  }
  return result.diagnoses.some((item) => !item.fixable && item.severity === 'error') ? 1 : 0;
}

export function parseDoctorCheckName(value: string): DoctorCheckName | null {
  const aliases: Record<string, DoctorCheckName> = {
    status: 'status-alignment',
    'status-alignment': 'status-alignment',
    changelog: 'changelog-gap',
    'changelog-gap': 'changelog-gap',
    'paired-view': 'paired-view',
    paired: 'paired-view',
    'stale-plan': 'stale-plan',
    stale: 'stale-plan',
    'release-readme': 'release-readme',
    releases: 'release-readme',
  };
  return aliases[value] ?? null;
}
