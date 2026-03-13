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

# Runtime — prod deps only
FROM base AS runtime
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=build /app/build build

USER bun
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

CMD ["bun", "run", "start"]
