import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import type { Stats } from 'node:fs';
import { dirname, join, relative as relativePath, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const scaffoldTiers = ['min', 'standard', 'max'] as const;
export type ScaffoldTier = (typeof scaffoldTiers)[number];

const minFiles = [
  'MISSION.md',
  '.osc/.gitignore',
  '.osc/cockpit.example.json',
  '.osc/RULES.md',
  '.osc/plans/WORKFLOW.md',
  '.osc/plans/README.md',
  '.osc/plans/handoff-template.md',
  '.osc/plans/templates/README.md',
  '.osc/plans/templates/arch-decision.md',
  '.osc/plans/templates/bug-fix.md',
  '.osc/plans/templates/dependency-upgrade.md',
  '.osc/plans/templates/docs-update.md',
  '.osc/plans/templates/new-feature.md',
  '.osc/plans/templates/refactor.md',
  '.osc/plans/active/.gitkeep',
  '.osc/plans/backlog/.gitkeep',
  '.osc/plans/done/.gitkeep',
  '.osc/plans/blocked/.gitkeep',
  '.osc/releases/README.md',
  'verify.sh',
  'close.sh',
  'bootstrap.sh',
] as const;

const standardOnlyFiles = [
  'README.md',
  'ROADMAP.md',
  'AGENTS.md',
  'CLAUDE.md',
  '.devcontainer/devcontainer.json',
  '.devcontainer/Dockerfile',
  '.devcontainer/README.md',
  'amend.sh',
  'docs/DEV_CONTAINER.md',
  'docs/WORKFLOW.md',
  'docs/TASKS.md',
  'docs/MINIMUM_VIABLE_SCAFFOLD.md',
  'docs/SLICE_CLOSE_PROTOCOL.md',
] as const;

const maxOnlyFiles = [
  'docs/GITHUB_WORKFLOW.md',
  'docs/GLASS_COCKPIT_PROTOCOL.md',
  'docs/RUNTIME_BINDING_CONTRACT.md',
  'docs/TASK_RUN_MODEL.md',
  'docs/OPEN_SCAFFOLD_SYSTEM.md',
  'delegate.sh',
  '.osc/runs/.gitkeep',
  '.osc/research/.gitkeep',
  '.osc/specs/.gitkeep',
] as const;

export const tierFiles: Record<ScaffoldTier, readonly string[]> = {
  min: minFiles,
  standard: [...minFiles, ...standardOnlyFiles],
  max: [...minFiles, ...standardOnlyFiles, ...maxOnlyFiles],
};

export interface InitializeScaffoldOptions {
  tier: ScaffoldTier;
  target: string;
  force?: boolean;
  fromExisting?: boolean;
}

interface ExistingProjectDetection {
  label: string;
  marker: string | null;
  packageManager?: string;
}

export interface InitializeScaffoldResult {
  tier: ScaffoldTier;
  target: string;
  filesCreated: string[];
  summary: string;
}

function packageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..');
}

function isExecutableTemplate(file: string): boolean {
  return file.endsWith('.sh');
}

function sourcePathFor(file: string): string | null {
  if (file === 'MISSION.md') return null;
  if (file.endsWith('/.gitkeep')) return null;

  const source = join(packageRoot(), file);
  if (file === '.osc/.gitignore' && !existsSync(source)) {
    const npmPackedFallback = join(packageRoot(), '.osc/.npmignore');
    if (existsSync(npmPackedFallback)) return npmPackedFallback;
  }

  return source;
}

