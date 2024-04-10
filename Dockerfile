FROM oven/bun:alpine
RUN apk add --update python3 make g++\
   && rm -rf /var/cache/apk/*

WORKDIR /app
COPY package.json ./
COPY bun.lockb ./
RUN bun install

COPY ./ ./
RUN bun run build

CMD ["bun", "start:prod"]
