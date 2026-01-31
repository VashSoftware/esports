import type { Team } from "../models/Team";
import type { QueueEntry } from "../models/QueueEntry";
import type { DomainEvent } from "./DomainEvent";
import { createEvent } from "./DomainEvent";

export interface TeamQueuedPayload {
  entry: QueueEntry;
}

export interface TeamDequeuedPayload {
  teamId: string;
  queueType: string;
}

export interface MatchFoundPayload {
  teams: Team[];
  queueType: string;
}

export type TeamQueuedEvent = DomainEvent<TeamQueuedPayload> & { type: "queue.team_joined" };
export type TeamDequeuedEvent = DomainEvent<TeamDequeuedPayload> & { type: "queue.team_left" };
export type MatchFoundEvent = DomainEvent<MatchFoundPayload> & { type: "queue.match_found" };

export type QueueEvent = TeamQueuedEvent | TeamDequeuedEvent | MatchFoundEvent;

export const QueueEvents = {
  teamJoined: (entry: QueueEntry): TeamQueuedEvent =>
    createEvent("queue.team_joined", { entry }) as TeamQueuedEvent,

  teamLeft: (teamId: string, queueType: string): TeamDequeuedEvent =>
    createEvent("queue.team_left", { teamId, queueType }) as TeamDequeuedEvent,

  matchFound: (teams: Team[], queueType: string): MatchFoundEvent =>
    createEvent("queue.match_found", { teams, queueType }) as MatchFoundEvent,
};
