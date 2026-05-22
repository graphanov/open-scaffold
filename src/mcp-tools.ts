import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep, win32 } from 'node:path';
import {
  closePlan,
  createEvidenceNoteSkeleton,
  createPlanAmendment,
  createPlanSkeleton,
  inspectScaffold,
  parsePlanFile,
  PLAN_CREATION_STAGES,
  PLAN_STAGES,
  splitSections,
  type PlanCreationStage,
  type PlanStage,
} from './scaffold.js';
import { validateScaffold } from './validation.js';

export class McpJsonRpcError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'McpJsonRpcError';
    this.code = code;
    this.data = data;
  }
}

export interface McpToolContext {
  root: string;
  allowWrite: boolean;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

type JsonRecord = Record<string, unknown>;

interface PlanLocation {
  slug: string;
  stage: PlanStage;
  absolutePath: string;
  relativePath: string;
}

const WRITE_TOOLS = new Set(['create_plan', 'amend_plan', 'close_plan', 'create_evidence']);

function objectSchema(properties: Record<string, unknown>, required: string[] = []): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  };
}

function stringEnum(values: readonly string[]): Record<string, unknown> {
  return { type: 'string', enum: values };
}

export function listMcpTools(): McpToolDefinition[] {
  const stage = stringEnum(PLAN_STAGES);
  const stageCreation = stringEnum(PLAN_CREATION_STAGES);
  return [
    {
      name: 'list_plans',
      description: 'List Open Scaffold plan slugs by stage. Optional stage filter: active, backlog, blocked, or done.',
      inputSchema: objectSchema({ stage }),
      outputSchema: objectSchema({ plans: { type: 'array' } }, ['plans']),
    },
    {
      name: 'get_plan',
      description: 'Read a plan by slug and return parsed sections plus raw markdown.',
      inputSchema: objectSchema({ slug: { type: 'string' } }, ['slug']),
      outputSchema: objectSchema({ slug: { type: 'string' }, sections: { type: 'object' }, raw_markdown: { type: 'string' } }, ['slug', 'sections', 'raw_markdown']),
    },
    {
      name: 'get_mission',
      description: 'Return mission status, goals, non-goals, and recent changelog entries from MISSION.md.',
      inputSchema: objectSchema({}),
      outputSchema: objectSchema({ defined: { type: 'boolean' }, goals: { type: 'array' }, non_goals: { type: 'array' }, changelog: { type: 'array' } }, ['defined', 'goals', 'non_goals', 'changelog']),
    },
    {
      name: 'list_evidence',
      description: 'List scaffold-native evidence/release notes, optionally filtered by plan slug.',
      inputSchema: objectSchema({ slug: { type: 'string' } }),
      outputSchema: objectSchema({ evidence: { type: 'array' } }, ['evidence']),
    },
    {
      name: 'get_evidence',
      description: 'Read an evidence/release note by repo-relative path, file name, or latest note matching a slug.',
      inputSchema: objectSchema({ path: { type: 'string' }, slug: { type: 'string' } }),
      outputSchema: objectSchema({ content: { type: 'string' } }, ['content']),
    },
    {
      name: 'get_status',
      description: 'Return scaffold health, mission state, plan counts, and local verify result when available.',
      inputSchema: objectSchema({}),
      outputSchema: objectSchema({ mission: { type: 'object' }, plan_counts: { type: 'object' }, verify: { type: 'object' } }, ['mission', 'plan_counts', 'verify']),
    },
    {
      name: 'search_plans',
      description: 'Full-text search across plan markdown, goals, and acceptance criteria. Optional stage filter.',
      inputSchema: objectSchema({ query: { type: 'string' }, stage }, ['query']),
      outputSchema: objectSchema({ results: { type: 'array' } }, ['results']),
    },
    {
      name: 'list_amendments',
      description: 'List amendment files for a plan slug.',
      inputSchema: objectSchema({ slug: { type: 'string' } }, ['slug']),
      outputSchema: objectSchema({ amendments: { type: 'array' } }, ['amendments']),
    },
    {
      name: 'create_plan',
      description: 'Create a plan skeleton. Requires server --allow-write.',
      inputSchema: objectSchema({ slug: { type: 'string' }, stage: stageCreation }, ['slug', 'stage']),
    },
    {
      name: 'amend_plan',
      description: 'Create an amendment for an existing plan. Requires server --allow-write.',
      inputSchema: objectSchema({ slug: { type: 'string' }, message: { type: 'string' } }, ['slug']),
    },
    {
      name: 'close_plan',
      description: 'Close a plan by moving it to done and stamping the changelog. Requires server --allow-write.',
      inputSchema: objectSchema({ slug: { type: 'string' }, message: { type: 'string' } }, ['slug']),
    },
    {
      name: 'create_evidence',
      description: 'Create an evidence note skeleton for a plan slug. Requires server --allow-write.',
      inputSchema: objectSchema({ slug: { type: 'string' } }, ['slug']),
    },
  ];
}

