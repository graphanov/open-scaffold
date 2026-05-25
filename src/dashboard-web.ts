import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { dirname, join, relative, resolve } from 'node:path';
import { findScaffoldRoot, inspectScaffold, parsePlanFile, splitSections, type PlanStage } from './scaffold.js';
import { getTaskSummary, type TaskSummary } from './tasks.js';
import { validateScaffold } from './validation.js';

export interface DashboardMission {
  defined: boolean;
  excerpt: string;
  goals: string[];
}

export interface DashboardPlanCriterion {
  text: string;
  done: boolean;
}

export interface DashboardPlanCard {
  slug: string;
  path: string;
  stage: PlanStage;
  status: string;
  goal: string;
  criteria: DashboardPlanCriterion[];
  openQuestions: string[];
}

export interface DashboardEvidenceNote {
  file: string;
  path: string;
  dashboardHref: string;
  title: string;
  summary: string;
}

export interface DashboardValidationStatus {
  ok: boolean;
  failures: number;
  warnings: number;
}

export interface DashboardIdentityChain {
  roadmap: boolean;
  plans: number;
  runs: number;
  prs: number;
  evidence: number;
}

export interface DashboardTaskState {
  exists: boolean;
  summary: TaskSummary | null;
  error?: string;
}

export interface WebDashboardData {
  schema: 'open-scaffold.web_dashboard.v1';
  generatedAt: string;
  rootName: string;
  namespace: '.osc';
  mission: DashboardMission;
  plans: Record<PlanStage, DashboardPlanCard[]>;
  evidence: DashboardEvidenceNote[];
  validation: DashboardValidationStatus;
  identityChain: DashboardIdentityChain;
  tasks: DashboardTaskState;
}

export interface WriteDashboardOptions {
  root?: string;
  out?: string;
  now?: Date;
}

export interface WriteDashboardResult {
  path: string;
  bytes: number;
  data: WebDashboardData;
}

export interface ServeDashboardOptions {
  root?: string;
  port?: number;
  now?: Date;
}

export interface DashboardServerHandle {
  server: Server;
  url: string;
  close: () => Promise<void>;
}

const PLAN_STAGES: PlanStage[] = ['active', 'backlog', 'blocked', 'done'];

function isEvidenceNoteFile(file: string): boolean {
  return file.endsWith('.md') && file.toLowerCase() !== 'readme.md';
}

function isAmendmentSlug(slug: string): boolean {
  return /-amendment-\d+$/.test(slug);
}

function resolveRoot(start = process.cwd()): string {
  return findScaffoldRoot(start) ?? resolve(start);
}

