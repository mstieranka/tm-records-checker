FROM node:18-alpine

RUN mkdir /app
RUN mkdir /app/build
RUN chown -R node:node /app

COPY package.json package-lock.json /app/
WORKDIR /app
RUN npm install

USER node
COPY --chown=node:node . /app/

CMD ["npm", "start"]
