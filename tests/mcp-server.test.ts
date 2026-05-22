import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { callMcpTool, listMcpTools, McpJsonRpcError } from '../src/mcp-tools.js';
import { listMcpResources, readMcpResource } from '../src/mcp-resources.js';
import { handleMcpJsonRpcLine } from '../src/mcp-server.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');
const mcpCli = join(repoRoot, 'src/mcp-cli.ts');

function scaffoldFixture() {
  const root = mkdtempSync(join(tmpdir(), 'osc-mcp-'));
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/backlog'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/blocked'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/done'), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, '.osc/RULES.md'), '# Rules\n\n- Mission first.\n');
  writeFileSync(join(root, 'ROADMAP.md'), '# Roadmap\n\n- Build MCP visibility.\n');
  writeFileSync(join(root, 'MISSION.md'), [
    '# Mission',
    '',
    'Expose repo truth to tools.',
    '',
    '## Goals',
    '',
    '- Make plan state queryable.',
    '- Keep data local.',
    '',
    '## Non-Goals',
    '',
    '- Do not spawn agents.',
    '',
    '## Changelog',
    '',
    '<!-- append YYYY-MM-DD entries below this line -->',
    '- 2026-05-22: created fixture mission',
    '',
  ].join('\n'));
  writeFileSync(join(root, '.osc/plans/active/001-sample.md'), samplePlan('001-sample', 'active', 'Ship MCP sample support.'));
  writeFileSync(join(root, '.osc/plans/active/001-sample-amendment-1.md'), '# Amendment 1: 001-sample\n\n## Parent\n\n001-sample\n');
  writeFileSync(join(root, '.osc/plans/backlog/002-next.md'), samplePlan('002-next', 'backlog', 'Backlog follow-up.'));
  writeFileSync(join(root, '.osc/releases/2026-05-22-001-sample.md'), '# Evidence: 001-sample\n\nVerified sample behavior.\n');
  return root;
}

function samplePlan(slug: string, status: string, goal: string) {
  return [
    `# Plan: ${slug}`,
    '',
    '## Status',
    '',
    status,
    '',
    '## Context',
    '',
    `Context for ${slug}.`,
    '',
    '## Goal',
    '',
    goal,
    '',
    '## Constraints / Out of scope',
    '',
    '- Do not execute runtimes.',
    '',
    '## Files to touch',
    '',
    '- `src/mcp-server.ts` — expose MCP surface.',
    '',
    '## Acceptance criteria',
    '',
    '- [ ] Agent can read the plan.',
    '- [ ] Missing plans return structured errors.',
    '',
    '## Verification steps',
    '',
    '1. Run `npm test`.',
    '',
    '## Open questions',
    '',
    '- None.',
    '',
  ].join('\n');
}

