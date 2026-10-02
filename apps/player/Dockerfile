# Dev image — build context = repo root. Hot-reload via `nx serve`.
FROM node:26-alpine

WORKDIR /app

COPY package.json package-lock.json nx.json tsconfig.base.json ./
RUN npm install

COPY . .

EXPOSE 4300

# Docker proxy config points /api at the `backend` compose service.
CMD ["npx", "nx", "serve", "player", "--host", "0.0.0.0", "--poll", "2000", "--proxy-config", "apps/player/proxy.conf.docker.json"]
