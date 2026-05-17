#!/usr/bin/env node
import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

const SUPPORTED_LANES = new Map([
  ['human', { harnessSkills: [null] }],
  ['plain-agent', { harnessSkills: [null] }],
  ['omc-claude', { harnessSkills: ['/deep-interview', '/ralplan', '/team', '/ralph', '/ultrawork'] }],
  ['omx-codex', { harnessSkills: ['$deep-interview', '$ralplan', '$team', '$ralph', '$ultrawork', '$ultragoal'] }],
]);

const WORKFLOW_HARNESS_BY_LANE = {
  'omc-claude': {
    interview: '/deep-interview',
    plan: '/ralplan',
    team: '/team',
    loop: '/ralph',
    execute: '/ultrawork',
    goal: '/ultrawork',
  },
  'omx-codex': {
    interview: '$deep-interview',
    plan: '$ralplan',
    team: '$team',
    loop: '$ralph',
    execute: '$ultrawork',
    goal: '$ultragoal',
  },
};

function fail(message) {
  console.error(`Fake/local adapter refused package: ${message}`);
  process.exit(1);
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${label} must be a non-empty string`);
  }
  return value;
}

function requireNonEmptyArray(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    fail(`${label} must be a non-empty array`);
  }
  return value;
}

function loadRunPacket(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`could not read or parse ${path}: ${error.message}`);
  }
}

function parseArgs(argv) {
  if (argv.length !== 1 && argv.length !== 3) {
    console.error('Usage: node docs/examples/runtime-binding-conformance/fake-local-adapter.mjs <path-to-run.json> [--out <dispatch-receipt.json>]');
    process.exit(2);
  }
  if (argv.length === 3 && argv[1] !== '--out') {
    fail(`unsupported argument ${argv[1]}`);
  }
  return { runPacketPath: argv[0], outPath: argv[2] ?? null };
}

function relativeFromRepo(repoPath, path) {
  const repoRoot = resolve(repoPath);
  const rel = relative(repoRoot, resolve(path));
  if (rel.startsWith('..') || isAbsolute(rel)) {
    fail('run packet path must stay under runtime.repoPath');
  }
  const realRepoRoot = realpathSync.native(repoRoot);
  const realPath = realpathSync.native(path);
  assertPathInside(realRepoRoot, realPath, 'run packet path must stay under runtime.repoPath');
  return rel === '' ? '.' : rel;
}

function assertPathInside(root, path, message) {
  const rel = relative(root, path);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    fail(message);
  }
}

function assertExistingParentsInsideRepo(lexicalRepoRoot, realRepoRoot, targetDir) {
  const rel = relative(lexicalRepoRoot, targetDir);
  const parts = rel.split(/[\\/]+/).filter(Boolean);
  let current = lexicalRepoRoot;
  for (const part of parts) {
    current = resolve(current, part);
    try {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) {
        fail('artifact path must stay under runtime.repoPath');
      }
      const realCurrent = realpathSync.native(current);
      assertPathInside(realRepoRoot, realCurrent, 'artifact path must stay under runtime.repoPath');
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return;
      }
      fail(`could not validate artifact path: ${error.message}`);
    }
  }
}

function prepareSafeArtifactPath(repoPath, artifactPath) {
  const raw = requireString(artifactPath, 'artifacts.evidence[0]');
  if (isAbsolute(raw)) {
    fail('artifact path must stay under runtime.repoPath');
  }
  const repoRoot = resolve(repoPath);
  const absolutePath = resolve(repoRoot, raw);
  if (relative(repoRoot, absolutePath) === '') {
    fail('artifact path must name a file under runtime.repoPath');
  }
  assertPathInside(repoRoot, absolutePath, 'artifact path must stay under runtime.repoPath');

  const realRepoRoot = realpathSync.native(repoRoot);
  assertExistingParentsInsideRepo(repoRoot, realRepoRoot, dirname(absolutePath));
  mkdirSync(dirname(absolutePath), { recursive: true });
  const realArtifactDir = realpathSync.native(dirname(absolutePath));
  assertPathInside(realRepoRoot, realArtifactDir, 'artifact path must stay under runtime.repoPath');

  try {
    const artifactStat = lstatSync(absolutePath);
    if (artifactStat.isSymbolicLink()) {
      fail('artifact path must stay under runtime.repoPath');
    }
    const realArtifactPath = realpathSync.native(absolutePath);
    assertPathInside(realRepoRoot, realArtifactPath, 'artifact path must stay under runtime.repoPath');
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      fail(`could not validate artifact path: ${error.message}`);
    }
  }

  return { raw, absolutePath };
}

function hasBlockingOpenQuestions(openQuestions) {
  if (!Array.isArray(openQuestions)) {
    return false;
  }
  return openQuestions.some((question) => {
    if (typeof question === 'string') {
      return /\bblocking\b/i.test(question);
    }
    if (question && typeof question === 'object') {
      return question.blocking === true
        || question.required === true
        || /\bblocking\b/i.test(String(question.status ?? ''))
        || /\bblocking\b/i.test(String(question.severity ?? ''));
    }
    return false;
  });
}

function normalizeLane(lane) {
  return lane === 'manual' ? 'human' : lane;
}

function harnessSkill(manifest) {
  return manifest?.executor?.harnessSkill ?? manifest?.executor?.harness_skill ?? null;
}

function validateLaneAndHarness(manifest) {
  const lane = normalizeLane(requireString(manifest?.executor?.lane, 'executor.lane'));
  const laneContract = SUPPORTED_LANES.get(lane);
  if (!laneContract) {
    fail(`unsupported executor.lane ${lane}`);
  }

  const skill = harnessSkill(manifest);
  if (!laneContract.harnessSkills.includes(skill)) {
    if (skill === null) {
      fail(`executor.harnessSkill is required for lane ${lane}`);
    }
    fail(`executor.harnessSkill ${skill} is not allowed for lane ${lane}`);
  }

  const workflow = manifest?.runtimeSelection?.workflow ?? null;
  const requiredSkill = WORKFLOW_HARNESS_BY_LANE[lane]?.[workflow];
  if (requiredSkill && skill !== requiredSkill) {
    fail(`runtimeSelection.workflow ${workflow} requires executor.harnessSkill ${requiredSkill}`);
  }

  return { lane, skill };
}

const { runPacketPath, outPath } = parseArgs(process.argv.slice(2));
const manifest = loadRunPacket(runPacketPath);

if (manifest.schemaVersion !== 'open-scaffold.run.v1') {
  fail(`unsupported schemaVersion ${manifest.schemaVersion}`);
}

const runId = requireString(manifest.runId, 'runId');
const planPath = requireString(manifest?.plan?.path, 'plan.path');
requireString(manifest?.plan?.goal, 'plan.goal');
const repoPath = requireString(manifest?.runtime?.repoPath, 'runtime.repoPath');
const commitPolicy = requireString(manifest.commitPolicy, 'commitPolicy');
const worktreePath = manifest?.runtime?.worktreePath ?? null;
const branch = manifest?.runtime?.branch ?? null;
const { lane, skill } = validateLaneAndHarness(manifest);
const runPacketRelativePath = relativeFromRepo(repoPath, runPacketPath);

if (manifest?.packageQuality?.executable !== true) {
  fail('packageQuality.executable must be true before dispatch');
}
if (!Array.isArray(manifest?.packageQuality?.blockers) || manifest.packageQuality.blockers.length > 0) {
  fail('packageQuality.blockers must be an empty array before dispatch');
}
if (hasBlockingOpenQuestions(manifest?.plan?.openQuestions)) {
  fail('plan.openQuestions must not contain blocking questions before dispatch');
}
requireNonEmptyArray(manifest?.plan?.acceptanceCriteria, 'plan.acceptanceCriteria');
requireNonEmptyArray(manifest?.plan?.verificationSteps, 'plan.verificationSteps');
if (manifest?.executor?.spawning !== false) {
  fail('executor.spawning must be false; Open Scaffold core packages work while adapters own launch behavior');
}

const defaultReceiptPath = `${dirname(runPacketRelativePath)}/dispatch-receipt.json`;
const { raw: receiptRelativePath, absolutePath: receiptPath } = prepareSafeArtifactPath(repoPath, outPath ?? defaultReceiptPath);
const fallbackEvidencePath = `.osc/runs/${runId}/fake-local-evidence.md`;
const { raw: evidencePath, absolutePath: evidenceAbsolutePath } = prepareSafeArtifactPath(
  repoPath,
  manifest?.artifacts?.evidence?.[0] ?? fallbackEvidencePath,
);

if (resolve(receiptPath) === resolve(evidenceAbsolutePath)) {
  fail('dispatch receipt and evidence paths must be distinct');
}

const evidence = `# Fake/local adapter evidence\n\nSchema: open-scaffold.adapter-evidence.v1\nRun ID: ${runId}\nTask ID: ${manifest.taskId ?? '(none)'}\nPlan: ${planPath}\nDispatch receipt: ${receiptRelativePath}\nAdapter ID: fake-local\nRuntime backend: none\nExecutor lane: ${lane}\nHarness skill: ${skill ?? '(none)'}\nSpawned: false\n\nThis evidence was written by the fake/local adapter conformance fixture.\nNo runtime was launched. No network access or credentials were required.\n`;
writeFileSync(evidenceAbsolutePath, evidence);

const receipt = {
  schema_version: 'open-scaffold.dispatch-receipt.v1',
  receipt_id: `fake-local:${runId}`,
  run_id: runId,
  task_id: manifest.taskId ?? null,
  adapter_id: 'fake-local',
  runtime_backend: 'none',
  invoked_by: 'fake-local-adapter',
  invoked_at: '1970-01-01T00:00:00.000Z',
  working_directory: repoPath,
  worktree_path: worktreePath,
  branch,
  run_packet_path: runPacketRelativePath,
  prompt_or_package_path: null,
  runtime_selection: {
    runtime: manifest?.runtimeSelection?.runtime ?? null,
    workflow: manifest?.runtimeSelection?.workflow ?? null,
    profile_id: manifest?.runtimeSelection?.profileId ?? null,
    profile_source: manifest?.runtimeSelection?.profileSource ?? null,
  },
  authority: {
    sandbox_policy: ['write_artifacts_only', 'commit_forbidden', 'push_forbidden', 'merge_forbidden', 'human_approval_required'],
    commit_policy: commitPolicy,
    approval_policy: 'human_approval_required',
  },
  spawned: false,
  spawn_command_redacted: null,
  runtime_handle: null,
  logs: [],
  artifacts: [evidencePath],
  status: 'dry_run',
  failure: {
    code: null,
    message: null,
  },
  fixture: {
    kind: 'conformance-fixture',
    lane,
    harness_skill: skill,
    plan_path: planPath,
    evidence_path: evidencePath,
    adapter_spawned_runtime: false,
    network_required: false,
    credentials_required: false,
  },
};

writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

console.log('Fake/local adapter conformance complete');
console.log(`Run ID: ${runId}`);
console.log(`Receipt: ${receiptPath}`);
console.log(`Evidence: ${evidencePath}`);
console.log('No runtime was launched. No credentials were read. No network was required.');
