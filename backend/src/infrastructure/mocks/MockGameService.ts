import type { IGameService } from "../../domain/interfaces/IGameService";
import type { Match } from "../../domain/models/Match";
import type { Player } from "../../domain/models/Player";
import type { Score } from "../../domain/models/Score";

interface MockLobby {
  id: string;
  matchId: string;
  players: Set<number>;
  messages: string[];
  currentMap?: number;
}

export class MockGameService implements IGameService {
  public lobbies: Map<string, MockLobby> = new Map();
  public messageLog: Array<{ lobbyId: string; message: string }> = [];

  private playerJoinCallbacks: Array<(osuId: number, lobbyId: string) => void> = [];
  private playerLeaveCallbacks: Array<(osuId: number, lobbyId: string) => void> = [];
  private matchStartCallbacks: Array<(lobbyId: string) => void> = [];
  private matchFinishCallbacks: Array<(lobbyId: string, scores: Score[]) => void> = [];
  private rollCallbacks: Array<(osuId: number, lobbyId: string, roll: number) => void> = [];

  async createLobby(match: Match): Promise<string> {
    const lobbyId = `mock-lobby-${match.id}`;
    this.lobbies.set(lobbyId, {
      id: lobbyId,
      matchId: match.id,
      players: new Set(),
      messages: [],
    });
    return lobbyId;
  }

  async closeLobby(lobbyId: string): Promise<void> {
    this.lobbies.delete(lobbyId);
  }

  async invitePlayer(player: Player, lobbyId: string): Promise<void> {
    const lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      lobby.messages.push(`Invited ${player.osuName}`);
    }
  }

  async sendMessage(lobbyId: string, message: string): Promise<void> {
    const lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      lobby.messages.push(message);
    }
    this.messageLog.push({ lobbyId, message });
  }

  async setMap(lobbyId: string, mapId: number): Promise<void> {
    const lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      lobby.currentMap = mapId;
      lobby.messages.push(`Changed map to ${mapId}`);
    }
  }

  async startMatch(lobbyId: string): Promise<void> {
    const lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      lobby.messages.push("Match started");
    }
  }

  onPlayerJoin(callback: (osuId: number, lobbyId: string) => void): void {
    this.playerJoinCallbacks.push(callback);
  }

  onPlayerLeave(callback: (osuId: number, lobbyId: string) => void): void {
    this.playerLeaveCallbacks.push(callback);
  }

  onMatchStart(callback: (lobbyId: string) => void): void {
    this.matchStartCallbacks.push(callback);
  }

  onMatchFinish(callback: (lobbyId: string, scores: Score[]) => void): void {
    this.matchFinishCallbacks.push(callback);
  }

  onRoll(callback: (osuId: number, lobbyId: string, roll: number) => void): void {
    this.rollCallbacks.push(callback);
  }

  simulatePlayerJoin(lobbyId: string, osuId: number): void {
    const lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      lobby.players.add(osuId);
    }
    for (const cb of this.playerJoinCallbacks) {
      cb(osuId, lobbyId);
    }
  }

  simulatePlayerLeave(lobbyId: string, osuId: number): void {
    const lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      lobby.players.delete(osuId);
    }
    for (const cb of this.playerLeaveCallbacks) {
      cb(osuId, lobbyId);
    }
  }

  simulateRoll(lobbyId: string, osuId: number, roll: number): void {
    for (const cb of this.rollCallbacks) {
      cb(osuId, lobbyId, roll);
    }
  }

  simulateMatchStart(lobbyId: string): void {
    for (const cb of this.matchStartCallbacks) {
      cb(lobbyId);
    }
  }

  simulateMatchFinish(lobbyId: string, scores: Score[]): void {
    for (const cb of this.matchFinishCallbacks) {
      cb(lobbyId, scores);
    }
  }

  clear(): void {
    this.lobbies.clear();
    this.messageLog = [];
    this.playerJoinCallbacks = [];
    this.playerLeaveCallbacks = [];
    this.matchStartCallbacks = [];
    this.matchFinishCallbacks = [];
    this.rollCallbacks = [];
  }
}
