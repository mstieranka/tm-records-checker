FROM node:18-alpine

RUN mkdir /app

COPY package.json package-lock.json /app/
WORKDIR /app
RUN npm install

USER node
COPY --chown=node:node . /app/

CMD ["npm", "start"]
