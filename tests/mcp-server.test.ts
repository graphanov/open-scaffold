import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { callMcpTool, isSafeEvidenceRelativePath, listMcpTools, McpJsonRpcError } from '../src/mcp-tools.js';
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

function framedMessage(payload: unknown): string {
  const json = JSON.stringify(payload);
  return `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
}

function parseFramedMessages(output: string): unknown[] {
  const messages: unknown[] = [];
  let remaining = output;
  while (remaining.trim()) {
    const headerEnd = remaining.indexOf('\r\n\r\n');
    expect(headerEnd).toBeGreaterThanOrEqual(0);
    const header = remaining.slice(0, headerEnd);
    const lengthMatch = /^Content-Length:\s*(\d+)$/im.exec(header);
    expect(lengthMatch).not.toBeNull();
    const length = Number(lengthMatch?.[1] ?? 0);
    const bodyStart = headerEnd + 4;
    const body = remaining.slice(bodyStart, bodyStart + length);
    messages.push(JSON.parse(body));
    remaining = remaining.slice(bodyStart + length);
  }
  return messages;
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

    const evidenceFile = callMcpTool('get_evidence', { path: '.osc/releases/2026-05-22-001-sample.md' }, { root, allowWrite: false });
    expect(evidenceFile).toMatchObject({ slug: '001-sample', file: '2026-05-22-001-sample.md' });
    expect(isSafeEvidenceRelativePath('2026-05-22-001-sample.md')).toBe(true);
    expect(isSafeEvidenceRelativePath('../secret.md')).toBe(false);
    expect(isSafeEvidenceRelativePath('..\\secret.md')).toBe(false);
    expect(isSafeEvidenceRelativePath('/tmp/secret.md')).toBe(false);
    expect(isSafeEvidenceRelativePath('D:\\secret.md')).toBe(false);
    expect(isSafeEvidenceRelativePath('\\\\server\\share\\secret.md')).toBe(false);

    const outside = join(root, '..', 'outside-secret.md');
    const symlinkedEvidence = join(root, '.osc/releases/2999-evil.md');
    const symlinkedSlugEvidence = join(root, '.osc/releases/2999-001-sample.md');
    const symlinkedPlan = join(root, '.osc/plans/done/999-evil.md');
    writeFileSync(outside, 'do not expose this file');
    let symlinkCreated = false;
    try {
      symlinkSync(outside, symlinkedEvidence);
      symlinkSync(outside, symlinkedSlugEvidence);
      symlinkSync(outside, symlinkedPlan);
      symlinkCreated = true;
    } catch {
      // Some platforms disable file symlink creation. The path-shape guard above still covers
      // cross-root strings; symlink-specific assertions run when the fixture can create one.
    }
    if (symlinkCreated) {
      expect(() => callMcpTool('get_evidence', { path: '.osc/releases/2999-evil.md' }, { root, allowWrite: false })).toThrow(McpJsonRpcError);
      expect(callMcpTool('list_evidence', { slug: 'evil' }, { root, allowWrite: false })).toMatchObject({ evidence: [] });
      expect(() => callMcpTool('get_evidence', { slug: 'evil' }, { root, allowWrite: false })).toThrow(McpJsonRpcError);
      const evidenceBySlug = callMcpTool('get_evidence', { slug: '001-sample' }, { root, allowWrite: false });
      expect((evidenceBySlug as { content: string }).content).toContain('Verified sample behavior.');
      expect((evidenceBySlug as { content: string }).content).not.toContain('do not expose this file');
      expect(() => callMcpTool('get_plan', { slug: '999-evil' }, { root, allowWrite: false })).toThrow(McpJsonRpcError);
      expect(callMcpTool('list_plans', { stage: 'done' }, { root, allowWrite: false })).toMatchObject({ plans: [] });
      expect(callMcpTool('search_plans', { query: 'do not expose' }, { root, allowWrite: false })).toMatchObject({ results: [] });
      const latestEvidence = readMcpResource('osc://releases/latest', { root });
      expect(latestEvidence.text).toContain('Verified sample behavior.');
      expect(latestEvidence.text).not.toContain('do not expose this file');
    }

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

  it('refuses symlinked fixed markdown resources', () => {
    const root = scaffoldFixture();
    const outside = join(root, '..', 'resource-secret.md');
    writeFileSync(outside, 'do not expose this resource');

    let symlinkCreated = false;
    try {
      rmSync(join(root, 'ROADMAP.md'));
      rmSync(join(root, '.osc/RULES.md'));
      rmSync(join(root, 'MISSION.md'));
      symlinkSync(outside, join(root, 'ROADMAP.md'));
      symlinkSync(outside, join(root, '.osc/RULES.md'));
      symlinkSync(outside, join(root, 'MISSION.md'));
      symlinkCreated = true;
    } catch {
      // Some platforms disable file symlink creation.
    }

    if (symlinkCreated) {
      expect(() => readMcpResource('osc://roadmap', { root })).toThrow(McpJsonRpcError);
      expect(() => readMcpResource('osc://rules', { root })).toThrow(McpJsonRpcError);
      const mission = callMcpTool('get_mission', {}, { root, allowWrite: false });
      expect(mission).toMatchObject({ defined: false, goals: [], changelog: [] });
      expect(JSON.stringify(mission)).not.toContain('do not expose this resource');
    }
  });

  it('refuses evidence reads through a symlinked releases directory', () => {
    const root = scaffoldFixture();
    const outsideReleases = join(root, '..', 'outside-releases');
    mkdirSync(outsideReleases, { recursive: true });
    writeFileSync(join(outsideReleases, '2999-evil.md'), 'do not expose this release');

    let symlinkCreated = false;
    try {
      rmSync(join(root, '.osc/releases'), { recursive: true, force: true });
      symlinkSync(outsideReleases, join(root, '.osc/releases'));
      symlinkCreated = true;
    } catch {
      // Some platforms disable directory symlink creation.
    }

    if (symlinkCreated) {
      expect(callMcpTool('list_evidence', { slug: 'evil' }, { root, allowWrite: false })).toMatchObject({ evidence: [] });
      expect(() => callMcpTool('get_evidence', { path: '.osc/releases/2999-evil.md' }, { root, allowWrite: false })).toThrow(McpJsonRpcError);
      expect(() => readMcpResource('osc://releases/latest', { root })).toThrow(McpJsonRpcError);
    }
  });
});

describe('Open Scaffold MCP JSON-RPC server', () => {
  it('handles initialize, tools/list, tools/call, resources/list, and malformed JSON', () => {
    const root = scaffoldFixture();
    const context = { root, allowWrite: false };

    const initialized = handleMcpJsonRpcLine('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}', context);
    expect(initialized).toMatchObject({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2024-11-05', serverInfo: { name: 'open-scaffold-mcp' } } });
    expect((initialized as { result: { serverInfo: { version: string } } }).result.serverInfo.version).toMatch(/^\d+\.\d+\.\d+/);

    const unsupportedProtocol = handleMcpJsonRpcLine('{"jsonrpc":"2.0","id":5,"method":"initialize","params":{"protocolVersion":"2099-01-01","capabilities":{}}}', context);
    expect(unsupportedProtocol).toMatchObject({ jsonrpc: '2.0', id: 5, result: { protocolVersion: '2024-11-05' } });

    const tools = handleMcpJsonRpcLine('{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}', context);
    expect((tools as { result: { tools: Array<{ name: string }> } }).result.tools.map((tool) => tool.name)).toContain('get_plan');

    const writeDenied = handleMcpJsonRpcLine('{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_plan","arguments":{"slug":"003-write","stage":"backlog"}}}', context);
    expect(writeDenied).toMatchObject({ jsonrpc: '2.0', id: 3, error: { code: -32000, message: 'Write operations require --allow-write flag' } });

    const resources = handleMcpJsonRpcLine('{"jsonrpc":"2.0","id":4,"method":"resources/list","params":{}}', context);
    expect((resources as { result: { resources: Array<{ uri: string }> } }).result.resources.map((resource) => resource.uri)).toContain('osc://roadmap');

    const malformed = handleMcpJsonRpcLine('{not json', context);
    expect(malformed).toMatchObject({ jsonrpc: '2.0', id: null, error: { code: -32700 } });

    const invalidId = handleMcpJsonRpcLine('{"jsonrpc":"2.0","id":{},"method":"tools/list","params":{}}', context);
    expect(invalidId).toMatchObject({ jsonrpc: '2.0', id: null, error: { code: -32600 } });

    const nullId = handleMcpJsonRpcLine('{"jsonrpc":"2.0","id":null,"method":"tools/list","params":{}}', context);
    expect(nullId).toMatchObject({ jsonrpc: '2.0', id: null, error: { code: -32600 } });
  });

  it('suppresses responses for notifications and handles JSON-RPC batches', () => {
    const root = scaffoldFixture();
    const context = { root, allowWrite: false };

    const notification = handleMcpJsonRpcLine('{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}', context);
    expect(notification).toBeNull();

    const batch = handleMcpJsonRpcLine('[{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}},{"jsonrpc":"2.0","method":"notifications/initialized","params":{}},{"jsonrpc":"2.0","id":2,"method":"resources/list","params":{}}]', context);

    expect(Array.isArray(batch)).toBe(true);
    expect(batch).toHaveLength(2);
    expect((batch as Array<{ id: number; result: unknown }>)[0].id).toBe(1);
    expect((batch as Array<{ id: number; result: unknown }>)[1].id).toBe(2);
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

  it('responds over stdio with MCP content-length frames', () => {
    const root = scaffoldFixture();
    const input = [
      framedMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {} } }),
      framedMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
    ].join('');

    const run = execFileSync(tsx, [cli, 'mcp', 'serve'], { cwd: root, input, encoding: 'utf8' });
    const messages = parseFramedMessages(run) as Array<{ id: number; result: { serverInfo?: { name: string }; tools?: Array<{ name: string }> } }>;

    expect(messages[0]).toMatchObject({ id: 1, result: { serverInfo: { name: 'open-scaffold-mcp' } } });
    expect(messages[1].result.tools?.map((tool) => tool.name)).toContain('list_plans');
  }, 20_000);
});
