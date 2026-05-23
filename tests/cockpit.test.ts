import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  buildDiscordPayload,
  buildSlackPayload,
  formatCockpitConfig,
  hasCockpitDispatchFailures,
  loadCockpitConfig,
  maskWebhookUrl,
  postCockpitEvent,
} from '../src/cockpit.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');
const roots: string[] = [];

function tempScaffold(prefix = 'osc-cockpit-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/backlog'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/blocked'), { recursive: true });
  mkdirSync(join(root, '.osc/plans/done'), { recursive: true });
  mkdirSync(join(root, '.osc/releases'), { recursive: true });
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n\nTest cockpit project.\n');
  writeFileSync(join(root, '.osc/releases/README.md'), '# Releases\n');
  return root;
}

function writeConfig(root: string, webhookUrl = 'https://discord.com/api/webhooks/1234567890/test') {
  writeFileSync(join(root, '.osc/cockpit.json'), JSON.stringify({
    targets: [
      { name: 'build-stream', platform: 'discord', webhookUrl, events: ['status', 'completion_report', 'evidence_receipt'] },
      { name: 'review-room', platform: 'slack', webhookUrl: 'https://hooks.slack.com/services/T000/B000/secret', events: ['blocker', 'approval_request'] },
    ],
  }, null, 2));
}

