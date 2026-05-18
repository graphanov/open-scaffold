# Plan: 070-runtime-adapter-registry

## Status

backlog

## Context

Open Scaffold ships with built-in runtime profiles (omc, omx, plain, human) and one in-repo agentic runtime package (`packages/runtime-omx/`). But there is no discoverability mechanism — a user running `osc runtimes list` sees built-in profiles but has no way to know what third-party adapters exist, what workflows they support, or how to install them. A runtime adapter registry — even a simple JSON file in the repo — would make the runtime ecosystem feel real and give adapter authors a canonical place to register their work. This is infrastructure for the multi-runtime vision without committing core to any specific runtime.

## Goal

Ship a runtime adapter registry: a JSON file in the Open Scaffold repo listing known adapter packages, plus `osc runtimes search|install|info` commands to discover and set up adapters, establishing the marketplace pattern without building a marketplace backend.

## Constraints / Out of scope

- The registry is a single `registry.json` file tracked in the Open Scaffold repo. No server, no API, no dynamic resolution.
- Registry entries are curated by PR — adapter authors submit a PR adding their entry. The Open Scaffold maintainer reviews and merges.
- `osc runtimes install <id>` runs the adapter's documented install command (typically `npm install`). It does NOT execute arbitrary code from the registry — it prints the install command for the user to run manually if the command looks unsafe.
- Does NOT implement automatic runtime discovery, version compatibility checking, or dependency resolution.
- Does NOT validate that adapter packages actually work — the registry is a directory, not a certification.
- Does NOT implement a marketplace with ratings, downloads, or popularity metrics.
- Adapter entries must include: name, description, repo URL, install command, supported workflows, minimum Open Scaffold version, and a conformance badge (self-declared).

## Files to touch

- `registry.json` — new file: array of adapter entries with standardized schema
- `src/registry.ts` — new file: registry loading, searching, display formatting, install command generation
- `src/cli.ts` — wire `osc runtimes search <query>`, `osc runtimes info <id>`, `osc runtimes install <id> [--yes]`, `osc runtimes registry`
- `tests/registry.test.ts` — test registry loading, search, info display, install command output
- `docs/RUNTIME_PROFILES.md` — add "Adapter Registry" section
- `docs/ADAPTER_REGISTRY.md` — new file: registry schema, submission guide, review criteria

## Acceptance criteria

- [ ] `registry.json` exists with a `$schema` field, a `version` field, and an `adapters` array
- [ ] `registry.json` includes at minimum: the built-in OMX adapter (`packages/runtime-omx/`), plus documentation for how to submit new entries
- [ ] Each adapter entry has: `id` (unique slug), `name` (human-readable), `description`, `repo` (URL), `install` (command or object with platform variants), `workflows` (list of supported workflow names), `runtime` (omc|omx|plain-agent|human|custom), `minOpenScaffoldVersion`, `conformance` (self-declared conformance level and date), `status` (stable|beta|experimental)
- [ ] `osc runtimes search "omx"` returns entries matching the query in name, description, or id
- [ ] `osc runtimes search` (no query) lists all registry entries
- [ ] `osc runtimes info omx` displays the full entry for the OMX adapter: name, description, repo, install command, supported workflows, conformance status
- [ ] `osc runtimes install omx` prints the install command (e.g., `cd packages/runtime-omx && npm install && npm run build`) and asks for confirmation before executing
- [ ] `osc runtimes install omx --yes` skips confirmation and runs the install command
- [ ] `osc runtimes registry` shows registry metadata: number of adapters, last updated, schema version
- [ ] The `registry.json` schema is documented in `docs/ADAPTER_REGISTRY.md` with a JSON Schema definition
- [ ] `docs/ADAPTER_REGISTRY.md` includes submission instructions: fork, add entry, open PR, what the maintainer checks before merge
- [ ] All existing tests pass; new registry tests cover search, info display, and install command generation

## Verification steps

1. **Registry validity:** Run `python3 -c "import json; json.load(open('registry.json'))"` to validate JSON. Verify required fields present on all entries.
2. **Search:** Run `osc runtimes search omx`. Verify output includes the OMX adapter entry.
3. **Info:** Run `osc runtimes info omx`. Verify all fields (name, description, repo, install, workflows) are displayed.
4. **Install dry-run:** Run `osc runtimes install omx` (without --yes). Verify it prints the command and asks for confirmation. Answer "no". Verify nothing is installed.
5. **Empty search:** Run `osc runtimes search "nonexistent"`. Verify output is "No adapters found matching 'nonexistent'."
6. **Schema doc:** Run `osc runtimes registry`. Verify metadata output. Read `docs/ADAPTER_REGISTRY.md`. Verify submission guide is clear.

## Open questions

- Should the registry support version ranges (e.g., adapter v1.2.0 requires Open Scaffold >=1.0.0)? Yes — `minOpenScaffoldVersion` is a simple floor. Semantic version range support (e.g., `^1.0.0`) would be more precise but adds complexity. Start with minimum version only.
- Should `osc runtimes install` ever install packages globally (npm install -g)? No — adapters should be project-local (npm install in the repo or in a packages/ directory). Global installs create version conflicts across projects.
- Should the registry be automatically tested in CI? A CI step that validates `registry.json` schema and checks that all listed repos are accessible (HTTP 200) would catch stale entries. Add this as a stretch goal if the registry grows beyond 10 entries.
- Should the registry be in the core repo or a separate `open-scaffold-registry` repo? In the core repo for v1 — it's a single file and the submission flow (PR to core) is simple. A separate repo would be warranted if the registry grows to 50+ entries with automated validation.