function missionTemplate(project?: ExistingProjectDetection): string {
  if (!project) {
    return `# Mission\n\n<!-- mission:unset -->\n\nTODO: define mission.\n\nDescribe what this repository is trying to accomplish, the non-goals, and the owner-visible definition of done before starting substantial work.\n`;
  }

  const marker = project.marker ? ` Detected marker: \`${project.marker}\`.` : '';
  const packageManager = project.packageManager ? ` Package manager: ${project.packageManager}.` : '';
  return [
    '# Mission',
    '',
    '<!-- mission:unset -->',
    '',
    `TODO: define the mission for this ${project.label}.`,
    '',
    `This repository appears to be an existing ${project.label}. Open Scaffold was added in brownfield mode so existing project files stay owned by the project.${marker}${packageManager}`,
    '',
    '## Goals',
    '',
    `- TODO: describe what this ${project.label} should achieve first.`,
    '',
    '## Non-Goals',
    '',
    '- TODO: describe what this project should not do yet.',
    '',
    '## Changelog',
    '',
    'One-line dated entries for every scope pivot. Format: `YYYY-MM-DD: <one-line pivot description + link to amendment file if applicable>`. Append entries in chronological order. Never rewrite history here.',
    '',
    '<!-- append YYYY-MM-DD entries below this line -->',
  ].join('\n') + '\n';
}

function detectPackageManager(target: string): string | undefined {
  if (existsSync(join(target, 'pnpm-lock.yaml')) || existsSync(join(target, 'pnpm-workspace.yaml'))) return 'pnpm';
  if (existsSync(join(target, 'yarn.lock'))) return 'Yarn';
  if (existsSync(join(target, 'package-lock.json'))) return 'npm';
  if (existsSync(join(target, 'bun.lockb')) || existsSync(join(target, 'bun.lock'))) return 'Bun';
  return undefined;
}

function packageJsonDeclaresWorkspaces(target: string): boolean {
  try {
    const parsed = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8')) as { workspaces?: unknown };
    return Array.isArray(parsed.workspaces) || (typeof parsed.workspaces === 'object' && parsed.workspaces !== null);
  } catch {
    return false;
  }
}

function detectExistingProject(target: string): ExistingProjectDetection {
  if (existsSync(join(target, 'package.json'))) {
    return {
      label: packageJsonDeclaresWorkspaces(target) || existsSync(join(target, 'pnpm-workspace.yaml')) || existsSync(join(target, 'lerna.json')) || existsSync(join(target, 'nx.json')) ? 'Node.js monorepo' : 'Node.js project',
      marker: 'package.json',
      packageManager: detectPackageManager(target),
    };
  }
  if (existsSync(join(target, 'pyproject.toml')) || existsSync(join(target, 'setup.py')) || existsSync(join(target, 'requirements.txt'))) {
    return { label: 'Python project', marker: existsSync(join(target, 'pyproject.toml')) ? 'pyproject.toml' : existsSync(join(target, 'setup.py')) ? 'setup.py' : 'requirements.txt' };
  }
  if (existsSync(join(target, 'go.mod'))) return { label: 'Go project', marker: 'go.mod' };
  if (existsSync(join(target, 'Cargo.toml'))) return { label: 'Rust project', marker: 'Cargo.toml' };
  if (existsSync(join(target, 'pnpm-workspace.yaml')) || existsSync(join(target, 'lerna.json')) || existsSync(join(target, 'nx.json'))) {
    return { label: 'monorepo', marker: existsSync(join(target, 'pnpm-workspace.yaml')) ? 'pnpm-workspace.yaml' : existsSync(join(target, 'lerna.json')) ? 'lerna.json' : 'nx.json' };
  }
  return { label: 'existing project', marker: null };
}

function filesForInitialization(tier: ScaffoldTier, fromExisting: boolean): string[] {
  const files = [...tierFiles[tier]];
  if (fromExisting) {
    for (const file of ['AGENTS.md', 'CLAUDE.md']) {
      if (!files.includes(file)) files.push(file);
    }
  }
  return files;
}

function scaffoldConflicts(target: string, files: readonly string[], fromExisting: boolean): string[] {
  if (!fromExisting) return files.filter((file) => existsSync(join(target, file)));

  const conflicts: string[] = [];
  const oscExists = existsSync(join(target, '.osc'));

  for (const file of files) {
    if (file.startsWith('.osc/')) continue;
    if (existsSync(join(target, file))) conflicts.push(file);
  }
  if (oscExists) conflicts.push('.osc');
  return conflicts;
}

