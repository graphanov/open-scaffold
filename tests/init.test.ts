import { describe, expect, it } from 'vitest';
import { existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeScaffold, tierFiles } from '../src/init.js';

function tempTarget() {
  return mkdtempSync(join(tmpdir(), 'osc-init-'));
}

describe('tiered scaffold initialization', () => {
  it('generates the minimum viable scaffold file set', () => {
    const target = tempTarget();

    const result = initializeScaffold({ tier: 'min', target });

    expect(result.tier).toBe('min');
    expect(result.filesCreated.sort()).toEqual([...tierFiles.min].sort());
    expect(readFileSync(join(target, 'MISSION.md'), 'utf8')).toContain('<!-- mission:unset -->');
    expect(readFileSync(join(target, '.osc/cockpit.example.json'), 'utf8')).toContain('discord');
    expect(readFileSync(join(target, '.osc/plans/WORKFLOW.md'), 'utf8')).toContain('Plan Workflow');
    expect(readFileSync(join(target, '.osc/plans/README.md'), 'utf8')).toContain('Amendments');
    expect(readFileSync(join(target, '.osc/plans/README.md'), 'utf8')).not.toContain('amend.sh');
    expect(readFileSync(join(target, '.osc/plans/README.md'), 'utf8')).toContain('lightweight fallback');
    expect(readFileSync(join(target, '.osc/RULES.md'), 'utf8')).not.toContain('amend.sh');
    expect(readFileSync(join(target, '.osc/RULES.md'), 'utf8')).not.toContain('docs/WORKFLOW.md');
    expect(readFileSync(join(target, '.osc/RULES.md'), 'utf8')).toContain('.osc/plans/WORKFLOW.md');
    expect(readFileSync(join(target, '.osc/plans/handoff-template.md'), 'utf8')).not.toContain('amend.sh');
    expect(readFileSync(join(target, '.osc/plans/handoff-template.md'), 'utf8')).toContain('upgrade to the standard scaffold tier');
    expect(readFileSync(join(target, 'verify.sh'), 'utf8')).toContain('open-scaffold compliance checker');
    expect(result.summary).toContain('Generated min Open Scaffold');
    expect(result.summary).toContain('Next: edit MISSION.md');
  });

  it('generates the standard scaffold as a superset of min', () => {
    const target = tempTarget();

    const result = initializeScaffold({ tier: 'standard', target });

    expect(result.filesCreated.sort()).toEqual([...tierFiles.standard].sort());
    for (const file of tierFiles.min) expect(result.filesCreated).toContain(file);
    expect(readFileSync(join(target, 'README.md'), 'utf8')).toContain('Open Scaffold');
    expect(readFileSync(join(target, 'docs/START_HERE.md'), 'utf8')).toContain('minimum viable scaffold');
    const taskRunModel = readFileSync(join(target, 'docs/TASK_RUN_MODEL.md'), 'utf8');
    expect(taskRunModel).toContain('Task owns intent/lifecycle');
    expect(taskRunModel).toContain('[`WORKFLOW.md`](WORKFLOW.md)');
    expect(taskRunModel).toContain('[`SLICE_CLOSE_PROTOCOL.md`](SLICE_CLOSE_PROTOCOL.md)');
    expect(taskRunModel).not.toContain('RUNTIME_BINDING_CONTRACT.md');
    expect(taskRunModel).not.toContain('HARNESS_ARCHITECTURE.md');
    expect(taskRunModel).not.toContain('ADAPTERS.md');
    expect(readFileSync(join(target, 'docs/WORKFLOW.md'), 'utf8')).not.toContain('ADAPTERS.md#reference-labels-for-named-tools');
    expect(existsSync(join(target, '.devcontainer/devcontainer.json'))).toBe(true);
    expect(existsSync(join(target, '.devcontainer/Dockerfile'))).toBe(true);
    expect(existsSync(join(target, '.devcontainer/README.md'))).toBe(true);
    const devcontainer = readFileSync(join(target, '.devcontainer/devcontainer.json'), 'utf8');
    expect(devcontainer).toContain('postCreateCommand');
    expect(devcontainer).toContain("p.name === 'open-scaffold'");
    expect(readFileSync(join(target, 'docs/DEV_CONTAINER.md'), 'utf8')).toContain('Dev Container');
  });

  it('keeps devcontainer support out of the minimum tier', () => {
    const target = tempTarget();

    initializeScaffold({ tier: 'min', target });

    expect(existsSync(join(target, '.devcontainer/devcontainer.json'))).toBe(false);
    expect(existsSync(join(target, 'docs/DEV_CONTAINER.md'))).toBe(false);
  });

  it('generates the max scaffold as a superset of standard', () => {
    const target = tempTarget();

    const result = initializeScaffold({ tier: 'max', target });

    expect(result.filesCreated.sort()).toEqual([...tierFiles.max].sort());
    for (const file of tierFiles.standard) expect(result.filesCreated).toContain(file);
    expect(readFileSync(join(target, 'docs/OPEN_SCAFFOLD_SYSTEM.md'), 'utf8')).toContain('Open Scaffold');
    const maxTaskRunModel = readFileSync(join(target, 'docs/TASK_RUN_MODEL.md'), 'utf8');
    expect(maxTaskRunModel).toContain('RUNTIME_BINDING_CONTRACT.md');
    expect(maxTaskRunModel).toContain('HARNESS_ARCHITECTURE.md');
    expect(maxTaskRunModel).toContain('ADAPTERS.md#runtime-dispatch-pattern');
    expect(existsSync(join(target, 'docs/ADAPTERS.md'))).toBe(true);
    expect(existsSync(join(target, 'docs/HARNESS_ARCHITECTURE.md'))).toBe(true);
    expect(readFileSync(join(target, '.osc/runs/.gitkeep'), 'utf8')).toBe('');
  });

  it('refuses to overwrite existing files by default', () => {
    const target = tempTarget();
    writeFileSync(join(target, 'MISSION.md'), 'keep me');

    expect(() => initializeScaffold({ tier: 'min', target })).toThrow(/Refusing to overwrite existing files: MISSION\.md/);
    expect(readFileSync(join(target, 'MISSION.md'), 'utf8')).toBe('keep me');
  });

  it('refuses to write through symlinked target paths', () => {
    const target = tempTarget();
    const outside = tempTarget();
    mkdirSync(join(outside, '.osc'), { recursive: true });
    symlinkSync(join(outside, '.osc'), join(target, '.osc'));

    expect(() => initializeScaffold({ tier: 'min', target })).toThrow(/Refusing to write through symlinked path: \.osc/);
    expect(existsSync(join(target, 'MISSION.md'))).toBe(false);
    expect(existsSync(join(outside, '.osc/RULES.md'))).toBe(false);
  });

  it('refuses symlinked target ancestors before creating directories', () => {
    const parent = tempTarget();
    const outside = tempTarget();
    const link = join(parent, 'link');
    symlinkSync(outside, link);

    expect(() => initializeScaffold({ tier: 'min', target: join(link, 'project') })).toThrow(/Refusing to write through symlinked path:/);
    expect(existsSync(join(outside, 'project'))).toBe(false);
  });

  it('allows the standard macOS /tmp alias for new brownfield targets', () => {
    if (process.platform !== 'darwin' || !existsSync('/tmp') || !lstatSync('/tmp').isSymbolicLink() || realpathSync('/tmp') !== '/private/tmp') return;

    const slug = `osc-init-macos-tmp-${process.pid}-${Date.now()}`;
    const requestedTarget = join('/tmp', slug);
    const canonicalTarget = join('/private/tmp', slug);

    const result = initializeScaffold({ tier: 'min', target: requestedTarget, fromExisting: true, force: true });

    expect(result.target).toBe(canonicalTarget);
    expect(existsSync(join(canonicalTarget, 'MISSION.md'))).toBe(true);
    expect(readFileSync(join(canonicalTarget, 'MISSION.md'), 'utf8')).toContain('<!-- mission:unset -->');
  });

  it('refuses dangling symlink destinations before writing outside target', () => {
    const target = tempTarget();
    const outside = tempTarget();
    const outsideFile = join(outside, 'outside.md');
    symlinkSync(outsideFile, join(target, 'MISSION.md'));

    expect(() => initializeScaffold({ tier: 'min', target, force: true })).toThrow(/Refusing to write through symlinked path: MISSION\.md/);
    expect(existsSync(outsideFile)).toBe(false);
  });

  it('refuses to overwrite symlinked files even with force', () => {
    const target = tempTarget();
    const outside = tempTarget();
    writeFileSync(join(outside, 'README.md'), 'outside');
    symlinkSync(join(outside, 'README.md'), join(target, 'README.md'));

    expect(() => initializeScaffold({ tier: 'standard', target, force: true })).toThrow(/Refusing to write through symlinked path: README\.md/);
    expect(readFileSync(join(outside, 'README.md'), 'utf8')).toBe('outside');
  });

  it('adds a min brownfield scaffold to an existing Node.js repo without touching project files', () => {
    const target = tempTarget();
    const packageJson = '{"name":"brownfield-node","scripts":{"test":"node src/index.js"}}\n';
    const source = 'console.log("hi")\n';
    writeFileSync(join(target, 'package.json'), packageJson);
    mkdirSync(join(target, 'src'));
    writeFileSync(join(target, 'src/index.js'), source);

    const result = initializeScaffold({ tier: 'min', target, fromExisting: true });

    expect(result.summary).toContain('Detected existing Node.js project');
    expect(result.filesCreated).toContain('AGENTS.md');
    expect(result.filesCreated).toContain('CLAUDE.md');
    expect(existsSync(join(target, '.osc/plans/active/.gitkeep'))).toBe(true);
    expect(existsSync(join(target, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(target, 'CLAUDE.md'))).toBe(true);
    expect(readFileSync(join(target, 'MISSION.md'), 'utf8')).toContain('Node.js');
    expect(readFileSync(join(target, 'MISSION.md'), 'utf8')).toContain('<!-- mission:unset -->');
    expect(readFileSync(join(target, 'package.json'), 'utf8')).toBe(packageJson);
    expect(readFileSync(join(target, 'src/index.js'), 'utf8')).toBe(source);
  });

  it('refuses brownfield scaffold conflicts without force and lists scaffold-owned conflicts', () => {
    const target = tempTarget();
    writeFileSync(join(target, 'package.json'), '{"name":"conflict"}\n');
    writeFileSync(join(target, 'MISSION.md'), 'keep mission');
    mkdirSync(join(target, '.osc'));

    expect(() => initializeScaffold({ tier: 'min', target, fromExisting: true })).toThrow(/Refusing to overwrite existing scaffold files: MISSION\.md, \.osc/);
    expect(readFileSync(join(target, 'MISSION.md'), 'utf8')).toBe('keep mission');
    expect(readFileSync(join(target, 'package.json'), 'utf8')).toBe('{"name":"conflict"}\n');
  });

  it('allows forced brownfield scaffold refresh while preserving user project files', () => {
    const target = tempTarget();
    const packageJson = '{"name":"force-node"}\n';
    writeFileSync(join(target, 'package.json'), packageJson);
    writeFileSync(join(target, 'MISSION.md'), 'old mission');
    writeFileSync(join(target, 'README.md'), 'user readme');

    initializeScaffold({ tier: 'min', target, fromExisting: true, force: true });

    expect(readFileSync(join(target, 'package.json'), 'utf8')).toBe(packageJson);
    expect(readFileSync(join(target, 'README.md'), 'utf8')).toBe('user readme');
    expect(readFileSync(join(target, 'MISSION.md'), 'utf8')).toContain('Node.js');
    expect(readFileSync(join(target, 'AGENTS.md'), 'utf8')).toContain('This repository uses Open Scaffold');
  });

  it('tailors brownfield mission drafts for Python, Go, Rust, and generic projects', () => {
    const cases = [
      { marker: 'pyproject.toml', contents: '[project]\nname="demo"\n', expected: 'Python' },
      { marker: 'go.mod', contents: 'module example.com/demo\n', expected: 'Go' },
      { marker: 'Cargo.toml', contents: '[package]\nname="demo"\n', expected: 'Rust' },
      { marker: 'README.md', contents: '# Existing project\n', expected: 'existing project' },
    ];

    for (const entry of cases) {
      const target = tempTarget();
      writeFileSync(join(target, entry.marker), entry.contents);

      initializeScaffold({ tier: 'min', target, fromExisting: true });

      expect(readFileSync(join(target, 'MISSION.md'), 'utf8'), entry.marker).toContain(entry.expected);
      expect(readFileSync(join(target, entry.marker), 'utf8'), entry.marker).toBe(entry.contents);
    }
  });

  it('detects common Node.js monorepo markers before falling back to a plain Node.js project', () => {
    const cases = [
      { file: 'package.json', contents: '{"name":"mono","workspaces":["packages/*"]}\n' },
      { file: 'pnpm-workspace.yaml', contents: 'packages:\n  - packages/*\n' },
      { file: 'lerna.json', contents: '{"packages":["packages/*"]}\n' },
      { file: 'nx.json', contents: '{"npmScope":"demo"}\n' },
    ];

    for (const entry of cases) {
      const target = tempTarget();
      writeFileSync(join(target, 'package.json'), '{"name":"mono"}\n');
      writeFileSync(join(target, entry.file), entry.contents);

      initializeScaffold({ tier: 'min', target, fromExisting: true });

      expect(readFileSync(join(target, 'MISSION.md'), 'utf8'), entry.file).toContain('Node.js monorepo');
      expect(readFileSync(join(target, entry.file), 'utf8'), entry.file).toBe(entry.contents);
    }
  });

  it('rejects standard and max brownfield tiers so force cannot overwrite user-owned docs', () => {
    const target = tempTarget();
    writeFileSync(join(target, 'package.json'), '{"name":"safe"}\n');
    writeFileSync(join(target, 'README.md'), 'user readme');

    expect(() => initializeScaffold({ tier: 'standard', target, fromExisting: true, force: true })).toThrow(/supports --tier min only/);
    expect(() => initializeScaffold({ tier: 'max', target, fromExisting: true })).toThrow(/supports --tier min only/);
    expect(readFileSync(join(target, 'README.md'), 'utf8')).toBe('user readme');
  });

  it('refuses to force-overwrite existing project root shell scripts in brownfield mode', () => {
    const target = tempTarget();
    writeFileSync(join(target, 'package.json'), '{"name":"script-safe"}\n');
    writeFileSync(join(target, 'verify.sh'), '#!/usr/bin/env bash\necho project verify\n');

    expect(() => initializeScaffold({ tier: 'min', target, fromExisting: true, force: true })).toThrow(/Refusing to overwrite existing project files in brownfield mode: verify\.sh/);
    expect(readFileSync(join(target, 'verify.sh'), 'utf8')).toBe('#!/usr/bin/env bash\necho project verify\n');
    expect(existsSync(join(target, 'MISSION.md'))).toBe(false);
  });
});
