import type { SQL } from "bun";
import type { IQueueRepository } from "../../domain/interfaces/IQueueRepository";
import type { QueueEntry } from "../../domain/models/QueueEntry";
import type { Team } from "../../domain/models/Team";
import type { Player } from "../../domain/models/Player";
import { getAverageRating } from "../../domain/models/Team";

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

interface QueueEntryRow {
  id: string;
  team_id: string;
  queue_type: string;
  joined_at: Date;
}

export class PostgresQueueRepository implements IQueueRepository {
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

  private async loadTeam(teamId: string): Promise<Team | null> {
    const rows = await this.db`SELECT * FROM teams WHERE id = ${teamId}`;
    if (rows.length === 0) return null;

    const row = rows[0] as TeamRow;
    const players = await this.loadTeamPlayers(teamId);
    const captain = players.find((p) => p.id === row.captain_id) ?? players[0];

    return {
      id: row.id,
      name: row.name,
      players,
      captain,
      createdAt: row.created_at,
    };
  }

  async add(entry: QueueEntry): Promise<void> {
    await this.db`
      INSERT INTO queue_entries (id, team_id, queue_type, joined_at)
      VALUES (${entry.id}, ${entry.team.id}, ${entry.queueType}, ${entry.joinedAt})
      ON CONFLICT (team_id) DO UPDATE SET
        queue_type = EXCLUDED.queue_type,
        joined_at = EXCLUDED.joined_at
    `;
  }

  async remove(teamId: string): Promise<void> {
    await this.db`DELETE FROM queue_entries WHERE team_id = ${teamId}`;
  }

  async findByTeamId(teamId: string): Promise<QueueEntry | null> {
    const rows = await this.db`SELECT * FROM queue_entries WHERE team_id = ${teamId}`;
    if (rows.length === 0) return null;

    const row = rows[0] as QueueEntryRow;
    const team = await this.loadTeam(row.team_id);
    if (!team) return null;

    return {
      id: row.id,
      team,
      queueType: row.queue_type,
      joinedAt: row.joined_at,
    };
  }

  async findByType(queueType: string): Promise<QueueEntry[]> {
    const rows = await this.db`
      SELECT * FROM queue_entries
      WHERE queue_type = ${queueType}
      ORDER BY joined_at ASC
    `;

    const entries: QueueEntry[] = [];
    for (const row of rows as QueueEntryRow[]) {
      const team = await this.loadTeam(row.team_id);
      if (team) {
        entries.push({
          id: row.id,
          team,
          queueType: row.queue_type,
          joinedAt: row.joined_at,
        });
      }
    }

    return entries;
  }

  async findClosestByRating(
    rating: number,
    queueType: string,
    exclude?: string[]
  ): Promise<QueueEntry | null> {
    const entries = await this.findByType(queueType);

    let closest: QueueEntry | null = null;
    let closestDiff = Infinity;

    for (const entry of entries) {
      if (exclude?.includes(entry.team.id)) continue;

      const teamRating = getAverageRating(entry.team);
      const diff = Math.abs(teamRating - rating);

      if (diff < closestDiff) {
        closestDiff = diff;
        closest = entry;
      }
    }

    return closest;
  }

  async findAll(): Promise<QueueEntry[]> {
    const rows = await this.db`SELECT * FROM queue_entries ORDER BY joined_at ASC`;

    const entries: QueueEntry[] = [];
    for (const row of rows as QueueEntryRow[]) {
      const team = await this.loadTeam(row.team_id);
      if (team) {
        entries.push({
          id: row.id,
          team,
          queueType: row.queue_type,
          joinedAt: row.joined_at,
        });
      }
    }

    return entries;
  }

  async clear(): Promise<void> {
    await this.db`DELETE FROM queue_entries`;
  }
}