function readTextIfExists(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function firstParagraph(text: string): string {
  return text.split(/\n\s*\n/).map((part) => part.trim()).find(Boolean) ?? '';
}

function sectionBeforeNextHeading(markdown: string, heading: string): string {
  const pattern = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im');
  const match = markdown.match(pattern);
  if (!match || match.index === undefined) return '';
  const after = markdown.slice(match.index + match[0].length);
  const next = after.search(/^##\s+/m);
  return (next >= 0 ? after.slice(0, next) : after).trim();
}

function parseMission(root: string): DashboardMission {
  const missionPath = join(root, 'MISSION.md');
  const text = readTextIfExists(missionPath);
  if (!text || text.includes('mission:unset') || text.includes('TODO: define mission')) {
    return { defined: false, excerpt: 'Mission is not defined.', goals: [] };
  }
  const firstBody = text.replace(/^#\s+Mission\s*/i, '').split(/^##\s+/m)[0] ?? '';
  const goalsText = sectionBeforeNextHeading(text, 'Goals');
  const goals = goalsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .slice(0, 5);
  return { defined: true, excerpt: firstParagraph(firstBody) || 'Mission defined.', goals };
}

function acceptanceCriteria(markdown: string): DashboardPlanCriterion[] {
  const sections = splitSections(markdown);
  const text = sections.get('Acceptance criteria') ?? '';
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => {
      const checkbox = line.match(/^[-*]\s+\[([ xX])]\s+(.+)$/);
      if (checkbox) return { done: checkbox[1].toLowerCase() === 'x', text: checkbox[2].trim() };
      return { done: false, text: line.replace(/^[-*]\s+/, '').trim() };
    })
    .filter((criterion) => criterion.text.length > 0);
}

function parsePlanCard(root: string, planPath: string, stage: PlanStage): DashboardPlanCard {
  const absolute = join(root, planPath);
  const text = readFileSync(absolute, 'utf8');
  const parsed = parsePlanFile(absolute);
  return {
    slug: parsed.slug,
    path: planPath,
    stage,
    status: parsed.status || stage,
    goal: parsed.goal,
    criteria: acceptanceCriteria(text),
    openQuestions: parsed.openQuestions,
  };
}

function collectPlans(root: string): Record<PlanStage, DashboardPlanCard[]> {
  const state = inspectScaffold(root);
  const plans: Record<PlanStage, DashboardPlanCard[]> = {
    active: [],
    backlog: [],
    blocked: [],
    done: [],
  };
  for (const stage of PLAN_STAGES) {
    plans[stage] = state.plans[stage]
      .filter((plan) => !isAmendmentSlug(plan.slug))
      .map((plan) => parsePlanCard(root, plan.path, stage));
  }
  return plans;
}

function noteTitle(markdown: string, file: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : file.replace(/\.md$/, '');
}

function collectEvidence(root: string, limit = 8): DashboardEvidenceNote[] {
  const releasesDir = join(root, '.osc', 'releases');
  if (!existsSync(releasesDir)) return [];
  return readdirSync(releasesDir)
    .filter(isEvidenceNoteFile)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, limit)
    .map((file) => {
      const path = join(releasesDir, file);
      const markdown = readFileSync(path, 'utf8');
      const sections = splitSections(markdown);
      return {
        file,
        path: relative(root, path),
        dashboardHref: `releases/${file}`,
        title: noteTitle(markdown, file),
        summary: firstParagraph(sections.get('Summary') ?? '') || 'Evidence note recorded.',
      };
    });
}

function countDirectoryEntries(path: string): number {
  if (!existsSync(path)) return 0;
  return readdirSync(path).filter((entry) => {
    try {
      return statSync(join(path, entry)).isDirectory() || statSync(join(path, entry)).isFile();
    } catch {
      return false;
    }
  }).length;
}

function countEvidenceWithPr(root: string): number {
  const releasesDir = join(root, '.osc', 'releases');
  if (!existsSync(releasesDir)) return 0;
  return readdirSync(releasesDir)
    .filter(isEvidenceNoteFile)
    .filter((file) => /pull\/\d+|Branch \/ PR|PR:/i.test(readFileSync(join(releasesDir, file), 'utf8')))
    .length;
}

function collectIdentityChain(root: string, plans: Record<PlanStage, DashboardPlanCard[]>, evidenceCount: number): DashboardIdentityChain {
  return {
    roadmap: existsSync(join(root, 'ROADMAP.md')),
    plans: Object.values(plans).flat().length,
    runs: countDirectoryEntries(join(root, '.osc', 'runs')),
    prs: countEvidenceWithPr(root),
    evidence: evidenceCount,
  };
}

function collectTaskState(root: string): DashboardTaskState {
  if (!existsSync(join(root, '.osc', 'tasks.db'))) return { exists: false, summary: null };
  try {
    return { exists: true, summary: getTaskSummary(root) };
  } catch (error) {
    return { exists: true, summary: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export function collectWebDashboardData(rootInput = process.cwd(), now = new Date()): WebDashboardData {
  const root = resolveRoot(rootInput);
  const plans = collectPlans(root);
  const evidence = collectEvidence(root);
  const validation = validateScaffold(root);
  return {
    schema: 'open-scaffold.web_dashboard.v1',
    generatedAt: now.toISOString(),
    rootName: root.split(/[\\/]/).filter(Boolean).at(-1) ?? root,
    namespace: '.osc',
    mission: parseMission(root),
    plans,
    evidence,
    validation: {
      ok: validation.ok,
      failures: validation.failures.length,
      warnings: validation.warnings.length,
    },
    identityChain: collectIdentityChain(root, plans, evidence.length),
    tasks: collectTaskState(root),
  };
}

function safeDashboardJson(data: WebDashboardData): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/=/g, '\\u003d')
    .replace(/(https?:)\/\//g, '$1\\/\\/')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function renderWebDashboard(data: WebDashboardData): string {
  const safeJson = safeDashboardJson(data);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Open Scaffold Dashboard</title>
<style>
:root { color-scheme: dark; --bg:#090a0c; --panel:#111318; --panel2:#171a20; --text:#f4f4f0; --muted:#a6a8ad; --line:#2a2e36; --active:#6ea8fe; --done:#63d471; --blocked:#ff6b6b; --backlog:#f6c453; --accent:#ff4d4d; --shadow:0 24px 80px rgba(0,0,0,.35); }
body[data-theme="system"] { color-scheme: light dark; }
@media (prefers-color-scheme: light) { body[data-theme="system"] { --bg:#f6f5f1; --panel:#ffffff; --panel2:#f0eee8; --text:#151515; --muted:#575b63; --line:#d9d6ce; --active:#1c64d1; --done:#238636; --blocked:#d1242f; --backlog:#9a6700; --accent:#d1242f; --shadow:0 24px 80px rgba(20,20,20,.12); } }
* { box-sizing:border-box; }
body { margin:0; min-height:100vh; font:15px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:radial-gradient(circle at top right, rgba(255,255,255,.08), transparent 32rem), var(--bg); color:var(--text); }
.wrap { width:min(1180px, calc(100vw - 32px)); margin:0 auto; padding:32px 0 48px; }
header { display:grid; grid-template-columns:1fr auto; gap:16px; align-items:start; margin-bottom:24px; }
.eyebrow { color:var(--accent); letter-spacing:.16em; text-transform:uppercase; font-size:12px; font-weight:800; }
h1 { margin:.2rem 0 .6rem; font-size:clamp(2rem, 7vw, 5.25rem); line-height:.92; letter-spacing:-.07em; }
p { margin:.25rem 0; }
button { font:inherit; color:inherit; }
.theme { border:1px solid var(--line); background:var(--panel); padding:10px 12px; cursor:pointer; box-shadow:var(--shadow); }
.grid { display:grid; grid-template-columns:repeat(12,1fr); gap:16px; }
.card { grid-column:span 12; border:1px solid var(--line); background:linear-gradient(180deg, rgba(255,255,255,.035), transparent), var(--panel); box-shadow:var(--shadow); padding:18px; }
.card h2, .card h3 { margin:.1rem 0 .8rem; letter-spacing:-.03em; }
.card h2 { font-size:1.2rem; }
.muted { color:var(--muted); }
.kpis { display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:10px; }
.kpi { background:var(--panel2); border:1px solid var(--line); padding:12px; min-height:82px; }
.kpi b { display:block; font-size:1.7rem; line-height:1; margin-bottom:.4rem; }
.columns { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:12px; }
.column { border:1px solid var(--line); background:rgba(255,255,255,.025); padding:12px; min-width:0; }
.column-title { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; text-transform:uppercase; font-size:12px; letter-spacing:.12em; color:var(--muted); }
.status-dot { width:10px; height:10px; display:inline-block; border-radius:999px; background:var(--muted); }
.status-active { background:var(--active); } .status-backlog { background:var(--backlog); } .status-blocked { background:var(--blocked); } .status-done { background:var(--done); }
.plan { width:100%; text-align:left; border:1px solid var(--line); background:var(--panel); padding:11px; margin:0 0 8px; cursor:pointer; }
.plan strong { display:block; overflow-wrap:anywhere; }
.plan small { color:var(--muted); }
.plan-detail { display:none; margin-top:10px; padding-top:10px; border-top:1px solid var(--line); color:var(--muted); }
.plan[aria-expanded="true"] .plan-detail { display:block; }
.check { color:var(--done); font-weight:800; margin-right:6px; }
.uncheck { color:var(--muted); margin-right:6px; }
.flow { display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:8px; align-items:stretch; }
.flow-step { position:relative; border:1px solid var(--line); background:var(--panel2); padding:12px; min-height:86px; }
.flow-step:not(:last-child)::after { content:"→"; position:absolute; right:-14px; top:50%; transform:translateY(-50%); color:var(--accent); font-weight:900; }
.evidence-list { display:grid; gap:10px; }
.evidence { border:1px solid var(--line); background:var(--panel2); padding:12px; }
.badge { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--line); padding:5px 8px; margin:3px 6px 3px 0; background:var(--panel2); }
.ok { color:var(--done); } .warn { color:var(--backlog); } .bad { color:var(--blocked); }
.empty { border:1px dashed var(--line); padding:14px; color:var(--muted); }
@media (min-width: 760px) { .span-5 { grid-column:span 5; } .span-7 { grid-column:span 7; } .span-6 { grid-column:span 6; } }
@media (max-width: 860px) { header, .columns, .flow, .kpis { grid-template-columns:1fr; } .flow-step:not(:last-child)::after { display:none; } .wrap { width:min(100vw - 20px, 1180px); padding-top:20px; } }
</style>
</head>
<body data-theme="dark">
<div class="wrap">
<header>
  <div>
    <div class="eyebrow">Open Scaffold glass cockpit</div>
    <h1>Repo dashboard</h1>
    <p class="muted" id="generated"></p>
  </div>
  <button class="theme" id="theme-toggle" type="button">Use system theme</button>
</header>
<main id="dashboard"></main>
</div>
<script id="osc-dashboard-data" type="application/json">${safeJson}</script>
<script>
const data = JSON.parse(document.getElementById('osc-dashboard-data').textContent);
const stages = ['active', 'backlog', 'blocked', 'done'];
const labels = { active: 'Active', backlog: 'Backlog', blocked: 'Blocked', done: 'Done' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const allPlans = stages.flatMap((stage) => data.plans[stage] || []);
document.getElementById('generated').textContent = data.rootName + ' • generated ' + new Date(data.generatedAt).toLocaleString();
function renderMission() {
  const goals = data.mission.goals.length ? '<ul>' + data.mission.goals.map((goal) => '<li>' + esc(goal) + '</li>').join('') + '</ul>' : '<p class="muted">No mission goals listed.</p>';
  return '<section class="card span-7"><h2>Mission</h2><p>' + esc(data.mission.excerpt) + '</p>' + goals + '</section>';
}
function renderValidation() {
  const cls = data.validation.ok ? 'ok' : 'bad';
  const label = data.validation.ok ? 'Verification shape passes' : 'Verification needs attention';
  const taskText = data.tasks.exists && data.tasks.summary ? Object.entries(data.tasks.summary.counts).map(([k,v]) => esc(k) + ': ' + esc(v)).join(', ') : (data.tasks.exists ? 'Task database found; summary unavailable' : 'No local task database');
  return '<section class="card span-5"><h2>Verification status</h2><p class="' + cls + '">' + label + '</p><p class="muted">Failures: ' + esc(data.validation.failures) + ' • warnings: ' + esc(data.validation.warnings) + '</p><h3>Tasks</h3><p class="muted">' + taskText + '</p></section>';
}
function renderKpis() {
  const counts = stages.map((stage) => '<div class="kpi"><b>' + esc((data.plans[stage] || []).length) + '</b><span>' + labels[stage] + '</span></div>').join('');
  return '<section class="card"><h2>Plan state</h2><div class="kpis">' + counts + '<div class="kpi"><b>' + esc(data.evidence.length) + '</b><span>Recent evidence</span></div></div></section>';
}
function planDetail(plan) {
  const criteria = plan.criteria.length ? '<ul>' + plan.criteria.map((item) => '<li><span class="' + (item.done ? 'check' : 'uncheck') + '">' + (item.done ? '✓' : '□') + '</span>' + esc(item.text) + '</li>').join('') + '</ul>' : '<p>No acceptance criteria listed.</p>';
  const questions = plan.openQuestions.length ? '<p><strong>Open questions</strong></p><ul>' + plan.openQuestions.map((q) => '<li>' + esc(q) + '</li>').join('') + '</ul>' : '<p>No open questions.</p>';
  return '<div class="plan-detail"><p><strong>Goal:</strong> ' + esc(plan.goal || 'No goal recorded.') + '</p><p><strong>Acceptance criteria</strong></p>' + criteria + questions + '<p><small>' + esc(plan.path) + '</small></p></div>';
}
function renderColumns() {
  if (!allPlans.length) return '<section class="card"><h2>Plan kanban</h2><div class="empty">No plans yet.</div></section>';
  const columns = stages.map((stage) => {
    const cards = (data.plans[stage] || []).map((plan) => '<button type="button" class="plan" aria-expanded="false"><strong>' + esc(plan.slug) + '</strong><small>' + esc(plan.status || stage) + '</small>' + planDetail(plan) + '</button>').join('') || '<div class="empty">No plans in ' + labels[stage].toLowerCase() + '.</div>';
    return '<div class="column"><div class="column-title"><span><span class="status-dot status-' + stage + '"></span> ' + labels[stage] + '</span><span>' + esc((data.plans[stage] || []).length) + '</span></div>' + cards + '</div>';
  }).join('');
  return '<section class="card"><h2>Plan kanban</h2><div class="columns">' + columns + '</div></section>';
}
function renderFlow() {
  const steps = [
    ['Roadmap', data.identityChain.roadmap ? 'present' : 'missing'],
    ['Plans', data.identityChain.plans],
    ['Runs', data.identityChain.runs],
    ['PR traces', data.identityChain.prs],
    ['Evidence', data.identityChain.evidence],
  ].map(([name, value]) => '<div class="flow-step"><strong>' + esc(name) + '</strong><p class="muted">' + esc(value) + '</p></div>').join('');
  return '<section class="card span-6"><h2>Identity chain</h2><div class="flow">' + steps + '</div></section>';
}
function renderEvidence() {
  const notes = data.evidence.length ? data.evidence.map((note) => '<article class="evidence"><strong>' + esc(note.title) + '</strong><p>' + esc(note.summary) + '</p><a class="muted" href="' + esc(note.dashboardHref) + '">' + esc(note.path) + '</a></article>').join('') : '<div class="empty">No evidence notes yet.</div>';
  return '<section class="card span-6"><h2>Recent evidence</h2><div class="evidence-list">' + notes + '</div></section>';
}
document.getElementById('dashboard').innerHTML = '<div class="grid">' + renderMission() + renderValidation() + renderKpis() + renderColumns() + renderFlow() + renderEvidence() + '</div>';
document.querySelectorAll('.plan').forEach((button) => button.addEventListener('click', () => button.setAttribute('aria-expanded', button.getAttribute('aria-expanded') !== 'true')));
document.getElementById('theme-toggle').addEventListener('click', () => {
  const body = document.body;
  const next = body.dataset.theme === 'system' ? 'dark' : 'system';
  body.dataset.theme = next;
  document.getElementById('theme-toggle').textContent = next === 'system' ? 'Use dark theme' : 'Use system theme';
});
</script>
</body>
</html>
`;
}

export function writeWebDashboard(options: WriteDashboardOptions = {}): WriteDashboardResult {
  const root = resolveRoot(options.root);
  const outputPath = options.out ? resolve(options.out) : join(root, '.osc', 'dashboard.html');
  const data = collectWebDashboardData(root, options.now);
  const html = renderWebDashboard(data);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html, 'utf8');
  return { path: outputPath, bytes: Buffer.byteLength(html), data };
}

export async function serveDashboard(options: ServeDashboardOptions = {}): Promise<DashboardServerHandle> {
  const root = resolveRoot(options.root);
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Method not allowed');
      return;
    }
    if (url.pathname !== '/' && url.pathname !== '/dashboard.html') {
      if (url.pathname.startsWith('/releases/')) {
        let file = '';
        try {
          file = decodeURIComponent(url.pathname.slice('/releases/'.length));
        } catch {
          response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
          response.end('Not found');
          return;
        }
        if (!isEvidenceNoteFile(file) || file.includes('/') || file.includes('\\')) {
          response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
          response.end('Not found');
          return;
        }
        const releasePath = join(root, '.osc', 'releases', file);
        if (!existsSync(releasePath) || !lstatSync(releasePath).isFile()) {
          response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
          response.end('Not found');
          return;
        }
        response.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' });
        if (request.method === 'HEAD') response.end();
        else response.end(readFileSync(releasePath, 'utf8'));
        return;
      }
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    const html = renderWebDashboard(collectWebDashboardData(root, options.now ?? new Date()));
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    if (request.method === 'HEAD') response.end();
    else response.end(html);
  });
  const port = options.port ?? 9876;
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', rejectListen);
      resolveListen();
    });
  });
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? (address as AddressInfo).port : port;
  return {
    server,
    url: `http://localhost:${actualPort}`,
    close: () => new Promise<void>((resolveClose, rejectClose) => {
      server.close((error) => {
        if (error) rejectClose(error);
        else resolveClose();
      });
    }),
  };
}

export function openDashboardUrl(url: string): void {
  console.log(`Open this URL in your browser: ${url}`);
}
