FROM oven/bun:alpine

WORKDIR /app
COPY package.json ./
COPY bun.lock ./
RUN bun install --frozen-lockfile

COPY ./ ./
RUN bun run build

CMD ["bun", "start:prod"]
