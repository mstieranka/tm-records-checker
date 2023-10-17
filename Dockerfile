FROM oven/bun:alpine

WORKDIR /app
COPY package.json ./
COPY bun.lockb ./
COPY src ./

RUN bun install

CMD ["bun", "start"]
