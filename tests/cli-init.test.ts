import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');

function tempTarget() {
  return mkdtempSync(join(tmpdir(), 'osc-cli-init-'));
}

function filesUnder(root: string): string[] {
  const files: string[] = [];
  function visit(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) visit(path);
      else files.push(path);
    }
  }
  visit(root);
  return files.sort();
}

function writeRuntimeSelectionPlan(target: string, goal = 'Demo runtime selection.') {
  writeFileSync(join(target, 'MISSION.md'), '# Mission\n\nRuntime selection packet test.\n');
  const planPath = join(target, '.osc/plans/active/001-demo.md');
  writeFileSync(planPath, `# Plan: 001-demo

## Status

active

## Context

Demo.

## Goal

${goal}

## Constraints / Out of scope

- Do not spawn.

## Files to touch

- README.md

## Acceptance criteria

- [ ] Packet records runtime selection.

## Verification steps

1. Check run packet.

## Open questions

None.
`);
  return planPath;
}

describe('osc init CLI', () => {
  it('creates the requested tier in the target directory and prints a summary', () => {
    const target = tempTarget();

    const output = execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });

    expect(output).toContain('Generated min Open Scaffold');
    expect(output).toContain('Next: edit MISSION.md');
    expect(existsSync(join(target, 'MISSION.md'))).toBe(true);
    expect(existsSync(join(target, '.osc/plans/active/.gitkeep'))).toBe(true);
  });

  it('supports clean tier aliases', () => {
    const target = tempTarget();

    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });

    expect(existsSync(join(target, 'README.md'))).toBe(true);
    expect(existsSync(join(target, 'docs/SLICE_CLOSE_PROTOCOL.md'))).toBe(true);
  });

  it('generates standard-tier root docs as neutral downstream starter files', () => {
    const target = tempTarget();

    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });

    const checkedFiles = ['README.md', 'ROADMAP.md', 'AGENTS.md', 'CLAUDE.md'] as const;
    for (const file of checkedFiles) {
      const text = readFileSync(join(target, file), 'utf8');
      expect(text, file).not.toContain('This project is [open-scaffold]');
      expect(text, file).not.toContain('Open Scaffold is a runtime-neutral, repo-native operating system');
      expect(text, file).not.toContain('graphanov/open-scaffold/generate');
      expect(text, file).not.toContain('/Users/');
      expect(text, file).not.toContain('Daniel');
      expect(text, file).not.toContain('.osc-dev');
    }

    for (const path of filesUnder(target)) {
      const text = readFileSync(path, 'utf8');
      expect(text, path).not.toContain('/Users/');
      expect(text, path).not.toContain('owner-local');
      expect(text, path).not.toContain('private workspace');
      expect(text, path).not.toContain('graphanov/open-scaffold/generate');
      expect(text, path).not.toContain('Open Scaffold is a runtime-neutral, repo-native operating system');
      expect(text, path).not.toContain('Daniel');
      expect(text, path).not.toContain('.osc-dev');
    }

    const readme = readFileSync(join(target, 'README.md'), 'utf8');
    const minimum = readFileSync(join(target, 'docs/MINIMUM_VIABLE_SCAFFOLD.md'), 'utf8');
    const agents = readFileSync(join(target, 'AGENTS.md'), 'utf8');
    expect(readme).toContain('TODO: replace this with your project overview.');
    expect(agents).toContain('This repository uses Open Scaffold. It is not the Open Scaffold product repository.');
    expect(readme).toContain('npx open-scaffold plan new');
    expect(readme).toContain('npx open-scaffold evidence new');
    expect(readme).toContain('cp .osc/plans/handoff-template.md');
    expect(readme).toContain('Optional Dev Container');
    expect(minimum).toContain('npx open-scaffold plan new');
    expect(minimum).toContain('npx open-scaffold evidence new');
    expect(minimum).toContain('copy `.osc/plans/handoff-template.md`');
    expect(existsSync(join(target, '.devcontainer/devcontainer.json'))).toBe(true);
    expect(existsSync(join(target, '.devcontainer/Dockerfile'))).toBe(true);
    expect(existsSync(join(target, 'docs/DEV_CONTAINER.md'))).toBe(true);
  });

  it('exits non-zero rather than overwriting an existing file', () => {
    const target = tempTarget();
    writeFileSync(join(target, 'MISSION.md'), 'keep me');

    expect(() => execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8', stdio: 'pipe' })).toThrow(/Refusing to overwrite/);
  });

  it('reports invalid tier values as argument errors without a stack trace', () => {
    const target = tempTarget();

    const result = spawnSync(tsx, [cli, 'init', '--tier', 'foo', '--target', target], { encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Invalid value for --tier: foo');
    expect(result.stderr).not.toContain('Error: Invalid tier');
    expect(result.stderr).not.toContain('at parseTier');
  });

  it('keeps min-tier bootstrap output pointed at an existing workflow guide', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--tier', 'min', '--target', target], { encoding: 'utf8' });

    const output = execFileSync(join(target, 'bootstrap.sh'), { cwd: target, encoding: 'utf8' });

    expect(existsSync(join(target, 'docs/WORKFLOW.md'))).toBe(false);
    expect(output).toContain(join(target, '.osc/plans/WORKFLOW.md'));
    expect(output).not.toContain(join(target, 'docs/WORKFLOW.md'));
  });

  it('creates a brownfield scaffold from the CLI without replacing existing project files', () => {
    const target = tempTarget();
    const packageJson = '{"name":"cli-brownfield"}\n';
    writeFileSync(join(target, 'package.json'), packageJson);

    const output = execFileSync(tsx, [cli, 'init', '--from-existing', '--tier', 'min', '--target', target], { encoding: 'utf8' });

    expect(output).toContain('Detected existing Node.js project');
    expect(readFileSync(join(target, 'package.json'), 'utf8')).toBe(packageJson);
    expect(readFileSync(join(target, 'MISSION.md'), 'utf8')).toContain('Node.js');
    expect(existsSync(join(target, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(target, 'CLAUDE.md'))).toBe(true);
  });

  it('mentions the brownfield init flag in CLI help', () => {
    const result = spawnSync(tsx, [cli, '--help'], { encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('osc init --from-existing --tier min --target <dir> [--force]');
  });

  it('prints the package version for container smoke checks', () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as { version: string };
    const result = spawnSync(tsx, [cli, '--version'], { encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(packageJson.version);
    expect(result.stderr).toBe('');
  });

  it('prints init-specific help without treating --help as an unknown option', () => {
    const result = spawnSync(tsx, [cli, 'init', '--help'], { encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: osc init --tier <min|standard|max> --target <dir> [--force]');
    expect(result.stdout).toContain('osc init --from-existing --tier min --target <dir> [--force]');
    expect(result.stdout).not.toContain('Unknown option for init');
    expect(result.stdout).not.toContain('Run binding options:');
  });

  it('shows init-specific usage for unsupported init options', () => {
    const result = spawnSync(tsx, [cli, 'init', '--json'], { encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Unknown option for init: --json');
    expect(result.stderr).toContain('Usage: osc init --tier <min|standard|max> --target <dir> [--force]');
    expect(result.stderr).not.toContain('Run binding options:');
  });

  it('treats missing init operands as an error, not help', () => {
    const result = spawnSync(tsx, [cli, 'init'], { encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Missing --tier');
  });

  it('does not treat a target value named help as an init help request', () => {
    const parent = tempTarget();
    const result = spawnSync(tsx, [cli, 'init', '--target', 'help', '--tier', 'min'], { cwd: parent, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Generated min Open Scaffold');
    expect(existsSync(join(parent, 'help', 'MISSION.md'))).toBe(true);
  });

  it('does not treat an invalid tier value named help as an init help request', () => {
    const target = tempTarget();
    const result = spawnSync(tsx, [cli, 'init', '--tier', 'help', '--target', target], { encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Invalid value for --tier: help');
    expect(result.stderr).not.toContain('Usage: osc init');
  });

  it('maps runtime and workflow presets into a run packet without spawning', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    const planPath = writeRuntimeSelectionPlan(target);

    execFileSync(tsx, [cli, 'run', planPath, '--runtime', 'omx', '--workflow', 'plan', '--repo', target], { cwd: target, encoding: 'utf8' });
    const runsDir = join(target, '.osc/runs');
    const runId = readdirSync(runsDir).sort().at(-1);
    expect(runId).toBeTruthy();
    const manifest = JSON.parse(readFileSync(join(runsDir, runId!, 'run.json'), 'utf8'));

    expect(manifest.runtimeSelection).toMatchObject({ runtime: 'omx', workflow: 'plan', profileId: 'omx', profileSource: 'builtin' });
    expect(manifest.executor).toMatchObject({ lane: 'omx-codex', harnessSkill: '$ralplan', spawning: false });
  }, 15_000);


  it('defaults Codex/OMX runtime presets to plan workflow so packets are dispatchable', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    const planPath = writeRuntimeSelectionPlan(target, 'Demo runtime default workflow.');

    execFileSync(tsx, [cli, 'run', planPath, '--runtime', 'codex', '--repo', target], { cwd: target, encoding: 'utf8' });
    execFileSync(tsx, [cli, 'run', planPath, '--runtime', 'omx', '--repo', target], { cwd: target, encoding: 'utf8' });
    const runsDir = join(target, '.osc/runs');
    const runIds = readdirSync(runsDir).sort();
    expect(runIds.length).toBeGreaterThanOrEqual(2);
    const codexManifest = JSON.parse(readFileSync(join(runsDir, runIds.at(-2)!, 'run.json'), 'utf8'));
    const omxManifest = JSON.parse(readFileSync(join(runsDir, runIds.at(-1)!, 'run.json'), 'utf8'));

    expect(codexManifest.runtimeSelection).toMatchObject({ runtime: 'codex', workflow: 'plan', profileId: 'codex', profileSource: 'builtin' });
    expect(codexManifest.executor).toMatchObject({ lane: 'omx-codex', harnessSkill: '$ralplan', spawning: false });
    expect(omxManifest.runtimeSelection).toMatchObject({ runtime: 'omx', workflow: 'plan', profileId: 'omx', profileSource: 'builtin' });
    expect(omxManifest.executor).toMatchObject({ lane: 'omx-codex', harnessSkill: '$ralplan', spawning: false });
  }, 15_000);


  it('rejects mismatched workflow and harness skill for runtime presets', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    const planPath = writeRuntimeSelectionPlan(target, 'Demo runtime mismatch rejection.');

    const result = spawnSync(tsx, [cli, 'run', planPath, '--runtime', 'omx', '--workflow', 'plan', '--harness-skill', '$team', '--repo', target], {
      cwd: target,
      encoding: 'utf8',
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('--runtime omx with --workflow plan requires --harness-skill $ralplan');
  }, 15_000);

  it('rejects unmapped workflows for runtime profiles unless harness skill is explicit', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    const planPath = writeRuntimeSelectionPlan(target, 'Demo unmapped workflow rejection.');

    const result = spawnSync(tsx, [cli, 'run', planPath, '--runtime', 'omx', '--workflow', 'custom', '--repo', target], {
      cwd: target,
      encoding: 'utf8',
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('--runtime omx does not define workflow custom');

    execFileSync(tsx, [cli, 'run', planPath, '--runtime', 'omx', '--workflow', 'custom', '--harness-skill', '$custom', '--repo', target], { cwd: target, encoding: 'utf8' });
    const runsDir = join(target, '.osc/runs');
    const runId = readdirSync(runsDir).sort().at(-1);
    const manifest = JSON.parse(readFileSync(join(runsDir, runId!, 'run.json'), 'utf8'));
    expect(manifest.executor).toMatchObject({ lane: 'omx-codex', harnessSkill: '$custom', spawning: false });
  }, 15_000);

  it('honors explicit null workflow mappings as supported workflows without inferred harness skills', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    const planPath = writeRuntimeSelectionPlan(target, 'Demo null workflow mapping.');
    mkdirSync(join(target, '.osc/runtimes'), { recursive: true });
    writeFileSync(join(target, '.osc/runtimes/no-harness.json'), JSON.stringify({
      schemaVersion: 'open-scaffold.runtime-profile.v1',
      id: 'no-harness',
      displayName: 'No Harness',
      lane: 'plain-agent',
      status: 'user-defined',
      description: 'Supports plan workflow without inferred harness skill.',
      workflows: { plan: null },
      launch: { spawning: false },
    }, null, 2));

    execFileSync(tsx, [cli, 'run', planPath, '--runtime', 'no-harness', '--workflow', 'plan', '--repo', target], { cwd: target, encoding: 'utf8' });
    const runsDir = join(target, '.osc/runs');
    const runId = readdirSync(runsDir).sort().at(-1);
    const manifest = JSON.parse(readFileSync(join(runsDir, runId!, 'run.json'), 'utf8'));
    expect(manifest.runtimeSelection).toMatchObject({ runtime: 'no-harness', workflow: 'plan', profileId: 'no-harness', profileSource: 'project' });
    expect(manifest.executor).toMatchObject({ lane: 'plain-agent', harnessSkill: null, spawning: false });
  }, 15_000);

  it('lists and shows runtime profiles with source labels', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });

    const list = execFileSync(tsx, [cli, 'runtimes', 'list'], { cwd: target, encoding: 'utf8' });
    expect(list).toContain('codex\tbuiltin\tomx-codex\tadapter-candidate');
    expect(list).toContain('omx\tbuiltin\tomx-codex\tadapter-candidate');

    const listJson = JSON.parse(execFileSync(tsx, [cli, 'runtimes', 'list', '--json'], { cwd: target, encoding: 'utf8' }));
    expect(listJson).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'codex', source: 'builtin', lane: 'omx-codex', status: 'adapter-candidate' }),
      expect.objectContaining({ id: 'omx', source: 'builtin', lane: 'omx-codex', status: 'adapter-candidate' }),
    ]));

    const invalidList = spawnSync(tsx, [cli, 'runtimes', 'list', '--bogus'], { cwd: target, encoding: 'utf8' });
    expect(invalidList.status).toBe(2);
    expect(invalidList.stderr).toContain('Unknown option for runtimes list: --bogus');

    const codexShown = JSON.parse(execFileSync(tsx, [cli, 'runtimes', 'show', 'codex'], { cwd: target, encoding: 'utf8' }));
    expect(codexShown).toMatchObject({ id: 'codex', source: 'builtin', lane: 'omx-codex' });
    expect(codexShown.launch).toMatchObject({ expectedAdapterId: 'runtime-omx', spawning: false });

    const shown = JSON.parse(execFileSync(tsx, [cli, 'runtimes', 'show', 'omx'], { cwd: target, encoding: 'utf8' }));
    expect(shown).toMatchObject({ id: 'omx', source: 'builtin', lane: 'omx-codex' });
  }, 15_000);

  it('uses a project-local runtime profile in run packets', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    const planPath = writeRuntimeSelectionPlan(target, 'Demo custom runtime profile.');
    mkdirSync(join(target, '.osc/runtimes'), { recursive: true });
    writeFileSync(join(target, '.osc/runtimes/review-bot.json'), JSON.stringify({
      schemaVersion: 'open-scaffold.runtime-profile.v1',
      id: 'review-bot',
      displayName: 'Review Bot',
      lane: 'plain-agent',
      status: 'user-defined',
      description: 'Project-local review bot profile.',
      workflows: { plan: 'review-bot plan' },
      defaults: { workflow: 'plan', harnessSkill: 'review-bot plan', operatorSurface: 'github' },
      install: { humanHint: 'Install through the project developer portal.', auto: false },
      launch: { owner: 'external-adapter', commandTemplate: 'review-bot run <run.json>', spawning: false },
      evidence: { receiptSchema: 'open-scaffold.dispatch-receipt.v1' },
    }, null, 2));

    execFileSync(tsx, [cli, 'run', planPath, '--runtime', 'review-bot', '--repo', target], { cwd: target, encoding: 'utf8' });
    const runsDir = join(target, '.osc/runs');
    const runId = readdirSync(runsDir).sort().at(-1);
    const manifest = JSON.parse(readFileSync(join(runsDir, runId!, 'run.json'), 'utf8'));

    expect(manifest.runtimeSelection).toMatchObject({ runtime: 'review-bot', workflow: 'plan', profileId: 'review-bot', profileSource: 'project' });
    expect(manifest.executor).toMatchObject({ lane: 'plain-agent', harnessSkill: 'review-bot plan', spawning: false });
    expect(manifest.bindings).toMatchObject({ operatorSurface: 'github' });
  }, 15_000);

  it('resolves project-local runtime profiles from --repo when launched outside that repo', () => {
    const target = tempTarget();
    const coordinator = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    const planPath = writeRuntimeSelectionPlan(target, 'Demo external coordinator runtime profile resolution.');
    mkdirSync(join(target, '.osc/runtimes'), { recursive: true });
    writeFileSync(join(target, '.osc/runtimes/external-agent.json'), JSON.stringify({
      schemaVersion: 'open-scaffold.runtime-profile.v1',
      id: 'external-agent',
      displayName: 'External Agent',
      lane: 'plain-agent',
      status: 'user-defined',
      description: 'Project-local profile resolved through --repo.',
      workflows: { plan: 'external-agent plan' },
      defaults: { workflow: 'plan', harnessSkill: 'external-agent plan' },
      launch: { owner: 'external-adapter', commandTemplate: 'external-agent run <run.json>', spawning: false },
    }, null, 2));

    execFileSync(tsx, [cli, 'run', planPath, '--runtime', 'external-agent', '--repo', target], { cwd: coordinator, encoding: 'utf8' });
    const runsDir = join(coordinator, '.osc/runs');
    const runId = readdirSync(runsDir).sort().at(-1);
    const manifest = JSON.parse(readFileSync(join(runsDir, runId!, 'run.json'), 'utf8'));

    expect(manifest.runtimeSelection).toMatchObject({ runtime: 'external-agent', workflow: 'plan', profileId: 'external-agent', profileSource: 'project' });
    expect(manifest.executor).toMatchObject({ lane: 'plain-agent', harnessSkill: 'external-agent plan', spawning: false });
  }, 15_000);

  it('rejects project profiles that override reserved built-in ids', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    mkdirSync(join(target, '.osc/runtimes'), { recursive: true });
    writeFileSync(join(target, '.osc/runtimes/omx.json'), JSON.stringify({
      schemaVersion: 'open-scaffold.runtime-profile.v1',
      id: 'omx',
      displayName: 'Fake OMX',
      lane: 'custom',
      status: 'user-defined',
      description: 'Should not override built-in OMX.',
      launch: { spawning: false },
    }, null, 2));

    const result = spawnSync(tsx, [cli, 'runtimes', 'list'], { cwd: target, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('uses reserved built-in id: omx');
  }, 15_000);

  it('rejects duplicate project runtime profile ids', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    mkdirSync(join(target, '.osc/runtimes'), { recursive: true });
    const profile = {
      schemaVersion: 'open-scaffold.runtime-profile.v1',
      id: 'dupe-agent',
      displayName: 'Dupe Agent',
      lane: 'plain-agent',
      status: 'user-defined',
      description: 'Duplicate id fixture.',
      launch: { spawning: false },
    };
    writeFileSync(join(target, '.osc/runtimes/a.json'), JSON.stringify(profile, null, 2));
    writeFileSync(join(target, '.osc/runtimes/b.json'), JSON.stringify(profile, null, 2));

    const result = spawnSync(tsx, [cli, 'runtimes', 'list'], { cwd: target, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Duplicate project runtime profile id: dupe-agent');
  }, 15_000);

  it('rejects runtime profiles that try to enable spawning or installer execution', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    mkdirSync(join(target, '.osc/runtimes'), { recursive: true });
    writeFileSync(join(target, '.osc/runtimes/spawner.json'), JSON.stringify({
      schemaVersion: 'open-scaffold.runtime-profile.v1',
      id: 'spawner',
      displayName: 'Spawner',
      lane: 'custom',
      status: 'user-defined',
      description: 'Unsafe profile.',
      install: { auto: true },
      launch: { spawning: true },
    }, null, 2));

    const result = spawnSync(tsx, [cli, 'runtimes', 'show', 'spawner'], { cwd: target, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('install.auto must be false');
    expect(result.stderr).toContain('launch.spawning must be false');
  }, 15_000);

  it('rejects non-object install and launch blocks in runtime profiles', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    mkdirSync(join(target, '.osc/runtimes'), { recursive: true });
    writeFileSync(join(target, '.osc/runtimes/bad-blocks.json'), JSON.stringify({
      schemaVersion: 'open-scaffold.runtime-profile.v1',
      id: 'bad-blocks',
      displayName: 'Bad Blocks',
      lane: 'plain-agent',
      status: 'user-defined',
      description: 'Invalid install and launch blocks.',
      install: 'portal',
      launch: [],
    }, null, 2));

    const result = spawnSync(tsx, [cli, 'runtimes', 'show', 'bad-blocks'], { cwd: target, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('install must be an object');
    expect(result.stderr).toContain('launch must be an object');
  }, 15_000);

  it('rejects empty workflow command tokens in runtime profiles', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    mkdirSync(join(target, '.osc/runtimes'), { recursive: true });
    writeFileSync(join(target, '.osc/runtimes/empty-workflow.json'), JSON.stringify({
      schemaVersion: 'open-scaffold.runtime-profile.v1',
      id: 'empty-workflow',
      displayName: 'Empty Workflow',
      lane: 'plain-agent',
      status: 'user-defined',
      description: 'Invalid empty workflow token.',
      workflows: { plan: '' },
      launch: { spawning: false },
    }, null, 2));

    const result = spawnSync(tsx, [cli, 'runtimes', 'show', 'empty-workflow'], { cwd: target, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('workflows.plan must not be an empty string');
  }, 15_000);

  it('rejects unsupported default operator surfaces in runtime profiles', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    mkdirSync(join(target, '.osc/runtimes'), { recursive: true });
    writeFileSync(join(target, '.osc/runtimes/bad-surface.json'), JSON.stringify({
      schemaVersion: 'open-scaffold.runtime-profile.v1',
      id: 'bad-surface',
      displayName: 'Bad Surface',
      lane: 'plain-agent',
      status: 'user-defined',
      description: 'Invalid default operator surface.',
      defaults: { operatorSurface: 'matrix' },
      launch: { spawning: false },
    }, null, 2));

    const result = spawnSync(tsx, [cli, 'runtimes', 'show', 'bad-surface'], { cwd: target, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('defaults.operatorSurface must be one of');
  }, 15_000);

  it('rejects empty default harness skills in runtime profiles', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    mkdirSync(join(target, '.osc/runtimes'), { recursive: true });
    writeFileSync(join(target, '.osc/runtimes/empty-default-harness.json'), JSON.stringify({
      schemaVersion: 'open-scaffold.runtime-profile.v1',
      id: 'empty-default-harness',
      displayName: 'Empty Default Harness',
      lane: 'plain-agent',
      status: 'user-defined',
      description: 'Invalid empty default harness skill.',
      defaults: { workflow: 'plan', harnessSkill: '' },
      launch: { spawning: false },
    }, null, 2));

    const result = spawnSync(tsx, [cli, 'runtimes', 'show', 'empty-default-harness'], { cwd: target, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('defaults.harnessSkill must not be an empty string');
  }, 15_000);

  it('rejects non-object defaults in runtime profiles', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    mkdirSync(join(target, '.osc/runtimes'), { recursive: true });
    writeFileSync(join(target, '.osc/runtimes/bad-defaults.json'), JSON.stringify({
      schemaVersion: 'open-scaffold.runtime-profile.v1',
      id: 'bad-defaults',
      displayName: 'Bad Defaults',
      lane: 'plain-agent',
      status: 'user-defined',
      description: 'Invalid defaults block.',
      defaults: 'plan',
      launch: { spawning: false },
    }, null, 2));

    const result = spawnSync(tsx, [cli, 'runtimes', 'show', 'bad-defaults'], { cwd: target, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('defaults must be an object');
  }, 15_000);

  it('preserves trusted runtime profile source metadata in show output', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    mkdirSync(join(target, '.osc/runtimes'), { recursive: true });
    writeFileSync(join(target, '.osc/runtimes/spoof.json'), JSON.stringify({
      schemaVersion: 'open-scaffold.runtime-profile.v1',
      id: 'spoof',
      displayName: 'Spoof',
      lane: 'plain-agent',
      status: 'user-defined',
      description: 'Attempts to spoof trusted output metadata.',
      source: 'builtin',
      path: '/trusted',
      launch: { spawning: false },
    }, null, 2));

    const shown = JSON.parse(execFileSync(tsx, [cli, 'runtimes', 'show', 'spoof'], { cwd: target, encoding: 'utf8' }));
    expect(shown).toMatchObject({ id: 'spoof', source: 'project' });
    expect(shown.path).toContain('.osc/runtimes/spoof.json');
  }, 15_000);

  it('rejects unknown runtime ids', () => {
    const target = tempTarget();
    execFileSync(tsx, [cli, 'init', '--standard', '--target', target], { encoding: 'utf8' });
    const planPath = writeRuntimeSelectionPlan(target, 'Demo unknown runtime rejection.');

    const result = spawnSync(tsx, [cli, 'run', planPath, '--runtime', 'missing-runtime', '--repo', target], { cwd: target, encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Unknown runtime profile: missing-runtime');
  }, 15_000);

});
