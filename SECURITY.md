# Security Policy

Open Scaffold is a repo-native workflow record. It helps humans and agents plan, execute, verify, and hand off AI-assisted work, but it is not a security scanner, sandbox, or runtime supervisor by itself.

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

The local task database uses `better-sqlite3` as an optional native dependency. npm installs optional dependencies by default, which means downstream installs may fetch prebuilt/native artifacts for that feature.

This dependency is not required for the core scaffold files, plan workflow, run packets, evidence notes, or GitHub-based task tracking. If an environment wants to avoid optional native installs, install with npm's optional-dependency omission mode and use GitHub Issues or another task bridge instead of `osc task` local database commands.

When the optional dependency is unavailable, Open Scaffold should fail only the local task database command path with an explicit error rather than making the whole scaffold unusable.

## Runtime command boundaries

Open Scaffold core does not spawn agents by default. Runtime packages and adapters must keep launch authority explicit and auditable.

For `@open-scaffold/runtime-omx`:

- default behavior validates a run packet and writes receipt/evidence artifacts;
- real OMX launch requires explicit `--allow-spawn`;
- `--omx-command` is a trusted-operator override for local/manual use, not a value that should come from untrusted files or remote input;
- commit, push, merge, publish, credential management, destructive filesystem operations, and runtime certification remain outside the adapter's authority.

## Cockpit webhook configuration

`.osc/cockpit.json` is trusted local/operator configuration. Webhook URLs can send messages to external Discord or Slack endpoints, so keep this file out of git, avoid pasting real URLs into public artifacts, and rotate any webhook that may have been exposed.

Open Scaffold masks webhook URLs in summaries, but masking is not a substitute for treating the config file as sensitive local configuration.
