export type CommandMaturity = 'stable' | 'lab' | 'advanced';

export interface CommandRegistryEntry {
  section: string;
  maturity: CommandMaturity;
  command: string;
}

export const COMMAND_REGISTRY: CommandRegistryEntry[] = [
  { section: 'First-read demo', maturity: 'stable', command: 'osc compare <attempt-a-dir> <attempt-b-dir> [--json] [--output <path>]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc first-run --non-interactive --slug <slug> --mission <text> --goal <text>' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc init --tier <min|standard|max> --target <dir> [--force]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc init --from-existing --tier min --target <dir> [--force]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc init --min|--standard|--max --target <dir> [--force]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc status [--json|--dashboard]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc plan <plan-path>' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc plan new <slug> --stage <active|backlog|blocked> [--from-template <name>]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc plan new --from-template list' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc plan validate <slug-or-path> [--json] [--strict]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc plan wizard <slug> [--stage <active|backlog|blocked>] [--non-interactive --answers <answers.json>]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc plan move <slug> --to <active|backlog|blocked>' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc plan graph [--format <ascii|mermaid|json>] [--stage <active|backlog|all>] [--direction <downstream|upstream|both>] [--plan <slug>]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc plan stats [--json]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc amend <plan-slug> [--message <text>]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc evidence new <slug>' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc evidence collect <slug> [--ci] [--dry-run] [--verbose]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc evidence compact <run-or-loop> [--evaluation <evaluation-json>] [--candidate-note <path>]... [--out <dir>] [--json]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc close <plan-slug> [--message <text>]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc trace <plan-slug> [--json] [--include-unverified]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc verify [--evidence-chain [--plan <slug>] [--json] [--strict] [--online-github]]' },
  { section: 'Stable core protocol', maturity: 'stable', command: 'osc pr check <plan-slug> [--format <markdown|json>] [--online-github]' },
  { section: 'Handoff and run packages', maturity: 'stable', command: 'osc start <plan-slug-or-path> --runtime <codex|omx|plain|human|custom>' },
  { section: 'Handoff and run packages', maturity: 'stable', command: 'osc delegate <plan-path> [run binding options]' },
  { section: 'Handoff and run packages', maturity: 'stable', command: 'osc run <plan-path> [--dry-run] [--json] [run binding options]' },
  { section: 'Handoff and run packages', maturity: 'stable', command: 'osc adapter check <adapter-id>' },
  { section: 'Handoff and run packages', maturity: 'stable', command: 'osc adapter trust <adapter-id>' },
  { section: 'Handoff and run packages', maturity: 'stable', command: 'osc adapter list --trusted' },
  { section: 'Handoff and run packages', maturity: 'stable', command: 'osc dispatch <run-json> --adapter <adapter-id>' },
  { section: 'Handoff and run packages', maturity: 'stable', command: 'osc review <plan-path> [run binding options]' },
  { section: 'Handoff and run packages', maturity: 'stable', command: 'osc ultrareview <plan-path> [run binding options]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc work <task-description> --runtime <preset> --dry-run [--json] [--adapter <adapter-id>]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc task new <title> [--priority <high|medium|low>] [--plan <slug>]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc task list [--status <status>] [--priority <priority>] [--plan <slug>] [--json]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc task show <task-id>' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc task claim|start|complete|cancel <task-id>' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc task block <task-id> --reason <text>' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc task comment <task-id> <comment>' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc task link <task-id> --plan <slug>' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc eval init <run-or-plan> [--out <path>]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc eval import <run-or-plan> --adapter generic-ac-json-v1 --scorer <scorer-json> [--out <path>]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc eval check <evaluation-path>' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc audit init <run-or-plan> [--artifact <role> <path>]... [--out <path>]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc audit check <audit-manifest-path>' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc evolve init <run-or-plan> [--out <dir>] [--strategy <manual|greedy|tournament|novelty|map_elites|custom>]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc evolve record <loop-dir> --run <run-packet> [--evaluation <evaluation-json>] [--receipt <dispatch-receipt.json>] [--evidence <path>]... --decision <promote|reject|retry|block> [--score <0..1>] --rationale <text> [--repair-hypothesis <text>] [--target-metric <name>] [--expected-gain <number>] [--actual-delta <number>] [--tokens-total <integer>] [--estimated-usd <number>] [--usage-source <source>] [--usage-unavailable-reason <text>]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc evolve compare <loop-dir> [--a <attempt-id|run-id|frontier>] [--b <attempt-id|run-id|frontier>] [--format <terminal|markdown|json>] [--out <path>]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc evolve analyze <loop-dir> [--format <terminal|markdown|json>] [--out <path>] [--plateau-threshold <n>]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc evolve check <loop-dir>' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc cockpit config' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc cockpit test [--dry-run]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc cockpit post --event <event> [--message <text>] [--run-id <id>] [--plan <slug>] [--task-id <id>] [--pr <url>] [--evidence-path <path>] [--dry-run]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc dashboard [--watch] [--interval <seconds>]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc dashboard --web [--out <path>]' },
  { section: 'Lab and experimental', maturity: 'lab', command: 'osc dashboard --serve [--port <port>] [--open]' },
  { section: 'Diagnostics and advanced', maturity: 'advanced', command: 'osc mcp serve [--repo <path>] [--allow-write] [--validate]' },
  { section: 'Diagnostics and advanced', maturity: 'advanced', command: 'osc metrics [--json] [--since <date>] [--lookback <weeks>] [--table] [--verbose]' },
  { section: 'Diagnostics and advanced', maturity: 'advanced', command: 'osc study [--json] [--since <date>] [--out <path>]' },
  { section: 'Diagnostics and advanced', maturity: 'advanced', command: 'osc pr-summary <plan-slug> [--format <markdown|json>]' },
  { section: 'Diagnostics and advanced', maturity: 'advanced', command: 'osc ab check <path>' },
  { section: 'Diagnostics and advanced', maturity: 'advanced', command: 'osc doctor [--fix] [--dry-run] [--severity <info|warn|error>] [--check <name>]' },
  { section: 'Diagnostics and advanced', maturity: 'advanced', command: 'osc schemas list [--json]' },
  { section: 'Diagnostics and advanced', maturity: 'advanced', command: 'osc schemas show <schema-id>' },
  { section: 'Diagnostics and advanced', maturity: 'advanced', command: 'osc runtimes list [--json]' },
  { section: 'Diagnostics and advanced', maturity: 'advanced', command: 'osc runtimes show <id>' },
];

const SECTION_LABELS: Record<string, string> = {
  'First-read demo': 'First-read demo:',
  'Stable core protocol': 'Stable core protocol:',
  'Handoff and run packages': 'Handoff and run packages:',
  'Lab and experimental': 'Lab and experimental:',
  'Diagnostics and advanced': 'Diagnostics and advanced:',
};

export function renderCommandHelp(): string {
  const lines = [
    'osc — Open Scaffold CLI',
    '',
    'Repo-native work record: MISSION.md → plan → run packet/amendment → evidence → verification → close.',
    'Command maturity: stable day-one/day-two commands first; lab and advanced commands are labeled.',
    '',
    'Usage:',
  ];
  for (const section of Object.keys(SECTION_LABELS)) {
    lines.push(SECTION_LABELS[section]!);
    for (const entry of COMMAND_REGISTRY.filter((item) => item.section === section)) {
      lines.push(`  ${entry.command}`);
    }
    lines.push('');
  }
  lines.push(
    'Run binding options:',
    '  --task-id <id>              Canonical task/card/issue id for this work item',
    '  --source-ref <ref>          Additional source ref; repeatable',
    '  --runtime <preset>          omc | codex | omx | plain | human | custom',
    '  --workflow <workflow>       interview | plan | team | loop | execute | goal | custom',
    '  --executor <lane>           omc-claude | omx-codex | plain-agent | human | custom',
    '  --harness-skill <skill>     e.g. /ralplan, $ralplan, /ralph, $ultrawork',
    '  --repo <path>               Repository path for execution',
    '  --worktree <path>           Worktree path for isolated execution',
    '  --branch <name>             Branch expected for the run',
    '  --operator-surface <name>   discord | slack | telegram | github | cli | none | custom',
    '  --operator-thread <id>      Optional chat/thread/comment binding id',
    '  --issue <id-or-url>         Optional GitHub issue binding',
    '  --pr <id-or-url>            Optional PR binding',
    '  --commit-policy <text>      Commit/push approval rule',
    '',
    'Generic open-scaffold generates prompts/artifacts only. External coordinators, agents, and runtime harnesses perform any execution outside core.',
    '',
  );
  return lines.join('\n');
}
