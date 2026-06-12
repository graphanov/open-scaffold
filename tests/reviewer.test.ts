import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import {
  buildJudgeMessages,
  DEFAULT_JUDGE_TIMEOUT_MS,
  normalizeReviewerEndpoint,
  parseJudgeRuling,
  requestJudgeRuling,
} from '../src/reviewer.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

describe('167 AC6 reviewer profile: OpenAI-compatible judge', () => {
  it('normalizes endpoints and rejects non-http schemes', () => {
    expect(normalizeReviewerEndpoint('http://localhost:11434/v1/')).toBe('http://localhost:11434/v1');
    expect(normalizeReviewerEndpoint('https://api.deepseek.com/v1')).toBe('https://api.deepseek.com/v1');
    expect(() => normalizeReviewerEndpoint('ftp://example.com/v1')).toThrow(/http or https/);
    expect(() => normalizeReviewerEndpoint('not a url')).toThrow(/valid URL/);
  });

  it('builds messages that demand a strict JSON ruling and state the read-only boundary', () => {
    const messages = buildJudgeMessages('## Analysis\n\nAC2 failing.');
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('"action": "continue" | "stop_impossible" | "stop_blocked"');
    expect(messages[0].content).toContain('you cannot run code, modify files, or approve release');
    expect(messages[1]).toMatchObject({ role: 'user' });
    expect(messages[1].content).toContain('AC2 failing.');
  });

  it('parses clean, fenced, prose-wrapped, and camelCase rulings; rejects malformed ones', () => {
    expect(parseJudgeRuling('{"action":"continue","impossible_acs":[],"rationale":"AC2 is reachable."}')).toEqual({
      action: 'continue',
      impossibleAcs: [],
      rationale: 'AC2 is reachable.',
    });
    expect(parseJudgeRuling('```json\n{"action":"stop_impossible","impossible_acs":["AC2"]}\n```').action).toBe('stop_impossible');
    expect(parseJudgeRuling('My ruling follows.\n{"action":"stop_blocked","rationale":"Blocked on owner gate."}\nDone.').action).toBe('stop_blocked');
    expect(parseJudgeRuling('{"action":"stop_impossible","impossibleAcs":[" AC3 ", ""]}').impossibleAcs).toEqual(['AC3']);
    expect(() => parseJudgeRuling('{"action":"approve_everything"}')).toThrow(/action must be one of/);
    expect(() => parseJudgeRuling('{"action":"continue","impossible_acs":[42]}')).toThrow(/array of strings/);
    expect(() => parseJudgeRuling('no json here at all')).toThrow(/no parseable JSON/);
  });

  it('posts to {endpoint}/chat/completions without auth by default and returns ruling plus token usage', async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const fetchImpl = (async (url: unknown, init?: RequestInit) => {
      captured = { url: String(url), init: init ?? {} };
      return jsonResponse({
        choices: [{ message: { content: '{"action":"continue","impossible_acs":[],"rationale":"Retry is justified."}' } }],
        usage: { prompt_tokens: 900, completion_tokens: 40, total_tokens: 940 },
      });
    }) as typeof fetch;

    const result = await requestJudgeRuling(
      { endpoint: 'http://localhost:11434/v1/', model: 'gemma4:31b' },
      '## Analysis',
      fetchImpl,
    );

    expect(captured!.url).toBe('http://localhost:11434/v1/chat/completions');
    expect(captured!.init.method).toBe('POST');
    const headers = captured!.init.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
    expect(headers.authorization).toBeUndefined();
    const body = JSON.parse(String(captured!.init.body)) as { model: string; temperature: number; stream: boolean; messages: unknown[] };
    expect(body).toMatchObject({ model: 'gemma4:31b', temperature: 0, stream: false });
    expect(body.messages).toHaveLength(2);
    expect(result.ruling).toMatchObject({ action: 'continue' });
    expect(result.usage).toEqual({ promptTokens: 900, completionTokens: 40, totalTokens: 940 });
    expect(DEFAULT_JUDGE_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('sends a bearer token only via a named environment variable and fails closed when unset', async () => {
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      expect(headers.authorization).toBe('Bearer test-secret');
      return jsonResponse({ choices: [{ message: { content: '{"action":"continue"}' } }] });
    }) as typeof fetch;

    process.env.OSC_TEST_JUDGE_KEY = 'test-secret';
    try {
      const result = await requestJudgeRuling(
        { endpoint: 'https://api.example.com/v1', model: 'qwen-judge', apiKeyEnv: 'OSC_TEST_JUDGE_KEY' },
        '## Analysis',
        fetchImpl,
      );
      expect(result.ruling.action).toBe('continue');
    } finally {
      delete process.env.OSC_TEST_JUDGE_KEY;
    }

    await expect(
      requestJudgeRuling(
        { endpoint: 'https://api.example.com/v1', model: 'qwen-judge', apiKeyEnv: 'OSC_TEST_JUDGE_KEY' },
        '## Analysis',
        fetchImpl,
      ),
    ).rejects.toThrow(/OSC_TEST_JUDGE_KEY is not set/);
  });

  it('surfaces endpoint failures and empty completions as errors', async () => {
    const failing = (async () => new Response('model not found', { status: 404 })) as typeof fetch;
    await expect(
      requestJudgeRuling({ endpoint: 'http://localhost:11434/v1', model: 'missing' }, '## Analysis', failing),
    ).rejects.toThrow(/returned 404: model not found/);

    const empty = (async () => jsonResponse({ choices: [{ message: { content: '   ' } }] })) as typeof fetch;
    await expect(
      requestJudgeRuling({ endpoint: 'http://localhost:11434/v1', model: 'gemma4:31b' }, '## Analysis', empty),
    ).rejects.toThrow(/empty completion/);
  });

  it('rejects conflicting or incomplete judge flags on the gate before any analysis runs', () => {
    const conflicting = spawnSync(tsx, [cli, 'gate', 'no-such-loop', '--judge-endpoint', 'http://localhost:1/v1', '--judge-model', 'm', '--judge-action', 'continue'], { encoding: 'utf8', cwd: repoRoot });
    expect(conflicting.status).toBe(2);
    expect(conflicting.stderr).toContain('not both');

    const incomplete = spawnSync(tsx, [cli, 'gate', 'no-such-loop', '--judge-endpoint', 'http://localhost:1/v1'], { encoding: 'utf8', cwd: repoRoot });
    expect(incomplete.status).toBe(2);
    expect(incomplete.stderr).toContain('must be provided together');
  });
});
