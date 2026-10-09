import { describe, expect, it, vi } from 'vitest';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { previewFirstRun, runFirstRun } from '../src/first-run.js';
import { closePlan, movePlan } from '../src/scaffold.js';

vi.mock('node:fs', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs')>();
  return { ...fs, readFileSync: vi.fn(fs.readFileSync) };
});

const options = { slug: 'first-task', mission: 'Keep a reliable local work record.', goal: 'Prepare one reviewable slice.' };

describe('first-run record identity', () => {
  it('creates canonical evidence and preserves an authored legacy note on repeat', () => {
    const target = mkdtempSync(join(tmpdir(), 'osc-first-legacy-repeat-'));
    try {
      const first = runFirstRun(options, target);
      const path = join(target, first.evidencePath);
      const skeleton = readFileSync(path, 'utf8');
      expect(skeleton).toContain('\n## Verification\n');
      expect(skeleton).not.toContain('## Verification commands and results');
      expect(skeleton).toContain('Pending: replace this line with real command output');
      expect(skeleton).toContain('approval.status: blocked');
      const authored = skeleton.replace('## Verification', '## Verification commands and results')
        .replace('- Pending: replace this line with real command output before closing the plan.', '- Author result: bounded assertion passed; local fixture only.');
      writeFileSync(path, authored);
      writeFileSync(join(target, 'application.txt'), 'Unrelated authored bytes: café 路径\n');
      const before = snapshotBoundaryTree(target);
      const repeated = runFirstRun({ ...options, goal: 'Must preserve authored intent.' }, target);
      expect(repeated.evidencePath).toBe(first.evidencePath);
      expect(readFileSync(path, 'utf8')).toBe(authored);
      expect(snapshotBoundaryTree(target)).toEqual(before);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it('rejects invalid input before initializing a target', () => {
    const target = mkdtempSync(join(tmpdir(), 'osc-first-input-'));
    try {
      for (const invalid of [{ ...options, slug: '../bad' }, { ...options, slug: 'bad.md' }, { ...options, goal: '' }, { ...options, mission: ' ' }]) {
        expect(() => runFirstRun(invalid, target)).toThrow();
        expect(existsSync(join(target, 'MISSION.md'))).toBe(false);
        expect(existsSync(join(target, '.osc'))).toBe(false);
      }
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it('keeps preview input collection permissive and explicit missing roots non-creating', () => {
    const owned = mkdtempSync(join(process.env.OSC_FIRST_RUN_FIXTURE_ROOT ?? tmpdir(), 'osc-first-preview-input-'));
    try {
      expect(previewFirstRun({ ...options, mission: '', goal: '' }, owned).missionAction).toBe('write');
      expect(readdirSync(owned)).toEqual([]);
      const missing = join(owned, 'missing-selected-root');
      expect(() => runFirstRun({ ...options, root: missing }, owned)).toThrow();
      expect(readdirSync(owned)).toEqual([]);
    } finally {
      rmSync(owned, { recursive: true, force: true });
    }
  });

  it('preserves staged plans and previous-day evidence when first-run is repeated', () => {
    const target = mkdtempSync(join(tmpdir(), 'osc-first-repeat-'));
    try {
      const first = runFirstRun(options, target);
      const original = readFileSync(join(target, first.planPath), 'utf8');
      const oldEvidencePath = '.osc/releases/2020-01-01-first-task.md';
      renameSync(join(target, first.evidencePath), join(target, oldEvidencePath));
      movePlan(options.slug, 'blocked', target);
      const blocked = runFirstRun({ ...options, goal: 'Must not replace prior intent.' }, target);
      expect(blocked.planPath).toBe('.osc/plans/blocked/first-task.md');
      expect(blocked.evidencePath).toBe(oldEvidencePath);
      expect(blocked.nextCommands.some((command) => /\bhandoff\b/.test(command))).toBe(false);
      expect(existsSync(join(target, '.osc/plans/active/first-task.md'))).toBe(false);
      closePlan(options.slug, target, 'Local exercise reviewed.');
      const before = readFileSync(join(target, '.osc/plans/done/first-task.md'), 'utf8');
      const preview = previewFirstRun(options, target);
      const repeated = runFirstRun(options, target);
      expect(preview.planPath).toBe('.osc/plans/done/first-task.md');
      expect(repeated.planPath).toBe(preview.planPath);
      expect(repeated.nextCommands.some((command) => /\b(?:handoff|close)\b/.test(command))).toBe(false);
      expect(repeated.evidencePath).toBe(oldEvidencePath);
      expect(readFileSync(join(target, repeated.planPath), 'utf8')).toBe(before);
      expect(before).toContain('Prepare one reviewable slice.');
      expect(before).not.toContain('Must not replace prior intent.');
      expect(original).toContain('npx open-scaffold@latest handoff --plan first-task');
      expect(existsSync(join(target, '.osc/plans/active/first-task.md'))).toBe(false);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});

function snapshotBoundaryTree(root: string): Record<string, { kind: string; value?: string }> {
  const entries: Record<string, { kind: string; value?: string }> = {};
  const visit = (path: string) => {
    const name = relative(root, path).replace(/\\/g, '/') || '.';
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) entries[name] = { kind: 'link', value: readlinkSync(path) };
    else if (stat.isDirectory()) {
      entries[name] = { kind: 'directory' };
      for (const child of readdirSync(path).sort()) visit(join(path, child));
    } else entries[name] = { kind: 'file', value: readFileSync(path).toString('base64') };
  };
  visit(root);
  return entries;
}

function boundaryFixture() {
  const owned = mkdtempSync(join(process.env.OSC_FIRST_RUN_FIXTURE_ROOT ?? tmpdir(), 'osc-first-boundary-'));
  const root = join(owned, "project's café 路径");
  const outside = join(owned, 'outside-selected-repository');
  mkdirSync(join(root, '.osc/plans/active'), { recursive: true });
  mkdirSync(join(root, '.osc/releases'));
  mkdirSync(outside);
  writeFileSync(join(root, 'MISSION.md'), '# Mission\n<!-- mission:unset -->\n');
  writeFileSync(join(root, 'application.txt'), 'Existing project bytes: preserve.\n');
  writeFileSync(join(outside, 'sentinel.txt'), 'Owned sibling bytes: preserve.\n');
  return { owned, root, outside };
}

const linkedCases = [
  { path: 'MISSION.md', defined: false },
  { path: 'MISSION.md', defined: true },
  { path: 'MISSION.md', dangling: true },
  { path: 'MISSION.md', internal: true },
  { path: '.osc', directory: true },
  { path: '.osc/plans', directory: true },
  { path: '.osc/plans/active', directory: true },
  { path: '.osc/releases', directory: true },
  { path: '.osc/releases', directory: true, dangling: true },
  { path: '.osc/releases', directory: true, internal: true },
  { path: '.osc/plans/active/first-task.md' },
  { path: '.osc/plans/active/first-task.md', dangling: true },
  ...['backlog', 'blocked', 'done'].map((stage) => ({ path: `.osc/plans/${stage}/first-task.md`, dangling: true })),
  { path: '.osc/releases/2020-01-01-first-task.md' },
  { path: '.osc/releases/2020-01-01-first-task.md', dangling: true },
];

describe.skipIf(process.platform === 'win32')('first-run static record boundary', () => {
  it.each(linkedCases.flatMap((testCase) => ['preview', 'explicit-api', 'discovered-api'].map((route) => ({ ...testCase, route }))))('refuses $path before record reads or any tree mutation ($route/$defined/$dangling/$internal)', (testCase) => {
    const { owned, root, outside } = boundaryFixture();
    try {
      const path = join(root, testCase.path);
      mkdirSync(dirname(path), { recursive: true });
      rmSync(path, { recursive: true, force: true });
      const destination = join(testCase.internal ? root : outside, 'redirected');
      if (!testCase.dangling) {
        if (testCase.directory) {
          mkdirSync(destination);
          if (testCase.path === '.osc') {
            mkdirSync(join(destination, 'plans/active'), { recursive: true });
            mkdirSync(join(destination, 'releases'));
          }
        } else writeFileSync(destination, testCase.defined ? '# Mission\nDefined mission: preserve.\n' : '# Mission\n<!-- mission:unset -->\n');
      }
      symlinkSync(destination, path, testCase.directory ? 'dir' : 'file');
      const before = snapshotBoundaryTree(owned);
      const invoke = testCase.route === 'preview' ? () => previewFirstRun(options, root)
        : testCase.route === 'explicit-api' ? () => runFirstRun({ ...options, root }, root) : () => runFirstRun(options, root);
      vi.mocked(readFileSync).mockClear();
      expect(invoke).toThrow(testCase.path);
      expect(vi.mocked(readFileSync).mock.calls.filter(([path]) => /MISSION\.md|first-task\.md/.test(String(path)))).toEqual([]);
      expect(snapshotBoundaryTree(owned)).toEqual(before);
    } finally {
      rmSync(owned, { recursive: true, force: true });
    }
  });

  it.each(['.osc/plans/active', '.osc/releases', 'MISSION.md', '.osc/plans/active/first-task.md', '.osc/releases/2020-01-01-first-task.md'])('rejects wrong-type %s before reads or partial writes', (path) => {
    const { owned, root } = boundaryFixture();
    try {
      const endpoint = join(root, path);
      rmSync(endpoint, { recursive: true, force: true });
      if (path === '.osc/plans/active' || path === '.osc/releases') writeFileSync(endpoint, 'Not a directory.\n');
      else mkdirSync(endpoint);
      const before = snapshotBoundaryTree(owned);
      for (const invoke of [() => previewFirstRun(options, root), () => runFirstRun({ ...options, root }, root)]) {
        vi.mocked(readFileSync).mockClear();
        expect(invoke).toThrow(path);
        expect(vi.mocked(readFileSync).mock.calls.filter(([path]) => /MISSION\.md|first-task\.md/.test(String(path)))).toEqual([]);
        expect(snapshotBoundaryTree(owned)).toEqual(before);
      }
    } finally {
      rmSync(owned, { recursive: true, force: true });
    }
  });

  it('preflights a late custom evidence link before initializing starter guidance', () => {
    const { owned, root, outside } = boundaryFixture();
    try {
      rmSync(join(root, '.osc/plans'), { recursive: true });
      rmSync(join(root, 'MISSION.md'));
      const path = `.osc/releases/${new Date().toISOString().slice(0, 10)}-first-task.md`;
      symlinkSync(join(outside, 'missing-evidence.md'), join(root, path));
      const before = snapshotBoundaryTree(owned);
      expect(() => previewFirstRun(options, root)).toThrow(path);
      expect(snapshotBoundaryTree(owned)).toEqual(before);
      expect(() => runFirstRun(options, root)).toThrow(path);
      expect(snapshotBoundaryTree(owned)).toEqual(before);
      expect(existsSync(join(root, 'AGENTS.md'))).toBe(false);
      expect(existsSync(join(root, 'CLAUDE.md'))).toBe(false);
    } finally {
      rmSync(owned, { recursive: true, force: true });
    }
  });

  it('preserves initializer refusal for a missing target immediately beneath a linked parent', () => {
    const { owned, outside } = boundaryFixture();
    try {
      const alias = join(owned, 'linked-parent');
      symlinkSync(outside, alias, 'dir');
      const before = snapshotBoundaryTree(owned);
      expect(() => runFirstRun(options, join(alias, 'new-target'))).toThrow(/symlinked path/);
      expect(snapshotBoundaryTree(owned)).toEqual(before);
    } finally {
      rmSync(owned, { recursive: true, force: true });
    }
  });

  it('preserves duplicate-stage refusal and selects regular newer evidence without policing an unselected link', () => {
    const { owned, root, outside } = boundaryFixture();
    try {
      const first = runFirstRun(options, root);
      const oldPath = join(root, '.osc/releases/2000-01-01-first-task.md');
      symlinkSync(join(outside, 'missing-old-evidence.md'), oldPath);
      const beforeRepeat = snapshotBoundaryTree(owned);
      expect(runFirstRun(options, root).evidencePath).toBe(first.evidencePath);
      expect(snapshotBoundaryTree(owned)).toEqual(beforeRepeat);
      mkdirSync(join(root, '.osc/plans/done'), { recursive: true });
      writeFileSync(join(root, '.osc/plans/done/first-task.md'), readFileSync(join(root, first.planPath)));
      const beforeDuplicate = snapshotBoundaryTree(owned);
      expect(() => runFirstRun(options, root)).toThrow('Multiple plans');
      expect(snapshotBoundaryTree(owned)).toEqual(beforeDuplicate);
    } finally {
      rmSync(owned, { recursive: true, force: true });
    }
  });

  it('allows selected existing root and ancestor aliases, preserves edited repeats and repairs a refused link', () => {
    const { owned, root, outside } = boundaryFixture();
    try {
      const alias = join(owned, 'root-alias');
      const ancestor = join(owned, 'ancestor-alias');
      symlinkSync(root, alias, 'dir');
      symlinkSync(owned, ancestor, 'dir');
      const linkedMission = join(root, 'MISSION.md');
      rmSync(linkedMission);
      writeFileSync(join(outside, 'mission.md'), '# Mission\n<!-- mission:unset -->\n');
      symlinkSync(join(outside, 'mission.md'), linkedMission);
      const refused = snapshotBoundaryTree(owned);
      expect(() => runFirstRun({ ...options, root: alias }, alias)).toThrow('MISSION.md');
      expect(snapshotBoundaryTree(owned)).toEqual(refused);
      rmSync(linkedMission);
      writeFileSync(linkedMission, '# Mission\nReviewed regular mission: preserve.\n');
      const first = runFirstRun({ ...options, goal: 'Prepare one locally reviewable repair slice.', root: alias }, alias);
      expect(first.root).toBe(alias);
      expect(first.validationIssueCount).toBe(0);
      for (const path of [first.missionPath, first.planPath, first.evidencePath]) writeFileSync(join(root, path), readFileSync(join(root, path), 'utf8') + '\nUser edit: preserve exact bytes.\n');
      const beforeRepeat = snapshotBoundaryTree(owned);
      expect(previewFirstRun(options, alias).missionAction).toBe('preserve');
      expect(runFirstRun(options, alias).planPath).toBe(first.planPath);
      expect(runFirstRun(options, join(ancestor, "project's café 路径")).evidencePath).toBe(first.evidencePath);
      expect(snapshotBoundaryTree(owned)).toEqual(beforeRepeat);
    } finally {
      rmSync(owned, { recursive: true, force: true });
    }
  });
});
