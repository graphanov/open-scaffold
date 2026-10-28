import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { initializeScaffold } from '../src/init.js';
import { packageVersion } from '../src/version.js';

// #324: nothing the CLI writes into a downstream repo may point an agent at a
// remote, unpinned, or otherwise live resource. Commands must be bare `osc`.
const TIERS = ['min', 'standard', 'max'] as const;

// RFC 2606 / RFC 6761 reserved hosts and loopback are documentation-only
// placeholders, not live online resources, so they are allowed.
const RESERVED_URL =
  /https?:\/\/(?:localhost|127\.0\.0\.1|[A-Za-z0-9.-]*\.(?:invalid|example|test)|example\.(?:com|org|net))(?::\d+)?(?:[/?#][^\s)"'`]*)?/gi;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

describe('generated scaffold is offline-clean (#324)', () => {
  for (const tier of TIERS) {
    it(`${tier} tier: no unpinned npx, registry install, github, or live URL in generated files`, () => {
      const target = mkdtempSync(join(tmpdir(), `osc-offline-${tier}-`));
      try {
        initializeScaffold({ tier, target });
        const files = walk(target);
        expect(files.length).toBeGreaterThan(0);
        for (const file of files) {
          const content = readFileSync(file, 'utf8');
          const where = `${tier}:${relative(target, file)}`;
          // Pinned `npx open-scaffold@<version>` is allowed; unpinned npx and @latest are not.
          expect(content, where).not.toMatch(/npx\s+open-scaffold(?!@\d)/i);
          expect(content, where).not.toMatch(/open-scaffold@latest/i);
          expect(content, where).not.toMatch(/npm\s+(?:i|install)\s+(?:-g|--global)\s+open-scaffold(?!@\d)/i);
          expect(content, where).not.toMatch(/github\.com/i);
          const liveUrls = content.replace(RESERVED_URL, '');
          expect(liveUrls, where).not.toMatch(/https?:\/\//i);
        }
      } finally {
        rmSync(target, { recursive: true, force: true });
      }
    });
  }

  it('generated agent instructions use bare osc with no remote references', () => {
    const target = mkdtempSync(join(tmpdir(), 'osc-offline-agents-'));
    try {
      initializeScaffold({ tier: 'standard', target });
      const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8');
      expect(agents).toContain('osc handoff');
      expect(agents).toContain(`npx open-scaffold@${packageVersion()} `);
      expect(agents).not.toContain('npx open-scaffold@latest');
      expect(agents).not.toContain('github.com');
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});
