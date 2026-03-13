FROM oven/bun AS base
WORKDIR /app

# Install dependencies (cached unless package.json/bun.lock change)
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build (mount cache so SvelteKit reuses previous build artifacts)
FROM base AS build
COPY --from=deps /app/node_modules node_modules
COPY . .
ENV NODE_ENV=production
ENV BETTER_AUTH_SECRET=build-placeholder
RUN --mount=type=cache,target=/app/.svelte-kit bun run build

# Runtime — prod deps + drizzle-kit for migrations
FROM base AS runtime
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts && bun add drizzle-kit drizzle-orm --ignore-scripts
COPY --from=build /app/build build
COPY drizzle.config.ts ./
COPY src/lib/server/db/schema.ts src/lib/server/db/auth.schema.ts src/lib/server/db/

USER bun
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

CMD ["bun", "run", "start"]
