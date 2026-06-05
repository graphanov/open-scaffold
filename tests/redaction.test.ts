import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanPublicFilesForSecrets } from '../src/redaction.js';

describe('secret redaction scanner', () => {
  it('skips ignored local agent runtime state while scanning public files', () => {
    const root = mkdtempSync(join(tmpdir(), 'osc-redaction-'));
    try {
      mkdirSync(join(root, '.clawhip/state'), { recursive: true });
      writeFileSync(join(root, '.clawhip/state/prompt-submit.json'), JSON.stringify({ cwd: '/Users/example/private/repo' }));
      expect(scanPublicFilesForSecrets(root)).toEqual([]);

      writeFileSync(join(root, 'leak.md'), 'token ghp_abcdefghijklmnopqrstuvwxyz123456');
      expect(scanPublicFilesForSecrets(root)).toEqual([
        { path: 'leak.md', kind: 'token', line: 1, detail: 'GitHub token' },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
