import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findScaffoldRoot } from './scaffold.js';

export const COCKPIT_EVENT_TYPES = [
  'nudge',
  'session_start',
  'status',
  'blocker',
  'question',
  'answer',
  'approval_request',
  'completion_report',
  'evidence_receipt',
  'pr_link',
  'release_link',
  'cancellation',
] as const;

export const COCKPIT_PLATFORMS = ['discord', 'slack'] as const;

export type CockpitEventType = (typeof COCKPIT_EVENT_TYPES)[number];
export type CockpitPlatform = (typeof COCKPIT_PLATFORMS)[number];

export interface CockpitTarget {
  name?: string;
  platform: CockpitPlatform;
  webhookUrl: string;
  events: CockpitEventType[];
}

export interface CockpitConfig {
  exists: boolean;
  path: string;
  root: string;
  targets: CockpitTarget[];
}

export interface CockpitPostOptions {
  event: CockpitEventType;
  message?: string;
  title?: string;
  taskId?: string;
  runId?: string;
  planSlug?: string;
  pr?: string;
  evidencePath?: string;
  dryRun?: boolean;
  testMode?: boolean;
  now?: Date;
}

export interface CockpitTargetSummary {
  name?: string;
  platform: CockpitPlatform;
  events: CockpitEventType[];
}

export interface CockpitDispatchResult {
  target: CockpitTargetSummary;
  status: 'sent' | 'dry_run' | 'skipped' | 'failed';
  maskedUrl: string;
  reason?: string;
  httpStatus?: number;
  responseSnippet?: string;
  payload?: unknown;
}

export interface CockpitDispatchSummary {
  configured: boolean;
  configPath: string;
  root: string;
  results: CockpitDispatchResult[];
}

interface EventEnvelope {
  schema: 'open-scaffold.cockpit_event.v1';
  event_id: string;
  created_at: string;
  event_type: CockpitEventType;
  visibility: 'private' | 'internal' | 'public' | 'stakeholder';
  source: { kind: 'manual'; name: 'osc cockpit' };
  refs: Record<string, string>;
  title: string;
  body: string;
  requires_response: boolean;
  redaction: 'public_safe' | 'internal_only' | 'private_sensitive';
  next_action: string;
}

export class CockpitUsageError extends Error {}
export class CockpitConfigError extends Error {}

export const NO_COCKPIT_TARGETS_MESSAGE = 'No cockpit targets configured. See .osc/cockpit.example.json';

const eventTitles: Record<CockpitEventType, string> = {
  nudge: 'Nudge',
  session_start: 'Session started',
  status: 'Status update',
  blocker: 'Blocker',
  question: 'Question',
  answer: 'Answer',
  approval_request: 'Approval requested',
  completion_report: 'Completion report',
  evidence_receipt: 'Evidence receipt',
  pr_link: 'Pull request ready',
  release_link: 'Release link',
  cancellation: 'Cancellation',
};

const nextActions: Record<CockpitEventType, string> = {
  nudge: 'none',
  session_start: 'none',
  status: 'none',
  blocker: 'unblock',
  question: 'answer_question',
  answer: 'none',
  approval_request: 'approve',
  completion_report: 'inspect_evidence',
  evidence_receipt: 'inspect_evidence',
  pr_link: 'review_pr',
  release_link: 'none',
  cancellation: 'none',
};

const discordColors: Record<CockpitEventType, number> = {
  nudge: 0x95a5a6,
  session_start: 0x3498db,
  status: 0x3498db,
  blocker: 0xe74c3c,
  question: 0xf1c40f,
  answer: 0x95a5a6,
  approval_request: 0xf1c40f,
  completion_report: 0x2ecc71,
  evidence_receipt: 0x2ecc71,
  pr_link: 0x3498db,
  release_link: 0x2ecc71,
  cancellation: 0x95a5a6,
};

