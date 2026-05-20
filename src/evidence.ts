import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { findScaffoldRoot, PLAN_STAGES } from './scaffold.js';

export interface CommandResult {
  commandLine: string;
  status: number | null;
  stdout: string;
  stderr: string;
  error?: string;
}

export type CommandRunner = (command: string, args: string[], cwd: string) => CommandResult;

export interface EvidenceCollectOptions {
  ci?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  now?: Date;
  runner?: CommandRunner;
}

export interface EvidenceCollectionResult {
  root: string;
  slug: string;
  evidencePath: string;
  relativePath: string;
  block: string;
  written: boolean;
  notes: string[];
}

interface GitContext {
  inside: boolean;
  branch: string | null;
  recentCommits: CommandResult | null;
  changedFiles: CommandResult | null;
  notes: string[];
}

type GhStatus = 'skipped' | 'missing' | 'unauthenticated' | 'available';

interface PrCiContext {
  enabled: boolean;
  ghStatus: GhStatus;
  prList: CommandResult | null;
  checks: CommandResult | null;
  env: Record<string, string>;
  notes: string[];
}

function assertSafeSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed || trimmed.endsWith('.md') || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(trimmed) || trimmed.includes('..')) {
    throw new Error(`Unsafe slug: ${slug}. Use letters, numbers, dots, underscores, and hyphens only; omit .md and path separators.`);
  }
  return trimmed;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function commandLine(command: string, args: string[]): string {
  return [basename(command), ...args].join(' ');
}

function defaultRunner(command: string, args: string[], cwd: string): CommandResult {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });
  return {
    commandLine: commandLine(command, args),
    status: typeof result.status === 'number' ? result.status : null,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? result.error.message : undefined,
  };
}

function requireScaffoldRoot(start: string): string {
  const root = findScaffoldRoot(start);
  if (!root) throw new Error(`No Open Scaffold root found from ${start}. Run this inside a repo with .osc/plans and .osc/releases.`);
  return root;
}

function findPlanPath(root: string, slug: string): string | null {
  for (const stage of PLAN_STAGES) {
    const path = join(root, '.osc', 'plans', stage, `${slug}.md`);
    if (existsSync(path) && statSync(path).isFile()) return path;
  }
  return null;
}

function findEvidenceNote(root: string, slug: string): string | null {
  const releasesDir = join(root, '.osc', 'releases');
  if (!existsSync(releasesDir)) return null;
  const pattern = new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${escapeRegex(slug)}\\.md$`);
  const matches = readdirSync(releasesDir)
    .filter((file) => pattern.test(file))
    .sort();
  const latest = matches.at(-1);
  return latest ? join(releasesDir, latest) : null;
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, '');
}

function compactOutput(result: CommandResult): string {
  const parts: string[] = [];
  if (result.stdout.trim()) parts.push(stripAnsi(result.stdout).trimEnd());
  if (result.stderr.trim()) parts.push(stripAnsi(result.stderr).trimEnd());
  if (result.error) parts.push(`ERROR: ${result.error}`);
  return parts.join('\n').trim() || '(no output)';
}

function renderCommandBlock(result: CommandResult): string[] {
  return [
    `- Command: \`${result.commandLine}\``,
    `- Exit code: ${result.status ?? 'not started'}`,
    '```text',
    compactOutput(result),
    '```',
  ];
}

function runVerification(root: string, runner: CommandRunner): CommandResult {
  const verifyPath = join(root, 'verify.sh');
  if (!existsSync(verifyPath)) {
    return {
      commandLine: './verify.sh --standard',
      status: null,
      stdout: '',
      stderr: 'verify.sh not found — verification output skipped',
      error: 'verify.sh not found',
    };
  }
  const result = runner(verifyPath, ['--standard'], root);
  return { ...result, commandLine: './verify.sh --standard' };
}

