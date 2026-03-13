#!/usr/bin/env bash
set -euo pipefail

# Deploy the staging environment.
#
# Usage:
#   ./scripts/deploy-staging.sh          # deploy current branch
#   ./scripts/deploy-staging.sh v1       # deploy a specific branch
#   ./scripts/deploy-staging.sh main --seed  # deploy + seed data
#
# Prerequisites:
#   - .env.staging exists with all values filled in
#   - Docker is running
#   - DNS, SSL, and nginx are configured (see docker-compose.staging.yml header)

COMPOSE_FILE="docker-compose.staging.yml"
PROJECT="esports-staging"
BRANCH="${1:-}"
SEED=false

# Parse args
for arg in "$@"; do
  case $arg in
    --seed) SEED=true ;;
    *) BRANCH="$arg" ;;
  esac
done

echo "=== Deploying staging ==="

# Checkout branch if specified
if [ -n "$BRANCH" ] && [ "$BRANCH" != "--seed" ]; then
  echo "Switching to branch: $BRANCH"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
fi

# Check .env.staging exists
if [ ! -f .env.staging ]; then
  echo "ERROR: .env.staging not found. Copy .env.staging.example and fill in values."
  exit 1
fi

# Build and restart
echo "Building containers..."
docker compose -f "$COMPOSE_FILE" -p "$PROJECT" build

echo "Starting containers..."
docker compose -f "$COMPOSE_FILE" -p "$PROJECT" up -d

# Wait for DB
echo "Waiting for staging DB to be ready..."
until docker compose -f "$COMPOSE_FILE" -p "$PROJECT" exec staging-db pg_isready -U vash_staging -d vash_staging 2>/dev/null; do
  sleep 1
done
echo "DB ready."

# Run schema push (reads DATABASE_URL from the staging DB exposed on host port 5433)
echo "Pushing schema to staging DB..."
source .env.staging
export DATABASE_URL="postgresql://vash_staging:${STAGING_DB_PASSWORD}@127.0.0.1:5433/vash_staging"
bun run db:push

# Optionally seed
if [ "$SEED" = true ]; then
  echo "Seeding staging database..."
  bun scripts/seed-staging.ts --fresh
fi

echo ""
echo "=== Staging deployed ==="
echo "URL: https://staging.esports.vash.software"
echo "DB:  postgresql://vash_staging:***@127.0.0.1:5433/vash_staging"
echo ""
echo "Useful commands:"
echo "  docker compose -f $COMPOSE_FILE -p $PROJECT logs -f staging-app"
echo "  docker compose -f $COMPOSE_FILE -p $PROJECT ps"
echo "  docker compose -f $COMPOSE_FILE -p $PROJECT down"
