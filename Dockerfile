FROM node:19.1.0 as build
WORKDIR /usr/src/app
COPY package.json yarn.lock tsconfig*.json ./
RUN yarn install --frozen-lockfile
COPY prisma ./prisma
COPY src ./src
RUN yarn build:production
RUN cp -r ./src/generated/prisma/runtime ./dist/generated/prisma/runtime


FROM node:19.1.0 as dependencies
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production


FROM node:19.1.0-bullseye-slim
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init
ENV NODE_ENV production

USER node
WORKDIR /usr/src/app

COPY --chown=node:node --from=build /usr/src/app/dist/ ./dist
COPY --chown=node:node --from=dependencies /usr/src/app/node_modules ./node_modules

EXPOSE 4000
CMD ["dumb-init", "node", "dist/server"]
