FROM oven/bun:1.4.5 AS bun
FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["bun", "run", "start", "--hostname", "0.0.0.0"]
