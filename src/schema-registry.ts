export interface SchemaRegistryEntry {
  id: string;
  owner: string;
  maturity: 'stable' | 'lab' | 'advanced' | 'future';
  emittedBy: string[];
  shape: string;
}

export const SCHEMA_REGISTRY: SchemaRegistryEntry[] = [
  { id: 'open-scaffold.run.v1', owner: 'src/artifacts.ts', maturity: 'stable', emittedBy: ['osc run', 'osc delegate', 'osc review', 'osc ultrareview'], shape: 'Run packet under .osc/runs/<run_id>/run.json with plan, runtime selection, bindings, artifacts, questions, and commit policy.' },
  { id: 'open-scaffold.adapter.v1', owner: 'src/dispatch.ts', maturity: 'stable', emittedBy: ['project-local .osc/adapters/<id>.json'], shape: 'Project-local adapter command config with id, command tokens, env allowlist, explicit env, timeout/log caps, and optional worktree-isolation requirement.' },
  { id: 'open-scaffold.trusted_adapters.v1', owner: 'src/adapter-trust.ts', maturity: 'stable', emittedBy: ['osc adapter trust'], shape: 'Gitignored local trust records keyed by adapter id and adapter config sha256 digest.' },
  { id: 'open-scaffold.dispatch-receipt.v1', owner: 'src/dispatch.ts + adapters', maturity: 'stable', emittedBy: ['osc dispatch adapters', '@open-scaffold/runtime-omx'], shape: 'Adapter receipt describing adapter id, run id, status, spawn boundary, evidence artifacts, and runtime metadata.' },
  { id: 'open-scaffold.runtime-profile.v1', owner: 'src/runtimes.ts', maturity: 'stable', emittedBy: ['builtin runtime profiles', '.osc/runtimes/<id>.json', 'osc runtimes list/show'], shape: 'Runtime handoff profile metadata for no-spawn executor lane, workflow defaults, operator surface defaults, and adapter expectations.' },
  { id: 'open-scaffold.pr_summary.v1', owner: 'src/pr-summary.ts', maturity: 'stable', emittedBy: ['osc pr-summary'], shape: 'Read-only plan summary for PR comments: plan path/stage, goal, acceptance criteria, evidence note, validation, and open questions.' },
  { id: 'open-scaffold.pr_check.v1', owner: 'src/pr-check.ts', maturity: 'stable', emittedBy: ['osc pr check'], shape: 'Structural PR work-record check with findings for plan/evidence/run/close-decision and explicit structural-only warning.' },
  { id: 'open-scaffold.trace.v1', owner: 'src/trace.ts', maturity: 'stable', emittedBy: ['osc trace --json'], shape: 'Local work-record replay for one plan with plan state, evidence/run/PR links, warnings, and structural summary.' },
  { id: 'open-scaffold.attempt-comparison.v1', owner: 'src/compare.ts', maturity: 'stable', emittedBy: ['osc compare --json'], shape: 'Read-only comparison of two attempt directories with file diffs and reviewable decision support.' },
  { id: 'open-scaffold.evidence.v1', owner: 'docs/SLICE_CLOSE_PROTOCOL.md', maturity: 'stable', emittedBy: ['evidence receipts and postflight notes'], shape: 'Evidence receipt with approval status, rationale, artifacts, verification, follow-up, and boundary statements.' },
  { id: 'open-scaffold.audit-envelope.v1', owner: 'src/audit.ts', maturity: 'lab', emittedBy: ['osc audit init'], shape: 'Digest-only artifact audit envelope for local structural review.' },
  { id: 'open-scaffold.proof-comparison.v1', owner: 'src/compare.ts', maturity: 'lab', emittedBy: ['proof manifests consumed by osc prove compare/check'], shape: 'Source-labeled scaffolded-vs-control comparison manifest with quality, token, speed, and evolution metrics.' },
  { id: 'open-scaffold.proof-comparison-result.v1', owner: 'src/compare.ts', maturity: 'lab', emittedBy: ['osc prove compare --format json'], shape: 'Computed receipt-comparison verdict with per-metric winners, category status, caveats, and validation summary.' },
  { id: 'open-scaffold.proof-receipt.v1', owner: 'docs/PROOF_HARNESS.md', maturity: 'lab', emittedBy: ['examples/proof/*/receipts/*.json'], shape: 'Sanitized per-run receipt for a bounded proof fixture; raw private logs stay out of the public repo.' },
  { id: 'open-scaffold.proof-aggregate.v1', owner: 'docs/PROOF_HARNESS.md', maturity: 'lab', emittedBy: ['examples/proof/*/receipts/aggregate.json'], shape: 'Aggregate receipt with per-arm medians and derived deltas for a bounded proof fixture.' },
  { id: 'open-scaffold.evaluation.v1', owner: 'src/cli.ts + src/evolution.ts', maturity: 'lab', emittedBy: ['osc eval init', 'osc evolve record --evaluation'], shape: 'Acceptance-criteria evaluation envelope scaffold or external scorer summary reference; structural input only, not approval evidence.' },
  { id: 'open-scaffold.evolution-loop.v1', owner: 'src/evolution.ts', maturity: 'lab', emittedBy: ['osc evolve init'], shape: 'Loop directory state for objective, subject, strategy, created time, boundary flags, and stop conditions.' },
  { id: 'open-scaffold.evolution-attempt.v1', owner: 'src/evolution.ts', maturity: 'lab', emittedBy: ['osc evolve record'], shape: 'Append-only attempt journal entries with run/evidence refs, decision, score, rationale, optional usage, and retry repair-hypothesis control fields.' },
  { id: 'open-scaffold.evolution-frontier.v1', owner: 'src/evolution.ts', maturity: 'lab', emittedBy: ['osc evolve record', 'osc evolve compare'], shape: 'Current frontier pointer for the promoted attempt plus decision metadata.' },
  { id: 'open-scaffold.cockpit_event.v1', owner: 'src/cockpit.ts', maturity: 'lab', emittedBy: ['osc cockpit post'], shape: 'Operator-surface event payload for status/blocker/question/approval/completion messages; not canonical state.' },
];

export function schemaById(id: string): SchemaRegistryEntry | null {
  return SCHEMA_REGISTRY.find((entry) => entry.id === id) ?? null;
}

export function renderSchemaList(): string {
  return `${['Open Scaffold schema registry', '', ...SCHEMA_REGISTRY.map((entry) => `- ${entry.id} (${entry.maturity}) — owner: ${entry.owner}`), ''].join('\n')}`;
}

export function renderSchemaDetail(entry: SchemaRegistryEntry): string {
  return [
    `# ${entry.id}`,
    '',
    `Maturity: ${entry.maturity}`,
    `Owner: ${entry.owner}`,
    `Emitted by: ${entry.emittedBy.join(', ')}`,
    '',
    'Shape:',
    entry.shape,
    '',
    'Boundary: schema registration documents artifact shape and ownership only; it is not a correctness, compliance, or approval claim.',
    '',
  ].join('\n');
}
