import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { checkAbPacket } from '../src/ab.js';

const repoRoot = resolve(import.meta.dirname, '..');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const cli = join(repoRoot, 'src/cli.ts');
const shippedPacket = join(repoRoot, 'docs/examples/ab-comparison');

function tempDir(prefix = 'osc-ab-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

const VALID_PREREG = [
  '# Pre-Registration',
  '',
  '## Hypotheses',
  '- H1: arm A resumes faster. Null: no difference.',
  '',
  '## Arms',
  '- Arm A scaffolded; Arm B control.',
  '',
  '## Metrics',
  '- resume_time_seconds, source-labeled.',
  '',
  '## Analysis plan',
  '- Descriptive only; report every arm.',
  '',
  '## Attestation',
  '- These were committed before any data was collected.',
  '',
].join('\n');

const VALID_CSV = [
  'task_id,arm,metric,value,source,notes',
  'T01,A,resume_time_seconds,42,manual,ok',
  'T02,B,resume_time_seconds,,unavailable,no data',
  '',
].join('\n');

function writePacket(dir: string, prereg: string, csv: string) {
  writeFileSync(join(dir, 'pre-registration.md'), prereg);
  writeFileSync(join(dir, 'raw-data-template.csv'), csv);
}

describe('checkAbPacket', () => {
  it('accepts the shipped example packet as well-formed', () => {
    const report = checkAbPacket(shippedPacket, repoRoot);

    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.preRegistration).toBe('docs/examples/ab-comparison/pre-registration.md');
    expect(report.rawData).toBe('docs/examples/ab-comparison/raw-data-template.csv');
  });

  it('accepts a header-only raw-data file (an empty template with no data rows)', () => {
    const dir = tempDir();
    writePacket(dir, VALID_PREREG, 'task_id,arm,metric,value,source,notes\n');

    expect(checkAbPacket(dir, dir).ok).toBe(true);
  });

  it('rejects a raw-data file missing the required source column', () => {
    const dir = tempDir();
    writePacket(dir, VALID_PREREG, 'task_id,arm,metric,value\nT01,A,resume_time_seconds,12\n');

    const report = checkAbPacket(dir, dir);

    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => /missing required column: source/i.test(issue.message))).toBe(true);
  });

  it('rejects a row whose arm is not A or B', () => {
    const dir = tempDir();
    writePacket(dir, VALID_PREREG, 'task_id,arm,metric,value,source,notes\nT01,C,resume_time_seconds,,unavailable,x\n');

    const report = checkAbPacket(dir, dir);

    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => /invalid arm "C"/i.test(issue.message))).toBe(true);
  });

  it('rejects a row whose source label is outside the allowed set', () => {
    const dir = tempDir();
    writePacket(dir, VALID_PREREG, 'task_id,arm,metric,value,source,notes\nT01,A,resume_time_seconds,12,guess,x\n');

    const report = checkAbPacket(dir, dir);

    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => /invalid source "guess"/i.test(issue.message))).toBe(true);
  });

  it('enforces the honesty rule that unavailable means blank and a real source means a number', () => {
    const dir = tempDir();
    writePacket(
      dir,
      VALID_PREREG,
      [
        'task_id,arm,metric,value,source,notes',
        'T01,A,resume_time_seconds,99,unavailable,value-but-unavailable',
        'T02,A,resume_time_seconds,,manual,blank-but-measured',
        'T03,A,resume_time_seconds,lots,manual,not-numeric',
        '',
      ].join('\n'),
    );

    const report = checkAbPacket(dir, dir);

    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => /source is "unavailable"/i.test(issue.message))).toBe(true);
    expect(report.issues.some((issue) => /blank but source is "manual"/i.test(issue.message))).toBe(true);
    expect(report.issues.some((issue) => /not numeric/i.test(issue.message))).toBe(true);
  });

  it('rejects a pre-registration missing the commit-before-data attestation', () => {
    const dir = tempDir();
    writePacket(dir, VALID_PREREG.replace('These were committed before any data was collected.', 'Filled in.'), VALID_CSV);

    const report = checkAbPacket(dir, dir);

    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => /attestation/i.test(issue.message))).toBe(true);
  });

  it('rejects a pre-registration missing a required section', () => {
    const dir = tempDir();
    writePacket(dir, VALID_PREREG.replace('## Hypotheses', '## Guesses'), VALID_CSV);

    const report = checkAbPacket(dir, dir);

    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => /missing a "Hypotheses" heading/i.test(issue.message))).toBe(true);
  });

  it('reports a missing packet directory without throwing', () => {
    const report = checkAbPacket(join(tempDir(), 'does-not-exist'));

    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => /does not exist/i.test(issue.message))).toBe(true);
  });
});

describe('osc ab check CLI', () => {
  it('exits 0 and reports well-formed for the shipped packet', () => {
    const result = spawnSync(tsx, [cli, 'ab', 'check', 'docs/examples/ab-comparison'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('well-formed');
    expect(result.stdout).toContain('not that any experiment was run');
  });

  it('exits 1 with an explicit message for a malformed raw-data file', () => {
    const dir = tempDir();
    const csv = join(dir, 'no-source.csv');
    writeFileSync(csv, 'task_id,arm,metric,value\nT01,A,resume_time_seconds,12\n');

    const result = spawnSync(tsx, [cli, 'ab', 'check', csv], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing required column: source');
  });

  it('treats a missing path as a usage error (exit 2)', () => {
    const result = spawnSync(tsx, [cli, 'ab', 'check'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Missing required argument: path');
  });

  it('prints usage under --help at exit 0', () => {
    const result = spawnSync(tsx, [cli, 'ab', '--help'], { cwd: repoRoot, encoding: 'utf8' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: osc ab check');
  });
});

describe('A/B packet honesty guard', () => {
  it('keeps the no-data / no-claim disclaimer prominent in the runbook and packet readme', () => {
    const runbook = readFileSync(join(repoRoot, 'docs/AB_COMPARISON_PILOT.md'), 'utf8');
    const packetReadme = readFileSync(join(repoRoot, 'docs/examples/ab-comparison/README.md'), 'utf8');

    expect(runbook).toContain('No data has been collected');
    expect(packetReadme).toContain('No data has been collected');
    expect(packetReadme).toContain('proves nothing about outcomes');
  });
});
