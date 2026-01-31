import type { Player } from "../models/Player";

export interface IPlayerRepository {
  findById(id: string): Promise<Player | null>;
  findByOsuId(osuId: number): Promise<Player | null>;
  findByDiscordId(discordId: string): Promise<Player | null>;
  save(player: Player): Promise<void>;
  updateRating(playerId: string, newRating: number): Promise<void>;
  findAll(): Promise<Player[]>;
}
