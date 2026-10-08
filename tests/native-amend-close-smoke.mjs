// Standalone built-CLI/API fixture; run directly with Node, outside Vitest discovery.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { arch, release, tmpdir } from 'node:os';
import { dirname, join, resolve, sep, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(packageRoot, 'dist', 'cli.js');
const report = {
  schema: 'open-scaffold.native-amend-close-smoke.v1', passed: false,
  execution: { platform: process.platform, arch: arch(), osRelease: release(), node: process.version, nativeSeparator: sep },
  qualification: 'portable-node-amend-close-smoke',
  invocation: { argv: process.argv.slice(2) },
  childProcess: { executable: process.execPath, shell: false, environmentKeys: ['PATH', 'TZ', ...(process.platform === 'win32' ? ['SystemRoot'] : [])] },
  commands: [], assertions: [], snapshots: {}, cleanup: { attempted: false, removed: false },
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const record = (label, bytes) => { report.snapshots[label] = { sha256: sha256(bytes), bytes: bytes.length, utf8: bytes.toString('utf8') }; };
const childEnv = { PATH: dirname(process.execPath), TZ: 'UTC' };
// Only this operating-system field is read; inherited credentials are never copied.
if (process.platform === 'win32') childEnv.SystemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT ?? 'C:\\Windows';
function run(cwd, ...argv) {
  const result = spawnSync(process.execPath, [cli, ...argv], { cwd, encoding: 'utf8', shell: false, env: childEnv, timeout: 30000, maxBuffer: 1024 * 1024 });
  report.commands.push({ executable: process.execPath, argv: [cli, ...argv], cwd, status: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr,
    ...(result.error ? { error: { code: result.error.code, message: result.error.message } } : {}) });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, `${argv.join(' ')}: ${result.stderr}`);
  return result.stdout;
}
let target, evidencePath, bindingPath, requireWindows = false;
try {
  const seen = new Set();
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    assert(['--require-windows', '--evidence', '--source-binding'].includes(arg), `Unknown argument: ${arg}`);
    assert(!seen.has(arg), `Duplicate argument: ${arg}`);
    seen.add(arg);
    if (arg === '--require-windows') { requireWindows = true; continue; }
    const value = args[++index];
    assert(value && !value.startsWith('--'), `Missing path for ${arg}`);
    if (arg === '--evidence') evidencePath = resolve(value);
    else bindingPath = resolve(value);
  }
  if (evidencePath) {
    assert(!existsSync(evidencePath), 'Refusing to overwrite existing evidence.');
    assert(lstatSync(dirname(evidencePath)).isDirectory(), 'Evidence parent must already be a directory.');
  }
  if (requireWindows) {
    assert.equal(process.platform, 'win32', 'This CI qualification requires an actual Windows Node process.');
    assert.equal(process.version, 'v22.12.0', 'The native qualification requires the declared Node pin.');
    assert.equal(arch(), 'x64', 'This bounded qualification requires the declared Windows x64 runner.');
    assert(evidencePath && bindingPath, 'Native qualification requires separate evidence and source-binding paths.');
    assert.notEqual(evidencePath, bindingPath, 'Evidence must not overwrite the source binding.');
    report.qualification = 'native-windows-node-amend-close-smoke';
  }
  assert.equal(sep, process.platform === 'win32' ? '\\' : '/');
  if (bindingPath) {
    const bindingBytes = readFileSync(bindingPath);
    const binding = JSON.parse(bindingBytes.toString('utf8').replace(/^\uFEFF/, ''));
    assert.equal(binding.schema, 'open-scaffold.native-windows-source-binding.v1');
    assert.equal(binding.tested_commit, binding.event_sha);
    assert.match(binding.tested_commit, /^[a-f0-9]{40}$/);
    assert(Array.isArray(binding.files) && binding.files.length > 0);
    const paths = new Set();
    for (const file of binding.files) {
      assert(typeof file.path === 'string' && !paths.has(file.path));
      assert(!file.path.includes('\\') && !file.path.split('/').includes('..') && !file.path.startsWith('/'));
      paths.add(file.path);
      assert.match(file.git_blob_oid, /^[a-f0-9]{40}$/);
      assert.match(file.working_sha256, /^[a-f0-9]{64}$/);
      assert.equal(sha256(readFileSync(join(packageRoot, file.path))), file.working_sha256, `Working bytes changed: ${file.path}`);
    }
    for (const path of ['src/scaffold.ts', 'src/cli.ts', 'src/init.ts', 'src/path-safety.ts', 'package.json', 'package-lock.json', 'tsconfig.json', 'tests/native-amend-close-smoke.mjs', '.github/workflows/ci.yml']) assert(paths.has(path), `Missing source binding: ${path}`);
    if (requireWindows) {
      assert.equal(binding.runner_os, 'Windows');
      assert.equal(binding.runner_label, 'windows-2025');
      assert(binding.image_os && binding.image_version && binding.powershell_version);
      assert.match(binding.run_id, /^\d+$/);
      assert.match(binding.run_attempt, /^\d+$/);
      if (binding.event_name === 'pull_request') {
        assert.match(binding.pr_head_sha, /^[a-f0-9]{40}$/);
        assert.match(binding.pr_base_sha, /^[a-f0-9]{40}$/);
        assert.deepEqual(binding.tested_parents, [binding.pr_base_sha, binding.pr_head_sha]);
      }
    }
    report.sourceBinding = { path: bindingPath, sha256: sha256(bindingBytes), data: binding };
  }
  report.artifactSha256 = Object.fromEntries(['dist/cli.js', 'dist/scaffold.js', 'tests/native-amend-close-smoke.mjs']
    .map((path) => [path, sha256(readFileSync(join(packageRoot, path)))]));
  const { createPlanAmendment } = await import(new URL('../dist/scaffold.js', import.meta.url));
  target = mkdtempSync(join(tmpdir(), 'osc native amend close '));
  run(packageRoot, 'init', '--tier', 'min', '--target', target);
  const slug = 'native-amend-close';
  const parentName = `${slug}.md`;
  const firstName = `${slug}-amendment-1.md`;
  const secondName = `${slug}-amendment-2.md`;
  const canonicalFirst = `.osc/plans/active/${firstName}`;
  const canonicalSecond = `.osc/plans/active/${secondName}`;
  const nativeFirst = ['.osc', 'plans', 'active', firstName].join(sep);
  const nativeSecond = ['.osc', 'plans', 'active', secondName].join(sep);
  const windowsFirst = win32.relative('C:\\fixture', `C:\\fixture\\.osc\\plans\\active\\${firstName}`);
  const windowsAlias = `.osc\\plans\\backlog\\${secondName}`;
  const anchor = '<!-- append YYYY-MM-DD entries below this line -->';
  const outside = `- 2026-10-01: Outside — see ${windowsFirst}\t  `;
  const missionSeed = ['# Mission', '', 'Qualify a bounded Node lifecycle on the actual host.', 'Outside section text.',
    '', '## Changelog', anchor, '', '## Later', 'Later section text.', ''].join('\r\n');
  writeFileSync(join(target, 'MISSION.md'), missionSeed);
  run(target, 'plan', 'new', slug, '--stage', 'active');
  const parent = ['# Native lifecycle fixture', '', '## Status', '', 'active — retain this note', '',
    '## Context', '', 'An ordinary regular plan and two regular amendments.', '',
    '## Goal', '', 'Move the records while preserving their bytes and history contract.', '',
    '## Constraints / Out of scope', '', '- Node CLI amend/close only.', '',
    '## Files to touch', '', '- `fixture.txt` — deterministic public fixture.', '',
    '## Acceptance criteria', '', '- [x] This fixture is ready for closure.', '',
    '## Verification steps', '', '1. Run this standalone smoke and expect exit zero.', '',
    '## Open questions', '', '- None.', ''].join('\r\n');
  writeFileSync(join(target, '.osc', 'plans', 'active', parentName), parent);
  const nested = join(target, 'nested cwd');
  mkdirSync(nested);
  const amendOutput = run(nested, 'amend', slug, '--message', '  CLI serialized  ');
  assert(amendOutput.includes(`Created amendment: ${nativeFirst}`));
  assert(amendOutput.includes('Stamped: MISSION.md changelog'));
  const firstBefore = readFileSync(join(target, '.osc', 'plans', 'active', firstName));
  const firstDate = firstBefore.toString('utf8').match(/## Date\n\n(\d{4}-\d{2}-\d{2})\n/)?.[1];
  assert(firstDate, 'CLI amendment date must use the shipped ISO day field.');
  assert(readFileSync(join(target, 'MISSION.md'), 'utf8').includes(`- ${firstDate}: CLI serialized — see ${canonicalFirst}\r\n`));
  const second = createPlanAmendment(slug, nested, '  API serialized  ', new Date(2026, 9, 8, 12));
  assert.equal(second.root, target);
  assert.equal(second.path, join(target, '.osc', 'plans', 'active', secondName));
  assert.equal(second.parentPath, join(target, '.osc', 'plans', 'active', parentName));
  assert.equal(second.relativePath, nativeSecond);
  assert.equal(second.amendmentNumber, 2);
  assert.equal(second.changelogStamped, true);
  assert(readFileSync(join(target, 'MISSION.md'), 'utf8').includes(`- 2026-10-08: API serialized — see ${canonicalSecond}\r\n`));
  const secondBefore = readFileSync(second.path);
  const legacy = `- 2026-10-02: Legacy Windows history — see ${windowsFirst}\t  `;
  const parentHistory = `- 2026-10-02: Parent history — see .osc/plans/active/${parentName}`;
  const aliasHistory = `- 2026-10-02: Surviving regular alias — see ${windowsAlias}\t  `;
  const fenced = ['```markdown', `- 2026-10-02: Fenced — see ${windowsFirst}`, '```'].join('\r\n');
  const aliasBytes = Buffer.from('Surviving regular alias.\r\n');
  writeFileSync(join(target, '.osc', 'plans', 'backlog', secondName), aliasBytes);
  const missionBefore = readFileSync(join(target, 'MISSION.md'), 'utf8')
    .replace('Outside section text.', outside).replace('Later section text.', outside).replace('\r\n## Later',
    `\r\n${legacy}\r\n${parentHistory}\r\n${aliasHistory}\r\n${fenced}\r\n## Later`);
  writeFileSync(join(target, 'MISSION.md'), missionBefore);
  record('parent-before', Buffer.from(parent));
  record('amendment-1-before', firstBefore);
  record('amendment-2-before', secondBefore);
  record('mission-before-close', Buffer.from(missionBefore));
  record('surviving-regular-alias-before', aliasBytes);
  report.fixture = { root: target, nestedCwd: nested, ordinaryFiles: [parentName, firstName, secondName], lineEnding: 'CRLF' };
  const closeOutput = run(nested, 'close', slug, '--message', '  native smoke shipped  ');
  assert(closeOutput.includes(`Closed: ${slug}`));
  assert(closeOutput.includes(`Moved to done/: ${parentName}, ${firstName}, ${secondName}`));
  for (const name of [parentName, firstName, secondName]) {
    assert.equal(existsSync(join(target, '.osc', 'plans', 'active', name)), false);
    assert.equal(lstatSync(join(target, '.osc', 'plans', 'done', name)).isFile(), true);
  }
  const parentAfter = readFileSync(join(target, '.osc', 'plans', 'done', parentName));
  const firstAfter = readFileSync(join(target, '.osc', 'plans', 'done', firstName));
  const secondAfter = readFileSync(join(target, '.osc', 'plans', 'done', secondName));
  assert.deepEqual(parentAfter, Buffer.from(parent.replace('active — retain this note', 'done — retain this note')));
  assert.deepEqual(firstAfter, firstBefore);
  assert.deepEqual(secondAfter, secondBefore);
  assert.deepEqual(readFileSync(join(target, '.osc', 'plans', 'backlog', secondName)), aliasBytes);
  const missionAfter = readFileSync(join(target, 'MISSION.md'));
  const closeEntry = missionAfter.toString('utf8').match(/- \d{4}-\d{2}-\d{2}: closed native-amend-close — native smoke shipped\r\n/g);
  assert.equal(closeEntry?.length, 1);
  const expectedMission = missionBefore.replace(canonicalFirst, `.osc/plans/done/${firstName}`)
    .replace(canonicalSecond, `.osc/plans/done/${secondName}`)
    .replace(legacy, legacy.replace(windowsFirst, `.osc/plans/done/${firstName}`))
    .replace(parentHistory, parentHistory.replace(`/active/${parentName}`, `/done/${parentName}`))
    .replace(`${anchor}\r\n`, `${anchor}\r\n${closeEntry[0]}`);
  assert.deepEqual(missionAfter, Buffer.from(expectedMission));
  const repeatOutput = run(nested, 'close', slug, '--message', 'must not stamp twice');
  assert(repeatOutput.includes(`Plan ${parentName} is already in done/.`));
  assert.deepEqual(readFileSync(join(target, 'MISSION.md')), missionAfter);
  assert.deepEqual(readFileSync(join(target, '.osc', 'plans', 'done', parentName)), parentAfter);
  assert.deepEqual(readFileSync(join(target, '.osc', 'plans', 'done', firstName)), firstBefore);
  assert.deepEqual(readFileSync(join(target, '.osc', 'plans', 'done', secondName)), secondBefore);
  report.nativePaths = { apiRelativePath: second.relativePath, cliCreatedPath: nativeFirst };
  report.assertions = ['platform-recorded', ...(requireWindows ? ['native-windows-required'] : []), 'minimal-init-and-plan-new', 'native-cli-output', 'native-api-relativePath',
    'canonical-new-mission-serialization', 'regular-file-move', 'status-only-parent-byte-change', 'amendment-byte-preservation',
    'uniform-windows-history-retarget', 'posix-history-retarget', 'surviving-regular-alias-preserved',
    'outside-and-fenced-history-preserved', 'crlf-and-trailing-bytes-preserved', 'repeat-close-idempotence'];
  record('parent-after', parentAfter);
  record('amendment-1-after', firstAfter);
  record('amendment-2-after', secondAfter);
  record('mission-after-close-and-repeat', missionAfter);
  record('surviving-regular-alias-after', readFileSync(join(target, '.osc', 'plans', 'backlog', secondName)));
  report.api = { function: 'createPlanAmendment', arguments: { slug, start: nested, message: '  API serialized  ', localDateParts: [2026, 9, 8, 12] }, result: second };
  report.passed = true;
} catch (error) {
  report.error = { name: error.name, message: error.message };
  process.exitCode = 1;
} finally {
  if (target) {
    report.cleanup.attempted = true;
    try {
      rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      assert.equal(existsSync(target), false, 'Fixture cleanup did not remove the temporary root.');
      report.cleanup.removed = true;
    } catch (error) {
      report.cleanup.error = { name: error.name, message: error.message };
      report.passed = false;
      process.exitCode = 1;
    }
  }
  let json = `${JSON.stringify(report, null, 2)}\n`;
  if (evidencePath && !existsSync(evidencePath)) {
    try { writeFileSync(evidencePath, json, { flag: 'wx' }); }
    catch (error) {
      report.evidenceWriteError = { name: error.name, message: error.message };
      report.passed = false;
      process.exitCode = 1;
      json = `${JSON.stringify(report, null, 2)}\n`;
    }
  }
  console.log(json);
}