function downstreamReadmeTemplate(): string {
  return [
    '# Project README',
    '',
    'TODO: replace this with your project overview.',
    '',
    '## How this repo uses Open Scaffold',
    '',
    'This repository uses Open Scaffold to keep AI-assisted work traceable in files instead of lost in chat history.',
    '',
    'The basic loop is:',
    '',
    '1. Define the mission in `MISSION.md`.',
    '2. Create the current slice with `npx open-scaffold plan new <slug> --stage active` (or `osc plan new <slug> --stage active` if installed locally), then fill every TODO prompt. For a shaped starting point, use `--from-template bug-fix`; validate before execution with `npx open-scaffold plan validate <slug>`. Shell fallback: `cp .osc/plans/handoff-template.md .osc/plans/active/<slug>.md`.',
    '3. Do the work and run the project checks.',
    '4. Record evidence with `npx open-scaffold evidence new <slug>` (or `osc evidence new <slug>` if installed locally), then replace every TODO with real commands and results. Shell fallback: create the note manually under `.osc/releases/`.',
    '5. If scope changes, run `npx open-scaffold amend <slug> --message "<what changed>"` (or `osc amend <slug> --message "<what changed>"`) and fill the amendment TODOs. When verified, close with `npx open-scaffold close <slug> --message "<what shipped>"` (or `osc close <slug> --message "<what shipped>"`). Shell fallback: `./amend.sh <slug>` and `./close.sh <slug> --message "<what shipped>"`.',
    '',
    '## First useful commands',
    '',
    '```bash',
    './bootstrap.sh',
    'npx open-scaffold plan new my-first-task --stage active',
    '# shell fallback: cp .osc/plans/handoff-template.md .osc/plans/active/my-first-task.md',
    './verify.sh --quick',
    './verify.sh --standard',
    'npx open-scaffold evidence new my-first-task',
    'npx open-scaffold amend my-first-task --message "scope changed"',
    'npx open-scaffold close my-first-task --message "verified first task"',
    '```',
    '',
    '## Optional Dev Container',
    '',
    'This standard scaffold includes `.devcontainer/` for teams that want the same Node.js, npm, git, and `osc` setup everywhere.',
    'Open the repo in VS Code Dev Containers or Codespaces and run `osc status` after setup completes.',
    'Containers are optional: the normal `npx open-scaffold ...` and shell fallback commands above still work on the host.',
    '',
    '## Project status',
    '',
    '- Mission: fill in `MISSION.md` before substantial work.',
    '- Current work: keep one active plan under `.osc/plans/active/`.',
    '- Evidence: add concise notes under `.osc/releases/` when meaningful slices close.',
    '',
    'Keep this README about the downstream project. Link to Open Scaffold docs only when the methodology itself needs explanation.',
  ].join('\n') + '\n';
}

function downstreamRoadmapTemplate(): string {
  return [
    '# Roadmap',
    '',
    'TODO: replace this with the downstream project roadmap.',
    '',
    'Use this file for product direction, not live task status. Live/current work belongs in `.osc/plans/active/`, GitHub Issues, or the project task board.',
    '',
    '## Now',
    '',
    '- Define the mission in `MISSION.md`.',
    '- Create one first active plan under `.osc/plans/active/`.',
    '',
    '## Next',
    '',
    '- TODO: add the next small, reviewable slice.',
    '',
    '## Later',
    '',
    '- TODO: add larger ideas only after they are accepted as real roadmap pressure.',
  ].join('\n') + '\n';
}

