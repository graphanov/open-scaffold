import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(process.cwd());

function read(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('MCP quickstart documentation', () => {
  it('front-loads the packaged osc-mcp path for solo coding-agent users', () => {
    const docs = read('docs/MCP.md');

    expect(docs.indexOf('## Solo coding-agent quickstart')).toBeLessThan(docs.indexOf('## Start the server'));
    expect(docs).toContain('npx -y -p open-scaffold@latest osc-mcp --repo /absolute/path/to/repo');
    expect(docs).toContain('"open_scaffold"');
    expect(docs).toContain('"mcpServers"');
    expect(docs).toContain('"osc-mcp"');
  });

  it('keeps common client adaptation guidance tied to one command shape', () => {
    const docs = read('docs/MCP.md');

    for (const client of ['Claude Code', 'Codex CLI', 'Cursor', 'Continue']) {
      expect(docs, client).toContain(client);
    }

    expect(docs).toContain('Name the server with underscores (`open_scaffold`, not `open-scaffold`)');
    expect(docs).toContain('This is not a compatibility matrix.');
  });

  it('names the first useful read calls and the evidence prerequisite', () => {
    const docs = read('docs/MCP.md');

    for (const toolName of ['get_status', 'get_handoff', 'list_plans', 'list_evidence', 'get_evidence']) {
      expect(docs, toolName).toContain(`\`${toolName}\``);
    }

    expect(docs).toContain('`get_evidence` needs an existing evidence');
  });

  it('pins the read-only authority boundary in public docs', () => {
    const docs = read('docs/MCP.md');

    expect(docs).toContain('By default MCP is read-only.');
    expect(docs).toContain('--allow-write');
    expect(docs).toContain('scaffold-file helpers');
    for (const boundary of ['spawn runtimes', 'run shell commands', 'commit', 'push', 'open PRs', 'merge', 'publish', 'release', 'deploy', 'read secrets', 'use credentials']) {
      expect(docs, boundary).toContain(boundary);
    }
  });

  it('links the MCP quickstart from public entry points', () => {
    expect(read('README.md')).toContain('[`docs/MCP.md`](docs/MCP.md) — connect MCP-capable coding agents to repo truth.');
    expect(read('docs/START_HERE.md')).toContain('| Connect an MCP-capable coding agent | [`MCP.md`](MCP.md) |');
  });

  it('keeps the packaged MCP binary documented against package truth', () => {
    const packageJson = JSON.parse(read('package.json')) as { bin?: Record<string, string> };

    expect(packageJson.bin?.['osc-mcp']).toBe('dist/mcp-cli.js');
  });
});
