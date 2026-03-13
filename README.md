# Vash Esports

[![CI](https://github.com/VashSoftware/esports/actions/workflows/ci.yml/badge.svg)](https://github.com/VashSoftware/esports/actions/workflows/ci.yml)
[![Deploy](https://github.com/VashSoftware/esports/actions/workflows/deploy.yml/badge.svg)](https://github.com/VashSoftware/esports/actions/workflows/deploy.yml)
[![Discord](https://img.shields.io/discord/639921094974898176?color=5865F2&logo=discord&logoColor=white&label=discord)](https://discord.gg/n3mZgWk)

An automated osu! matchmaking platform. Players queue up, get matched by ELO, and play fully automated multiplayer matches — lobby creation, map picking, score tracking, and rating updates all happen without referees.

## Features

- **Ranked queue** — ELO-based matchmaking with automatic mappool selection by skill level
- **Automated matches** — lobbies are created in osu! via IRC, maps are picked/banned through chat commands, scores are collected automatically
- **Match engine** — full state machine (lobby → rolling → picking → playing → results) with configurable best-of formats and team sizes
- **Beatmap pools** — create and manage mappools with standard categories (NM, HD, HR, DT, FM, TB)
- **Teams** — create teams, manage rosters, track team stats
- **Leaderboard** — player and team rankings with high score tracking
- **Admin panel** — user management, role assignment, match oversight
- **Discord notifications** — match results posted to your Discord server

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Framework:** [SvelteKit](https://svelte.dev) + [Svelte 5](https://svelte.dev/docs/svelte/overview)
- **Database:** PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)
- **Auth:** [Better Auth](https://better-auth.com) with osu! OAuth
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com)
- **osu! Integration:** [bancho.js](https://bancho.js.org) (IRC) + osu! API v2
- **Discord:** [discord.js](https://discord.js.org)
- **Testing:** [Vitest](https://vitest.dev) (unit) + [Playwright](https://playwright.dev) (e2e)
- **Deploy:** Docker Compose on a single VM, CI/CD via GitHub Actions

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.3+)
- PostgreSQL 16+ (or Docker)
- An [osu! OAuth application](https://osu.ppy.sh/home/account/edit#new-oauth-application) with callback URL `http://localhost:5173/api/auth/oauth2/callback/osu`
- [osu! IRC credentials](https://osu.ppy.sh/p/irc)
- A [Discord bot](https://discord.com/developers/applications) with a token and channel ID
- [Cloudflare R2](https://developers.cloudflare.com/r2/) bucket for image storage

### Setup

```sh
git clone https://github.com/VashSoftware/esports.git
cd esports
cp .env.example .env
```

Edit `.env` with your credentials:

```sh
# Database — use Docker or your own Postgres instance
DATABASE_URL="postgresql://vash:password@localhost:5432/vash"

# App
ORIGIN="http://localhost:5173"
BETTER_AUTH_SECRET="<run: openssl rand -hex 32>"
ROOT_ADMIN_EMAIL="<your-osu-user-id>@osu.local"

# osu!
OSU_CLIENT_ID="<from osu settings>"
OSU_CLIENT_SECRET="<from osu settings>"
OSU_IRC_USERNAME="<your osu username>"
OSU_IRC_PASSWORD="<from osu IRC settings>"

# Discord
DISCORD_BOT_TOKEN="<your bot token>"
DISCORD_MATCH_CHANNEL_ID="<channel id for match notifications>"

# Cloudflare R2
R2_ACCOUNT_ID="<cloudflare account id>"
R2_ACCESS_KEY_ID="<r2 api token access key>"
R2_SECRET_ACCESS_KEY="<r2 api token secret>"
R2_BUCKET="vash-esports-images"
R2_PUBLIC_URL="https://cdn.esports.vash.software"
```

If you don't have Postgres installed, start one with Docker:

```sh
docker run -d --name esports-db \
  -e POSTGRES_DB=vash \
  -e POSTGRES_USER=vash \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:17
```

Install dependencies and push the database schema:

```sh
bun install
bunx drizzle-kit push
```

Start the dev server:

```sh
bun run dev
```

The app will be running at [http://localhost:5173](http://localhost:5173).

## Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `bun run dev`       | Start dev server                   |
| `bun run build`     | Production build                   |
| `bun run check`     | Type-check with svelte-check       |
| `bun run lint`      | Lint with Prettier + ESLint        |
| `bun run test:unit` | Run unit tests (Vitest)            |
| `bun run test:e2e`  | Run e2e tests (Playwright)         |
| `bun run test`      | Run all tests                      |
| `bun run db:push`   | Push schema changes to database    |
| `bun run db:studio` | Open Drizzle Studio (database GUI) |

## Project Structure

```
src/
  lib/
    server/
      match/
        engine.ts       # Match state machine and ELO calculations
        orchestrator.ts  # IRC lobby lifecycle (create, pick, play, results)
        queue.ts         # Ranked queue and matchmaking logic
        rating.ts        # ELO rating system
      db/
        schema.ts        # Drizzle database schema
      osu.ts             # osu! API v2 client
      auth.ts            # Better Auth configuration
  routes/
    (app)/
      matches/           # Match browser and live match view
      mappools/          # Mappool creation and management
      teams/             # Team browser and management
      leaderboard/       # Player and team rankings
      admin/             # Admin panel
```

## Deployment

The app deploys via Docker Compose to a single VM. Merges to `staging` and `prod` branches trigger automatic deployments through GitHub Actions.

```sh
docker compose build
docker compose up -d
docker compose exec app bunx drizzle-kit push --force
```

See `docker-compose.yml` for the full production setup and `docker-compose.staging.yml` for the staging environment.

## Contributing

This project uses [conventional commits](https://www.conventionalcommits.org/) enforced by git hooks:

```
feat: add new feature
fix: fix a bug
chore: maintenance task
refactor: code restructuring
docs: documentation changes
```

Pre-commit hooks run Prettier and ESLint on staged files. Pre-push hooks run type-checking and unit tests.

## License

All rights reserved. This source code is publicly available for reference and educational purposes. See the project maintainers for contribution or usage inquiries.