function downstreamAgentInstructionsTemplate(file: 'AGENTS.md' | 'CLAUDE.md'): string {
  return [
    `# ${file}`,
    '',
    'This repository uses Open Scaffold. It is not the Open Scaffold product repository.',
    '',
    '## Project facts',
    '',
    '- `MISSION.md` is the source of truth for what this project is trying to do.',
    '- `.osc/plans/` stores immutable plans in `active/`, `backlog/`, `done/`, and `blocked/`.',
    '- `.osc/RULES.md` is the compact rule sheet. Re-read it before structural changes.',
    '- `.osc/plans/WORKFLOW.md` explains how plan files move between stages.',
    '- `.osc/releases/` stores concise evidence/release notes for meaningful closed slices.',
    '- `verify.sh` checks scaffold health before claiming work is done.',
    '',
    '## Operating rules',
    '',
    '1. Read `MISSION.md` before meaningful work. If the mission is still unset, help the owner define it first.',
    '2. Check `.osc/plans/active/` before starting new work. Continue active work unless the owner says otherwise.',
    '3. Do not silently rewrite committed plans. New information becomes an amendment, follow-up plan, or evidence note.',
    '4. Keep work small enough to review. One plan should map to one clear slice.',
    '5. Verify against acceptance criteria, then record evidence before closing a plan.',
    '6. Treat chat and agent transcripts as working context, not durable truth. Promote important facts into repo files.',
    '',
    '## First task bootstrap',
    '',
    'If this is a new repo, ask the owner:',
    '',
    '1. What is this project in one sentence?',
    '2. What should it achieve first?',
    '3. What should it explicitly not do yet?',
    '',
    'Then update `MISSION.md` and create the first active plan with `npx open-scaffold plan new <slug> --stage active`, `osc plan new <slug> --stage active`, or by copying `.osc/plans/handoff-template.md`.',
  ].join('\n') + '\n';
}

function downstreamMinimumScaffoldDocTemplate(): string {
  return [
    '# Minimum Viable Scaffold',
    '',
    'This repo has the minimum Open Scaffold loop needed for a human and an agent to answer:',
    '',
    'In plain terms: this is the minimum viable scaffold for this project.',
    '',
    '- What are we building?',
    '- What is the current slice?',
    '- How will we verify it?',
    '- What evidence proves it closed?',
    '',
    '## Five-step loop',
    '',
    '1. Define the project mission in `MISSION.md`.',
    '2. Create one active plan with `npx open-scaffold plan new <slug> --stage active` (or `osc plan new <slug> --stage active` if installed locally), then fill every TODO prompt with real acceptance criteria and verification. Shell fallback: copy `.osc/plans/handoff-template.md` into `.osc/plans/active/<slug>.md`.',
    '3. Execute the work and run the project checks.',
    '4. Run `./verify.sh --standard` before calling the slice done.',
    '5. Record evidence with `npx open-scaffold evidence new <slug>` (or `osc evidence new <slug>`), replace every TODO with real results, then close the plan with `npx open-scaffold close <slug> --message "<what shipped>"` (or `osc close <slug> --message "<what shipped>"`). If scope changes, use `npx open-scaffold amend <slug> --message "<what changed>"` (or `osc amend <slug> --message "<what changed>"`). Shell fallback: `./amend.sh <slug>` and `./close.sh <slug> --message "<what shipped>"`.',
    '',
    '## First-user checklist',
    '',
    '- [ ] `MISSION.md` describes this project.',
    '- [ ] `.osc/plans/active/` has one current plan before first verification.',
    '- [ ] `.osc/plans/done/` contains only this project\'s completed work.',
    '- [ ] `.osc/releases/` contains only this project\'s evidence notes.',
    '- [ ] `./verify.sh --standard` passes.',
  ].join('\n') + '\n';
}

