FROM node:20-alpine AS base

WORKDIR /app

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

COPY pnpm-lock.yaml package.json tsconfig.json ./
COPY src ./src
COPY drizzle ./drizzle

RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm prune --prod

FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/dist ./dist
COPY --from=base /app/drizzle ./drizzle

EXPOSE 3001

CMD ["node", "dist/server.js"]
