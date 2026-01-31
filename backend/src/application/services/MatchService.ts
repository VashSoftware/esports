import type { IMatchRepository } from "../../domain/interfaces/IMatchRepository";
import type { IPlayerRepository } from "../../domain/interfaces/IPlayerRepository";
import type { IGameService } from "../../domain/interfaces/IGameService";
import type { INotificationService } from "../../domain/interfaces/INotificationService";
import type { ProtocolRegistry } from "../../domain/protocols/ProtocolRegistry";
import type { ProtocolContext, RollResult } from "../../domain/protocols/IMatchProtocol";
import type { EventBus } from "../events/EventBus";
import type { Team } from "../../domain/models/Team";
import type { Player } from "../../domain/models/Player";
import type { OsuMap } from "../../domain/models/OsuMap";
import type { Score } from "../../domain/models/Score";
import { type Match, createMatch, allPlayersJoined, getTeamWins } from "../../domain/models/Match";
import { MatchState } from "../../domain/models/MatchState";
import { createMatchScore } from "../../domain/models/Score";
import { MatchEvents } from "../../domain/events/MatchEvents";

export class MatchService {
  constructor(
    private matchRepo: IMatchRepository,
    private playerRepo: IPlayerRepository,
    private protocolRegistry: ProtocolRegistry,
    private gameService: IGameService,
    private notificationService: INotificationService,
    private eventBus: EventBus
  ) {
    this.setupGameServiceCallbacks();
  }

  private setupGameServiceCallbacks(): void {
    this.gameService.onPlayerJoin(async (osuId, lobbyId) => {
      const match = await this.matchRepo.findByLobbyId(lobbyId);
      if (!match) return;

      const player = await this.playerRepo.findByOsuId(osuId);
      if (!player) return;

      await this.handlePlayerJoined(match.id, player);
    });

    this.gameService.onRoll(async (osuId, lobbyId, roll) => {
      const match = await this.matchRepo.findByLobbyId(lobbyId);
      if (!match) return;

      const player = await this.playerRepo.findByOsuId(osuId);
      if (!player) return;

      await this.handleRoll(match.id, player, roll);
    });

    this.gameService.onMatchFinish(async (lobbyId, scores) => {
      const match = await this.matchRepo.findByLobbyId(lobbyId);
      if (!match) return;

      await this.handleMapComplete(match.id, scores);
    });
  }

  async createMatch(teams: Team[], protocolName: string): Promise<Match> {
    const protocol = this.protocolRegistry.get(protocolName);

    const match = createMatch({
      teams,
      protocol: protocolName,
    });

    await this.matchRepo.save(match);
    await this.eventBus.publish(MatchEvents.created(match));

    return match;
  }

