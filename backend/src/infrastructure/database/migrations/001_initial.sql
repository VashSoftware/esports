-- Initial database schema for Vash Esports Backend

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id VARCHAR(255) UNIQUE NOT NULL,
  osu_id INTEGER UNIQUE NOT NULL,
  osu_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  rating INTEGER DEFAULT 1000,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  captain_id UUID REFERENCES players(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_players (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, player_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lobby_id VARCHAR(255),
  winner_team_id UUID REFERENCES teams(id),
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS match_teams (
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  team_order INTEGER NOT NULL,
  PRIMARY KEY (match_id, team_id)
);

CREATE TABLE IF NOT EXISTS match_rolls (
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  roll_value INTEGER NOT NULL,
  PRIMARY KEY (match_id, team_id)
);

CREATE TABLE IF NOT EXISTS match_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  map_id INTEGER NOT NULL,
  ban_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  map_id INTEGER NOT NULL,
  pick_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  map_id INTEGER NOT NULL,
  winner_team_id UUID REFERENCES teams(id),
  map_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS player_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_score_id UUID REFERENCES match_scores(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  score INTEGER NOT NULL,
  accuracy DECIMAL(5,2),
  max_combo INTEGER,
  misses INTEGER,
  mods TEXT[]
);

CREATE TABLE IF NOT EXISTS queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  queue_type VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_players_osu_id ON players(osu_id);
CREATE INDEX IF NOT EXISTS idx_players_discord_id ON players(discord_id);
CREATE INDEX IF NOT EXISTS idx_matches_state ON matches(state) WHERE state NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_matches_lobby_id ON matches(lobby_id) WHERE lobby_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_queue_entries_type ON queue_entries(queue_type, joined_at);
CREATE INDEX IF NOT EXISTS idx_team_players_player ON team_players(player_id);
