import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('devcontainer profile', () => {
  it('defines a valid JSONC devcontainer that builds from the bundled Dockerfile', () => {
    const config = JSON.parse(read('.devcontainer/devcontainer.json')) as {
      build?: { dockerfile?: string; context?: string };
      postCreateCommand?: string;
      remoteUser?: string;
      customizations?: { vscode?: { extensions?: string[] } };
    };

    expect(config.build).toMatchObject({ dockerfile: 'Dockerfile', context: '.' });
    expect(config.remoteUser).toBe('node');
    expect(config.postCreateCommand).toContain("p.name === 'open-scaffold'");
    expect(config.postCreateCommand).toContain('p.bin && p.bin.osc');
    expect(config.postCreateCommand).toContain('npm install');
    expect(config.postCreateCommand).toContain('npm run build');
    expect(config.postCreateCommand).toContain('npm install -g .');
    expect(config.postCreateCommand).toContain('osc --version');
    expect(config.customizations?.vscode?.extensions).toContain('ms-vscode.vscode-typescript-next');
  });

  it('keeps the Dockerfile optional, runtime-neutral, and usable without VS Code', () => {
    const dockerfile = read('.devcontainer/Dockerfile');

    expect(dockerfile).toContain('FROM node:22');
    expect(dockerfile).toContain('apt-get install -y --no-install-recommends git');
    expect(dockerfile).toContain('npm install -g "open-scaffold@${OPEN_SCAFFOLD_VERSION}"');
    expect(dockerfile).not.toContain('Claude');
    expect(dockerfile).not.toContain('Codex');
    expect(dockerfile).not.toContain('TOKEN');
  });
});