export function callMcpTool(name: string, args: unknown, context: McpToolContext): unknown {
  const input = asRecord(args);
  if (WRITE_TOOLS.has(name) && !context.allowWrite) {
    throw new McpJsonRpcError(-32000, 'Write operations require --allow-write flag');
  }

  switch (name) {
    case 'list_plans':
      return { plans: listPlans(context.root, optionalStage(input, 'stage')) };
    case 'get_plan':
      return getPlan(context.root, requiredString(input, 'slug'));
    case 'get_mission':
      return readMissionSummary(context.root);
    case 'list_evidence':
      return { evidence: listEvidence(context.root, optionalString(input, 'slug')) };
    case 'get_evidence':
      return getEvidence(context.root, optionalString(input, 'path'), optionalString(input, 'slug'));
    case 'get_status':
      return getStatus(context.root);
    case 'search_plans':
      return searchPlans(context.root, requiredString(input, 'query'), optionalStage(input, 'stage'));
    case 'list_amendments':
      return listAmendments(context.root, requiredString(input, 'slug'));
    case 'create_plan': {
      const result = createPlanSkeleton(requiredString(input, 'slug'), requiredCreationStage(input, 'stage'), context.root);
      return { slug: result.slug, path: result.relativePath, stage: result.stage };
    }
    case 'amend_plan': {
      const result = createPlanAmendment(requiredString(input, 'slug'), context.root, optionalString(input, 'message') ?? '');
      return { slug: result.slug, path: result.relativePath, amendment_number: result.amendmentNumber, changelog_stamped: result.changelogStamped };
    }
    case 'close_plan': {
      const result = closePlan(requiredString(input, 'slug'), context.root, optionalString(input, 'message') ?? '');
      return { slug: result.slug, moved_files: result.movedFiles, changelog_stamped: result.changelogStamped, already_done: result.alreadyDone };
    }
    case 'create_evidence': {
      const result = createEvidenceNoteSkeleton(requiredString(input, 'slug'), context.root);
      return { slug: result.slug, path: result.relativePath };
    }
    default:
      throw new McpJsonRpcError(-32601, `Unknown MCP tool: ${name}`);
  }
}

function asRecord(value: unknown): JsonRecord {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new McpJsonRpcError(-32602, 'Tool arguments must be an object');
  return value as JsonRecord;
}

function requiredString(args: JsonRecord, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || !value.trim()) throw new McpJsonRpcError(-32602, `Missing required string argument: ${key}`);
  return value.trim();
}

function optionalString(args: JsonRecord, key: string): string | undefined {
  const value = args[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new McpJsonRpcError(-32602, `Argument ${key} must be a string`);
  return value.trim();
}

function optionalStage(args: JsonRecord, key: string): PlanStage | undefined {
  const value = optionalString(args, key);
  if (!value) return undefined;
  if (!(PLAN_STAGES as readonly string[]).includes(value)) {
    throw new McpJsonRpcError(-32602, `Invalid stage: ${value}. Expected one of: ${PLAN_STAGES.join(', ')}`);
  }
  return value as PlanStage;
}

function requiredCreationStage(args: JsonRecord, key: string): PlanCreationStage {
  const value = requiredString(args, key);
  if (!(PLAN_CREATION_STAGES as readonly string[]).includes(value)) {
    throw new McpJsonRpcError(-32602, `Invalid stage: ${value}. Expected one of: ${PLAN_CREATION_STAGES.join(', ')}`);
  }
  return value as PlanCreationStage;
}

function safeSlug(slug: string): string {
  const value = slug.endsWith('.md') ? slug.slice(0, -3) : slug;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) || value.includes('..')) {
    throw new McpJsonRpcError(-32602, `Unsafe slug: ${slug}`);
  }
  return value;
}

