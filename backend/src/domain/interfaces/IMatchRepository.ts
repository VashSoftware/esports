import type { Match } from "../models/Match";
import type { MatchState } from "../models/MatchState";

export interface IMatchRepository {
  findById(id: string): Promise<Match | null>;
  findActive(): Promise<Match[]>;
  findByPlayer(playerId: string, limit?: number): Promise<Match[]>;
  findByLobbyId(lobbyId: string): Promise<Match | null>;
  save(match: Match): Promise<void>;
  updateState(matchId: string, state: MatchState): Promise<void>;
  findAll(): Promise<Match[]>;
}
