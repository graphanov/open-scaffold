FROM node:22

ARG OPEN_SCAFFOLD_VERSION=latest

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=/home/node/.npm-global/bin:$PATH

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates openssh-client \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /home/node/.npm-global \
  && chown -R node:node /home/node/.npm-global

USER node
WORKDIR /workspaces/open-scaffold

RUN npm install -g "open-scaffold@${OPEN_SCAFFOLD_VERSION}"

CMD ["sleep", "infinity"]
