import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(process.cwd());

function read(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('first-run documentation truth', () => {
  it('advertises the published guided first-run as the default adoption path', () => {
    expect(read('README.md')).toContain('npx open-scaffold@latest first-run');
    expect(read('docs/START_HERE.md')).toContain('npx open-scaffold@latest first-run');
    expect(read('LLM_QUICKSTART.md')).toContain('npx open-scaffold@latest first-run');
  });

  it('keeps a source-checkout fallback path for users who do not want npx', () => {
    const minimum = read('docs/START_HERE.md');

    expect(minimum).toContain('git clone https://github.com/graphanov/open-scaffold');
    expect(minimum).toContain('npm install');
    expect(minimum).toContain('npm run build');
    expect(minimum).toContain('node dist/cli.js init');
  });

  it('keeps the LLM quickstart runnable without assuming a global osc binary', () => {
    const quickstart = read('LLM_QUICKSTART.md');

    expect(quickstart).toContain('npx open-scaffold@latest first-run');
    expect(quickstart).toContain('npx open-scaffold@latest handoff');
    expect(quickstart).not.toContain('\nosc handoff\n');
    expect(quickstart).toContain('TARGET_REPO=/path/to/your/project');
    expect(quickstart).toContain('cd "$TARGET_REPO"');
    expect(quickstart).toContain('node "$OSC_SOURCE/dist/cli.js" first-run');
  });

  it('documents lifecycle helper commands without removing shell fallbacks', () => {
    const readme = read('README.md');
    for (const command of ['osc plan new', 'osc evidence new', 'osc amend', 'osc close']) {
      expect(readme, 'README.md').toContain(command);
    }

    const docs = [
      ['docs/START_HERE.md', read('docs/START_HERE.md')],
      ['docs/WORKFLOW.md', read('docs/WORKFLOW.md')],
    ] as const;

    for (const [path, text] of docs) {
      expect(text, path).toContain('osc plan new');
      expect(text, path).toContain('osc evidence new');
      expect(text, path).toContain('osc amend');
      expect(text, path).toContain('osc close');
      expect(text, path).toContain('npx open-scaffold amend');
      expect(text, path).toContain('npx open-scaffold close');
    }
    expect(read('docs/START_HERE.md')).toContain('copy `.osc/plans/handoff-template.md`');
    expect(read('docs/START_HERE.md')).toContain('./close.sh');
    expect(read('docs/WORKFLOW.md')).toContain('Shell scripts remain the day-zero floor');
  });

  it('exposes a package-name binary alias so npx open-scaffold runs the CLI', () => {
    const packageJson = JSON.parse(read('package.json')) as { bin?: Record<string, string> };

    expect(packageJson.bin).toMatchObject({
      'open-scaffold': 'dist/cli.js',
      osc: 'dist/cli.js',
    });
  });

  it('documents optional dev container support', () => {
    const devcontainer = read('docs/DEV_CONTAINER.md');

    expect(devcontainer).toContain('docker build -t osc-devcontainer -f .devcontainer/Dockerfile .devcontainer/');
    expect(devcontainer).toContain('Containers');
    expect(devcontainer).not.toContain('Daniel');
  });
});