describe('Open Scaffold MCP tool handlers', () => {
  it('lists core tools and returns structured local scaffold state', () => {
    const root = scaffoldFixture();
    const toolNames = listMcpTools().map((tool) => tool.name);

    expect(toolNames).toEqual(expect.arrayContaining([
      'list_plans',
      'get_plan',
      'get_mission',
      'list_evidence',
      'get_evidence',
      'get_status',
      'search_plans',
      'list_amendments',
      'create_plan',
      'amend_plan',
      'close_plan',
      'create_evidence',
    ]));

    const plans = callMcpTool('list_plans', { stage: 'active' }, { root, allowWrite: false });
    expect(plans).toMatchObject({ plans: [{ slug: '001-sample', stage: 'active' }] });

    const plan = callMcpTool('get_plan', { slug: '001-sample' }, { root, allowWrite: false });
    expect(plan).toMatchObject({
      slug: '001-sample',
      stage: 'active',
      status: 'active',
      goal: 'Ship MCP sample support.',
      sections: { Goal: 'Ship MCP sample support.' },
    });
    expect(String((plan as { raw_markdown: string }).raw_markdown)).toContain('# Plan: 001-sample');

    const mission = callMcpTool('get_mission', {}, { root, allowWrite: false });
    expect(mission).toMatchObject({ defined: true, goals: ['Make plan state queryable.', 'Keep data local.'] });

    const evidence = callMcpTool('list_evidence', { slug: '001-sample' }, { root, allowWrite: false });
    expect(evidence).toMatchObject({ evidence: [{ slug: '001-sample', file: '2026-05-22-001-sample.md' }] });

    const search = callMcpTool('search_plans', { query: 'sample support' }, { root, allowWrite: false });
    expect(search).toMatchObject({ results: [{ slug: '001-sample', stage: 'active' }] });

    const amendments = callMcpTool('list_amendments', { slug: '001-sample' }, { root, allowWrite: false });
    expect(amendments).toMatchObject({ amendments: [{ file: '001-sample-amendment-1.md' }] });

    const status = callMcpTool('get_status', {}, { root, allowWrite: false });
    expect(status).toMatchObject({ mission: { defined: true }, plan_counts: { active: 1, backlog: 1, blocked: 0, done: 0 } });
  });

  it('enforces read-only mode for write tools with the MCP JSON-RPC application error code', () => {
    const root = scaffoldFixture();

    try {
      callMcpTool('create_plan', { slug: '003-write', stage: 'backlog' }, { root, allowWrite: false });
      throw new Error('expected read-only gate to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(McpJsonRpcError);
      expect((error as McpJsonRpcError).code).toBe(-32000);
      expect((error as Error).message).toBe('Write operations require --allow-write flag');
    }
  });

  it('lists and resolves osc:// resources without network access', () => {
    const root = scaffoldFixture();
    const resources = listMcpResources(root).map((resource) => resource.uri);

    expect(resources).toEqual(expect.arrayContaining([
      'osc://plans/active',
      'osc://plans/backlog',
      'osc://plans/done',
      'osc://plans/blocked',
      'osc://releases/latest',
      'osc://mission/goals',
      'osc://mission/changelog',
      'osc://rules',
      'osc://roadmap',
    ]));

    const activePlans = readMcpResource('osc://plans/active', { root });
    expect(JSON.parse(activePlans.text)).toMatchObject({ plans: [{ slug: '001-sample' }] });

    const latestEvidence = readMcpResource('osc://releases/latest', { root });
    expect(latestEvidence.text).toContain('Verified sample behavior.');

    const rules = readMcpResource('osc://rules', { root });
    expect(rules.text).toContain('Mission first');
  });
});

describe('Open Scaffold MCP JSON-RPC server', () => {
  it('handles initialize, tools/list, tools/call, resources/list, and malformed JSON', () => {
    const root = scaffoldFixture();
    const context = { root, allowWrite: false };

    const initialized = handleMcpJsonRpcLine('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}', context);
    expect(initialized).toMatchObject({ jsonrpc: '2.0', id: 1, result: { serverInfo: { name: 'open-scaffold-mcp' } } });

    const tools = handleMcpJsonRpcLine('{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}', context);
    expect((tools as { result: { tools: Array<{ name: string }> } }).result.tools.map((tool) => tool.name)).toContain('get_plan');

    const writeDenied = handleMcpJsonRpcLine('{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_plan","arguments":{"slug":"003-write","stage":"backlog"}}}', context);
    expect(writeDenied).toMatchObject({ jsonrpc: '2.0', id: 3, error: { code: -32000, message: 'Write operations require --allow-write flag' } });

    const resources = handleMcpJsonRpcLine('{"jsonrpc":"2.0","id":4,"method":"resources/list","params":{}}', context);
    expect((resources as { result: { resources: Array<{ uri: string }> } }).result.resources.map((resource) => resource.uri)).toContain('osc://roadmap');

    const malformed = handleMcpJsonRpcLine('{not json', context);
    expect(malformed).toMatchObject({ jsonrpc: '2.0', id: null, error: { code: -32700 } });
  });

  it('wires osc mcp serve --validate and osc-mcp --validate to local scaffold status output', () => {
    const root = scaffoldFixture();

    const validate = spawnSync(tsx, [cli, 'mcp', 'serve', '--validate'], { cwd: root, encoding: 'utf8' });
    expect(validate.status).toBe(0);
    expect(JSON.parse(validate.stdout)).toMatchObject({ plan_counts: { active: 1, backlog: 1 }, mission: { defined: true } });

    const aliasValidate = spawnSync(tsx, [mcpCli, '--validate'], { cwd: root, encoding: 'utf8' });
    expect(aliasValidate.status).toBe(0);
    expect(JSON.parse(aliasValidate.stdout)).toMatchObject({ plan_counts: { active: 1, backlog: 1 }, mission: { defined: true } });
  }, 20_000);

  it('responds over stdio with JSON-RPC envelopes', () => {
    const root = scaffoldFixture();
    const input = [
      '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}',
      '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}',
      '',
    ].join('\n');

    const run = execFileSync(tsx, [cli, 'mcp', 'serve'], { cwd: root, input, encoding: 'utf8' });
    const lines = run.trim().split(/\r?\n/).map((line) => JSON.parse(line));

    expect(lines[0]).toMatchObject({ id: 1, result: { serverInfo: { name: 'open-scaffold-mcp' } } });
    expect(lines[1].result.tools.map((tool: { name: string }) => tool.name)).toContain('list_plans');
  }, 20_000);
});
