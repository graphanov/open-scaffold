import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const claudeHook = resolve(repoRoot, 'examples/hooks/ambient-hook.mjs');

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'osc-capture-setup-rollback-'));
}

afterEach(() => {
  vi.doUnmock('node:fs');
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('capture setup rollback', () => {
  it('restores the current config when a write fails after truncation', async () => {
    const dir = tempDir();
    const settings = join(dir, '.claude/settings.local.json');
    const original = '{"hooks":{}}\n';
    mkdirSync(dirname(settings), { recursive: true });
    writeFileSync(settings, original);

    let writeCalls = 0;
    vi.resetModules();
    vi.doMock('node:fs', async (importOriginal) => {
      const fs = await importOriginal<typeof import('node:fs')>();
      return {
        ...fs,
        writeSync: vi.fn((...args: Parameters<typeof fs.writeSync>) => {
          writeCalls += 1;
          if (writeCalls === 1) {
            const error = new Error('simulated write failure after truncation') as NodeJS.ErrnoException;
            error.code = 'ENOSPC';
            throw error;
          }
          return fs.writeSync(...args);
        }),
      };
    });

    const { runCaptureSetup } = await import('../src/capture-setup.js');

    expect(() => runCaptureSetup('claude-code', {
      write: true,
      claudeSettingsPath: settings,
      claudeHookPath: claudeHook,
    })).toThrow('simulated write failure after truncation');

    expect(writeCalls).toBe(2);
    expect(readFileSync(settings, 'utf8')).toBe(original);
  });
});
