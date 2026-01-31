import type { IPlayerRepository } from "../../domain/interfaces/IPlayerRepository";
import type { Player } from "../../domain/models/Player";

export class InMemoryPlayerRepository implements IPlayerRepository {
  private players: Map<string, Player> = new Map();

  async findById(id: string): Promise<Player | null> {
    return this.players.get(id) ?? null;
  }

  async findByOsuId(osuId: number): Promise<Player | null> {
    for (const player of this.players.values()) {
      if (player.osuId === osuId) {
        return player;
      }
    }
    return null;
  }

  async findByDiscordId(discordId: string): Promise<Player | null> {
    for (const player of this.players.values()) {
      if (player.discordId === discordId) {
        return player;
      }
    }
    return null;
  }

  async save(player: Player): Promise<void> {
    this.players.set(player.id, player);
  }

  async updateRating(playerId: string, newRating: number): Promise<void> {
    const player = this.players.get(playerId);
    if (player) {
      player.rating = newRating;
    }
  }

  async findAll(): Promise<Player[]> {
    return Array.from(this.players.values());
  }

  clear(): void {
    this.players.clear();
  }
}
