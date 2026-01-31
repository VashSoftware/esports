import type { Match } from "../models/Match";
import type { Player } from "../models/Player";
import type { Score } from "../models/Score";

export interface IGameService {
  createLobby(match: Match): Promise<string>;
  closeLobby(lobbyId: string): Promise<void>;
  invitePlayer(player: Player, lobbyId: string): Promise<void>;
  sendMessage(lobbyId: string, message: string): Promise<void>;
  setMap(lobbyId: string, mapId: number): Promise<void>;
  startMatch(lobbyId: string): Promise<void>;

  onPlayerJoin(callback: (osuId: number, lobbyId: string) => void): void;
  onPlayerLeave(callback: (osuId: number, lobbyId: string) => void): void;
  onMatchStart(callback: (lobbyId: string) => void): void;
  onMatchFinish(callback: (lobbyId: string, scores: Score[]) => void): void;
  onRoll(callback: (osuId: number, lobbyId: string, roll: number) => void): void;
}
