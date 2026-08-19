# Build context is the repo root (see fly.toml / `docker build -f server/Dockerfile .`)
# because the server lives inside an npm-workspaces monorepo and needs the
# root lockfile to install reproducibly.

FROM node:22-alpine AS builder
WORKDIR /app

# Only the package.json files are needed to resolve the workspace + lockfile --
# copying these before the rest of the source keeps Docker's layer cache warm
# across rebuilds that only touch application code.
COPY package.json package-lock.json ./
COPY packages/governance-core/package.json packages/governance-core/package.json
COPY apps/deal-architect/package.json apps/deal-architect/package.json
COPY apps/capital-readiness/package.json apps/capital-readiness/package.json
COPY apps/notes-underwriting/package.json apps/notes-underwriting/package.json
COPY apps/legacy-estate/package.json apps/legacy-estate/package.json
COPY server/package.json server/package.json
RUN npm ci

COPY server ./server
RUN npm run build --workspace=server
# Drop devDependencies (typescript, tsx, @types/*) across the whole workspace
# tree now that the build is done -- the runtime image only needs what
# server/dist actually requires at runtime.
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./server/package.json

EXPOSE 4000
CMD ["node", "server/dist/index.js"]