function collectGitContext(root: string, runner: CommandRunner): GitContext {
  const inside = runner('git', ['rev-parse', '--is-inside-work-tree'], root);
  if (inside.status !== 0 || !inside.stdout.trim().includes('true')) {
    return {
      inside: false,
      branch: null,
      recentCommits: null,
      changedFiles: null,
      notes: ['no git repository detected — git context skipped'],
    };
  }

  const branchResult = runner('git', ['branch', '--show-current'], root);
  const branch = branchResult.status === 0 && branchResult.stdout.trim() ? branchResult.stdout.trim() : '(detached or unknown)';
  const recentCommits = runner('git', ['log', '--oneline', '-5'], root);
  const stagedChanges = runner('git', ['diff', '--cached', '--name-status'], root);
  const workingChanges = runner('git', ['diff', '--name-status'], root);
  const untrackedFiles = runner('git', ['ls-files', '--others', '--exclude-standard'], root);
  let changedFiles: CommandResult;
  if (stagedChanges.stdout.trim() || workingChanges.stdout.trim() || untrackedFiles.stdout.trim()) {
    const stagedText = stagedChanges.stdout.trim() || '(none)';
    const workingText = workingChanges.stdout.trim() || '(none)';
    const untrackedText = untrackedFiles.stdout.trim() || '(none)';
    changedFiles = {
      commandLine: 'git diff --cached --name-status && git diff --name-status && git ls-files --others --exclude-standard',
      status: stagedChanges.status === 0 && workingChanges.status === 0 && untrackedFiles.status === 0 ? 0 : 1,
      stdout: `Staged changes:\n${stagedText}\n\nWorking tree changes:\n${workingText}\n\nUntracked files:\n${untrackedText}\n`,
      stderr: [stagedChanges.stderr, workingChanges.stderr, untrackedFiles.stderr].filter(Boolean).join('\n'),
      error: stagedChanges.error ?? workingChanges.error ?? untrackedFiles.error,
    };
  } else {
    changedFiles = runner('git', ['diff', '--name-status', 'HEAD~1..HEAD'], root);
    if (changedFiles.status !== 0) changedFiles = stagedChanges;
  }
  return {
    inside: true,
    branch,
    recentCommits,
    changedFiles,
    notes: [],
  };
}

function collectPrCiContext(root: string, runner: CommandRunner, git: GitContext, enabled: boolean): PrCiContext {
  if (!enabled) {
    return {
      enabled: false,
      ghStatus: 'skipped',
      prList: null,
      checks: null,
      env: {},
      notes: ['PR/CI checks skipped by default — pass --ci to enable gh calls'],
    };
  }

  const ghVersion = runner('gh', ['--version'], root);
  if (ghVersion.status !== 0) {
    return {
      enabled: true,
      ghStatus: 'missing',
      prList: null,
      checks: null,
      env: readCiEnv(),
      notes: ['gh CLI not available — PR and CI checks skipped'],
    };
  }

  const ghAuth = runner('gh', ['auth', 'status'], root);
  if (ghAuth.status !== 0) {
    return {
      enabled: true,
      ghStatus: 'unauthenticated',
      prList: null,
      checks: null,
      env: readCiEnv(),
      notes: ['gh CLI installed but not authenticated — PR and CI checks skipped; run gh auth login or set GH_TOKEN to collect PR/CI status'],
    };
  }

  const notes: string[] = [];
  const branch = git.branch && git.branch !== '(detached or unknown)' ? git.branch : null;
  let prList: CommandResult | null = null;
  let checks: CommandResult | null = null;
  if (!branch) {
    notes.push('current branch unavailable — PR lookup skipped');
  } else {
    prList = runner('gh', ['pr', 'list', '--head', branch, '--json', 'number,title,url,state'], root);
    if (prList.status === 0 && prList.stdout.trim() === '[]') notes.push(`no open PR found for branch ${branch}`);
    checks = runner('gh', ['pr', 'checks', '--json', 'name,state,bucket,workflow,link,startedAt,completedAt'], root);
    if (checks.status !== 0) notes.push('gh pr checks did not return check data for the current branch');
  }

  return {
    enabled: true,
    ghStatus: 'available',
    prList,
    checks,
    env: readCiEnv(),
    notes,
  };
}

