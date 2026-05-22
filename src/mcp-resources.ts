import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { inspectScaffold, PLAN_STAGES, type PlanStage } from './scaffold.js';
import { McpJsonRpcError, readMissionSummary } from './mcp-tools.js';

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface McpResourceContext {
  root: string;
}

export interface McpResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

export function listMcpResources(root: string): McpResourceDefinition[] {
  const latestEvidence = latestEvidenceFile(root);
  return [
    ...PLAN_STAGES.map((stage) => ({
      uri: `osc://plans/${stage}`,
      name: `${stage} plans`,
      description: `Open Scaffold ${stage} plan slugs and paths`,
      mimeType: 'application/json',
    })),
    {
      uri: 'osc://releases/latest',
      name: 'latest evidence note',
      description: latestEvidence ? `Most recent scaffold evidence note: ${latestEvidence}` : 'Most recent scaffold evidence note',
      mimeType: 'text/markdown',
    },
    {
      uri: 'osc://mission/goals',
      name: 'mission goals',
      description: 'Goals from MISSION.md',
      mimeType: 'application/json',
    },
    {
      uri: 'osc://mission/changelog',
      name: 'mission changelog',
      description: 'Recent changelog entries from MISSION.md',
      mimeType: 'application/json',
    },
    {
      uri: 'osc://rules',
      name: 'Open Scaffold quick rules',
      description: 'Content of .osc/RULES.md',
      mimeType: 'text/markdown',
    },
    {
      uri: 'osc://roadmap',
      name: 'roadmap',
      description: 'Content of ROADMAP.md',
      mimeType: 'text/markdown',
    },
  ];
}

export function readMcpResource(uri: string, context: McpResourceContext): McpResourceContent {
  const root = context.root;
  const planMatch = uri.match(/^osc:\/\/plans\/(active|backlog|blocked|done)$/);
  if (planMatch) {
    const stage = planMatch[1] as PlanStage;
    const state = inspectScaffold(root);
    const plans = state.plans[stage].filter((plan) => !/-amendment-\d+$/.test(plan.slug));
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify({ stage, plans }, null, 2),
    };
  }

  switch (uri) {
    case 'osc://releases/latest': {
      const latest = latestEvidenceFile(root);
      if (!latest) throw new McpJsonRpcError(-32004, 'No evidence notes found in .osc/releases');
      const path = join(root, '.osc', 'releases', latest);
      return { uri, mimeType: 'text/markdown', text: readFileSync(path, 'utf8') };
    }
    case 'osc://mission/goals': {
      const mission = readMissionSummary(root) as { goals?: unknown[] };
      return { uri, mimeType: 'application/json', text: JSON.stringify({ goals: mission.goals ?? [] }, null, 2) };
    }
    case 'osc://mission/changelog': {
      const mission = readMissionSummary(root) as { changelog?: unknown[] };
      return { uri, mimeType: 'application/json', text: JSON.stringify({ changelog: mission.changelog ?? [] }, null, 2) };
    }
    case 'osc://rules':
      return readMarkdownResource(root, uri, '.osc/RULES.md');
    case 'osc://roadmap':
      return readMarkdownResource(root, uri, 'ROADMAP.md');
    default:
      throw new McpJsonRpcError(-32004, `Unknown MCP resource: ${uri}`);
  }
}

function readMarkdownResource(root: string, uri: string, relativePath: string): McpResourceContent {
  const path = resolve(root, relativePath);
  const relativeToRoot = relative(root, path);
  if (relativeToRoot.startsWith('..')) throw new McpJsonRpcError(-32602, `Resource path escapes repository: ${relativePath}`);
  if (!existsSync(path)) throw new McpJsonRpcError(-32004, `Resource file not found: ${relativePath}`);
  return { uri, mimeType: 'text/markdown', text: readFileSync(path, 'utf8') };
}

function latestEvidenceFile(root: string): string | null {
  const dir = join(root, '.osc', 'releases');
  if (!existsSync(dir)) return null;
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .sort()
    .at(-1) ?? null;
}
