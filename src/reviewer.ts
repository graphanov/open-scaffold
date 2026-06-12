import type { EvolutionJudgeRuling } from './evolution.js';

// 167 AC6: external reviewer profile. Any OpenAI-compatible chat endpoint
// (Ollama/MLX local, DeepSeek, Qwen, hosted gateways) can judge a recorded
// loop analysis and return a ruling for the gate. The judge reads the record
// and rules on it; it cannot modify the record, run code, or approve release.
// The call happens only when the operator names an endpoint explicitly.

export interface ReviewerProfile {
  /** Base URL of an OpenAI-compatible API, e.g. http://localhost:11434/v1 */
  endpoint: string;
  model: string;
  /** Name of the environment variable holding the bearer token — never the token itself. */
  apiKeyEnv?: string;
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface JudgeRulingRequestResult {
  ruling: EvolutionJudgeRuling;
  /** Raw model text, kept for the record. */
  raw: string;
  usage: { promptTokens: number | null; completionTokens: number | null; totalTokens: number | null };
  endpoint: string;
  model: string;
}

const JUDGE_RULING_ACTIONS = ['continue', 'stop_impossible', 'stop_blocked'] as const;

export const DEFAULT_JUDGE_TIMEOUT_MS = 300_000;

export function normalizeReviewerEndpoint(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Reviewer endpoint must be a valid URL: ${value}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Reviewer endpoint must use http or https: ${value}`);
  }
  return trimmed;
}

export function buildJudgeMessages(analysisMarkdown: string): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    {
      role: 'system',
      content: [
        'You are an independent reviewer for recorded AI-assisted work. You receive the analysis of an evolution loop: acceptance criteria with observed pass/fail history, plateau state, and the recorded next-action packet.',
        'Decide whether the next retry should proceed. You rule on the record only: you cannot run code, modify files, or approve release.',
        'Respond with a single JSON object and nothing else:',
        '{"action": "continue" | "stop_impossible" | "stop_blocked", "impossible_acs": [criterion ids, only with stop_impossible], "rationale": "one to three sentences citing observed facts"}',
        'Rules: choose stop_impossible only when a criterion cannot pass against the recorded artifacts no matter how the retry is attempted; choose stop_blocked when retrying cannot help until an external blocker is cleared; otherwise choose continue.',
      ].join('\n'),
    },
    { role: 'user', content: `Rule on this recorded loop analysis:\n\n${analysisMarkdown}` },
  ];
}

export function parseJudgeRuling(text: string): EvolutionJudgeRuling {
  const withoutFences = text.replace(/```(?:json)?/gi, '');
  const candidates: string[] = [];
  const greedy = withoutFences.match(/\{[\s\S]*\}/);
  if (greedy) candidates.push(greedy[0]);
  const lazy = withoutFences.match(/\{[\s\S]*?\}/);
  if (lazy && lazy[0] !== greedy?.[0]) candidates.push(lazy[0]);
  let parsed: unknown;
  for (const candidate of candidates) {
    try {
      parsed = JSON.parse(candidate);
      break;
    } catch {
      parsed = undefined;
    }
  }
  if (parsed === undefined) throw new Error('Judge response contained no parseable JSON object.');
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Judge ruling must be a JSON object.');
  }
  const record = parsed as Record<string, unknown>;
  const action = record.action;
  if (typeof action !== 'string' || !(JUDGE_RULING_ACTIONS as readonly string[]).includes(action)) {
    throw new Error(`Judge ruling action must be one of ${JUDGE_RULING_ACTIONS.join(', ')}; got: ${String(action)}`);
  }
  const impossibleRaw = record.impossible_acs ?? record.impossibleAcs ?? [];
  if (!Array.isArray(impossibleRaw) || impossibleRaw.some((entry) => typeof entry !== 'string')) {
    throw new Error('Judge ruling impossible_acs must be an array of strings.');
  }
  const impossibleAcs = (impossibleRaw as string[]).map((entry) => entry.trim()).filter(Boolean);
  const rationale = typeof record.rationale === 'string' && record.rationale.trim() ? record.rationale.trim() : undefined;
  return { action: action as EvolutionJudgeRuling['action'], impossibleAcs, rationale };
}

interface ChatCompletionPayload {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export async function requestJudgeRuling(
  profile: ReviewerProfile,
  analysisMarkdown: string,
  fetchImpl: typeof fetch = fetch,
): Promise<JudgeRulingRequestResult> {
  const endpoint = normalizeReviewerEndpoint(profile.endpoint);
  const model = profile.model.trim();
  if (!model) throw new Error('Reviewer profile requires a model name.');
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (profile.apiKeyEnv) {
    const key = process.env[profile.apiKeyEnv];
    if (!key) {
      throw new Error(`Environment variable ${profile.apiKeyEnv} is not set; the reviewer profile names the variable, never the key itself.`);
    }
    headers.authorization = `Bearer ${key}`;
  }
  const body: Record<string, unknown> = {
    model,
    messages: buildJudgeMessages(analysisMarkdown),
    temperature: profile.temperature ?? 0,
    stream: false,
  };
  if (profile.maxTokens) body.max_tokens = profile.maxTokens;
  const response = await fetchImpl(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(profile.timeoutMs ?? DEFAULT_JUDGE_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    throw new Error(`Judge endpoint returned ${response.status}: ${detail}`);
  }
  const payload = (await response.json()) as ChatCompletionPayload;
  const raw = payload.choices?.[0]?.message?.content ?? '';
  if (!raw.trim()) throw new Error('Judge endpoint returned an empty completion.');
  const ruling = parseJudgeRuling(raw);
  return {
    ruling,
    raw,
    usage: {
      promptTokens: payload.usage?.prompt_tokens ?? null,
      completionTokens: payload.usage?.completion_tokens ?? null,
      totalTokens: payload.usage?.total_tokens ?? null,
    },
    endpoint,
    model,
  };
}
