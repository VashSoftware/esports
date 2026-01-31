import type { SQL } from "bun";
import type { IMatchRepository } from "../../domain/interfaces/IMatchRepository";
import type { Match } from "../../domain/models/Match";
import { MatchState, isActiveState } from "../../domain/models/MatchState";
import type { Team } from "../../domain/models/Team";
import type { Player } from "../../domain/models/Player";
import type { MatchScore, Score } from "../../domain/models/Score";

interface MatchRow {
  id: string;
  protocol: string;
  state: string;
  lobby_id: string | null;
  winner_team_id: string | null;
  created_at: Date;
  started_at: Date | null;
  ended_at: Date | null;
}

interface PlayerRow {
  id: string;
  discord_id: string;
  osu_id: number;
  osu_name: string;
  display_name: string;
  rating: number;
  created_at: Date;
}

interface TeamRow {
  id: string;
  name: string;
  captain_id: string;
  created_at: Date;
}

export class PostgresMatchRepository implements IMatchRepository {
  constructor(private db: SQL) {}

  private rowToPlayer(row: PlayerRow): Player {
    return {
      id: row.id,
      discordId: row.discord_id,
      osuId: row.osu_id,
      osuName: row.osu_name,
      displayName: row.display_name,
      rating: row.rating,
      createdAt: row.created_at,
    };
  }

  private async loadTeamPlayers(teamId: string): Promise<Player[]> {
    const rows = await this.db`
      SELECT p.* FROM players p
      JOIN team_players tp ON tp.player_id = p.id
      WHERE tp.team_id = ${teamId}
    `;
    return rows.map((row) => this.rowToPlayer(row as PlayerRow));
  }

  private async loadMatchTeams(matchId: string): Promise<Team[]> {
    const teamRows = await this.db`
      SELECT t.*, mt.team_order FROM teams t
      JOIN match_teams mt ON mt.team_id = t.id
      WHERE mt.match_id = ${matchId}
      ORDER BY mt.team_order
    `;

    const teams: Team[] = [];
    for (const row of teamRows as (TeamRow & { team_order: number })[]) {
      const players = await this.loadTeamPlayers(row.id);
      const captain = players.find((p) => p.id === row.captain_id) ?? players[0];
      teams.push({
        id: row.id,
        name: row.name,
        players,
        captain,
        createdAt: row.created_at,
      });
    }

    return teams;
  }

  private async loadMatchScores(matchId: string): Promise<MatchScore[]> {
    const scoreRows = await this.db`
      SELECT * FROM match_scores WHERE match_id = ${matchId} ORDER BY map_order
    `;

    const scores: MatchScore[] = [];
    for (const row of scoreRows as any[]) {
      const playerScoreRows = await this.db`
        SELECT * FROM player_scores WHERE match_score_id = ${row.id}
      `;

      const teamScores = new Map<string, number>();
      const playerScores = new Map<string, Score>();

      for (const ps of playerScoreRows as any[]) {
        playerScores.set(ps.player_id, {
          playerId: ps.player_id,
          score: ps.score,
          accuracy: ps.accuracy,
          maxCombo: ps.max_combo,
          misses: ps.misses,
          mods: ps.mods,
        });
      }

      scores.push({
        id: row.id,
        mapId: row.map_id,
        teamScores,
        playerScores,
        winner: row.winner_team_id,
      });
    }

    return scores;
  }

  private async loadMatchRolls(matchId: string): Promise<Map<string, number>> {
    const rows = await this.db`SELECT * FROM match_rolls WHERE match_id = ${matchId}`;
    const rolls = new Map<string, number>();
    for (const row of rows as any[]) {
      rolls.set(row.team_id, row.roll_value);
    }
    return rolls;
  }

  private async loadMatchBans(matchId: string): Promise<Map<string, number[]>> {
    const rows = await this.db`
      SELECT * FROM match_bans WHERE match_id = ${matchId} ORDER BY ban_order
    `;
    const bans = new Map<string, number[]>();
    for (const row of rows as any[]) {
      const teamBans = bans.get(row.team_id) ?? [];
      teamBans.push(row.map_id);
      bans.set(row.team_id, teamBans);
    }
    return bans;
  }

  private async loadMatchPicks(matchId: string): Promise<number[]> {
    const rows = await this.db`
      SELECT * FROM match_picks WHERE match_id = ${matchId} ORDER BY pick_order
    `;
    return (rows as any[]).map((r) => r.map_id);
  }

