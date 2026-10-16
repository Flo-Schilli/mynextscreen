# Dev image — build context = repo root. Hot-reload via `nx serve` (nest --watch).
FROM node:26-alpine

# Fonts for the content-source slide renderer (SVG text renders empty without them).
RUN apk add --no-cache ffmpeg fontconfig font-dejavu font-liberation

WORKDIR /app

COPY package.json package-lock.json nx.json tsconfig.base.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npx", "nx", "serve", "backend"]
