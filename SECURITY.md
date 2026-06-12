# Security Policy

Open Scaffold is a repo-native workflow record. It helps humans and agents plan, execute, verify, and hand off AI-assisted work, but it is not a security scanner, sandbox, or runtime supervisor by itself. For the full structural-vs-correctness boundary and local-state split, see [`docs/TRUST_BOUNDARIES.md`](docs/TRUST_BOUNDARIES.md).

## Reporting a vulnerability

Please report security issues through GitHub Security Advisories for this repository when available, or open a minimal public issue that asks for a private contact path without disclosing exploit details.

Include:

- affected version or commit;
- affected command, workflow, or package surface;
- reproduction steps using non-sensitive test data;
- expected impact and any required attacker capability.

Do not include real tokens, webhook URLs, private repo content, customer data, or other secrets in public issues.

## Release and publishing posture

The npm publishing workflow uses GitHub Actions trusted publishing with least-privilege job permissions:

- `contents: read`
- `id-token: write`

The workflow pins the npm CLI used by the privileged publish job instead of installing `npm@latest` at publish time. Version bumps, actual npm publication, GitHub Release updates, and merge/publish decisions remain owner-gated.

## Dependency maintenance

Dependabot monitors:

- GitHub Actions workflow dependencies;
- the root npm package;
- the private `packages/runtime-omx` npm manifest.

Security or dependency bot output is review input, not automatic truth. Changes still need local verification and owner review before merge/publish.

## Optional native dependency posture

The root package intentionally ships without optional native dependencies. The core scaffold files, plan workflow, run packets, evidence notes, and GitHub-based task tracking should install without fetching native database artifacts.

If a future local task database returns, it needs a dedicated plan and review gate before reintroducing native optional installs. Until then, use GitHub Issues or another external task bridge for task tracking rather than implying a bundled `osc task` database path.

## Runtime command boundaries

Open Scaffold core does not spawn agents. `osc run` records runtime intent and writes a `run.json` package; external coordinators, humans, runtime harnesses, or runtime-specific packages decide whether and how to execute it. The retired root adapter/dispatch commands are historical and should not be treated as current security controls.

For `@open-scaffold/runtime-omx`:

- default behavior validates a run packet and writes receipt/evidence artifacts;
- real OMX launch requires explicit `--allow-spawn`;
- `--omx-command` is a trusted-operator override for local/manual use, not a value that should come from untrusted files or remote input;
- commit, push, merge, publish, credential management, destructive filesystem operations, and runtime certification remain outside the adapter's authority.

## Cockpit webhook configuration

`.osc/cockpit.json` is trusted local/operator configuration. Webhook URLs can send messages to external Discord or Slack endpoints, so keep this file out of git, avoid pasting real URLs into public artifacts, and rotate any webhook that may have been exposed.

Open Scaffold masks webhook URLs in summaries, but masking is not a substitute for treating the config file as sensitive local configuration.