  async findById(id: string): Promise<Match | null> {
    const rows = await this.db`SELECT * FROM matches WHERE id = ${id}`;
    if (rows.length === 0) return null;

    const row = rows[0] as MatchRow;
    const teams = await this.loadMatchTeams(id);
    const scores = await this.loadMatchScores(id);
    const rolls = await this.loadMatchRolls(id);
    const bans = await this.loadMatchBans(id);
    const picks = await this.loadMatchPicks(id);

    const winner = row.winner_team_id
      ? teams.find((t) => t.id === row.winner_team_id)
      : undefined;

    return {
      id: row.id,
      teams,
      protocol: row.protocol,
      state: row.state as MatchState,
      scores,
      winner,
      lobbyId: row.lobby_id ?? undefined,
      createdAt: row.created_at,
      startedAt: row.started_at ?? undefined,
      endedAt: row.ended_at ?? undefined,
      rolls,
      bans,
      picks,
      joinedPlayers: new Set(),
      currentPicker: undefined,
      currentBanner: undefined,
    };
  }

  async findActive(): Promise<Match[]> {
    const rows = await this.db`
      SELECT id FROM matches WHERE state NOT IN ('completed', 'cancelled')
    `;
    const matches: Match[] = [];
    for (const row of rows as { id: string }[]) {
      const match = await this.findById(row.id);
      if (match) matches.push(match);
    }
    return matches;
  }

  async findByPlayer(playerId: string, limit?: number): Promise<Match[]> {
    const query = limit
      ? this.db`
          SELECT DISTINCT m.id FROM matches m
          JOIN match_teams mt ON mt.match_id = m.id
          JOIN team_players tp ON tp.team_id = mt.team_id
          WHERE tp.player_id = ${playerId}
          ORDER BY m.created_at DESC
          LIMIT ${limit}
        `
      : this.db`
          SELECT DISTINCT m.id FROM matches m
          JOIN match_teams mt ON mt.match_id = m.id
          JOIN team_players tp ON tp.team_id = mt.team_id
          WHERE tp.player_id = ${playerId}
          ORDER BY m.created_at DESC
        `;

    const rows = await query;
    const matches: Match[] = [];
    for (const row of rows as { id: string }[]) {
      const match = await this.findById(row.id);
      if (match) matches.push(match);
    }
    return matches;
  }

  async findByLobbyId(lobbyId: string): Promise<Match | null> {
    const rows = await this.db`SELECT id FROM matches WHERE lobby_id = ${lobbyId}`;
    if (rows.length === 0) return null;
    return this.findById((rows[0] as { id: string }).id);
  }

  async save(match: Match): Promise<void> {
    await this.db`
      INSERT INTO matches (id, protocol, state, lobby_id, winner_team_id, created_at, started_at, ended_at)
      VALUES (${match.id}, ${match.protocol}, ${match.state}, ${match.lobbyId ?? null}, ${match.winner?.id ?? null}, ${match.createdAt}, ${match.startedAt ?? null}, ${match.endedAt ?? null})
      ON CONFLICT (id) DO UPDATE SET
        protocol = EXCLUDED.protocol,
        state = EXCLUDED.state,
        lobby_id = EXCLUDED.lobby_id,
        winner_team_id = EXCLUDED.winner_team_id,
        started_at = EXCLUDED.started_at,
        ended_at = EXCLUDED.ended_at
    `;

    await this.db`DELETE FROM match_teams WHERE match_id = ${match.id}`;
    for (let i = 0; i < match.teams.length; i++) {
      await this.db`
        INSERT INTO match_teams (match_id, team_id, team_order)
        VALUES (${match.id}, ${match.teams[i].id}, ${i})
      `;
    }

    await this.db`DELETE FROM match_rolls WHERE match_id = ${match.id}`;
    for (const [teamId, roll] of match.rolls) {
      await this.db`
        INSERT INTO match_rolls (match_id, team_id, roll_value)
        VALUES (${match.id}, ${teamId}, ${roll})
      `;
    }

    await this.db`DELETE FROM match_bans WHERE match_id = ${match.id}`;
    let banOrder = 0;
    for (const [teamId, mapIds] of match.bans) {
      for (const mapId of mapIds) {
        await this.db`
          INSERT INTO match_bans (match_id, team_id, map_id, ban_order)
          VALUES (${match.id}, ${teamId}, ${mapId}, ${banOrder++})
        `;
      }
    }

    await this.db`DELETE FROM match_picks WHERE match_id = ${match.id}`;
    for (let i = 0; i < match.picks.length; i++) {
      await this.db`
        INSERT INTO match_picks (match_id, map_id, pick_order)
        VALUES (${match.id}, ${match.picks[i]}, ${i})
      `;
    }
  }

  async updateState(matchId: string, state: MatchState): Promise<void> {
    await this.db`UPDATE matches SET state = ${state} WHERE id = ${matchId}`;
  }

  async findAll(): Promise<Match[]> {
    const rows = await this.db`SELECT id FROM matches ORDER BY created_at DESC`;
    const matches: Match[] = [];
    for (const row of rows as { id: string }[]) {
      const match = await this.findById(row.id);
      if (match) matches.push(match);
    }
    return matches;
  }
}
