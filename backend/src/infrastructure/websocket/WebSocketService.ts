import type { ServerWebSocket } from "bun";
import type { EventBus } from "../../application/events/EventBus";
import type { DomainEvent } from "../../domain/events/DomainEvent";

interface WebSocketData {
  id: string;
  subscribedMatches: Set<string>;
}

type WebSocketClient = ServerWebSocket<WebSocketData>;

export interface ClientMessage {
  type: string;
  matchId?: string;
  payload?: unknown;
}

export class WebSocketService {
  private clients: Map<string, WebSocketClient> = new Map();
  private matchSubscriptions: Map<string, Set<string>> = new Map();

  constructor(private eventBus: EventBus) {
    this.setupEventSubscriptions();
  }

  private setupEventSubscriptions(): void {
    const eventsToForward = [
      "match.created",
      "match.state_changed",
      "match.player_joined",
      "match.roll_completed",
      "match.map_picked",
      "match.map_banned",
      "match.map_started",
      "match.map_completed",
      "match.completed",
      "match.cancelled",
      "queue.team_joined",
      "queue.team_left",
      "queue.match_found",
    ];

    for (const eventType of eventsToForward) {
      this.eventBus.subscribe(eventType as any, (event: DomainEvent) => {
        this.broadcastEvent(event);
      });
    }
  }

  handleOpen(ws: WebSocketClient): void {
    const clientId = crypto.randomUUID();
    ws.data = {
      id: clientId,
      subscribedMatches: new Set(),
    };
    this.clients.set(clientId, ws);
    console.log(`[WebSocket] Client connected: ${clientId}`);

    ws.send(JSON.stringify({ type: "connected", clientId }));
  }

  handleMessage(ws: WebSocketClient, message: string | Buffer): void {
    try {
      const msg: ClientMessage =
        typeof message === "string" ? JSON.parse(message) : JSON.parse(message.toString());

      switch (msg.type) {
        case "subscribe":
          if (msg.matchId) {
            this.subscribeToMatch(ws, msg.matchId);
          }
          break;

        case "unsubscribe":
          if (msg.matchId) {
            this.unsubscribeFromMatch(ws, msg.matchId);
          }
          break;

        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;

        default:
          console.log(`[WebSocket] Unknown message type: ${msg.type}`);
      }
    } catch (error) {
      console.error("[WebSocket] Failed to parse message:", error);
    }
  }

  handleClose(ws: WebSocketClient): void {
    const clientId = ws.data?.id;
    if (clientId) {
      // Clean up subscriptions
      for (const matchId of ws.data.subscribedMatches) {
        const subs = this.matchSubscriptions.get(matchId);
        if (subs) {
          subs.delete(clientId);
          if (subs.size === 0) {
            this.matchSubscriptions.delete(matchId);
          }
        }
      }

      this.clients.delete(clientId);
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
    }
  }

  subscribeToMatch(ws: WebSocketClient, matchId: string): void {
    const clientId = ws.data?.id;
    if (!clientId) return;

    ws.data.subscribedMatches.add(matchId);

    if (!this.matchSubscriptions.has(matchId)) {
      this.matchSubscriptions.set(matchId, new Set());
    }
    this.matchSubscriptions.get(matchId)!.add(clientId);

    ws.send(JSON.stringify({ type: "subscribed", matchId }));
    console.log(`[WebSocket] Client ${clientId} subscribed to match ${matchId}`);
  }

  unsubscribeFromMatch(ws: WebSocketClient, matchId: string): void {
    const clientId = ws.data?.id;
    if (!clientId) return;

    ws.data.subscribedMatches.delete(matchId);

    const subs = this.matchSubscriptions.get(matchId);
    if (subs) {
      subs.delete(clientId);
      if (subs.size === 0) {
        this.matchSubscriptions.delete(matchId);
      }
    }

    ws.send(JSON.stringify({ type: "unsubscribed", matchId }));
  }

  private broadcastEvent(event: DomainEvent): void {
    const payload = event.payload as any;
    const matchId = payload?.match?.id;

    const message = JSON.stringify({
      type: "event",
      eventType: event.type,
      timestamp: event.timestamp.toISOString(),
      payload: this.serializePayload(payload),
    });

    if (matchId) {
      // Send to match subscribers
      const subscribers = this.matchSubscriptions.get(matchId);
      if (subscribers) {
        for (const clientId of subscribers) {
          const client = this.clients.get(clientId);
          if (client) {
            client.send(message);
          }
        }
      }
    } else {
      // Broadcast to all clients
      for (const client of this.clients.values()) {
        client.send(message);
      }
    }
  }

  private serializePayload(payload: any): any {
    if (!payload) return payload;

    // Handle Maps
    if (payload instanceof Map) {
      return Object.fromEntries(payload);
    }

    // Handle Sets
    if (payload instanceof Set) {
      return Array.from(payload);
    }

    // Handle objects with Maps/Sets
    if (typeof payload === "object") {
      const result: any = {};
      for (const [key, value] of Object.entries(payload)) {
        if (value instanceof Map) {
          result[key] = Object.fromEntries(value);
        } else if (value instanceof Set) {
          result[key] = Array.from(value);
        } else if (typeof value === "object" && value !== null) {
          result[key] = this.serializePayload(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return payload;
  }

  broadcast(message: object): void {
    const msg = JSON.stringify(message);
    for (const client of this.clients.values()) {
      client.send(msg);
    }
  }

  getConnectedCount(): number {
    return this.clients.size;
  }

  getMatchSubscriberCount(matchId: string): number {
    return this.matchSubscriptions.get(matchId)?.size ?? 0;
  }
}