function listPlans(root: string, stage?: PlanStage): Array<{ slug: string; stage: PlanStage; path: string }> {
  const state = inspectScaffold(root);
  const stages = stage ? [stage] : PLAN_STAGES;
  return stages.flatMap((currentStage) =>
    state.plans[currentStage]
      .filter((plan) => !isAmendmentSlug(plan.slug) && isRegularMcpFile(join(root, plan.path), root))
      .map((plan) => ({ slug: plan.slug, stage: currentStage, path: plan.path })),
  );
}

function isAmendmentSlug(slug: string): boolean {
  return /-amendment-\d+$/.test(slug);
}

function findPlan(root: string, slug: string): PlanLocation {
  const normalized = safeSlug(slug);
  for (const stage of PLAN_STAGES) {
    const absolutePath = join(root, '.osc', 'plans', stage, `${normalized}.md`);
    if (existsSync(absolutePath) && isRegularMcpFile(absolutePath, root)) {
      return { slug: normalized, stage, absolutePath, relativePath: relative(root, absolutePath) };
    }
  }
  throw new McpJsonRpcError(-32004, `Plan not found: ${normalized}`);
}

function isRegularMcpFile(path: string, root: string): boolean {
  try {
    if (!lstatSync(path).isFile()) return false;
    const relativeToRoot = relative(realpathSync(root), realpathSync(path));
    return isSafeEvidenceRelativePath(relativeToRoot);
  } catch {
    return false;
  }
}

function getPlan(root: string, slug: string): Record<string, unknown> {
  const found = findPlan(root, slug);
  const plan = parsePlanFile(found.absolutePath);
  const raw = readFileSync(found.absolutePath, 'utf8');
  return {
    slug: plan.slug,
    stage: found.stage,
    path: found.relativePath,
    status: plan.status,
    goal: plan.goal,
    files_to_touch: plan.filesToTouch,
    acceptance_criteria: plan.acceptanceCriteria,
    verification_steps: plan.verificationSteps,
    open_questions: plan.openQuestions,
    sections: Object.fromEntries(plan.sections.entries()),
    raw_markdown: raw,
  };
}

function bulletItems(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
}

export function readMissionSummary(root: string): Record<string, unknown> {
  const missionPath = join(root, 'MISSION.md');
  if (!existsSync(missionPath) || !isRegularMcpFile(missionPath, root)) return { defined: false, reason: 'MISSION.md not found or not a regular file under repository', goals: [], non_goals: [], changelog: [] };
  const raw = readFileSync(missionPath, 'utf8');
  const defined = !raw.includes('mission:unset') && !raw.includes('TODO: define mission');
  const sections = splitSections(raw);
  const changelog = (sections.get('Changelog') ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^-\s+/, ''))
    .slice(0, 10);
  return {
    defined,
    reason: defined ? undefined : 'mission unset marker present',
    path: 'MISSION.md',
    goals: bulletItems(sections.get('Goals') ?? ''),
    non_goals: bulletItems(sections.get('Non-Goals') ?? ''),
    changelog,
  };
}

function evidenceSlug(file: string): string {
  return file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
}

function listEvidence(root: string, slug?: string): Array<{ slug: string; file: string; path: string }> {
  const dir = join(root, '.osc', 'releases');
  if (!existsSync(dir) || !isRegularEvidenceDirectory(dir, root)) return [];
  const normalizedSlug = slug ? safeSlug(slug) : undefined;
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .filter((file) => isRegularEvidenceFile(dir, file))
    .sort()
    .filter((file) => !normalizedSlug || evidenceSlug(file) === normalizedSlug)
    .map((file) => ({ slug: evidenceSlug(file), file, path: relative(root, join(dir, file)) }));
}

function isRegularEvidenceFile(dir: string, file: string): boolean {
  try {
    return lstatSync(join(dir, file)).isFile();
  } catch {
    return false;
  }
}

function isRegularEvidenceDirectory(dir: string, root: string): boolean {
  try {
    if (!lstatSync(dir).isDirectory()) return false;
    const relativeToRoot = relative(realpathSync(root), realpathSync(dir));
    return isSafeEvidenceRelativePath(relativeToRoot);
  } catch {
    return false;
  }
}