function downstreamBootstrapTemplate(): string {
  return `#!/usr/bin/env bash
# open-scaffold bootstrap for a downstream project
# Tested on macOS system bash (3.2). Avoids GNU-only date flags.
# Idempotent: safe to run any number of times.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
TODAY="$(date +%Y-%m-%d)"
MISSION="$ROOT/MISSION.md"

stamp_changelog() {
  if [ ! -f "$MISSION" ]; then
    return 0
  fi
  STAMP="$TODAY: bootstrap run"
  if ! grep -Fq "$STAMP" "$MISSION"; then
    ANCHOR='<!-- append YYYY-MM-DD entries below this line -->'
    if grep -Fq "$ANCHOR" "$MISSION"; then
      TMPFILE=$(mktemp)
      while IFS= read -r line || [ -n "$line" ]; do
        printf '%s\\n' "$line"
        if printf '%s' "$line" | grep -Fq "$ANCHOR"; then
          printf -- '- %s\\n' "$STAMP"
        fi
      done < "$MISSION" > "$TMPFILE"
      mv "$TMPFILE" "$MISSION"
    else
      printf -- '- %s\\n' "$STAMP" >> "$MISSION"
    fi
  fi
}

mkdir -p "$ROOT/.osc/research"
mkdir -p "$ROOT/.osc/state"
mkdir -p "$ROOT/.osc/plans/active"
mkdir -p "$ROOT/.osc/plans/backlog"
mkdir -p "$ROOT/.osc/plans/done"
mkdir -p "$ROOT/.osc/plans/blocked"
mkdir -p "$ROOT/.osc/releases"

if [ -f "$MISSION" ] && grep -Fq 'mission:unset' "$MISSION"; then
  if [ -t 0 ]; then
    printf '\\n'
    printf '=== open-scaffold: Define Your Mission ===\\n'
    printf '\\n'
    printf 'What is this project? (one sentence)\\n> '
    read -r USER_MISSION
    printf '\\n'
    printf 'What should it achieve? (main outcomes — separate multiple with semicolons)\\n> '
    read -r USER_GOALS
    printf '\\n'
    printf 'What should this project NOT do? (separate multiple with semicolons)\\n> '
    read -r USER_NONGOALS
    printf '\\n'

    if [ -n "$USER_MISSION" ]; then
      GOALS_LIST=""
      if [ -n "$USER_GOALS" ]; then
        GOALS_LIST=$(printf '%s' "$USER_GOALS" | tr ',;' '\\n\\n' | while read -r item; do
          trimmed=$(printf '%s' "$item" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
          if [ -n "$trimmed" ]; then
            printf '- %s\\n' "$trimmed"
          fi
        done)
      fi
      if [ -z "$GOALS_LIST" ]; then
        GOALS_LIST="- TODO: define your project's goals"
      fi

      NONGOALS_LIST=""
      if [ -n "$USER_NONGOALS" ]; then
        NONGOALS_LIST=$(printf '%s' "$USER_NONGOALS" | tr ',;' '\\n\\n' | while read -r item; do
          trimmed=$(printf '%s' "$item" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
          if [ -n "$trimmed" ]; then
            printf '- %s\\n' "$trimmed"
          fi
        done)
      fi
      if [ -z "$NONGOALS_LIST" ]; then
        NONGOALS_LIST="- TODO: define your project's non-goals"
      fi

      cat > "$MISSION" << MISSION_EOF
# Mission

$USER_MISSION

## Goals

$GOALS_LIST

## Non-Goals

$NONGOALS_LIST

## Changelog

One-line dated entries for every scope pivot. Format: \`YYYY-MM-DD: <one-line pivot description + link to amendment file if applicable>\`. Append entries in chronological order. Never rewrite history here.

<!-- append YYYY-MM-DD entries below this line -->
MISSION_EOF

      stamp_changelog
      printf 'Mission defined! Your MISSION.md has been updated.\\n'
    else
      printf 'No mission entered. You can edit MISSION.md manually later.\\n'
      stamp_changelog
    fi
  else
    stamp_changelog
  fi
else
  stamp_changelog
fi

if [ -x "$ROOT/verify.sh" ]; then
  printf '\\n'
  "$ROOT/verify.sh" --quick || true
fi

if [ -f "$ROOT/docs/WORKFLOW.md" ]; then
  NEXT_READ="$ROOT/docs/WORKFLOW.md"
elif [ -f "$ROOT/.osc/plans/WORKFLOW.md" ]; then
  NEXT_READ="$ROOT/.osc/plans/WORKFLOW.md"
else
  NEXT_READ="$ROOT/.osc/RULES.md"
fi
printf '\\nBootstrap complete.\\nRead: %s\\n' "$NEXT_READ"
`;
}

