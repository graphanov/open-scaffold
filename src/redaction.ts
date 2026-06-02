import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const REDACTION_TOKEN = '[redacted]';

export interface SecretFinding {
  path: string;
  kind: 'token' | 'webhook' | 'private_path';
  line: number;
  detail: string;
}

const SECRET_PATTERNS: Array<{ kind: SecretFinding['kind']; pattern: RegExp; replacement: string; detail: string }> = [
  { kind: 'webhook', pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/(?!0{6,}\/replace-with-secret)[^\s)>'"]+/gi, replacement: 'https://discord.com/api/webhooks/[redacted]', detail: 'Discord webhook URL' },
  { kind: 'webhook', pattern: /https:\/\/hooks\.slack\.com\/services\/(?!T0+\/B0+\/replace-with-secret)[^\s)>'"]+/gi, replacement: 'https://hooks.slack.com/services/[redacted]', detail: 'Slack webhook URL' },
  { kind: 'token', pattern: /(?<![A-Za-z0-9])github_pat_[A-Za-z0-9_]{20,}/g, replacement: 'github_pat_[redacted]', detail: 'GitHub fine-grained token' },
  { kind: 'token', pattern: /(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9_]{20,}/g, replacement: 'gh*_[redacted]', detail: 'GitHub token' },
  { kind: 'token', pattern: /(?<![A-Za-z0-9])xox[baprs]-[A-Za-z0-9-]{20,}/g, replacement: 'xox*-[redacted]', detail: 'Slack token' },
  { kind: 'token', pattern: /(?<![A-Za-z0-9])sk-(?:proj-)?[A-Za-z0-9_-]{24,}/g, replacement: 'sk-[redacted]', detail: 'API token' },
  { kind: 'token', pattern: /\bBearer\s+[A-Za-z0-9._-]{30,}/gi, replacement: 'Bearer [redacted]', detail: 'Bearer token' },
  { kind: 'token', pattern: /(?<![A-Za-z0-9])AIza[0-9A-Za-z_-]{20,}/g, replacement: 'AIza[redacted]', detail: 'Google API key' },
  { kind: 'private_path', pattern: /\/(?:Users|home\/(?!node\b))\/[^\s`'"),;]+/g, replacement: '/[local-path-redacted]', detail: 'local private path' },
  { kind: 'private_path', pattern: /[A-Za-z]:\\Users\\[^\s`'"),;]+/g, replacement: 'C:\\[local-path-redacted]', detail: 'Windows local private path' },
];

const PUBLIC_SCAN_EXTENSIONS = new Set(['.md', '.txt', '.json', '.yml', '.yaml', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.sh', '.html', '.css']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'coverage', '.osc-dev', '.omc', '.omx']);
const SKIP_PREFIXES = ['.osc/research/', '.osc/runs/', '.osc/state/', 'tests/'];
const SKIP_FILES = new Set(['.osc/dashboard.html']);

function isAllowedExampleLine(line: string): boolean {
  return /replace-with-secret|placeholder|example|dummy|fake|not-a-real|\[redacted\]|<[^>]+>|YOUR_|0000000000|T00000000|B00000000|webhookUrl.*\.\.\./i.test(line)
    || /grep\b.*\\?\/Users|Reproduction before fix|SECRET_PATTERNS|pattern:\s*\//.test(line);
}

export function redactSecrets(text: string): string {
  let output = text;
  for (const item of SECRET_PATTERNS) output = output.replace(item.pattern, item.replacement);
  return output;
}

export function findSecretsInText(text: string): Array<Omit<SecretFinding, 'path'>> {
  const findings: Array<Omit<SecretFinding, 'path'>> = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isAllowedExampleLine(line)) continue;
    for (const item of SECRET_PATTERNS) {
      const regex = new RegExp(item.pattern.source, item.pattern.flags.includes('g') ? item.pattern.flags : `${item.pattern.flags}g`);
      if (regex.test(line)) findings.push({ kind: item.kind, line: index + 1, detail: item.detail });
    }
  }
  return findings;
}

function extensionOf(path: string): string {
  const match = /\.[^.\/]+$/.exec(path);
  return match?.[0] ?? '';
}

function shouldSkipRelative(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  return SKIP_FILES.has(normalized) || SKIP_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function walk(root: string, dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(root, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || shouldSkipRelative(`${rel}/`)) continue;
      walk(root, full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (shouldSkipRelative(rel)) continue;
    if (!PUBLIC_SCAN_EXTENSIONS.has(extensionOf(entry.name))) continue;
    if (statSync(full).size > 1_000_000) continue;
    out.push(full);
  }
}

export function scanPublicFilesForSecrets(root: string): SecretFinding[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  walk(root, root, files);
  const findings: SecretFinding[] = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const finding of findSecretsInText(text)) {
      findings.push({ ...finding, path: relative(root, file).replace(/\\/g, '/') });
    }
  }
  return findings;
}
