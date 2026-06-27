import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { renderCaptureSetupText, runCaptureSetup } from '../src/capture-setup.js';

const repoRoot = resolve(import.meta.dirname, '..');
const claudeHook = resolve(repoRoot, 'examples/hooks/ambient-hook.mjs');
const codexHook = resolve(repoRoot, 'examples/hooks/codex-notify.mjs');

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'osc-capture-setup-'));
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('capture setup planning', () => {
  it('plans a Claude Code settings install without writing by default', () => {
    const dir = tempDir();
    const settings = join(dir, '.claude/settings.local.json');
    const [result] = runCaptureSetup('claude-code', { claudeSettingsPath: settings, claudeHookPath: claudeHook });

    expect(result.status).toBe('would-install');
    expect(result.changed).toBe(true);
    expect(result.command).toContain(claudeHook);
    expect(existsSync(settings)).toBe(false);
  });

  it('writes Claude Code settings idempotently and preserves unrelated settings/hooks', () => {
    const dir = tempDir();
    const settings = join(dir, '.claude/settings.local.json');
    mkdirSync(join(dir, '.claude'), { recursive: true });
    writeFileSync(settings, JSON.stringify({
      theme: 'dark',
      hooks: {
        PreToolUse: [{ hooks: [{ type: 'command', command: 'echo keep' }] }],
      },
    }, null, 2));

    const [first] = runCaptureSetup('claude-code', { write: true, claudeSettingsPath: settings, claudeHookPath: claudeHook });
    const afterFirst = read(settings);
    const [second] = runCaptureSetup('claude-code', { write: true, claudeSettingsPath: settings, claudeHookPath: claudeHook });

    expect(first.status).toBe('installed');
    expect(first.changed).toBe(true);
    expect(second.status).toBe('installed');
    expect(second.changed).toBe(false);
    expect(read(settings)).toBe(afterFirst);
    const parsed = JSON.parse(afterFirst);
    expect(parsed.theme).toBe('dark');
    expect(parsed.hooks.PreToolUse[0].hooks[0].command).toBe('echo keep');
    expect(parsed.hooks.SessionEnd[0].hooks[0].command).toContain(claudeHook);
  });

  it('writes default Claude Code settings with a gitignore guard', () => {
    const dir = tempDir();
    const settings = join(dir, '.claude/settings.local.json');
    const gitignore = join(dir, '.gitignore');

    const [first] = runCaptureSetup('claude-code', { write: true, repoRoot: dir, claudeHookPath: claudeHook });
    const [second] = runCaptureSetup('claude-code', { write: true, repoRoot: dir, claudeHookPath: claudeHook });

    expect(first.status).toBe('installed');
    expect(first.changed).toBe(true);
    expect(second.status).toBe('installed');
    expect(second.changed).toBe(false);
    expect(read(settings)).toContain('ambient-hook.mjs');
    expect(read(gitignore)).toBe('.claude/settings.local.json\n');
  });

  it('blocks malformed Claude Code settings and preserves the file', () => {
    const dir = tempDir();
    const settings = join(dir, '.claude/settings.local.json');
    mkdirSync(join(dir, '.claude'), { recursive: true });
    writeFileSync(settings, '{not json');

    const [result] = runCaptureSetup('claude-code', { write: true, claudeSettingsPath: settings, claudeHookPath: claudeHook });

    expect(result.status).toBe('blocked');
    expect(result.message).toContain('Could not parse');
    expect(read(settings)).toBe('{not json');
  });

  it('blocks incompatible Claude Code SessionEnd hook shapes and preserves the file', () => {
    const dir = tempDir();
    const settings = join(dir, '.claude/settings.local.json');
    mkdirSync(join(dir, '.claude'), { recursive: true });
    const original = JSON.stringify({ hooks: { SessionEnd: [{ hooks: ['bad-hook'] }] } }, null, 2);
    writeFileSync(settings, original);

    const [result] = runCaptureSetup('claude-code', { write: true, claudeSettingsPath: settings, claudeHookPath: claudeHook });

    expect(result.status).toBe('blocked');
    expect(result.message).toContain('command hooks must be objects');
    expect(read(settings)).toBe(original);
  });

  it('quotes Claude Code command paths with spaces and remains idempotent', () => {
    const dir = tempDir();
    const hookDir = join(dir, 'hook path');
    const hook = join(hookDir, 'ambient hook.mjs');
    const settings = join(dir, '.claude/settings.local.json');
    const nodePath = join(dir, 'node path', 'node');
    mkdirSync(hookDir, { recursive: true });
    writeFileSync(hook, '');

    const [first] = runCaptureSetup('claude-code', {
      write: true,
      claudeSettingsPath: settings,
      claudeHookPath: hook,
      nodePath,
    });
    const [second] = runCaptureSetup('claude-code', {
      write: true,
      claudeSettingsPath: settings,
      claudeHookPath: hook,
      nodePath,
    });

    expect(first.command).toBe(`'${nodePath}' '${hook}'`);
    expect(second.changed).toBe(false);
    expect(read(settings)).toContain(`'${nodePath}' '${hook}'`);
  });

  it('rejects a Claude Code settings symlink before reading or writing it', () => {
    const dir = tempDir();
    const settings = join(dir, '.claude/settings.local.json');
    const secret = join(dir, 'secret.json');
    mkdirSync(join(dir, '.claude'), { recursive: true });
    writeFileSync(secret, '{"private":"SENTINEL_SECRET"}');
    symlinkSync(secret, settings);

    const dryRun = runCaptureSetup('claude-code', { claudeSettingsPath: settings, claudeHookPath: claudeHook });
    const text = renderCaptureSetupText(dryRun, 'dry-run');
    const write = runCaptureSetup('claude-code', { write: true, claudeSettingsPath: settings, claudeHookPath: claudeHook });

    expect(dryRun[0].status).toBe('blocked');
    expect(write[0].status).toBe('blocked');
    expect(text).not.toContain('SENTINEL_SECRET');
    expect(JSON.stringify(dryRun)).not.toContain('SENTINEL_SECRET');
    expect(read(secret)).toBe('{"private":"SENTINEL_SECRET"}');
  });

  it('rejects a symlinked Claude Code settings directory before writing outside the repo', () => {
    const dir = tempDir();
    const external = tempDir();
    const settingsDir = join(dir, '.claude');
    const settings = join(settingsDir, 'settings.local.json');
    symlinkSync(external, settingsDir, 'dir');

    const [dryRun] = runCaptureSetup('claude-code', { claudeSettingsPath: settings, claudeHookPath: claudeHook });
    const [write] = runCaptureSetup('claude-code', { write: true, claudeSettingsPath: settings, claudeHookPath: claudeHook });

    expect(dryRun.status).toBe('blocked');
    expect(write.status).toBe('blocked');
    expect(write.message).toContain('parent directory must not be a symlink');
    expect(existsSync(join(external, 'settings.local.json'))).toBe(false);
  });

  it('rejects a symlinked ancestor even when the immediate settings directory exists', () => {
    const dir = tempDir();
    const external = tempDir();
    const link = join(dir, 'link');
    mkdirSync(join(external, 'sub'));
    symlinkSync(external, link, 'dir');
    const settings = join(link, 'sub', 'settings.local.json');

    const [result] = runCaptureSetup('claude-code', { write: true, claudeSettingsPath: settings, claudeHookPath: claudeHook });

    expect(result.status).toBe('blocked');
    expect(result.message).toContain('parent directory must not be a symlink');
    expect(existsSync(join(external, 'sub', 'settings.local.json'))).toBe(false);
  });

  it('plans a Codex notify install without writing by default', () => {
    const dir = tempDir();
    const config = join(dir, 'config.toml');
    const [result] = runCaptureSetup('codex', { codexConfigPath: config, codexHookPath: codexHook });

    expect(result.status).toBe('would-install');
    expect(result.stanza).toContain(codexHook);
    expect(existsSync(config)).toBe(false);
  });

  it('writes Codex notify idempotently while preserving comments and tables', () => {
    const dir = tempDir();
    const config = join(dir, 'config.toml');
    writeFileSync(config, '# keep comment\nmodel = "gpt-test"\n[profiles.foo]\nmodel = "other"\n');

    const [first] = runCaptureSetup('codex', { write: true, codexConfigPath: config, codexHookPath: codexHook });
    const afterFirst = read(config);
    const [second] = runCaptureSetup('codex', { write: true, codexConfigPath: config, codexHookPath: codexHook });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(read(config)).toBe(afterFirst);
    expect(afterFirst).toMatch(/^# keep comment\nmodel = "gpt-test"\nnotify = \[/);
    expect(afterFirst.indexOf('notify = [')).toBeLessThan(afterFirst.indexOf('[profiles.foo]'));
    expect(afterFirst).toContain('[profiles.foo]\nmodel = "other"');
  });

  it('does not treat table-local Codex notify as a top-level conflict', () => {
    const dir = tempDir();
    const config = join(dir, 'config.toml');
    writeFileSync(config, '[ profiles.foo ]\nnotify = ["custom"]\n');

    const [result] = runCaptureSetup('codex', { write: true, codexConfigPath: config, codexHookPath: codexHook });

    expect(result.status).toBe('installed');
    expect(result.changed).toBe(true);
    expect(read(config).startsWith('notify = [')).toBe(true);
    expect(read(config)).toContain('[ profiles.foo ]\nnotify = ["custom"]');
  });

  it('inserts Codex notify before the first real table while ignoring multiline string content', () => {
    const dir = tempDir();
    const config = join(dir, 'config.toml');
    writeFileSync(config, 'developer_instructions = """\nnotify = ["not-top-level"]\n[profiles.fake]\n"""\n[profiles.real]\nmodel = "x"\n');

    const [result] = runCaptureSetup('codex', { write: true, codexConfigPath: config, codexHookPath: codexHook });
    const after = read(config);
    const generatedNotify = after.indexOf('notify = [', after.indexOf('"""\n', after.indexOf('[profiles.fake]')));

    expect(result.status).toBe('installed');
    expect(result.changed).toBe(true);
    expect(after).toContain('developer_instructions = """\nnotify = ["not-top-level"]\n[profiles.fake]\n"""\n');
    expect(after.indexOf('notify = ["not-top-level"]')).toBeLessThan(generatedNotify);
    expect(generatedNotify).toBeLessThan(after.indexOf('[profiles.real]'));
  });

  it('blocks different single-line and multiline top-level Codex notify values', () => {
    const singleDir = tempDir();
    const singleConfig = join(singleDir, 'config.toml');
    writeFileSync(singleConfig, 'notify = ["custom"]\n[profiles.foo]\nmodel = "x"\n');
    const multiDir = tempDir();
    const multiConfig = join(multiDir, 'config.toml');
    writeFileSync(multiConfig, 'notify = [\n  "custom"\n]\n[profiles.foo]\nmodel = "x"\n');

    const [single] = runCaptureSetup('codex', { write: true, codexConfigPath: singleConfig, codexHookPath: codexHook });
    const [multi] = runCaptureSetup('codex', { write: true, codexConfigPath: multiConfig, codexHookPath: codexHook });

    expect(single.status).toBe('blocked');
    expect(multi.status).toBe('blocked');
    expect(read(singleConfig)).toBe('notify = ["custom"]\n[profiles.foo]\nmodel = "x"\n');
    expect(read(multiConfig)).toBe('notify = [\n  "custom"\n]\n[profiles.foo]\nmodel = "x"\n');
  });

  it('blocks quoted top-level Codex notify values', () => {
    const basicDir = tempDir();
    const basicConfig = join(basicDir, 'config.toml');
    const basic = '"notify" = ["custom"]\n[profiles.foo]\nmodel = "x"\n';
    const literalDir = tempDir();
    const literalConfig = join(literalDir, 'config.toml');
    const literal = "'notify' = [\"custom\"]\n[profiles.foo]\nmodel = \"x\"\n";
    writeFileSync(basicConfig, basic);
    writeFileSync(literalConfig, literal);

    const [basicResult] = runCaptureSetup('codex', { write: true, codexConfigPath: basicConfig, codexHookPath: codexHook });
    const [literalResult] = runCaptureSetup('codex', { write: true, codexConfigPath: literalConfig, codexHookPath: codexHook });

    expect(basicResult.status).toBe('blocked');
    expect(literalResult.status).toBe('blocked');
    expect(read(basicConfig)).toBe(basic);
    expect(read(literalConfig)).toBe(literal);
  });

  it('rejects a Codex config symlink before reading or writing it', () => {
    const dir = tempDir();
    const config = join(dir, 'config.toml');
    const secret = join(dir, 'secret.toml');
    writeFileSync(secret, 'token = "SENTINEL_SECRET"\n');
    symlinkSync(secret, config);

    const dryRun = runCaptureSetup('codex', { codexConfigPath: config, codexHookPath: codexHook });
    const text = renderCaptureSetupText(dryRun, 'dry-run');
    const write = runCaptureSetup('codex', { write: true, codexConfigPath: config, codexHookPath: codexHook });

    expect(dryRun[0].status).toBe('blocked');
    expect(write[0].status).toBe('blocked');
    expect(text).not.toContain('SENTINEL_SECRET');
    expect(JSON.stringify(dryRun)).not.toContain('SENTINEL_SECRET');
    expect(read(secret)).toBe('token = "SENTINEL_SECRET"\n');
  });

  it('does not leak unrelated existing config values in dry-run text or JSON', () => {
    const dir = tempDir();
    const settings = join(dir, '.claude/settings.local.json');
    const config = join(dir, 'config.toml');
    mkdirSync(join(dir, '.claude'), { recursive: true });
    writeFileSync(settings, JSON.stringify({ privateValue: 'SENTINEL_SECRET' }));
    writeFileSync(config, 'model = "SENTINEL_SECRET"\n');

    const claude = runCaptureSetup('claude-code', { claudeSettingsPath: settings, claudeHookPath: claudeHook });
    const codex = runCaptureSetup('codex', { codexConfigPath: config, codexHookPath: codexHook });

    expect(renderCaptureSetupText(claude, 'dry-run')).not.toContain('SENTINEL_SECRET');
    expect(renderCaptureSetupText(codex, 'dry-run')).not.toContain('SENTINEL_SECRET');
    expect(JSON.stringify(claude)).not.toContain('SENTINEL_SECRET');
    expect(JSON.stringify(codex)).not.toContain('SENTINEL_SECRET');
  });

  it('blocks setup all writes without partial changes when any target is blocked', () => {
    const dir = tempDir();
    const settings = join(dir, '.claude/settings.local.json');
    const config = join(dir, 'config.toml');
    writeFileSync(config, 'notify = ["custom"]\n');

    const results = runCaptureSetup('all', {
      write: true,
      claudeSettingsPath: settings,
      codexConfigPath: config,
      claudeHookPath: claudeHook,
      codexHookPath: codexHook,
    });

    expect(results.some((result) => result.status === 'blocked')).toBe(true);
    expect(existsSync(settings)).toBe(false);
    expect(read(config)).toBe('notify = ["custom"]\n');
  });

  it('does not write earlier setup when a later config path is invalid', () => {
    const dir = tempDir();
    const settings = join(dir, '.claude/settings.local.json');
    const config = join(dir, `${'x'.repeat(300)}.toml`);

    const results = runCaptureSetup('all', {
      write: true,
      claudeSettingsPath: settings,
      codexConfigPath: config,
      claudeHookPath: claudeHook,
      codexHookPath: codexHook,
    });

    expect(results.some((result) => result.status === 'blocked')).toBe(true);
    expect(existsSync(settings)).toBe(false);
  });

  it('blocks missing hook targets with an actionable message', () => {
    const dir = tempDir();
    const config = join(dir, 'config.toml');
    const [result] = runCaptureSetup('codex', { codexConfigPath: config, codexHookPath: join(dir, 'missing.mjs') });

    expect(result.status).toBe('blocked');
    expect(result.message).toContain('hook target not found');
    expect(result.message).toContain('examples/hooks');
  });
});
