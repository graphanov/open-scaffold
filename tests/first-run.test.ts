import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { previewFirstRun, runFirstRun } from '../src/first-run.js';
import { closePlan, movePlan } from '../src/scaffold.js';

const options = { slug: 'first-task', mission: 'Keep a reliable local work record.', goal: 'Prepare one reviewable slice.' };

describe('first-run record identity', () => {
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