function safeEvidencePath(root: string, value: string): string {
  const releasesDir = resolve(root, '.osc', 'releases');
  if (!existsSync(releasesDir)) throw new McpJsonRpcError(-32004, '.osc/releases not found');
  if (!isRegularEvidenceDirectory(releasesDir, root)) throw new McpJsonRpcError(-32602, '.osc/releases must be a regular directory under the repository');
  const canonicalReleasesDir = realpathSync(releasesDir);
  const candidate = value.includes('/') || value.includes(sep) ? resolve(root, value) : resolve(releasesDir, value);
  const relativeToReleases = relative(releasesDir, candidate);
  if (!isSafeEvidenceRelativePath(relativeToReleases)) {
    throw new McpJsonRpcError(-32602, `Evidence path must stay under .osc/releases: ${value}`);
  }
  if (!existsSync(candidate)) throw new McpJsonRpcError(-32004, `Evidence not found: ${value}`);
  const candidateStat = lstatSync(candidate);
  if (!candidateStat.isFile()) throw new McpJsonRpcError(-32602, `Evidence path must be a regular file under .osc/releases: ${value}`);
  const canonicalCandidate = realpathSync(candidate);
  const realRelativeToReleases = relative(canonicalReleasesDir, canonicalCandidate);
  if (!isSafeEvidenceRelativePath(realRelativeToReleases)) {
    throw new McpJsonRpcError(-32602, `Evidence path must stay under .osc/releases: ${value}`);
  }
  return candidate;
}

export function isSafeEvidenceRelativePath(relativePath: string): boolean {
  return (
    relativePath !== '' &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${sep}`) &&
    !relativePath.startsWith(`..${win32.sep}`) &&
    !isAbsolute(relativePath) &&
    !win32.isAbsolute(relativePath)
  );
}

function getEvidence(root: string, pathArg?: string, slug?: string): Record<string, unknown> {
  let evidencePath: string | null = null;
  if (pathArg) evidencePath = safeEvidencePath(root, pathArg);
  else if (slug) {
    const matches = listEvidence(root, slug);
    const latest = matches.at(-1);
    if (!latest) throw new McpJsonRpcError(-32004, `Evidence not found: ${slug}`);
    evidencePath = safeEvidencePath(root, latest.path);
  }
  if (!evidencePath) throw new McpJsonRpcError(-32602, 'Provide either path or slug for get_evidence');
  const file = basename(evidencePath);
  return {
    slug: evidenceSlug(file),
    file,
    path: relative(root, evidencePath),
    content: readFileSync(evidencePath, 'utf8'),
  };
}

function getStatus(root: string): Record<string, unknown> {
  const state = inspectScaffold(root);
  const planCounts = Object.fromEntries(PLAN_STAGES.map((stage) => [stage, listPlans(root, stage).length]));
  const validation = validateScaffold(root);
  const verify = {
    available: true,
    ok: validation.ok,
    failure_count: validation.failures.length,
    warning_count: validation.warnings.length,
    failures: validation.failures,
    warnings: validation.warnings,
    note: 'Equivalent to osc verify validation; no runtime or subprocess is launched.',
  };
  return {
    namespace: state.namespace,
    root: state.root,
    mission: state.mission,
    plan_counts: planCounts,
    verify,
  };
}

function snippetFor(text: string, query: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  const index = compact.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return compact.slice(0, 180);
  const start = Math.max(0, index - 60);
  const end = Math.min(compact.length, index + query.length + 120);
  return compact.slice(start, end);
}

function searchPlans(root: string, query: string, stage?: PlanStage): Record<string, unknown> {
  const needle = query.trim().toLowerCase();
  if (!needle) throw new McpJsonRpcError(-32602, 'query must not be empty');
  const results = listPlans(root, stage)
    .map((plan) => {
      const location = findPlan(root, plan.slug);
      const raw = readFileSync(location.absolutePath, 'utf8');
      if (!raw.toLowerCase().includes(needle)) return null;
      const parsed = parsePlanFile(location.absolutePath);
      return { slug: plan.slug, stage: plan.stage, path: plan.path, goal: parsed.goal, snippet: snippetFor(raw, query) };
    })
    .filter((entry): entry is { slug: string; stage: PlanStage; path: string; goal: string; snippet: string } => entry !== null);
  return { query, results };
}

function listAmendments(root: string, slug: string): Record<string, unknown> {
  const found = findPlan(root, slug);
  const dir = join(root, '.osc', 'plans', found.stage);
  const prefix = `${found.slug}-amendment-`;
  const amendments = readdirSync(dir)
    .filter((file) => file.startsWith(prefix) && file.endsWith('.md'))
    .sort()
    .map((file) => ({ file, path: relative(root, join(dir, file)) }));
  return { slug: found.slug, stage: found.stage, amendments };
}
