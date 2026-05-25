import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findScaffoldRoot, parsePlanFile, PLAN_STAGES, type PlanStage } from './scaffold.js';

export const PLAN_GRAPH_SCHEMA = 'open-scaffold.plan-graph.v1';

export type PlanGraphRelationship = 'depends_on' | 'blocks' | 'follows';
export type PlanGraphFormat = 'ascii' | 'mermaid' | 'json';
export type PlanGraphStageFilter = 'active' | 'backlog' | 'all';
export type PlanGraphDirection = 'downstream' | 'upstream' | 'both';

export interface PlanGraphNode {
  slug: string;
  stage: PlanStage | 'unresolved';
  path: string | null;
  goal: string;
}

export interface PlanGraphEdge {
  from: string;
  to: string;
  relationship: PlanGraphRelationship;
}

export interface PlanGraph {
  schema: typeof PLAN_GRAPH_SCHEMA;
  root: string;
  stage: PlanGraphStageFilter | 'open';
  direction: PlanGraphDirection;
  focus: string | null;
  nodes: PlanGraphNode[];
  edges: PlanGraphEdge[];
  warnings: string[];
}

export interface BuildPlanGraphOptions {
  root?: string;
  stage?: PlanGraphStageFilter;
  direction?: PlanGraphDirection;
  plan?: string;
}

interface PlanRecord {
  node: PlanGraphNode;
  absolutePath: string;
  text: string;
}

interface DependencyPair {
  dependent: string;
  dependency: string;
}

const STAGE_ORDER: PlanStage[] = ['active', 'backlog', 'blocked', 'done'];
const PLAN_FILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.md$/;
const AMENDMENT_PATTERN = /-amendment-\d+\.md$/;

function resolveRoot(root?: string): string {
  const start = root ?? process.cwd();
  const scaffoldRoot = findScaffoldRoot(start);
  if (!scaffoldRoot) throw new Error(`No Open Scaffold root found from ${start}. Run this inside a repo with .osc/plans and .osc/releases.`);
  return scaffoldRoot;
}

function isPlanFile(file: string): boolean {
  return PLAN_FILE_PATTERN.test(file) && !AMENDMENT_PATTERN.test(file);
}

function sectionTextForDependencyScan(markdown: string): string {
  return markdown;
}

export function normalizePlanReference(raw: string): string | null {
  const trimmed = raw
    .trim()
    .replace(/^\[|\]$/g, '')
    .replace(/^[`'"(<]+/, '')
    .replace(/[>`'"),.;:]+$/g, '');
  if (!trimmed) return null;
  const withoutAnchor = trimmed.split('#')[0];
  let fileOrSlug: string;
  if (withoutAnchor.includes('/') || withoutAnchor.includes('\\')) {
    const match = withoutAnchor.match(/^\.osc\/plans\/(?:active|backlog|blocked|done)\/([^/\\]+)$/);
    if (!match) return null;
    fileOrSlug = (match[1] as string).replace(/\.md$/i, '');
  } else {
    fileOrSlug = withoutAnchor.replace(/\.md$/i, '');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(fileOrSlug)) return null;
  return fileOrSlug;
}

function extractTargets(raw: string): string[] {
  const withoutExternalLinks = raw.replace(/\[[^\]]+\]\((?:[a-z][a-z0-9+.-]*:)?\/\/[^)]+\)/gi, '');
  const withoutBareUrls = withoutExternalLinks.replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '');
  const linked = withoutBareUrls.replace(/\[[^\]]+\]\(([^)]+)\)/g, '$1');
  const fragments = linked.split(/[,;]|\s+and\s+/i);
  const targets: string[] = [];
  for (const fragment of fragments) {
    const target = normalizePlanReference(fragment);
    if (target && !targets.includes(target)) targets.push(target);
  }
  return targets;
}

function addEdge(edges: PlanGraphEdge[], seen: Set<string>, from: string, to: string, relationship: PlanGraphRelationship): void {
  if (from === to) return;
  const key = `${from}->${to}:${relationship}`;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push({ from, to, relationship });
}

