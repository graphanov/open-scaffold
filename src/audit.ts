import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, isAbsolute, relative, resolve } from 'node:path';
import { parsePlanFile } from './scaffold.js';
import type { ValidationIssue, ValidationResult } from './validation.js';

export const AUDIT_SCHEMA = 'open-scaffold.audit-envelope.v1';
const RUN_SCHEMA = 'open-scaffold.run.v1';
const DIGEST_ALG = 'sha256';

const ARTIFACT_ROLES = new Set([
  'plan',
  'run_packet',
  'evaluation',
  'evidence',
  'postflight',
  'release_note',
  'changed_file',
  'verification',
  'review',
  'other',
]);

const PRIVATE_PATH_PREFIXES = [
  '.git/',
  '.osc/state/',
  '.osc/research/',
  '.osc-dev/',
  '.hermes/',
  'node_modules/',
];

const UNSUPPORTED_BOUNDARY_TRUE_FIELDS = [
  'domain_correctness_judgment',
  'compliance_certification',
  'approval_or_release_decision',
  'runtime_spawning',
  'model_benchmarking',
  'external_anchoring',
];

export interface AuditArtifactInput {
  role: string;
  path: string;
  id?: string;
}

export interface AuditSubject {
  source: 'plan' | 'run';
  sourcePath: string;
  planPath: string;
  planSlug: string;
  taskId: string | null;
  runId: string | null;
  runPacketPath: string | null;
}

export interface RenderAuditOptions {
  now?: Date;
}

interface ResolvedArtifact {
  id: string;
  role: string;
  path: string;
  absolutePath: string;
}

function issue(level: 'fail' | 'warn', code: string, message: string, path?: string): ValidationIssue {
  return { level, code, message, path };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function meaningfulString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !/^(todo|tbd|n\/a|none)$/i.test(value.trim());
}

function toPosix(value: string): string {
  return value.split('\\').join('/');
}