  async startMatch(matchId: string): Promise<void> {
    const match = await this.matchRepo.findById(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    const protocol = this.protocolRegistry.get(match.protocol);
    const context = this.createProtocolContext(match);

    const lobbyId = await this.gameService.createLobby(match);
    match.lobbyId = lobbyId;
    match.startedAt = new Date();

    const newState = await protocol.onMatchStart(match, context);
    if (newState) {
      await this.transitionState(match, newState);
    }

    for (const team of match.teams) {
      for (const player of team.players) {
        await this.gameService.invitePlayer(player, lobbyId);
      }
    }

    await this.notificationService.announceMatch(match);
    await this.matchRepo.save(match);
  }

  async handlePlayerJoined(matchId: string, player: Player): Promise<void> {
    const match = await this.matchRepo.findById(matchId);
    if (!match) return;

    if (match.state !== MatchState.WAITING_PLAYERS) return;

    const isMatchPlayer = match.teams.some((t) =>
      t.players.some((p) => p.id === player.id)
    );
    if (!isMatchPlayer) return;

    match.joinedPlayers.add(player.id);
    await this.eventBus.publish(MatchEvents.playerJoined(match, player));

    if (allPlayersJoined(match)) {
      const protocol = this.protocolRegistry.get(match.protocol);
      const context = this.createProtocolContext(match);

      const newState = await protocol.onAllPlayersJoined(match, context);
      if (newState) {
        await this.transitionState(match, newState);
      }
    }

    await this.matchRepo.save(match);
  }

  async handleRoll(matchId: string, player: Player, roll: number): Promise<void> {
    const match = await this.matchRepo.findById(matchId);
    if (!match) return;

    if (match.state !== MatchState.ROLLING) return;

    const team = match.teams.find((t) => t.players.some((p) => p.id === player.id));
    if (!team) return;

    if (match.rolls.has(team.id)) return;

    match.rolls.set(team.id, roll);
    await this.eventBus.publish(MatchEvents.rollCompleted(match, player, roll));

    const rolls: RollResult[] = Array.from(match.rolls.entries()).map(
      ([teamId, rollValue]) => ({
        teamId,
        playerId: player.id,
        roll: rollValue,
      })
    );

    if (rolls.length === match.teams.length) {
      const protocol = this.protocolRegistry.get(match.protocol);
      const context = this.createProtocolContext(match);

      const newState = await protocol.onRollComplete(match, rolls, context);
      if (newState) {
        await this.transitionState(match, newState);
      }
    }

    await this.matchRepo.save(match);
  }

  async handlePick(matchId: string, team: Team, map: OsuMap): Promise<void> {
    const match = await this.matchRepo.findById(matchId);
    if (!match) return;

    if (match.state !== MatchState.PICKING) return;

    const protocol = this.protocolRegistry.get(match.protocol);
    if (!protocol.isValidPick(match, team, map)) return;

    const context = this.createProtocolContext(match);
    await this.eventBus.publish(MatchEvents.mapPicked(match, team, map));

    const newState = await protocol.onPick(match, team, map, context);
    if (newState) {
      await this.transitionState(match, newState);
    }

    await this.matchRepo.save(match);
  }

  async handleBan(matchId: string, team: Team, map: OsuMap): Promise<void> {
    const match = await this.matchRepo.findById(matchId);
    if (!match) return;

    if (match.state !== MatchState.BANNING) return;

    const protocol = this.protocolRegistry.get(match.protocol);
    if (!protocol.isValidBan(match, team, map)) return;

    const context = this.createProtocolContext(match);
    await this.eventBus.publish(MatchEvents.mapBanned(match, team, map));

    const newState = await protocol.onBan(match, team, map, context);
    if (newState) {
      await this.transitionState(match, newState);
    }

    await this.matchRepo.save(match);
  }

  async handleMapComplete(matchId: string, scores: Score[]): Promise<void> {
    const match = await this.matchRepo.findById(matchId);
    if (!match) return;

    if (match.state !== MatchState.PLAYING) return;

    const protocol = this.protocolRegistry.get(match.protocol);
    const winnerId = protocol.calculateMapWinner(match, scores);

    const teamScores = new Map<string, number>();
    const playerScores = new Map<string, Score>();

    for (const team of match.teams) {
      const teamPlayerIds = team.players.map((p) => p.id);
      const teamTotal = scores
        .filter((s) => teamPlayerIds.includes(s.playerId))
        .reduce((sum, s) => sum + s.score, 0);
      teamScores.set(team.id, teamTotal);
    }

    for (const score of scores) {
      playerScores.set(score.playerId, score);
    }

    const currentMapId = match.picks[match.picks.length - 1];
    const matchScore = createMatchScore({
      mapId: currentMapId,
      teamScores,
      playerScores,
      winner: winnerId,
    });

    match.scores.push(matchScore);
    await this.eventBus.publish(MatchEvents.mapCompleted(match, matchScore));
    await this.notificationService.announceMapResult(match, matchScore);

    const context = this.createProtocolContext(match);
    const newState = await protocol.onMapComplete(match, scores, context);

    if (newState === MatchState.COMPLETED) {
      const winner = match.teams.find((t) => t.id === protocol.calculateMatchWinner(match));
      if (winner) {
        match.winner = winner;
        match.endedAt = new Date();
        await this.eventBus.publish(MatchEvents.completed(match, winner));
        await this.notificationService.announceMatchResult(match, winner);
        await this.updatePlayerRatings(match);
      }
    }

    if (newState) {
      await this.transitionState(match, newState);
    }

    await this.matchRepo.save(match);
  }

  async cancelMatch(matchId: string, reason: string): Promise<void> {
    const match = await this.matchRepo.findById(matchId);
    if (!match) return;

    match.endedAt = new Date();
    await this.transitionState(match, MatchState.CANCELLED);
    await this.eventBus.publish(MatchEvents.cancelled(match, reason));

    if (match.lobbyId) {
      await this.gameService.closeLobby(match.lobbyId);
    }

    await this.matchRepo.save(match);
  }

  private async transitionState(match: Match, newState: MatchState): Promise<void> {
    const previousState = match.state;
    match.state = newState;
    await this.matchRepo.updateState(match.id, newState);
    await this.eventBus.publish(MatchEvents.stateChanged(match, previousState));
  }

  private createProtocolContext(match: Match): ProtocolContext {
    return {
      sendMessage: async (message: string) => {
        if (match.lobbyId) {
          await this.gameService.sendMessage(match.lobbyId, message);
        }
      },
      setMap: async (mapId: number) => {
        if (match.lobbyId) {
          await this.gameService.setMap(match.lobbyId, mapId);
        }
      },
      startGame: async () => {
        if (match.lobbyId) {
          await this.gameService.startMatch(match.lobbyId);
        }
      },
    };
  }

  private async updatePlayerRatings(match: Match): Promise<void> {
    if (!match.winner) return;

    const K = 32;
    const winningTeam = match.winner;
    const losingTeam = match.teams.find((t) => t.id !== winningTeam.id);
    if (!losingTeam) return;

    const winnerAvgRating =
      winningTeam.players.reduce((sum, p) => sum + p.rating, 0) /
      winningTeam.players.length;
    const loserAvgRating =
      losingTeam.players.reduce((sum, p) => sum + p.rating, 0) /
      losingTeam.players.length;

    const expectedWinner =
      1 / (1 + Math.pow(10, (loserAvgRating - winnerAvgRating) / 400));
    const expectedLoser = 1 - expectedWinner;

    const winnerDelta = Math.round(K * (1 - expectedWinner));
    const loserDelta = Math.round(K * (0 - expectedLoser));

    for (const player of winningTeam.players) {
      await this.playerRepo.updateRating(player.id, player.rating + winnerDelta);
    }

    for (const player of losingTeam.players) {
      await this.playerRepo.updateRating(
        player.id,
        Math.max(100, player.rating + loserDelta)
      );
    }
  }
}
