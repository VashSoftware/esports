import type { SQL } from "bun";
import type { ITeamRepository } from "../../domain/interfaces/ITeamRepository";
import type { Team } from "../../domain/models/Team";
import type { Player } from "../../domain/models/Player";

interface TeamRow {
  id: string;
  name: string;
  captain_id: string;
  created_at: Date;
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

export class PostgresTeamRepository implements ITeamRepository {
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

  async findById(id: string): Promise<Team | null> {
    const rows = await this.db`SELECT * FROM teams WHERE id = ${id}`;
    if (rows.length === 0) return null;

    const row = rows[0] as TeamRow;
    const players = await this.loadTeamPlayers(id);
    const captain = players.find((p) => p.id === row.captain_id) ?? players[0];

    return {
      id: row.id,
      name: row.name,
      players,
      captain,
      createdAt: row.created_at,
    };
  }

  async findByPlayer(playerId: string): Promise<Team[]> {
    const teamRows = await this.db`
      SELECT t.* FROM teams t
      JOIN team_players tp ON tp.team_id = t.id
      WHERE tp.player_id = ${playerId}
    `;

    const teams: Team[] = [];
    for (const row of teamRows as TeamRow[]) {
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

  async save(team: Team): Promise<void> {
    await this.db`
      INSERT INTO teams (id, name, captain_id, created_at)
      VALUES (${team.id}, ${team.name}, ${team.captain.id}, ${team.createdAt})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        captain_id = EXCLUDED.captain_id
    `;

    await this.db`DELETE FROM team_players WHERE team_id = ${team.id}`;

    for (const player of team.players) {
      await this.db`
        INSERT INTO team_players (team_id, player_id)
        VALUES (${team.id}, ${player.id})
      `;
    }
  }

  async delete(teamId: string): Promise<void> {
    await this.db`DELETE FROM teams WHERE id = ${teamId}`;
  }

  async findAll(): Promise<Team[]> {
    const teamRows = await this.db`SELECT * FROM teams ORDER BY created_at DESC`;
    const teams: Team[] = [];

    for (const row of teamRows as TeamRow[]) {
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
}
