FROM oven/bun:alpine
RUN apk --no-cache add curl

WORKDIR /app
COPY package.json ./
COPY bun.lockb ./
COPY src ./

RUN bun install

CMD ["bun", "start"]