export function extractDependencyReferences(text: string, source = 'source'): PlanGraphEdge[] {
  const edges: PlanGraphEdge[] = [];
  const seen = new Set<string>();
  const labeledPatterns: Array<{ relationship: PlanGraphRelationship; pattern: RegExp }> = [
    { relationship: 'depends_on', pattern: /\bdepends\s+on\s*:\s*(.+)$/i },
    { relationship: 'depends_on', pattern: /\bblocked\s+by\s*:\s*(.+)$/i },
    { relationship: 'blocks', pattern: /\bblocks\s*:\s*(.+)$/i },
    { relationship: 'follows', pattern: /\bfollows\s*:\s*(.+)$/i },
    { relationship: 'follows', pattern: /\binherits\s+from\s*:\s*(.+)$/i },
  ];

  for (const line of text.split(/\r?\n/)) {
    for (const { relationship, pattern } of labeledPatterns) {
      const match = line.match(pattern);
      if (!match) continue;
      for (const target of extractTargets(match[1] ?? '')) {
        addEdge(edges, seen, source, target, relationship);
      }
      break;
    }

    for (const match of line.matchAll(/--plan\s+[`'"(]*((?:\.osc\/plans\/(?:active|backlog|blocked|done)\/)?[A-Za-z0-9][A-Za-z0-9._-]*)(?:\.md)?/gi)) {
      const target = normalizePlanReference(match[1] ?? '');
      if (target) addEdge(edges, seen, source, target, 'follows');
    }

    for (const match of line.matchAll(/\bsee\s+plan\s+[`'"(]*((?:\.osc\/plans\/(?:active|backlog|blocked|done)\/)?[A-Za-z0-9][A-Za-z0-9._-]*)(?:\.md)?/gi)) {
      const target = normalizePlanReference(match[1] ?? '');
      if (target) addEdge(edges, seen, source, target, 'follows');
    }
  }

  return edges;
}

function loadPlans(root: string): Map<string, PlanRecord> {
  const records = new Map<string, PlanRecord>();
  for (const stage of PLAN_STAGES) {
    const dir = join(root, '.osc', 'plans', stage);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).sort()) {
      if (!isPlanFile(file)) continue;
      const absolutePath = join(dir, file);
      if (!statSync(absolutePath).isFile()) continue;
      const parsed = parsePlanFile(absolutePath);
      const relativePath = relative(root, absolutePath);
      records.set(parsed.slug, {
        node: {
          slug: parsed.slug,
          stage,
          path: relativePath,
          goal: parsed.goal,
        },
        absolutePath,
        text: readFileSync(absolutePath, 'utf8'),
      });
    }
  }
  return records;
}

function rootSlugs(records: Map<string, PlanRecord>, stage?: PlanGraphStageFilter, focus?: string): string[] {
  const wantedStages: PlanStage[] = stage === 'all' ? STAGE_ORDER : stage ? [stage] : ['active', 'backlog'];
  const roots: string[] = [];
  for (const wantedStage of wantedStages) {
    for (const [slug, record] of records.entries()) {
      if (record.node.stage === wantedStage && !roots.includes(slug)) roots.push(slug);
    }
  }
  if (focus && !roots.includes(focus)) roots.push(focus);
  return roots;
}

function dependencyPair(edge: PlanGraphEdge): DependencyPair {
  if (edge.relationship === 'blocks') return { dependent: edge.to, dependency: edge.from };
  return { dependent: edge.from, dependency: edge.to };
}

function detectCycles(edges: PlanGraphEdge[], knownSlugs: Set<string>): string[] {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const pair = dependencyPair(edge);
    if (!knownSlugs.has(pair.dependent) || !knownSlugs.has(pair.dependency)) continue;
    const next = adjacency.get(pair.dependent) ?? [];
    next.push(pair.dependency);
    adjacency.set(pair.dependent, next);
  }

  const warnings: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const reported = new Set<string>();

  function visit(slug: string, stack: string[]): void {
    if (visiting.has(slug)) {
      const cycle = [...stack.slice(stack.indexOf(slug)), slug];
      const key = cycle.join(' -> ');
      if (!reported.has(key)) {
        reported.add(key);
        warnings.push(`Circular dependency detected: ${key}`);
      }
      return;
    }
    if (visited.has(slug)) return;
    visiting.add(slug);
    for (const next of adjacency.get(slug) ?? []) visit(next, [...stack, slug]);
    visiting.delete(slug);
    visited.add(slug);
  }

  for (const slug of adjacency.keys()) visit(slug, []);
  return warnings;
}