function timestampId(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function shortDigest(parts: string[]): string {
  return createHash('sha256').update(parts.join('\n'), 'utf8').digest('hex').slice(0, 16);
}

function fileDigest(path: string): string {
  return createHash(DIGEST_ALG).update(readFileSync(path)).digest('hex');
}

function rootRealpath(root: string): string {
  return existsSync(root) ? realpathSync(root) : resolve(root);
}

function isInsideRoot(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function normalizeRepoRelative(root: string, path: string): { relativePath: string; absolutePath: string } {
  const realRoot = rootRealpath(root);
  const absolute = isAbsolute(path) ? path : resolve(realRoot, path);
  if (!isInsideRoot(realRoot, absolute)) {
    throw new Error(`Audit artifact path escapes the repo root: ${path}`);
  }
  if (!existsSync(absolute)) {
    throw new Error(`Audit artifact path does not exist: ${path}`);
  }
  const realArtifact = realpathSync(absolute);
  if (!isInsideRoot(realRoot, realArtifact)) {
    throw new Error(`Audit artifact path escapes the repo root: ${path}`);
  }
  if (!statSync(realArtifact).isFile()) {
    throw new Error(`Audit artifact path is not a file: ${path}`);
  }
  return { relativePath: toPosix(relative(realRoot, absolute)), absolutePath: realArtifact };
}

function pathRelativeToRoot(root: string, path: string): string {
  const realRoot = rootRealpath(root);
  const absolute = isAbsolute(path) ? path : resolve(realRoot, path);
  const comparablePath = existsSync(absolute) ? realpathSync(absolute) : absolute;
  const rel = relative(realRoot, comparablePath);
  if (!rel || rel.startsWith('..')) return toPosix(path);
  return toPosix(rel);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function sourceFromRunPacket(sourcePath: string, root: string): AuditSubject {
  const packet = readJson(sourcePath);
  if (!isRecord(packet) || packet.schemaVersion !== RUN_SCHEMA) {
    throw new Error(`Run packet must declare schemaVersion: ${RUN_SCHEMA}`);
  }
  const plan = isRecord(packet.plan) ? packet.plan : {};
  const planPath = asString(plan.path) ?? '(unknown plan)';
  return {
    source: 'run',
    sourcePath: pathRelativeToRoot(root, sourcePath),
    planPath,
    planSlug: asString(plan.slug) ?? basename(planPath, extname(planPath)),
    taskId: asString(packet.taskId),
    runId: asString(packet.runId),
    runPacketPath: pathRelativeToRoot(root, sourcePath),
  };
}

function sourceFromPlan(sourcePath: string, root: string): AuditSubject {
  const plan = parsePlanFile(sourcePath);
  return {
    source: 'plan',
    sourcePath: pathRelativeToRoot(root, sourcePath),
    planPath: pathRelativeToRoot(root, sourcePath),
    planSlug: plan.slug,
    taskId: null,
    runId: null,
    runPacketPath: null,
  };
}

export function loadAuditSubject(sourcePath: string, root = process.cwd()): AuditSubject {
  const absolute = isAbsolute(sourcePath) ? sourcePath : resolve(root, sourcePath);
  if (!existsSync(absolute)) throw new Error(`Audit source not found: ${sourcePath}`);
  if (!statSync(absolute).isFile()) throw new Error(`Audit source is not a file: ${sourcePath}`);
  if (extname(absolute).toLowerCase() === '.json') return sourceFromRunPacket(absolute, root);
  return sourceFromPlan(absolute, root);
}

function defaultSourceArtifact(subject: AuditSubject): AuditArtifactInput {
  if (subject.source === 'run') {
    return { role: 'run_packet', path: subject.runPacketPath ?? subject.sourcePath };
  }
  return { role: 'plan', path: subject.planPath };
}

function isPrivatePath(relativePath: string): boolean {
  const normalized = toPosix(relativePath).replace(/^\.\//, '');
  return PRIVATE_PATH_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix));
}

function resolveArtifact(input: AuditArtifactInput, root: string): ResolvedArtifact {
  if (!ARTIFACT_ROLES.has(input.role)) {
    throw new Error(`Unsupported audit artifact role: ${input.role}`);
  }
  if (!meaningfulString(input.path)) {
    throw new Error('Audit artifact path is required.');
  }
  const { relativePath, absolutePath } = normalizeRepoRelative(root, input.path);
  if (isPrivatePath(relativePath)) {
    throw new Error(`Audit artifact path points at private/internal workspace state: ${relativePath}`);
  }
  return {
    id: input.id ?? `${input.role}:${relativePath}`,
    role: input.role,
    path: relativePath,
    absolutePath,
  };
}

function artifactRecord(artifact: ResolvedArtifact) {
  const stats = statSync(artifact.absolutePath);
  return {
    id: artifact.id,
    role: artifact.role,
    path: artifact.path,
    digest: {
      alg: DIGEST_ALG,
      value: fileDigest(artifact.absolutePath),
    },
    size_bytes: stats.size,
  };
}

export function renderAuditManifest(sourcePath: string, artifacts: AuditArtifactInput[] = [], root = process.cwd(), options: RenderAuditOptions = {}): string {
  const now = options.now ?? new Date();
  const subject = loadAuditSubject(sourcePath, root);
  const resolved = [defaultSourceArtifact(subject), ...artifacts].map((artifact) => resolveArtifact(artifact, root));
  const seen = new Set<string>();
  for (const artifact of resolved) {
    if (seen.has(artifact.id)) throw new Error(`Duplicate audit artifact id: ${artifact.id}`);
    seen.add(artifact.id);
  }
  const stamp = timestampId(now);
  const artifactRecords = resolved.map(artifactRecord);
  const envelope = {
    schema: AUDIT_SCHEMA,
    audit_envelope_id: `${stamp}-${subject.runId ?? subject.planSlug}-audit`,
    idempotency_key: `audit:${subject.source}:${subject.runId ?? subject.planSlug}:${shortDigest(artifactRecords.map((artifact) => `${artifact.role}:${artifact.path}:${artifact.digest.value}`))}`,
    created_at: now.toISOString(),
    subject: {
      source: subject.source,
      plan: subject.planPath,
      plan_slug: subject.planSlug,
      task_id: subject.taskId,
      run_id: subject.runId,
      run_packet: subject.runPacketPath,
    },
    artifacts: artifactRecords,
    boundary: {
      digest_integrity_only: true,
      local_files_only: true,
      domain_correctness_judgment: false,
      compliance_certification: false,
      approval_or_release_decision: false,
      runtime_spawning: false,
      model_benchmarking: false,
      external_anchoring: false,
    },
    notes: [
      'This audit manifest records local artifact paths and sha256 content digests. It does not certify correctness, compliance, approval, runtime execution, model quality, or external anchoring.',
    ],
  };
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

export function writeAuditManifest(sourcePath: string, artifacts: AuditArtifactInput[], outPath: string, root = process.cwd(), options: RenderAuditOptions = {}): { path: string } {
  const absoluteOut = isAbsolute(outPath) ? outPath : resolve(root, outPath);
  writeFileSync(absoluteOut, renderAuditManifest(sourcePath, artifacts, root, options), { encoding: 'utf8', flag: 'wx' });
  return { path: absoluteOut };
}

function validateArtifactPath(rawPath: string, failures: ValidationIssue[], manifestPath: string | undefined, root: string): string | null {
  if (isAbsolute(rawPath)) {
    failures.push(issue('fail', 'audit.artifact.path_absolute', `Audit artifact path must be repo-relative, not absolute: ${rawPath}`, manifestPath));
    return null;
  }
  const normalized = toPosix(rawPath).replace(/^\.\//, '');
  if (!meaningfulString(normalized)) {
    failures.push(issue('fail', 'audit.artifact.missing_path', 'Audit artifact is missing path.', manifestPath));
    return null;
  }
  let privatePath = false;
  if (isPrivatePath(normalized)) {
    failures.push(issue('fail', 'audit.artifact.private_path', `Audit artifact path points at private/internal workspace state: ${normalized}`, manifestPath));
    privatePath = true;
  }
  const realRoot = rootRealpath(root);
  const absolute = resolve(realRoot, normalized);
  if (!isInsideRoot(realRoot, absolute)) {
    failures.push(issue('fail', 'audit.artifact.path_outside_root', `Audit artifact path escapes the repo root: ${rawPath}`, manifestPath));
    return null;
  }
  if (!existsSync(absolute)) {
    failures.push(issue('fail', 'audit.artifact.path_missing', `Audit artifact path does not exist: ${rawPath}`, manifestPath));
    return null;
  }
  let realArtifact: string;
  try {
    realArtifact = realpathSync(absolute);
  } catch (error) {
    failures.push(issue('fail', 'audit.artifact.path_unreadable', error instanceof Error ? error.message : `Could not read artifact path: ${rawPath}`, manifestPath));
    return null;
  }
  if (!isInsideRoot(realRoot, realArtifact)) {
    failures.push(issue('fail', 'audit.artifact.path_outside_root', `Audit artifact path escapes the repo root: ${rawPath}`, manifestPath));
    return null;
  }
  const canonicalRelative = toPosix(relative(realRoot, realArtifact));
  if (!privatePath && isPrivatePath(canonicalRelative)) {
    failures.push(issue('fail', 'audit.artifact.private_path', `Audit artifact path points at private/internal workspace state: ${canonicalRelative}`, manifestPath));
  }
  if (!statSync(realArtifact).isFile()) {
    failures.push(issue('fail', 'audit.artifact.path_not_file', `Audit artifact path is not a file: ${rawPath}`, manifestPath));
    return null;
  }
  return realArtifact;
}

function validateSubject(parsed: Record<string, unknown>, failures: ValidationIssue[], path: string | undefined): void {
  const subject = isRecord(parsed.subject) ? parsed.subject : null;
  if (!subject) {
    failures.push(issue('fail', 'audit.subject.missing', 'Audit manifest must include subject identity.', path));
    return;
  }
  const source = asString(subject.source);
  if (source !== 'plan' && source !== 'run') {
    failures.push(issue('fail', 'audit.subject.invalid_source', 'Audit subject source must be plan or run.', path));
  }
  if (!meaningfulString(subject.plan)) {
    failures.push(issue('fail', 'audit.subject.missing_plan', 'Audit subject must include a plan path.', path));
  }
  if (!meaningfulString(subject.plan_slug)) {
    failures.push(issue('fail', 'audit.subject.missing_plan_slug', 'Audit subject must include plan_slug.', path));
  }
  if (source === 'run' && (!meaningfulString(subject.run_id) || !meaningfulString(subject.run_packet))) {
    failures.push(issue('fail', 'audit.subject.missing_run_identity', 'Run-bound audit subject must include run_id and run_packet.', path));
  }
}

function validateBoundary(parsed: Record<string, unknown>, failures: ValidationIssue[], path: string | undefined): void {
  const boundary = isRecord(parsed.boundary) ? parsed.boundary : null;
  if (!boundary) {
    failures.push(issue('fail', 'audit.boundary.missing', 'Audit manifest must include boundary/non-claim metadata.', path));
    return;
  }
  if (boundary.digest_integrity_only !== true || boundary.local_files_only !== true) {
    failures.push(issue('fail', 'audit.boundary.unsupported_claim', 'Audit manifest must declare digest_integrity_only and local_files_only as true.', path));
  }
  for (const field of UNSUPPORTED_BOUNDARY_TRUE_FIELDS) {
    if (boundary[field] !== false) {
      failures.push(issue('fail', 'audit.boundary.unsupported_claim', `Audit manifest cannot claim ${field}.`, path));
    }
  }
}

export function validateAuditManifestText(text: string, path?: string, root = process.cwd()): ValidationResult {
  const failures: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    failures.push(issue('fail', 'audit.json.invalid', error instanceof Error ? error.message : 'Invalid JSON.', path));
    return { ok: false, failures, warnings };
  }

  if (!isRecord(parsed)) {
    failures.push(issue('fail', 'audit.schema.invalid', 'Audit manifest must be a JSON object.', path));
    return { ok: false, failures, warnings };
  }

  const schema = asString(parsed.schema) ?? asString(parsed.schemaVersion);
  if (schema !== AUDIT_SCHEMA) {
    failures.push(issue('fail', 'audit.schema.missing', `Audit manifest must declare schema: ${AUDIT_SCHEMA}.`, path));
  }
  if (!meaningfulString(parsed.audit_envelope_id)) {
    failures.push(issue('fail', 'audit.id.missing', 'Audit manifest must include audit_envelope_id.', path));
  }
  const createdAt = asString(parsed.created_at);
  if (!meaningfulString(createdAt) || Number.isNaN(Date.parse(createdAt))) {
    failures.push(issue('fail', 'audit.created_at.missing', 'Audit manifest must include a parseable created_at timestamp.', path));
  }
  if (!meaningfulString(parsed.idempotency_key)) {
    failures.push(issue('fail', 'audit.idempotency_key.missing', 'Audit manifest must include idempotency_key.', path));
  }
  validateSubject(parsed, failures, path);
  validateBoundary(parsed, failures, path);

  const artifacts = Array.isArray(parsed.artifacts) ? parsed.artifacts : null;
  if (!artifacts || artifacts.length === 0) {
    failures.push(issue('fail', 'audit.artifact.missing', 'Audit manifest must include at least one artifact.', path));
    return { ok: false, failures, warnings };
  }

  const ids = new Set<string>();
  for (let index = 0; index < artifacts.length; index += 1) {
    const artifact = artifacts[index];
    if (!isRecord(artifact)) {
      failures.push(issue('fail', 'audit.artifact.invalid', `Artifact ${index + 1} must be an object.`, path));
      continue;
    }
    const id = asString(artifact.id);
    if (!meaningfulString(id)) {
      failures.push(issue('fail', 'audit.artifact.missing_id', `Artifact ${index + 1} is missing id.`, path));
    } else if (ids.has(id)) {
      failures.push(issue('fail', 'audit.artifact.duplicate_id', `Duplicate artifact id: ${id}`, path));
    } else {
      ids.add(id);
    }

    const role = asString(artifact.role);
    if (!role || !ARTIFACT_ROLES.has(role)) {
      failures.push(issue('fail', 'audit.artifact.invalid_role', `Unsupported or missing audit artifact role: ${role ?? '(missing)'}`, path));
    }

    const digest = isRecord(artifact.digest) ? artifact.digest : null;
    const alg = digest ? asString(digest.alg) : null;
    const value = digest ? asString(digest.value) : null;
    if (alg !== DIGEST_ALG) {
      failures.push(issue('fail', 'audit.artifact.digest_unsupported_alg', `Audit artifact digest alg must be ${DIGEST_ALG}.`, path));
    }
    if (!value || !/^[a-f0-9]{64}$/.test(value)) {
      failures.push(issue('fail', 'audit.artifact.digest_invalid', 'Audit artifact digest value must be a 64-character lowercase sha256 hex string.', path));
    }

    const rawPath = asString(artifact.path);
    if (!rawPath) {
      failures.push(issue('fail', 'audit.artifact.missing_path', `Artifact ${id ?? index + 1} is missing path.`, path));
      continue;
    }
    const realArtifact = validateArtifactPath(rawPath, failures, path, root);
    if (realArtifact && alg === DIGEST_ALG && value && /^[a-f0-9]{64}$/.test(value)) {
      const actual = fileDigest(realArtifact);
      if (actual !== value) {
        failures.push(issue('fail', 'audit.artifact.digest_mismatch', `Artifact digest mismatch for ${rawPath}.`, path));
      }
    }
  }

  return { ok: failures.length === 0, failures, warnings };
}

export function validateAuditManifestFile(path: string, root = process.cwd()): ValidationResult {
  if (!existsSync(path)) {
    return { ok: false, failures: [issue('fail', 'audit.file_missing', `Audit manifest not found: ${path}`, path)], warnings: [] };
  }
  try {
    if (!statSync(path).isFile()) {
      return { ok: false, failures: [issue('fail', 'audit.file_not_file', `Audit manifest path is not a file: ${path}`, path)], warnings: [] };
    }
    return validateAuditManifestText(readFileSync(path, 'utf8'), path, root);
  } catch (error) {
    return {
      ok: false,
      failures: [issue('fail', 'audit.file_unreadable', error instanceof Error ? error.message : `Could not read audit manifest: ${path}`, path)],
      warnings: [],
    };
  }
}
