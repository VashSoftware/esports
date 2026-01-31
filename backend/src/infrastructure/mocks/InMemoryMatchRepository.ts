import type { IMatchRepository } from "../../domain/interfaces/IMatchRepository";
import type { Match } from "../../domain/models/Match";
import { MatchState, isActiveState } from "../../domain/models/MatchState";

export class InMemoryMatchRepository implements IMatchRepository {
  private matches: Map<string, Match> = new Map();

  async findById(id: string): Promise<Match | null> {
    return this.matches.get(id) ?? null;
  }

  async findActive(): Promise<Match[]> {
    const result: Match[] = [];
    for (const match of this.matches.values()) {
      if (isActiveState(match.state)) {
        result.push(match);
      }
    }
    return result;
  }

  async findByPlayer(playerId: string, limit?: number): Promise<Match[]> {
    const result: Match[] = [];
    for (const match of this.matches.values()) {
      const hasPlayer = match.teams.some((t) =>
        t.players.some((p) => p.id === playerId)
      );
      if (hasPlayer) {
        result.push(match);
        if (limit && result.length >= limit) break;
      }
    }
    return result;
  }

  async findByLobbyId(lobbyId: string): Promise<Match | null> {
    for (const match of this.matches.values()) {
      if (match.lobbyId === lobbyId) {
        return match;
      }
    }
    return null;
  }

  async save(match: Match): Promise<void> {
    this.matches.set(match.id, match);
  }

  async updateState(matchId: string, state: MatchState): Promise<void> {
    const match = this.matches.get(matchId);
    if (match) {
      match.state = state;
    }
  }

  async findAll(): Promise<Match[]> {
    return Array.from(this.matches.values());
  }

  clear(): void {
    this.matches.clear();
  }
}
