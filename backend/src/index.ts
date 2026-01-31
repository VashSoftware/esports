import type { ServerWebSocket } from "bun";
import { EventBus } from "./application/events/EventBus";
import { MatchService } from "./application/services/MatchService";
import { QueueService } from "./application/services/QueueService";
import { ProtocolRegistry } from "./domain/protocols/ProtocolRegistry";
import { StandardOsuProtocol } from "./domain/protocols/StandardOsuProtocol";
import { HeadToHeadProtocol } from "./domain/protocols/HeadToHeadProtocol";
import { InMemoryPlayerRepository } from "./infrastructure/mocks/InMemoryPlayerRepository";
import { InMemoryTeamRepository } from "./infrastructure/mocks/InMemoryTeamRepository";
import { InMemoryMatchRepository } from "./infrastructure/mocks/InMemoryMatchRepository";
import { InMemoryQueueRepository } from "./infrastructure/mocks/InMemoryQueueRepository";
import { MockGameService } from "./infrastructure/mocks/MockGameService";
import { MockNotificationService } from "./infrastructure/mocks/MockNotificationService";
import { WebSocketService } from "./infrastructure/websocket/WebSocketService";
import { getTeamWins } from "./domain/models/Match";
import { getAverageRating } from "./domain/models/Team";

interface WebSocketData {
  id: string;
  subscribedMatches: Set<string>;
}

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
  protocol: "head-to-head",
});

const wsService = new WebSocketService(eventBus);

const server = Bun.serve<WebSocketData>({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,

  async fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, {
        data: {
          id: crypto.randomUUID(),
          subscribedMatches: new Set(),
        },
      });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok", timestamp: new Date().toISOString() });
    }

    if (url.pathname === "/api/queue/status" && req.method === "GET") {
      const queueType = url.searchParams.get("type") ?? "ranked";
      const status = await queueService.getQueueStatus(queueType);
      return Response.json(status);
    }

    if (url.pathname === "/api/queue/join" && req.method === "POST") {
      try {
        const body = await req.json();
        const team = await teamRepo.findById(body.teamId);
        if (!team) {
          return Response.json({ error: "Team not found" }, { status: 404 });
        }
        const entry = await queueService.joinQueue(team, body.queueType ?? "ranked");
        return Response.json({ success: true, entry: { id: entry.id, joinedAt: entry.joinedAt } });
      } catch (error) {
        return Response.json({ error: (error as Error).message }, { status: 400 });
      }
    }

    if (url.pathname === "/api/queue/leave" && req.method === "POST") {
      try {
        const body = await req.json();
        await queueService.leaveQueue(body.teamId);
        return Response.json({ success: true });
      } catch (error) {
        return Response.json({ error: (error as Error).message }, { status: 400 });
      }
    }

    if (url.pathname.startsWith("/api/matches/") && req.method === "GET") {
      const matchId = url.pathname.split("/").pop();
      if (!matchId) {
        return Response.json({ error: "Match ID required" }, { status: 400 });
      }
      const match = await matchRepo.findById(matchId);
      if (!match) {
        return Response.json({ error: "Match not found" }, { status: 404 });
      }
      return Response.json({
        id: match.id,
        state: match.state,
        protocol: match.protocol,
        teams: match.teams.map((t) => ({
          id: t.id,
          name: t.name,
          players: t.players.map((p) => ({
            id: p.id,
            displayName: p.displayName,
            rating: p.rating,
          })),
          averageRating: getAverageRating(t),
          wins: getTeamWins(match, t.id),
        })),
        winner: match.winner ? { id: match.winner.id, name: match.winner.name } : null,
        createdAt: match.createdAt,
        startedAt: match.startedAt,
        endedAt: match.endedAt,
      });
    }

    if (url.pathname === "/api/matches" && req.method === "GET") {
      const matches = await matchRepo.findAll();
      return Response.json(
        matches.map((m) => ({
          id: m.id,
          state: m.state,
          teams: m.teams.map((t) => t.name),
          winner: m.winner?.name ?? null,
          createdAt: m.createdAt,
        }))
      );
    }

    if (url.pathname === "/api/players" && req.method === "GET") {
      const players = await playerRepo.findAll();
      return Response.json(players);
    }

    if (url.pathname === "/api/teams" && req.method === "GET") {
      const teams = await teamRepo.findAll();
      return Response.json(
        teams.map((t) => ({
          id: t.id,
          name: t.name,
          playerCount: t.players.length,
          averageRating: getAverageRating(t),
        }))
      );
    }

    if (url.pathname === "/api/protocols" && req.method === "GET") {
      const protocols = protocolRegistry.list();
      return Response.json(
        protocols.map((p) => ({
          name: p.name,
          description: p.description,
          teamSize: p.teamSize,
          bestOf: p.bestOf,
          hasPickBan: p.hasPickBan,
        }))
      );
    }

    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    open(ws: ServerWebSocket<WebSocketData>) {
      wsService.handleOpen(ws);
    },
    message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
      wsService.handleMessage(ws, message);
    },
    close(ws: ServerWebSocket<WebSocketData>) {
      wsService.handleClose(ws);
    },
  },
});

console.log(`Server running at http://localhost:${server.port}`);
console.log(`WebSocket available at ws://localhost:${server.port}/ws`);

queueService.startAutoMatchmaking(5000);
console.log("Auto-matchmaking started (5s interval)");
