import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(process.cwd());

function read(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('first-run documentation truth', () => {
  it('advertises the published npx command as the default first-run path', () => {
    const docs = [
      ['README.md', read('README.md')],
      ['docs/MINIMUM_VIABLE_SCAFFOLD.md', read('docs/MINIMUM_VIABLE_SCAFFOLD.md')],
    ] as const;

    for (const [path, text] of docs) {
      expect(text, path).toContain('npx open-scaffold init --tier min');
    }
  });

  it('keeps a source-checkout fallback path for users who do not want npx', () => {
    const readme = read('README.md');
    const minimum = read('docs/MINIMUM_VIABLE_SCAFFOLD.md');

    for (const [path, text] of [['README.md', readme], ['docs/MINIMUM_VIABLE_SCAFFOLD.md', minimum]] as const) {
      expect(text, path).toContain('git clone https://github.com/graphanov/open-scaffold');
      expect(text, path).toContain('npm install');
      expect(text, path).toContain('npm run build');
      expect(text, path).toContain('node dist/cli.js init');
    }
  });

  it('exposes a package-name binary alias so npx open-scaffold runs the CLI', () => {
    const packageJson = JSON.parse(read('package.json')) as { bin?: Record<string, string> };

    expect(packageJson.bin).toMatchObject({
      'open-scaffold': 'dist/cli.js',
      osc: 'dist/cli.js',
    });
  });
});