function downstreamTemplateFor(file: string, tier: ScaffoldTier): string | null {
  if (file === 'bootstrap.sh') return downstreamBootstrapTemplate();
  if (file === 'AGENTS.md' || file === 'CLAUDE.md') return downstreamAgentInstructionsTemplate(file);
  if (tier === 'min') return null;
  if (file === 'README.md') return downstreamReadmeTemplate();
  if (file === 'ROADMAP.md') return downstreamRoadmapTemplate();
  if (file === 'docs/MINIMUM_VIABLE_SCAFFOLD.md') return downstreamMinimumScaffoldDocTemplate();
  return null;
}

function minRulesTemplate(): string {
  return `# Open Scaffold — Rules (Minimum Tier)

Re-read this file before any major action on project structure.

## Non-Negotiables

1. **Mission first.** Read \`MISSION.md\` before doing anything. If \`<!-- mission:unset -->\` is present, stop and define the mission.
2. **Plans are immutable.** Never edit a plan file after creation. New information should become a follow-up plan or an upgrade to the standard scaffold tier.
3. **Folder = status.** Plans live in \`active/\`, \`backlog/\`, \`done/\`, or \`blocked/\`. Move files, don't rename them. See \`.osc/plans/WORKFLOW.md\`.
4. **Verify before claiming done.** Run \`./verify.sh\` against acceptance criteria. Use \`./close.sh\` to move plans to \`done/\`.
5. **Check active/ first.** Before starting new work, check \`.osc/plans/active/\`. Continue in-flight work unless told otherwise.
6. **One focus at a time.** Keep \`active/\` small (2–3 plans max). Finish or park before pulling from \`backlog/\`.

## File Conventions

- Plan files: \`NNN-slug.md\` (number is permanent ID, never changes)
- All plans follow the Status + seven content-heading schema in \`.osc/plans/handoff-template.md\`
- This minimum tier intentionally omits advanced amendment/docs helpers; use the standard tier when mechanical amendment workflow is needed.

## When In Doubt

- Structure and stage questions → re-read this file and \`.osc/plans/WORKFLOW.md\`
- Design rationale → capture a small plan or evidence note before expanding scope
`;
}

function minPlansReadmeTemplate(): string {
  return `# Plans — Minimum Tier Amendments

Plans in this directory and its stage subfolders (\`active/\`, \`backlog/\`, \`done/\`, \`blocked/\`) are **immutable** once committed. When new information changes a plan's goal, constraints, or acceptance criteria, do NOT edit the plan file in place.

The minimum scaffold tier intentionally ships without the mechanical amendment helper. Use this lightweight fallback:

1. Create a follow-up plan in the appropriate stage folder, or create \`<plan-slug>-amendment-<n>.md\` by hand beside the parent plan.
2. Capture what changed, the new direction, and the impact on acceptance criteria.
3. Add a one-line entry to \`MISSION.md\`'s changelog if the change is a real scope pivot.
4. Run \`./verify.sh\` before claiming the work is complete.

Use \`./close.sh <plan-slug>\` to move a completed plan to \`done/\`. See \`.osc/plans/WORKFLOW.md\` for the full stage-folder workflow.

Upgrade to the standard scaffold tier when you want the mechanical amendment helper and richer workflow docs.
`;
}

