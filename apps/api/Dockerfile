# Build context is the monorepo root (see .dockerignore at the repo root):
#   docker build -f apps/api/Dockerfile -t vexa-api .
#
# Both stages use the same base image on purpose. Prisma's query engine is a
# native binary compiled against a specific libssl; generating it in one image
# and running it in another risks an engine that cannot load at startup.
FROM node:20-slim AS build

WORKDIR /app

# ca-certificates: Prisma downloads its engine binaries over HTTPS during
# `prisma generate`. openssl: the engine links against libssl at runtime too.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Root manifests first, so `npm ci` is cached until a dependency changes.
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./

# Every workspace's package.json: npm workspaces needs the full member list to
# resolve the dependency graph, even for workspaces we never build here.
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json

# --ignore-scripts: the root "postinstall" runs `prisma generate`, which needs
# schema.prisma. That file is not in the build context yet at this point —
# generate runs explicitly below, once the source is copied in.
RUN npm ci --ignore-scripts

# Build order matches the dependency direction: apps/api imports @vexa/shared.
COPY packages/shared packages/shared
COPY apps/api apps/api

# Generated after deps are installed and before compiling TypeScript, so the
# API build can resolve the Prisma Client types it imports.
RUN npm run db:generate --workspace @vexa/api

RUN npm run build --workspace @vexa/shared
RUN npm run build --workspace @vexa/api

# ---------------------------------------------------------------------------

FROM node:20-slim AS runtime

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# node_modules carries the Prisma CLI (a devDependency) too: migrations are
# applied with `prisma migrate deploy` at container start, not build time.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh

WORKDIR /app/apps/api
RUN chmod +x docker-entrypoint.sh

# .env is never copied into the image — configuration comes from the
# platform's environment variables only.
USER node

EXPOSE $PORT

ENTRYPOINT ["./docker-entrypoint.sh"]
