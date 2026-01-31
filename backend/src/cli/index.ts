import { parseArgs } from "util";
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
import { createPlayer } from "../domain/models/Player";
import { createTeam, getAverageRating } from "../domain/models/Team";
import { MatchState } from "../domain/models/MatchState";

const eventBus = new EventBus();
const mockGameService = new MockGameService();
const mockNotificationService = new MockNotificationService();

const playerRepo = new InMemoryPlayerRepository();
const teamRepo = new InMemoryTeamRepository();
const matchRepo = new InMemoryMatchRepository();
const queueRepo = new InMemoryQueueRepository();

const protocolRegistry = new ProtocolRegistry();
protocolRegistry.register(new StandardOsuProtocol());
protocolRegistry.register(new HeadToHeadProtocol());

const matchService = new MatchService(
  matchRepo,
  playerRepo,
  protocolRegistry,
  mockGameService,
  mockNotificationService,
  eventBus
);

const queueService = new QueueService(queueRepo, matchService, eventBus, {
  minQueueTime: 0,
});

eventBus.subscribeAll((event) => {
  console.log(`[Event] ${event.type}`);
});

type CommandHandler = (...args: string[]) => Promise<void>;

const commands: Record<string, CommandHandler> = {
  "player:create": async (osuName?: string, rating?: string) => {
    const player = createPlayer({
      discordId: `discord-${Date.now()}`,
      osuId: Math.floor(Math.random() * 1000000),
      osuName: osuName ?? `Player${Date.now()}`,
      rating: rating ? parseInt(rating) : 1000,
    });
    await playerRepo.save(player);
    console.log(`Created player: ${player.id} (${player.osuName}, rating: ${player.rating})`);
  },

  "player:list": async () => {
    const players = await playerRepo.findAll();
    if (players.length === 0) {
      console.log("No players found");
      return;
    }
    console.log("Players:");
    for (const p of players) {
      console.log(`  ${p.id}: ${p.osuName} (rating: ${p.rating})`);
    }
  },

  "team:create": async (name: string, ...playerIds: string[]) => {
    if (!name || playerIds.length === 0) {
      console.log("Usage: team:create <name> <playerId1> [playerId2] ...");
      return;
    }
    const players = await Promise.all(
      playerIds.map((id) => playerRepo.findById(id))
    );
    const validPlayers = players.filter((p) => p !== null);
    if (validPlayers.length === 0) {
      console.log("No valid players found");
      return;
    }
    const team = createTeam({ name, players: validPlayers });
    await teamRepo.save(team);
    console.log(`Created team: ${team.id} (${team.name}, avg rating: ${getAverageRating(team)})`);
  },

  "team:list": async () => {
    const teams = await teamRepo.findAll();
    if (teams.length === 0) {
      console.log("No teams found");
      return;
    }
    console.log("Teams:");
    for (const t of teams) {
      console.log(`  ${t.id}: ${t.name} (${t.players.length} players, avg: ${getAverageRating(t)})`);
    }
  },

  "queue:join": async (teamId: string, queueType: string = "ranked") => {
    if (!teamId) {
      console.log("Usage: queue:join <teamId> [queueType]");
      return;
    }
    const team = await teamRepo.findById(teamId);
    if (!team) {
      console.log(`Team ${teamId} not found`);
      return;
    }
    try {
      const entry = await queueService.joinQueue(team, queueType);
      console.log(`Team ${team.name} joined ${queueType} queue at ${entry.joinedAt.toISOString()}`);
    } catch (e) {
      console.log(`Error: ${(e as Error).message}`);
    }
  },

  "queue:leave": async (teamId: string) => {
    if (!teamId) {
      console.log("Usage: queue:leave <teamId>");
      return;
    }
    try {
      await queueService.leaveQueue(teamId);
      console.log(`Team ${teamId} left the queue`);
    } catch (e) {
      console.log(`Error: ${(e as Error).message}`);
    }
  },

  "queue:list": async (queueType: string = "ranked") => {
    const status = await queueService.getQueueStatus(queueType);
    console.log(`Queue (${queueType}): ${status.count} teams`);
    for (const e of status.entries) {
      console.log(`  ${e.teamName} (rating: ${e.rating}, wait: ${Math.round(e.waitTime / 1000)}s)`);
    }
  },

  "matchmaking:run": async () => {
    const match = await queueService.findMatch("ranked");
    if (match) {
      console.log(`Created match ${match.id}: ${match.teams.map((t) => t.name).join(" vs ")}`);
    } else {
      console.log("No match found (need 2+ teams in queue)");
    }
  },

  "match:status": async (matchId: string) => {
    if (!matchId) {
      console.log("Usage: match:status <matchId>");
      return;
    }
    const match = await matchRepo.findById(matchId);
    if (!match) {
      console.log(`Match ${matchId} not found`);
      return;
    }
    console.log(`Match: ${match.id}`);
    console.log(`  State: ${match.state}`);
    console.log(`  Protocol: ${match.protocol}`);
    console.log(`  Teams: ${match.teams.map((t) => t.name).join(" vs ")}`);
    console.log(`  Scores: ${match.teams.map((t) => `${t.name}: ${match.scores.filter((s) => s.winner === t.id).length}`).join(", ")}`);
    if (match.winner) {
      console.log(`  Winner: ${match.winner.name}`);
    }
  },

  "match:list": async () => {
    const matches = await matchRepo.findAll();
    if (matches.length === 0) {
      console.log("No matches found");
      return;
    }
    console.log("Matches:");
    for (const m of matches) {
      console.log(`  ${m.id}: ${m.teams.map((t) => t.name).join(" vs ")} [${m.state}]`);
    }
  },

  "match:simulate-join": async (matchId: string, osuIdStr: string) => {
    if (!matchId || !osuIdStr) {
      console.log("Usage: match:simulate-join <matchId> <osuId>");
      return;
    }
    const match = await matchRepo.findById(matchId);
    if (!match || !match.lobbyId) {
      console.log(`Match ${matchId} not found or has no lobby`);
      return;
    }
    const osuId = parseInt(osuIdStr);
    mockGameService.simulatePlayerJoin(match.lobbyId, osuId);
    console.log(`Simulated player ${osuId} joining lobby ${match.lobbyId}`);
  },

  "match:simulate-roll": async (matchId: string, osuIdStr: string, rollStr: string) => {
    if (!matchId || !osuIdStr || !rollStr) {
      console.log("Usage: match:simulate-roll <matchId> <osuId> <roll>");
      return;
    }
    const match = await matchRepo.findById(matchId);
    if (!match || !match.lobbyId) {
      console.log(`Match ${matchId} not found or has no lobby`);
      return;
    }
    const osuId = parseInt(osuIdStr);
    const roll = parseInt(rollStr);
    mockGameService.simulateRoll(match.lobbyId, osuId, roll);
    console.log(`Simulated roll ${roll} from player ${osuId}`);
  },

  "protocol:list": async () => {
    const protocols = protocolRegistry.list();
    console.log("Available protocols:");
    for (const p of protocols) {
      console.log(`  ${p.name}: ${p.description} (${p.teamSize}v${p.teamSize}, best of ${p.bestOf})`);
    }
  },

  help: async () => {
    console.log("Available commands:");
    console.log("  player:create [osuName] [rating]");
    console.log("  player:list");
    console.log("  team:create <name> <playerId1> [playerId2] ...");
    console.log("  team:list");
    console.log("  queue:join <teamId> [queueType]");
    console.log("  queue:leave <teamId>");
    console.log("  queue:list [queueType]");
    console.log("  matchmaking:run");
    console.log("  match:status <matchId>");
    console.log("  match:list");
    console.log("  match:simulate-join <matchId> <osuId>");
    console.log("  match:simulate-roll <matchId> <osuId> <roll>");
    console.log("  protocol:list");
    console.log("  help");
  },
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const commandArgs = args.slice(1);

  if (!command) {
    await commands.help();
    process.exit(0);
  }

  const handler = commands[command];
  if (!handler) {
    console.log(`Unknown command: ${command}`);
    await commands.help();
    process.exit(1);
  }

  await handler(...commandArgs);
}

main().catch(console.error);