function minHandoffTemplate(): string {
  return `# Plan: <slug>

<!--
Copy this template to \`.osc/plans/<slug>.md\` for each task or feature slice.
Fill every section. Keep each section tight — a reader with no prior context
should be able to act on the plan after reading it once.

Plans are IMMUTABLE once committed. If new information changes the plan,
capture a follow-up plan or upgrade to the standard scaffold tier for the
mechanical amendment workflow. Do not hand-edit completed plan files.
-->

## Status

<!-- One of: active | complete | superseded -->
active

## Context

<1-3 sentences: why this plan exists. What happened that made us write it now? What prior plan or decision does it follow from, if any?>

## Goal

<One crisp sentence describing the outcome that defines "done" for this plan. Not a feature list — the single observable change in the world when this is complete.>

## Constraints / Out of scope

- <what this plan will NOT do>
- <non-goals specific to this slice>
- <boundaries on stack, time, or surface area>

## Files to touch

- \`path/to/file.ext\` — <one-line reason>
- \`path/to/other.ext\` — <one-line reason>

## Execution strategy

<Include this section when a plan involves 3+ tasks that can be organized into independent parallel batches. Omit for simple single-agent plans.>

### Task decomposition

| ID | Task | Dependencies | Parallel group |
|----|------|-------------|----------------|
| T1 | <task description> | None | A |
| T2 | <task description> | T1 | B |
| T3 | <task description> | None | A |

### Parallel groups

- **Group A** (<rationale>): T1, T3 — <why these are independent>
- **Group B** (depends on Group A): T2 — <why this must wait>

### Dependencies

- T2 depends on T1 (<specific reason — e.g., "needs the API schema T1 produces">)

### Delegation notes

- <which groups are suitable for parallel agents or separate terminal sessions>
- <which groups must wait for earlier groups to complete>

## Acceptance criteria

- [ ] <testable bullet — something a verifier can check mechanically or with a clear yes/no>
- [ ] <testable bullet>
- [ ] <testable bullet>

## Verification steps

1. <command or manual check>
2. <expected output or observable>
3. <pass criterion: exactly what makes this step green>

## Open questions

- <unresolved decision, tag with owner if known>
- <assumption that needs validation before or during execution>
`;
}

function ensureKnownTier(tier: string): asserts tier is ScaffoldTier {
  if (!scaffoldTiers.includes(tier as ScaffoldTier)) {
    throw new Error(`Invalid tier: ${tier}. Expected one of: ${scaffoldTiers.join(', ')}`);
  }
}

function assertTemplateExists(file: string, source: string): void {
  if (!existsSync(source) || !statSync(source).isFile()) {
    throw new Error(`Template source missing for ${file}: ${source}`);
  }
}

function formatSummary(tier: ScaffoldTier, target: string, files: string[], project?: ExistingProjectDetection): string {
  const detection = project
    ? [`Detected existing ${project.label}${project.marker ? ` via ${project.marker}` : ''}${project.packageManager ? ` (${project.packageManager})` : ''}.`]
    : [];
  return [
    `Generated ${tier} Open Scaffold in ${target}`,
    ...detection,
    `Files created (${files.length}):`,
    ...files.map((file) => `  - ${file}`),
    '',
    'Next: edit MISSION.md, add one current plan under .osc/plans/active/, then run ./verify.sh --standard',
  ].join('\n');
}

