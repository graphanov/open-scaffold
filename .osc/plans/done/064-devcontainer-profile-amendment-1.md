# Amendment 1: 064-devcontainer-profile

## Parent

064-devcontainer-profile

## Date

2026-05-24

## Learning

Plan 050 has already shipped npm publication, and the required standalone build command uses `.devcontainer/` as the Docker build context. That context cannot copy the repository source into the image, so the self-contained base image should preinstall the published `open-scaffold` package while the devcontainer post-create step installs the mounted workspace version.

## New direction

Build the base image from `node:22`, install git and a published `open-scaffold` package globally so `osc` works immediately, then run `npm install && npm run build && npm install -g .` after the workspace is mounted so local source wins during real development.

## Impact on acceptance criteria

The acceptance criteria stay the same. The Dockerfile build, `osc --version`, Node.js, git, standard-tier generation, and documentation checks now validate the published-package base image plus workspace post-create refresh path rather than a Docker build that copies local source from outside its build context.
