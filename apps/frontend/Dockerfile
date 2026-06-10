# Dev image — build context = repo root. Hot-reload via `nx serve`.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json nx.json tsconfig.base.json ./
RUN npm install

COPY . .

EXPOSE 4200

# Docker proxy config points /api at the `backend` compose service.
CMD ["npx", "nx", "serve", "frontend", "--host", "0.0.0.0", "--poll", "2000", "--proxy-config", "apps/frontend/proxy.conf.docker.json"]