function collectReachableEdges(edges: PlanGraphEdge[], focus: string, direction: PlanGraphDirection): PlanGraphEdge[] {
  const includeDownstream = direction === 'downstream' || direction === 'both';
  const includeUpstream = direction === 'upstream' || direction === 'both';
  const output: PlanGraphEdge[] = [];
  const seen = new Set<string>();

  function include(edge: PlanGraphEdge): void {
    const key = `${edge.from}->${edge.to}:${edge.relationship}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push(edge);
  }

  if (includeDownstream) {
    const queue = [focus];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const edge of edges) {
        const pair = dependencyPair(edge);
        if (pair.dependent !== current) continue;
        include(edge);
        queue.push(pair.dependency);
      }
    }
  }

  if (includeUpstream) {
    const queue = [focus];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const edge of edges) {
        const pair = dependencyPair(edge);
        if (pair.dependency !== current) continue;
        include(edge);
        queue.push(pair.dependent);
      }
    }
  }

  return output;
}

function filterNodesForEdges(nodes: PlanGraphNode[], edges: PlanGraphEdge[], focus: string | null): PlanGraphNode[] {
  if (!focus) return nodes;
  const slugs = new Set<string>([focus]);
  for (const edge of edges) {
    slugs.add(edge.from);
    slugs.add(edge.to);
  }
  return nodes.filter((node) => slugs.has(node.slug));
}

export function buildPlanGraph(options: BuildPlanGraphOptions = {}): PlanGraph {
  const root = resolveRoot(options.root);
  const stage = options.stage ?? 'open';
  const direction = options.direction ?? 'both';
  if (options.stage === 'all' && direction !== 'both') {
    throw new Error('Plan graph --stage all only supports --direction both. Use --plan or --stage active/backlog for upstream/downstream views.');
  }
  const focus = options.plan ? normalizePlanReference(options.plan) : null;
  if (options.plan && !focus) throw new Error(`Invalid plan reference: ${options.plan}`);
  const records = loadPlans(root);
  const warnings: string[] = [];
  const orderedNodeSlugs: string[] = [];
  const unresolvedNodeSlugs: string[] = [];
  const includedSlugs = new Set<string>();
  const graphEdges: PlanGraphEdge[] = [];
  const seenGraphEdges = new Set<string>();
  const allEdges: PlanGraphEdge[] = [];
  const seenAllEdges = new Set<string>();

  for (const [slug, record] of records.entries()) {
    for (const edge of extractDependencyReferences(sectionTextForDependencyScan(record.text), slug)) {
      const key = `${edge.from}->${edge.to}:${edge.relationship}`;
      if (seenAllEdges.has(key)) continue;
      seenAllEdges.add(key);
      allEdges.push(edge);
    }
  }

  function includeNode(slug: string): void {
    if (includedSlugs.has(slug)) return;
    includedSlugs.add(slug);
    if (records.has(slug)) orderedNodeSlugs.push(slug);
    else unresolvedNodeSlugs.push(slug);
  }

  function includeGraphEdge(edge: PlanGraphEdge): void {
    const key = `${edge.from}->${edge.to}:${edge.relationship}`;
    if (seenGraphEdges.has(key)) return;
    seenGraphEdges.add(key);
    graphEdges.push(edge);
    includeNode(edge.from);
    includeNode(edge.to);
  }

  if (focus) {
    if (records.has(focus)) includeNode(focus);
    else warnings.push(`Plan not found: ${focus}`);
    for (const edge of collectReachableEdges(allEdges, focus, direction)) includeGraphEdge(edge);
  } else if (options.stage === 'all') {
    for (const slug of records.keys()) includeNode(slug);
    for (const edge of allEdges) includeGraphEdge(edge);
  } else {
    for (const rootSlug of rootSlugs(records, options.stage)) {
      includeNode(rootSlug);
      const includeDownstream = direction === 'downstream' || direction === 'both';
      const includeUpstream = direction === 'upstream' || direction === 'both';
      const directEdges = allEdges.filter((edge) => {
        const pair = dependencyPair(edge);
        return (includeDownstream && pair.dependent === rootSlug) || (includeUpstream && pair.dependency === rootSlug);
      });
      const reachableEdges = collectReachableEdges(allEdges, rootSlug, direction);
      for (const edge of [...directEdges, ...reachableEdges]) includeGraphEdge(edge);
    }
  }

  for (const edge of graphEdges) {
    if (!records.has(edge.from)) warnings.push(`Unresolved dependency: ${edge.to} references ${edge.from}`);
    if (!records.has(edge.to)) warnings.push(`Unresolved dependency: ${edge.from} references ${edge.to}`);
  }

  const knownSlugs = new Set(orderedNodeSlugs);
  warnings.push(...detectCycles(graphEdges, knownSlugs));
  const nodes = [
    ...orderedNodeSlugs.map((slug) => (records.get(slug) as PlanRecord).node),
    ...unresolvedNodeSlugs.map((slug) => ({ slug, stage: 'unresolved' as const, path: null, goal: '' })),
  ];

  return {
    schema: PLAN_GRAPH_SCHEMA,
    root,
    stage,
    direction,
    focus,
    nodes,
    edges: graphEdges,
    warnings: [...new Set(warnings)],
  };
}

function nodeBySlug(graph: PlanGraph): Map<string, PlanGraphNode> {
  return new Map(graph.nodes.map((node) => [node.slug, node]));
}

function edgeLabel(edge: PlanGraphEdge, nodes: Map<string, PlanGraphNode>): string {
  const target = nodes.get(edge.to);
  return `${edge.relationship} -> ${edge.to}${target ? ` [${target.stage}]` : ' [unresolved]'}`;
}

export function renderPlanGraphAscii(graph: PlanGraph): string {
  if (graph.nodes.length === 0) return 'No plans found\n';
  const nodes = nodeBySlug(graph);
  const outgoing = new Map<string, PlanGraphEdge[]>();
  for (const edge of graph.edges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge);
    outgoing.set(edge.from, list);
  }

  const lines = ['Plan dependency graph'];
  for (const node of graph.nodes) {
    const goal = node.goal ? ` ${node.goal}` : '';
    lines.push(`- ${node.slug} [${node.stage}]${goal}`);
    for (const edge of outgoing.get(node.slug) ?? []) {
      lines.push(`  - ${edgeLabel(edge, nodes)}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function mermaidId(slug: string): string {
  const encoded = Array.from(slug)
    .map((character) => (character.codePointAt(0) as number).toString(16).padStart(2, '0'))
    .join('_');
  return `p_${encoded}`;
}

function escapeMermaidLabel(value: string): string {
  return value.replace(/"/g, '&quot;').replace(/[<>]/g, '');
}

export function renderPlanGraphMermaid(graph: PlanGraph): string {
  if (graph.nodes.length === 0) return 'flowchart TD\n  empty["No plans found"]\n';
  const lines = ['flowchart TD'];
  const emitted = new Set<string>();
  for (const node of graph.nodes) {
    const id = mermaidId(node.slug);
    emitted.add(node.slug);
    lines.push(`  ${id}["${escapeMermaidLabel(`${node.slug} (${node.stage})`)}"]`);
  }
  for (const edge of graph.edges) {
    if (!emitted.has(edge.from)) {
      lines.push(`  ${mermaidId(edge.from)}["${escapeMermaidLabel(edge.from)}"]`);
      emitted.add(edge.from);
    }
    if (!emitted.has(edge.to)) {
      lines.push(`  ${mermaidId(edge.to)}["${escapeMermaidLabel(`${edge.to} (unresolved)`)}"]`);
      emitted.add(edge.to);
    }
    lines.push(`  ${mermaidId(edge.from)} -->|${edge.relationship}| ${mermaidId(edge.to)}`);
  }
  return `${lines.join('\n')}\n`;
}