function lstatIfPresent(path: string): Stats | null {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function normalizeKnownSystemAlias(path: string): string {
  const target = resolve(path);
  if (process.platform !== 'darwin') return target;

  const tmpAlias = resolve('/tmp');
  if (target !== tmpAlias && !target.startsWith(`${tmpAlias}${sep}`)) return target;

  const tmpStats = lstatIfPresent(tmpAlias);
  if (!tmpStats?.isSymbolicLink()) return target;

  const realTmp = realpathSync(tmpAlias);
  if (realTmp !== '/private/tmp') return target;

  const suffix = relativePath(tmpAlias, target);
  return suffix ? join(realTmp, suffix) : realTmp;
}

function rejectSymlinkedExistingPath(path: string): void {
  let current = resolve(path);

  while (true) {
    const stats = lstatIfPresent(current);
    if (stats !== null) {
      if (stats.isSymbolicLink()) {
        throw new Error(`Refusing to write through symlinked path: ${current}`);
      }
      return;
    }

    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

function rejectSymlinkedDestination(target: string, destination: string): void {
  const relative = relativePath(target, destination);
  const parts = relative.split(sep).filter(Boolean);
  let current = target;

  if (lstatIfPresent(current)?.isSymbolicLink()) {
    throw new Error('Refusing to write through symlinked path: .');
  }

  for (const part of parts) {
    current = join(current, part);
    if (lstatIfPresent(current)?.isSymbolicLink()) {
      const symlinkRelative = current.slice(target.length + 1) || '.';
      throw new Error(`Refusing to write through symlinked path: ${symlinkRelative}`);
    }
  }
}

export function initializeScaffold(options: InitializeScaffoldOptions): InitializeScaffoldResult {
  ensureKnownTier(options.tier);
  if (options.fromExisting && options.tier !== 'min') {
    throw new Error('Brownfield init currently supports --tier min only. Use greenfield init for standard/max docs, or add advanced docs manually after preserving existing project files.');
  }
  const target = normalizeKnownSystemAlias(options.target);
  const fromExisting = Boolean(options.fromExisting);
  const protectedExistingProjectFiles = fromExisting && options.force
    ? ['verify.sh', 'close.sh', 'bootstrap.sh'].filter((file) => existsSync(join(target, file)))
    : [];
  if (protectedExistingProjectFiles.length > 0) {
    throw new Error(`Refusing to overwrite existing project files in brownfield mode: ${protectedExistingProjectFiles.join(', ')}. Rename or move them before re-running with --force.`);
  }
  const project = fromExisting ? detectExistingProject(target) : undefined;
  const files = filesForInitialization(options.tier, fromExisting);

  rejectSymlinkedExistingPath(target);
  mkdirSync(target, { recursive: true });

  for (const file of files) {
    rejectSymlinkedDestination(target, join(target, file));
  }

  const existing = scaffoldConflicts(target, files, fromExisting);

  if (existing.length > 0 && !options.force) {
    const noun = fromExisting ? 'existing scaffold files' : 'existing files';
    throw new Error(`Refusing to overwrite ${noun}: ${existing.join(', ')}. Re-run with --force only if you intend to replace them.`);
  }

  for (const file of files) {
    const destination = join(target, file);
    mkdirSync(dirname(destination), { recursive: true });

    const generatedTemplate = downstreamTemplateFor(file, options.tier);
    const source = sourcePathFor(file);
    if (generatedTemplate !== null) {
      writeFileSync(destination, generatedTemplate);
    } else if (source === null) {
      writeFileSync(destination, file === 'MISSION.md' ? missionTemplate(project) : '');
    } else if (file === '.osc/RULES.md' && options.tier === 'min') {
      writeFileSync(destination, minRulesTemplate());
    } else if (file === '.osc/plans/README.md' && options.tier === 'min') {
      writeFileSync(destination, minPlansReadmeTemplate());
    } else if (file === '.osc/plans/handoff-template.md' && options.tier === 'min') {
      writeFileSync(destination, minHandoffTemplate());
    } else {
      assertTemplateExists(file, source);
      copyFileSync(source, destination);
    }

    if (isExecutableTemplate(file)) chmodSync(destination, 0o755);
  }

  return {
    tier: options.tier,
    target,
    filesCreated: files,
    summary: formatSummary(options.tier, target, files, project),
  };
}

export function parseTier(value: string): ScaffoldTier {
  ensureKnownTier(value);
  return value;
}

export function listTargetFiles(root: string): string[] {
  const files: string[] = [];
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const relative = full.slice(root.length + 1);
      if (statSync(full).isDirectory()) walk(full);
      else files.push(relative);
    }
  }
  walk(root);
  return files.sort();
}
