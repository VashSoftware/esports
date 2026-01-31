import type { IGameService } from "../../domain/interfaces/IGameService";
import type { Match } from "../../domain/models/Match";
import type { Player } from "../../domain/models/Player";
import type { Score } from "../../domain/models/Score";

type PlayerJoinCallback = (osuId: number, lobbyId: string) => void;
type PlayerLeaveCallback = (osuId: number, lobbyId: string) => void;
type MatchStartCallback = (lobbyId: string) => void;
type MatchFinishCallback = (lobbyId: string, scores: Score[]) => void;
type RollCallback = (osuId: number, lobbyId: string, roll: number) => void;

export interface OsuApiConfig {
  clientId: string;
  clientSecret: string;
}

export interface OsuIrcConfig {
  username: string;
  password: string;
  server?: string;
  port?: number;
}

export class OsuService implements IGameService {
  private playerJoinCallbacks: PlayerJoinCallback[] = [];
  private playerLeaveCallbacks: PlayerLeaveCallback[] = [];
  private matchStartCallbacks: MatchStartCallback[] = [];
  private matchFinishCallbacks: MatchFinishCallback[] = [];
  private rollCallbacks: RollCallback[] = [];

  private lobbies: Map<string, { matchId: string; channel: string }> = new Map();

  constructor(
    private apiConfig: OsuApiConfig,
    private ircConfig: OsuIrcConfig
  ) {
    this.connectIrc();
  }

  private async connectIrc(): Promise<void> {
    // TODO: Implement IRC connection using Bun's WebSocket
    // Connect to irc.ppy.sh
    // Authenticate with BanchoBot
    console.log("[OsuService] IRC connection not yet implemented");
  }

  async createLobby(match: Match): Promise<string> {
    const lobbyName = `VASH: ${match.teams.map((t) => t.name).join(" vs ")}`;
    // TODO: Send IRC command to create lobby
    // !mp make <name>
    // Parse response to get lobby ID

    const lobbyId = `osu_${match.id.slice(0, 8)}`;
    this.lobbies.set(lobbyId, {
      matchId: match.id,
      channel: `#mp_${lobbyId}`,
    });

    console.log(`[OsuService] Created lobby: ${lobbyId}`);
    return lobbyId;
  }

  async closeLobby(lobbyId: string): Promise<void> {
    // TODO: Send IRC command to close lobby
    // !mp close
    this.lobbies.delete(lobbyId);
    console.log(`[OsuService] Closed lobby: ${lobbyId}`);
  }

  async invitePlayer(player: Player, lobbyId: string): Promise<void> {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      throw new Error(`Lobby ${lobbyId} not found`);
    }
    // TODO: Send IRC command
    // !mp invite <username>
    console.log(`[OsuService] Invited ${player.osuName} to ${lobbyId}`);
  }

  async sendMessage(lobbyId: string, message: string): Promise<void> {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      throw new Error(`Lobby ${lobbyId} not found`);
    }
    // TODO: Send IRC message to lobby channel
    console.log(`[OsuService] [${lobbyId}] ${message}`);
  }

  async setMap(lobbyId: string, mapId: number): Promise<void> {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      throw new Error(`Lobby ${lobbyId} not found`);
    }
    // TODO: Send IRC command
    // !mp map <id> <mode>
    console.log(`[OsuService] Set map ${mapId} in ${lobbyId}`);
  }

  async startMatch(lobbyId: string): Promise<void> {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      throw new Error(`Lobby ${lobbyId} not found`);
    }
    // TODO: Send IRC command
    // !mp start
    console.log(`[OsuService] Started match in ${lobbyId}`);
  }

  onPlayerJoin(callback: PlayerJoinCallback): void {
    this.playerJoinCallbacks.push(callback);
  }

  onPlayerLeave(callback: PlayerLeaveCallback): void {
    this.playerLeaveCallbacks.push(callback);
  }

  onMatchStart(callback: MatchStartCallback): void {
    this.matchStartCallbacks.push(callback);
  }

  onMatchFinish(callback: MatchFinishCallback): void {
    this.matchFinishCallbacks.push(callback);
  }

  onRoll(callback: RollCallback): void {
    this.rollCallbacks.push(callback);
  }

  // IRC message parsing - called when messages are received
  private handleIrcMessage(channel: string, user: string, message: string): void {
    // Find lobby by channel
    let lobbyId: string | null = null;
    for (const [id, lobby] of this.lobbies) {
      if (lobby.channel === channel) {
        lobbyId = id;
        break;
      }
    }
    if (!lobbyId) return;

    // Parse BanchoBot messages
    if (user === "BanchoBot") {
      // Player joined: "<username> joined in slot X"
      const joinMatch = message.match(/^(\S+) joined in slot \d+/);
      if (joinMatch) {
        // TODO: Look up osuId from username
        // For now, we'd need an API call or cache
        console.log(`[OsuService] Player joined: ${joinMatch[1]}`);
      }

      // Match finished - parse scores
      // Format varies, typically shows all player scores
      if (message.includes("The match has finished")) {
        // TODO: Parse scores from recent messages or API
        console.log(`[OsuService] Match finished in ${lobbyId}`);
      }
    }

    // Parse roll command: "<username> rolls X point(s)"
    const rollMatch = message.match(/^(\S+) rolls (\d+) point/);
    if (rollMatch) {
      const username = rollMatch[1];
      const roll = parseInt(rollMatch[2]);
      // TODO: Look up osuId from username
      console.log(`[OsuService] ${username} rolled ${roll}`);
    }
  }

  // Expose for testing
  _triggerPlayerJoin(osuId: number, lobbyId: string): void {
    for (const cb of this.playerJoinCallbacks) {
      cb(osuId, lobbyId);
    }
  }

  _triggerRoll(osuId: number, lobbyId: string, roll: number): void {
    for (const cb of this.rollCallbacks) {
      cb(osuId, lobbyId, roll);
    }
  }

  _triggerMatchFinish(lobbyId: string, scores: Score[]): void {
    for (const cb of this.matchFinishCallbacks) {
      cb(lobbyId, scores);
    }
  }
}
