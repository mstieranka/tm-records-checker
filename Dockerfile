FROM oven/bun:alpine

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN bun install

COPY ./ ./
RUN bun run build

CMD ["bun", "start:prod"]
