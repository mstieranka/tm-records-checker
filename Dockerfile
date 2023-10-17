FROM oven/bun:alpine

WORKDIR /app
COPY package.json ./
COPY bun.lockb ./
RUN bun install

COPY src/ ./src/

CMD ["bun", "start"]
