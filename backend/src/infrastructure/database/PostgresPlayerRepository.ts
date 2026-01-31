import type { SQL } from "bun";
import type { IPlayerRepository } from "../../domain/interfaces/IPlayerRepository";
import type { Player } from "../../domain/models/Player";

interface PlayerRow {
  id: string;
  discord_id: string;
  osu_id: number;
  osu_name: string;
  display_name: string;
  rating: number;
  created_at: Date;
}

export class PostgresPlayerRepository implements IPlayerRepository {
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

  async findById(id: string): Promise<Player | null> {
    const rows = await this.db`
      SELECT * FROM players WHERE id = ${id}
    `;
    if (rows.length === 0) return null;
    return this.rowToPlayer(rows[0] as PlayerRow);
  }

  async findByOsuId(osuId: number): Promise<Player | null> {
    const rows = await this.db`
      SELECT * FROM players WHERE osu_id = ${osuId}
    `;
    if (rows.length === 0) return null;
    return this.rowToPlayer(rows[0] as PlayerRow);
  }

  async findByDiscordId(discordId: string): Promise<Player | null> {
    const rows = await this.db`
      SELECT * FROM players WHERE discord_id = ${discordId}
    `;
    if (rows.length === 0) return null;
    return this.rowToPlayer(rows[0] as PlayerRow);
  }

  async save(player: Player): Promise<void> {
    await this.db`
      INSERT INTO players (id, discord_id, osu_id, osu_name, display_name, rating, created_at)
      VALUES (${player.id}, ${player.discordId}, ${player.osuId}, ${player.osuName}, ${player.displayName}, ${player.rating}, ${player.createdAt})
      ON CONFLICT (id) DO UPDATE SET
        discord_id = EXCLUDED.discord_id,
        osu_id = EXCLUDED.osu_id,
        osu_name = EXCLUDED.osu_name,
        display_name = EXCLUDED.display_name,
        rating = EXCLUDED.rating
    `;
  }

  async updateRating(playerId: string, newRating: number): Promise<void> {
    await this.db`
      UPDATE players SET rating = ${newRating} WHERE id = ${playerId}
    `;
  }

  async findAll(): Promise<Player[]> {
    const rows = await this.db`SELECT * FROM players ORDER BY created_at DESC`;
    return rows.map((row) => this.rowToPlayer(row as PlayerRow));
  }
}
