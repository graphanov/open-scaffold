# Dev Container

Open Scaffold includes an optional development container for teams that want the same toolchain on every machine. It provides Node.js 22, npm, git, and a preinstalled `osc` command without making containers required for local development.

## Prerequisites

- Docker Desktop or another Docker-compatible engine.
- VS Code with the Dev Containers extension, GitHub Codespaces, Gitpod, JetBrains Gateway, or plain Docker.
- No project secrets are required. Do not bake tokens, `.env` files, or credentials into the container image.

## First launch with VS Code

1. Clone the repository.
2. Open it in VS Code.
3. Choose **Reopen in Container** when prompted, or run **Dev Containers: Reopen in Container** from the command palette.
4. Wait for the image build and `postCreateCommand` to finish.
5. Open a terminal and run:

```bash
osc --version
osc status
npm test
```

The image installs the published `open-scaffold` package so `osc` exists as soon as the container starts. When the mounted workspace is the Open Scaffold package itself, the post-create step runs `npm install`, `npm run build`, and `npm install -g .` so `osc` points at the checked-out source; generated downstream scaffolds and arbitrary Node projects keep using the preinstalled CLI instead of running project-local npm scripts.

## GitHub Codespaces

Codespaces detects `.devcontainer/devcontainer.json` automatically. Create a codespace from the repository page, wait for setup, then run `osc status` in the terminal. If setup fails, choose **Rebuild Container** from the Codespaces command palette after checking the build logs.

## Plain Docker

Build the image without VS Code:

```bash
docker build -t osc-devcontainer -f .devcontainer/Dockerfile .devcontainer/
```

Smoke the base tools:

```bash
docker run --rm osc-devcontainer osc --version
docker run --rm osc-devcontainer node --version
docker run --rm osc-devcontainer npm --version
docker run --rm osc-devcontainer git --version
```

To work on a checkout with plain Docker, mount the repository and install the workspace package:

```bash
docker run --rm -it \
  -v "$PWD:/workspaces/open-scaffold" \
  -w /workspaces/open-scaffold \
  osc-devcontainer \
  bash -lc 'npm install && npm run build && npm install -g . && osc status'
```

## Customization

- Change the Node version by editing the first line of `.devcontainer/Dockerfile`; keep it aligned with `package.json` `engines`.
- Add editor extensions under `customizations.vscode.extensions` in `.devcontainer/devcontainer.json`.
- Add project-specific ports, features, or mounts in `devcontainer.json`, but keep secrets outside the image.
- Install AI agent runtimes such as Claude Code, Codex, OMC, or OMX separately if your team chooses them; the base Open Scaffold container stays runtime-neutral.

## Troubleshooting

### `osc` is missing after container creation

Run:

```bash
npm install
npm run build
npm install -g .
```

Then check `osc --version`. If global install permissions fail, confirm the container is using the bundled `node` user and `NPM_CONFIG_PREFIX=/home/node/.npm-global`.

### Dependency install failed

Run `npm install` again in the container terminal. If the lockfile or registry is unavailable, fix that project dependency issue before rebuilding the container.

### Rebuild after Dockerfile changes

Use **Dev Containers: Rebuild Container** in VS Code or rebuild manually:

```bash
docker build --no-cache -t osc-devcontainer -f .devcontainer/Dockerfile .devcontainer/
```

### Port conflicts

Open Scaffold itself does not expose ports. If your downstream project adds services, forward only the ports that project needs and avoid committing machine-specific port choices unless they are part of the team contract.

### Codespaces cache looks stale

Rebuild the codespace container. If it still uses an old published package, the post-create local install should replace it with the workspace checkout; run `npm run build && npm install -g .` to refresh manually.