function readCiEnv(): Record<string, string> {
  const keys = ['GITHUB_ACTIONS', 'GITHUB_RUN_ID', 'GITHUB_REPOSITORY', 'GITHUB_SHA', 'GITHUB_REF', 'CI'];
  const entries = keys
    .map((key) => [key, process.env[key]] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
  return Object.fromEntries(entries);
}

function renderCollectedBlock(now: Date, verification: CommandResult, git: GitContext, prCi: PrCiContext): { block: string; notes: string[] } {
  const notes = [...git.notes, ...prCi.notes];
  if (verification.error) notes.push(verification.stderr.trim() || verification.error);
  const lines: string[] = [`### Collected ${now.toISOString()}`, ''];

  lines.push('#### Verification', '', ...renderCommandBlock(verification), '');

  lines.push('#### Git context', '');
  if (!git.inside) {
    lines.push('- no git repository detected — git context skipped', '');
  } else {
    lines.push(`- Branch: ${git.branch ?? '(unknown)'}`, '');
    lines.push('- Recent commits:', '```text', git.recentCommits ? compactOutput(git.recentCommits) : '(not collected)', '```', '');
    lines.push('- Changed files:', '```text', git.changedFiles ? compactOutput(git.changedFiles) : '(not collected)', '```', '');
  }

  lines.push('#### PR / CI status', '');
  if (!prCi.enabled) {
    lines.push('- PR/CI checks skipped by default — pass `--ci` to enable `gh` calls.', '');
  } else if (prCi.ghStatus === 'missing') {
    lines.push('- gh CLI not available — PR and CI checks skipped.', '');
  } else if (prCi.ghStatus === 'unauthenticated') {
    lines.push('- gh CLI installed but not authenticated — PR and CI checks skipped. Run `gh auth login` or set `GH_TOKEN` to collect PR/CI status.', '');
  } else {
    if (prCi.prList) {
      lines.push('- PR lookup:', '```text', compactOutput(prCi.prList), '```', '');
    }
    if (prCi.checks) {
      lines.push('- CI checks:', '```text', compactOutput(prCi.checks), '```', '');
    }
  }

  lines.push('- CI environment:', '```text');
  if (Object.keys(prCi.env).length === 0) {
    lines.push('No CI environment variables detected.');
  } else {
    for (const [key, value] of Object.entries(prCi.env)) lines.push(`${key}=${value}`);
  }
  lines.push('```', '');

  lines.push('#### Collection notes', '');
  if (notes.length === 0) {
    lines.push('- All requested collectors completed.');
  } else {
    for (const note of notes) lines.push(`- ${note}`);
  }
  lines.push('');

  return { block: lines.join('\n'), notes };
}

function appendBlock(existing: string, block: string): string {
  const trimmedRight = existing.replace(/\s*$/, '');
  return `${trimmedRight}\n\n${block}`;
}

export function collectEvidence(slug: string, start = process.cwd(), options: EvidenceCollectOptions = {}): EvidenceCollectionResult {
  const safeSlug = assertSafeSlug(slug);
  const root = requireScaffoldRoot(start);
  if (!findPlanPath(root, safeSlug)) {
    throw new Error(`Plan not found: ${safeSlug}.md in .osc/plans/{active,backlog,blocked,done}.`);
  }
  const evidencePath = findEvidenceNote(root, safeSlug);
  if (!evidencePath) {
    throw new Error(`Evidence note skeleton not found for ${safeSlug} — run \`osc evidence new ${safeSlug}\` first.`);
  }

  const runner = options.runner ?? defaultRunner;
  const verification = runVerification(root, runner);
  const git = collectGitContext(root, runner);
  const prCi = collectPrCiContext(root, runner, git, Boolean(options.ci));
  const rendered = renderCollectedBlock(options.now ?? new Date(), verification, git, prCi);
  const relativePath = relative(root, evidencePath);
  if (!options.dryRun) {
    const existing = readFileSync(evidencePath, 'utf8');
    writeFileSync(evidencePath, appendBlock(existing, rendered.block), 'utf8');
  }
  return {
    root,
    slug: safeSlug,
    evidencePath,
    relativePath,
    block: rendered.block,
    written: !options.dryRun,
    notes: rendered.notes,
  };
}