const DISCORD_EMBED_TOTAL_LIMIT = 6000;
const DISCORD_TITLE_LIMIT = 256;
const DISCORD_DESCRIPTION_LIMIT = 4096;
const DISCORD_FOOTER_SOFT_LIMIT = 512;
const DISCORD_FIELD_VALUE_SOFT_LIMIT = 600;
const WEBHOOK_TIMEOUT_MS = 10_000;

function packageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..');
}

function packageVersion(): string {
  try {
    const parsed = JSON.parse(readFileSync(join(packageRoot(), 'package.json'), 'utf8')) as { version?: unknown };
    return typeof parsed.version === 'string' ? parsed.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

function resolveRoot(start = process.cwd()): string {
  return findScaffoldRoot(start) ?? resolve(start);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCockpitPlatform(value: unknown): value is CockpitPlatform {
  return typeof value === 'string' && (COCKPIT_PLATFORMS as readonly string[]).includes(value);
}

function isCockpitEventType(value: unknown): value is CockpitEventType {
  return typeof value === 'string' && (COCKPIT_EVENT_TYPES as readonly string[]).includes(value);
}

export function cockpitConfigPath(root: string): string {
  return join(root, '.osc', 'cockpit.json');
}

export function maskWebhookUrl(url: string): string {
  return `${url.slice(0, 20)}...`;
}

function validateTarget(raw: unknown, index: number): CockpitTarget {
  if (!isObject(raw)) throw new CockpitConfigError(`cockpit target ${index + 1} must be an object`);
  const platform = raw.platform;
  if (!isCockpitPlatform(platform)) {
    throw new CockpitConfigError(`cockpit target ${index + 1} has unsupported platform: ${String(platform)}. Expected discord or slack.`);
  }
  if (typeof raw.webhookUrl !== 'string' || raw.webhookUrl.trim() === '') {
    throw new CockpitConfigError(`cockpit target ${index + 1} must include webhookUrl`);
  }
  if (!Array.isArray(raw.events)) {
    throw new CockpitConfigError(`cockpit target ${index + 1} must include events as an array`);
  }
  const events = raw.events.map((event, eventIndex) => {
    if (!isCockpitEventType(event)) {
      throw new CockpitConfigError(`cockpit target ${index + 1} has unsupported event at events[${eventIndex}]: ${String(event)}`);
    }
    return event;
  });
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : undefined;
  return { name, platform, webhookUrl: raw.webhookUrl.trim(), events };
}

export function loadCockpitConfig(start = process.cwd()): CockpitConfig {
  const root = resolveRoot(start);
  const path = cockpitConfigPath(root);
  if (!existsSync(path)) return { exists: false, path, root, targets: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CockpitConfigError(`Failed to parse .osc/cockpit.json: ${message}`);
  }
  if (!isObject(parsed)) throw new CockpitConfigError('.osc/cockpit.json must contain a JSON object');
  if (!Array.isArray(parsed.targets)) throw new CockpitConfigError('.osc/cockpit.json must include a targets array');
  const targets = parsed.targets.map(validateTarget);
  return { exists: true, path, root, targets };
}

export function formatCockpitConfig(config: CockpitConfig): string {
  if (!config.exists || config.targets.length === 0) return `${NO_COCKPIT_TARGETS_MESSAGE}\n`;
  const lines = ['Cockpit targets:'];
  for (const target of config.targets) {
    const label = target.name ? `${target.platform} (${target.name})` : target.platform;
    lines.push(`- ${label} ${maskWebhookUrl(target.webhookUrl)} events: ${target.events.join(', ') || '(none)'}`);
  }
  return `${lines.join('\n')}\n`;
}

function refsFromOptions(options: CockpitPostOptions): Record<string, string> {
  const refs: Record<string, string> = {};
  if (options.taskId) refs.task_id = options.taskId;
  if (options.runId) refs.run_id = options.runId;
  if (options.planSlug) refs.plan_slug = options.planSlug;
  if (options.pr) refs.pr = options.pr;
  if (options.evidencePath) refs.evidence_path = options.evidencePath;
  return refs;
}

function defaultBody(options: CockpitPostOptions): string {
  if (options.testMode) return 'Open Scaffold cockpit test message.';
  if (options.message?.trim()) return options.message.trim();
  if (options.event === 'completion_report') return 'Open Scaffold completion report.';
  if (options.event === 'evidence_receipt') return 'Open Scaffold evidence receipt.';
  if (options.event === 'pr_link') return 'Open Scaffold pull request link.';
  if (options.event === 'approval_request') return 'Open Scaffold approval requested.';
  if (options.event === 'blocker') return 'Open Scaffold blocker.';
  return `Open Scaffold ${options.event.replace(/_/g, ' ')} event.`;
}

function eventIdFrom(date: Date, event: CockpitEventType): string {
  const stamp = date.toISOString().replace(/[-:.]/g, '').slice(0, 15);
  return `evt_${stamp}_${event}`;
}

export function buildCockpitEnvelope(options: CockpitPostOptions, root = resolveRoot()): EventEnvelope {
  const createdAt = options.now ?? new Date();
  const requiresResponse = options.event === 'question' || options.event === 'approval_request';
  return {
    schema: 'open-scaffold.cockpit_event.v1',
    event_id: eventIdFrom(createdAt, options.event),
    created_at: createdAt.toISOString(),
    event_type: options.event,
    visibility: 'internal',
    source: { kind: 'manual', name: 'osc cockpit' },
    refs: refsFromOptions(options),
    title: options.title?.trim() || eventTitles[options.event],
    body: defaultBody(options),
    requires_response: requiresResponse,
    redaction: 'internal_only',
    next_action: nextActions[options.event],
  };
}

function refsToDiscordFields(refs: Record<string, string>): Array<{ name: string; value: string; inline: boolean }> {
  return Object.entries(refs).map(([name, value]) => ({
    name: truncate(name, DISCORD_TITLE_LIMIT),
    value: truncate(value, DISCORD_FIELD_VALUE_SOFT_LIMIT),
    inline: true,
  }));
}

function refsToSlackFields(refs: Record<string, string>): Array<{ type: 'mrkdwn'; text: string }> {
  return Object.entries(refs).map(([name, value]) => ({ type: 'mrkdwn', text: `*${name}*\n\`${truncate(value, 1900)}\`` }));
}

function footerText(root: string): string {
  return `osc cockpit v${packageVersion()} • repo: ${root}`;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`;
}

function discordFieldsLength(fields: Array<{ name: string; value: string }>): number {
  return fields.reduce((total, field) => total + field.name.length + field.value.length, 0);
}

function fitDiscordDescription(body: string, title: string, fields: Array<{ name: string; value: string }>, footer: string): string {
  const used = title.length + footer.length + discordFieldsLength(fields);
  const availableForDescription = Math.max(0, DISCORD_EMBED_TOTAL_LIMIT - used);
  return truncate(body, Math.min(DISCORD_DESCRIPTION_LIMIT, availableForDescription));
}

export function buildDiscordPayload(options: CockpitPostOptions, root = resolveRoot()): Record<string, unknown> {
  const envelope = buildCockpitEnvelope(options, root);
  const title = truncate(envelope.title, DISCORD_TITLE_LIMIT);
  const fields = refsToDiscordFields(envelope.refs);
  const footer = truncate(footerText(root), DISCORD_FOOTER_SOFT_LIMIT);
  const description = fitDiscordDescription(envelope.body, title, fields, footer);
  return {
    username: 'Open Scaffold',
    embeds: [
      {
        title,
        description,
        color: discordColors[envelope.event_type],
        fields,
        footer: { text: footer },
        timestamp: envelope.created_at,
      },
    ],
  };
}

export function buildSlackPayload(options: CockpitPostOptions, root = resolveRoot()): Record<string, unknown> {
  const envelope = buildCockpitEnvelope(options, root);
  const body = truncate(envelope.body, 3000);
  const fields = refsToSlackFields(envelope.refs);
  const blocks: unknown[] = [
    { type: 'header', text: { type: 'plain_text', text: truncate(envelope.title, 150), emoji: true } },
    { type: 'section', text: { type: 'mrkdwn', text: body } },
  ];
  if (fields.length > 0) blocks.push({ type: 'section', fields });
  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: footerText(root) }] });
  return { text: truncate(`${envelope.title}: ${body}`, 3000), blocks };
}

export function buildCockpitPayload(platform: CockpitPlatform, options: CockpitPostOptions, root = resolveRoot()): Record<string, unknown> {
  if (platform === 'discord') return buildDiscordPayload(options, root);
  return buildSlackPayload(options, root);
}

function targetAcceptsEvent(target: CockpitTarget, event: CockpitEventType): boolean {
  return target.events.includes(event);
}

function summarizeTarget(target: CockpitTarget): CockpitTargetSummary {
  return { name: target.name, platform: target.platform, events: target.events };
}

async function sendWebhook(target: CockpitTarget, payload: unknown): Promise<{ ok: true } | { ok: false; httpStatus?: number; responseSnippet: string }> {
  try {
    const response = await fetch(target.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (response.ok) return { ok: true };
    const body = await response.text().catch(() => '');
    return { ok: false, httpStatus: response.status, responseSnippet: truncate(body, 300) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, responseSnippet: truncate(message, 300) };
  }
}

export async function postCockpitEvent(options: CockpitPostOptions, start = process.cwd()): Promise<CockpitDispatchSummary> {
  const config = loadCockpitConfig(start);
  if (!config.exists || config.targets.length === 0) {
    return { configured: false, configPath: config.path, root: config.root, results: [] };
  }

  const results: CockpitDispatchResult[] = [];
  for (const target of config.targets) {
    const targetSummary = summarizeTarget(target);
    const maskedUrl = maskWebhookUrl(target.webhookUrl);
    const shouldSend = options.testMode || targetAcceptsEvent(target, options.event);
    const payload = buildCockpitPayload(target.platform, options, config.root);
    if (!shouldSend) {
      results.push({ target: targetSummary, status: 'skipped', maskedUrl, reason: `event ${options.event} not enabled for target`, payload });
      continue;
    }
    if (options.dryRun) {
      results.push({ target: targetSummary, status: 'dry_run', maskedUrl, payload });
      continue;
    }
    const sent = await sendWebhook(target, payload);
    if (sent.ok) {
      results.push({ target: targetSummary, status: 'sent', maskedUrl });
    } else {
      results.push({
        target: targetSummary,
        status: 'failed',
        maskedUrl,
        httpStatus: sent.httpStatus,
        responseSnippet: sent.responseSnippet,
      });
    }
  }
  return { configured: true, configPath: config.path, root: config.root, results };
}

function targetLabel(target: CockpitTargetSummary): string {
  return target.name ? `${target.platform} (${target.name})` : target.platform;
}

export function formatCockpitDispatchSummary(summary: CockpitDispatchSummary): string {
  if (!summary.configured) return `${NO_COCKPIT_TARGETS_MESSAGE}\n`;
  const lines: string[] = [];
  for (const result of summary.results) {
    const label = targetLabel(result.target);
    if (result.status === 'sent') {
      lines.push(`sent ${label} ${result.maskedUrl}`);
    } else if (result.status === 'skipped') {
      lines.push(`skipped ${label} ${result.maskedUrl}: ${result.reason}`);
    } else if (result.status === 'failed') {
      const status = result.httpStatus ? `HTTP ${result.httpStatus}` : 'request failed';
      const snippet = result.responseSnippet ? `: ${result.responseSnippet}` : '';
      lines.push(`failed ${label} ${status}${snippet}`);
    } else {
      lines.push(`dry-run ${label} ${result.maskedUrl}`);
      lines.push(JSON.stringify(result.payload, null, 2));
    }
  }
  return `${lines.join('\n')}\n`;
}

export function hasCockpitDispatchFailures(summary: CockpitDispatchSummary): boolean {
  return summary.results.some((result) => result.status === 'failed');
}
