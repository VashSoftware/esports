import { EventBus } from "../application/events/EventBus";
import { MatchService } from "../application/services/MatchService";
import { QueueService } from "../application/services/QueueService";
import { ProtocolRegistry } from "../domain/protocols/ProtocolRegistry";
import { StandardOsuProtocol } from "../domain/protocols/StandardOsuProtocol";
import { HeadToHeadProtocol } from "../domain/protocols/HeadToHeadProtocol";
import { InMemoryPlayerRepository } from "../infrastructure/mocks/InMemoryPlayerRepository";
import { InMemoryTeamRepository } from "../infrastructure/mocks/InMemoryTeamRepository";
import { InMemoryMatchRepository } from "../infrastructure/mocks/InMemoryMatchRepository";
import { InMemoryQueueRepository } from "../infrastructure/mocks/InMemoryQueueRepository";
import { MockGameService } from "../infrastructure/mocks/MockGameService";
import { MockNotificationService } from "../infrastructure/mocks/MockNotificationService";
import { type Player, createPlayer } from "../domain/models/Player";
import { type Team, createTeam } from "../domain/models/Team";
import type { Match } from "../domain/models/Match";
import type { Score } from "../domain/models/Score";
import { MatchState } from "../domain/models/MatchState";
import type { DomainEvent } from "../domain/events/DomainEvent";

export class TestHarness {
  public eventBus: EventBus;
  public mockGameService: MockGameService;
  public mockNotificationService: MockNotificationService;
  public matchService: MatchService;
  public queueService: QueueService;
  public protocolRegistry: ProtocolRegistry;

  public playerRepo: InMemoryPlayerRepository;
  public teamRepo: InMemoryTeamRepository;
  public matchRepo: InMemoryMatchRepository;
  public queueRepo: InMemoryQueueRepository;

  public events: DomainEvent[] = [];

  private playerCounter = 1;
  private teamCounter = 1;

  constructor() {
    this.eventBus = new EventBus();
    this.mockGameService = new MockGameService();
    this.mockNotificationService = new MockNotificationService();

    this.playerRepo = new InMemoryPlayerRepository();
    this.teamRepo = new InMemoryTeamRepository();
    this.matchRepo = new InMemoryMatchRepository();
    this.queueRepo = new InMemoryQueueRepository();

    this.protocolRegistry = new ProtocolRegistry();
    this.protocolRegistry.register(new StandardOsuProtocol());
    this.protocolRegistry.register(new HeadToHeadProtocol());

    this.matchService = new MatchService(
      this.matchRepo,
      this.playerRepo,
      this.protocolRegistry,
      this.mockGameService,
      this.mockNotificationService,
      this.eventBus
    );

    this.queueService = new QueueService(
      this.queueRepo,
      this.matchService,
      this.eventBus,
      { minQueueTime: 0, protocol: "head-to-head" }
    );

    this.eventBus.subscribeAll((event) => {
      this.events.push(event);
    });
  }

  createPlayer(overrides?: Partial<Player>): Player {
    const id = this.playerCounter++;
    const player = createPlayer({
      discordId: `discord-${id}`,
      osuId: 100000 + id,
      osuName: `Player${id}`,
      displayName: `Player ${id}`,
      rating: 1000,
      ...overrides,
    });

    this.playerRepo.save(player);
    return player;
  }

  createPlayers(count: number, baseRating: number = 1000): Player[] {
    const players: Player[] = [];
    for (let i = 0; i < count; i++) {
      players.push(this.createPlayer({ rating: baseRating }));
    }
    return players;
  }

  createTeam(players: Player[], overrides?: Partial<Team>): Team {
    const id = this.teamCounter++;
    const team = createTeam({
      name: overrides?.name ?? `Team ${id}`,
      players,
      ...overrides,
    });

    this.teamRepo.save(team);
    return team;
  }

  async simulateAllPlayersJoin(match: Match): Promise<void> {
    for (const team of match.teams) {
      for (const player of team.players) {
        if (match.lobbyId) {
          this.mockGameService.simulatePlayerJoin(match.lobbyId, player.osuId);
        }
        await this.matchService.handlePlayerJoined(match.id, player);
      }
    }
  }

  async simulateRolls(
    match: Match,
    rolls: Map<string, number>
  ): Promise<void> {
    for (const team of match.teams) {
      const roll = rolls.get(team.id) ?? Math.floor(Math.random() * 100) + 1;
      const captain = team.captain;
      if (match.lobbyId) {
        this.mockGameService.simulateRoll(match.lobbyId, captain.osuId, roll);
      }
      await this.matchService.handleRoll(match.id, captain, roll);
    }
  }

  async simulateMapComplete(match: Match, winningTeamId: string): Promise<void> {
    const scores: Score[] = [];
    const winningTeam = match.teams.find((t) => t.id === winningTeamId)!;
    const losingTeam = match.teams.find((t) => t.id !== winningTeamId)!;

    for (const player of winningTeam.players) {
      scores.push({
        playerId: player.id,
        score: 500000 + Math.floor(Math.random() * 100000),
        accuracy: 95 + Math.random() * 5,
        maxCombo: 800 + Math.floor(Math.random() * 200),
        misses: Math.floor(Math.random() * 5),
      });
    }

    for (const player of losingTeam.players) {
      scores.push({
        playerId: player.id,
        score: 400000 + Math.floor(Math.random() * 80000),
        accuracy: 90 + Math.random() * 8,
        maxCombo: 600 + Math.floor(Math.random() * 200),
        misses: Math.floor(Math.random() * 10),
      });
    }

    if (match.lobbyId) {
      this.mockGameService.simulateMatchFinish(match.lobbyId, scores);
    }
    await this.matchService.handleMapComplete(match.id, scores);
  }

  async runFullMatch(
    team1: Team,
    team2: Team,
    protocolName: string = "head-to-head"
  ): Promise<Match> {
    await this.queueService.joinQueue(team1, "ranked");
    await this.queueService.joinQueue(team2, "ranked");

    const match = await this.queueService.findMatch("ranked");
    if (!match) {
      throw new Error("Failed to create match");
    }

    await this.simulateAllPlayersJoin(match);

    const rolls = new Map<string, number>();
    rolls.set(team1.id, 75);
    rolls.set(team2.id, 50);
    await this.simulateRolls(match, rolls);

    const protocol = this.protocolRegistry.get(protocolName);
    const winsNeeded = protocol.getWinsNeeded();

    for (let i = 0; i < winsNeeded; i++) {
      const updatedMatch = await this.matchRepo.findById(match.id);
      if (!updatedMatch || updatedMatch.state === MatchState.COMPLETED) break;

      await this.simulateMapComplete(match, team1.id);
    }

    return (await this.matchRepo.findById(match.id))!;
  }

  getEventsByType(type: string): DomainEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  clearEvents(): void {
    this.events = [];
  }

  reset(): void {
    this.playerRepo.clear();
    this.teamRepo.clear();
    this.matchRepo.clear();
    this.queueRepo.clear();
    this.mockGameService.clear();
    this.mockNotificationService.clear();
    this.eventBus.clear();
    this.events = [];
    this.playerCounter = 1;
    this.teamCounter = 1;
  }
}