function runOsc(root: string, args: string[]) {
  return spawnSync(tsx, [cli, ...args], { cwd: root, encoding: 'utf8' });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('osc cockpit webhooks', () => {
  it('prints a graceful missing-config message with exit 0', () => {
    const root = tempScaffold();

    const config = runOsc(root, ['cockpit', 'config']);
    const test = runOsc(root, ['cockpit', 'test']);

    expect(config.status).toBe(0);
    expect(config.stdout).toContain('No cockpit targets configured. See .osc/cockpit.example.json');
    expect(test.status).toBe(0);
    expect(test.stdout).toContain('No cockpit targets configured. See .osc/cockpit.example.json');
  }, 20_000);

  it('loads config and masks webhook URLs in config output', () => {
    const root = tempScaffold();
    writeConfig(root);

    const config = loadCockpitConfig(root);
    const rendered = formatCockpitConfig(config);
    const cliConfig = runOsc(root, ['cockpit', 'config']);

    expect(config.targets).toHaveLength(2);
    expect(maskWebhookUrl(config.targets[0].webhookUrl)).toBe('https://discord.com/...');
    expect(rendered).toContain('discord (build-stream) https://discord.com/... events: status, completion_report, evidence_receipt');
    expect(cliConfig.status).toBe(0);
    expect(cliConfig.stdout).toContain('slack (review-room) https://hooks.slack.... events: blocker, approval_request');
    expect(cliConfig.stdout).not.toContain('/secret');
  }, 20_000);

  it('builds structured Discord embeds and Slack blocks with refs and footer', () => {
    const root = tempScaffold();
    const options = {
      event: 'completion_report' as const,
      runId: '20260518T120000Z-062',
      planSlug: '062-glass-cockpit-webhooks',
      taskId: 'issue:62',
      pr: 'https://github.com/graphanov/open-scaffold/pull/100',
      now: new Date('2026-05-23T18:00:00.000Z'),
    };

    const discord = buildDiscordPayload(options, root) as { embeds: Array<Record<string, unknown>> };
    const slack = buildSlackPayload(options, root) as { blocks: Array<Record<string, unknown>> };

    expect(discord.embeds[0].title).toBe('Completion report');
    expect(discord.embeds[0].color).toBe(0x2ecc71);
    expect(discord.embeds[0].fields).toContainEqual({ name: 'run_id', value: '20260518T120000Z-062', inline: true });
    expect(discord.embeds[0].footer).toEqual({ text: expect.stringContaining(`repo: ${root}`) });
    expect(slack.blocks[0]).toMatchObject({ type: 'header', text: { type: 'plain_text', text: 'Completion report', emoji: true } });
    expect(JSON.stringify(slack.blocks)).toContain('*plan_slug*');
    expect(JSON.stringify(slack.blocks)).toContain(`repo: ${root}`);
  });

  it('truncates Slack section text to the Block Kit limit', () => {
    const root = tempScaffold();
    const longBody = 'x'.repeat(3_500);

    const slack = buildSlackPayload({ event: 'status', message: longBody }, root) as { blocks: Array<{ type: string; text?: { text: string } }>; text: string };
    const section = slack.blocks.find((block) => block.type === 'section' && block.text);

    expect(section?.text?.text).toHaveLength(3_000);
    expect(section?.text?.text.endsWith('…')).toBe(true);
    expect(slack.text.length).toBeLessThanOrEqual(3_000);
  });

  it('truncates Discord embed title and description to Discord limits', () => {
    const root = tempScaffold();
    const longTitle = 't'.repeat(500);
    const longBody = 'd'.repeat(5_000);

    const discord = buildDiscordPayload({ event: 'status', title: longTitle, message: longBody }, root) as { embeds: Array<{ title: string; description: string; footer: { text: string } }> };

    expect(discord.embeds[0].title).toHaveLength(256);
    expect(discord.embeds[0].title.endsWith('…')).toBe(true);
    expect(discord.embeds[0].description).toHaveLength(4_096);
    expect(discord.embeds[0].description.endsWith('…')).toBe(true);
    expect(discord.embeds[0].footer.text.length).toBeLessThanOrEqual(2_048);
  });

  it('keeps Slack field text under the Block Kit field limit', () => {
    const root = tempScaffold();
    const longRef = `https://example.com/${'x'.repeat(3_000)}`;

    const slack = buildSlackPayload({ event: 'completion_report', pr: longRef, evidencePath: longRef }, root) as { blocks: Array<{ type: string; fields?: Array<{ text: string }> }> };
    const fields = slack.blocks.flatMap((block) => block.fields ?? []);

    expect(fields).toHaveLength(2);
    for (const field of fields) {
      expect(field.text.length).toBeLessThanOrEqual(2_000);
      expect(field.text.endsWith('…`')).toBe(true);
    }
  });

  it('dry-runs exact payloads and skips targets whose events list does not include the event', () => {
    const root = tempScaffold();
    writeConfig(root);

    const status = runOsc(root, ['cockpit', 'post', '--event', 'status', '--message', 'Plan 062 in progress: implementing webhook dispatch', '--dry-run']);
    const blocker = runOsc(root, ['cockpit', 'post', '--event', 'blocker', '--message', 'Blocked: waiting for webhook URL approval', '--dry-run']);

    expect(status.status).toBe(0);
    expect(status.stdout).toContain('dry-run discord (build-stream) https://discord.com/...');
    expect(status.stdout).toContain('Plan 062 in progress: implementing webhook dispatch');
    expect(status.stdout).toContain('skipped slack (review-room) https://hooks.slack....: event status not enabled for target');

    expect(blocker.status).toBe(0);
    expect(blocker.stdout).toContain('skipped discord (build-stream) https://discord.com/...: event blocker not enabled for target');
    expect(blocker.stdout).toContain('dry-run slack (review-room) https://hooks.slack....');
    expect(blocker.stdout).toContain('Blocked: waiting for webhook URL approval');
  }, 20_000);

  it('test --dry-run sends the test message shape to every configured target regardless of event filter', () => {
    const root = tempScaffold();
    writeConfig(root);

    const result = runOsc(root, ['cockpit', 'test', '--dry-run']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('dry-run discord (build-stream) https://discord.com/...');
    expect(result.stdout).toContain('dry-run slack (review-room) https://hooks.slack....');
    expect(result.stdout).toContain('Open Scaffold cockpit test message.');
  }, 20_000);

  it('reports webhook HTTP failures without printing the full webhook URL', async () => {
    const root = tempScaffold();
    const server = await new Promise<Server>((resolveServer) => {
      const candidate = createServer((_, response) => {
        response.writeHead(503, { 'content-type': 'text/plain' });
        response.end('service unavailable for test target');
      });
      candidate.listen(0, '127.0.0.1', () => resolveServer(candidate));
    });
    const address = server.address();
    if (typeof address !== 'object' || address === null) throw new Error('missing test server address');
    const webhookUrl = `http://127.0.0.1:${address.port}/discord-webhook-secret-token`;
    writeConfig(root, webhookUrl);

    try {
      const summary = await postCockpitEvent({ event: 'status', message: 'Should fail cleanly' }, root);

      expect(hasCockpitDispatchFailures(summary)).toBe(true);
      expect(summary.results[0]).toMatchObject({ status: 'failed', httpStatus: 503, responseSnippet: 'service unavailable for test target' });
      expect(JSON.stringify(summary.results)).not.toContain('discord-webhook-secret-token');
    } finally {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    }
  });

  it('sends a real one-shot HTTP POST and reports success', async () => {
    const root = tempScaffold();
    let received = '';
    const server = await new Promise<Server>((resolveServer) => {
      const candidate = createServer((request, response) => {
        request.setEncoding('utf8');
        request.on('data', (chunk) => { received += chunk; });
        request.on('end', () => {
          response.writeHead(204);
          response.end();
        });
      });
      candidate.listen(0, '127.0.0.1', () => resolveServer(candidate));
    });
    const address = server.address();
    if (typeof address !== 'object' || address === null) throw new Error('missing test server address');
    const webhookUrl = `http://127.0.0.1:${address.port}/discord-webhook-test`;
    writeFileSync(join(root, '.osc/cockpit.json'), JSON.stringify({
      targets: [{ platform: 'discord', webhookUrl, events: ['status'] }],
    }, null, 2));

    try {
      const summary = await postCockpitEvent({ event: 'status', message: 'Successful local send' }, root);

      expect(summary.results).toHaveLength(1);
      expect(summary.results[0]).toMatchObject({ status: 'sent' });
      expect(received).toContain('Open Scaffold');
      expect(received).toContain('Successful local send');
    } finally {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    }
  });
});
