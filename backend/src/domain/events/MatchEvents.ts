import type { Match } from "../models/Match";
import type { MatchState } from "../models/MatchState";
import type { Player } from "../models/Player";
import type { Team } from "../models/Team";
import type { MatchScore } from "../models/Score";
import type { OsuMap } from "../models/OsuMap";
import type { DomainEvent } from "./DomainEvent";
import { createEvent } from "./DomainEvent";

export interface MatchCreatedPayload {
  match: Match;
}

export interface MatchStateChangedPayload {
  match: Match;
  previousState: MatchState;
}

export interface PlayerJoinedLobbyPayload {
  match: Match;
  player: Player;
}

export interface RollCompletedPayload {
  match: Match;
  player: Player;
  roll: number;
}

export interface MapPickedPayload {
  match: Match;
  team: Team;
  map: OsuMap;
}

export interface MapBannedPayload {
  match: Match;
  team: Team;
  map: OsuMap;
}

export interface MapStartedPayload {
  match: Match;
  map: OsuMap;
}

export interface MapCompletedPayload {
  match: Match;
  scores: MatchScore;
}

export interface MatchCompletedPayload {
  match: Match;
  winner: Team;
}

export interface MatchCancelledPayload {
  match: Match;
  reason: string;
}

export type MatchCreatedEvent = DomainEvent<MatchCreatedPayload> & { type: "match.created" };
export type MatchStateChangedEvent = DomainEvent<MatchStateChangedPayload> & { type: "match.state_changed" };
export type PlayerJoinedLobbyEvent = DomainEvent<PlayerJoinedLobbyPayload> & { type: "match.player_joined" };
export type RollCompletedEvent = DomainEvent<RollCompletedPayload> & { type: "match.roll_completed" };
export type MapPickedEvent = DomainEvent<MapPickedPayload> & { type: "match.map_picked" };
export type MapBannedEvent = DomainEvent<MapBannedPayload> & { type: "match.map_banned" };
export type MapStartedEvent = DomainEvent<MapStartedPayload> & { type: "match.map_started" };
export type MapCompletedEvent = DomainEvent<MapCompletedPayload> & { type: "match.map_completed" };
export type MatchCompletedEvent = DomainEvent<MatchCompletedPayload> & { type: "match.completed" };
export type MatchCancelledEvent = DomainEvent<MatchCancelledPayload> & { type: "match.cancelled" };

export type MatchEvent =
  | MatchCreatedEvent
  | MatchStateChangedEvent
  | PlayerJoinedLobbyEvent
  | RollCompletedEvent
  | MapPickedEvent
  | MapBannedEvent
  | MapStartedEvent
  | MapCompletedEvent
  | MatchCompletedEvent
  | MatchCancelledEvent;

export const MatchEvents = {
  created: (match: Match): MatchCreatedEvent =>
    createEvent("match.created", { match }) as MatchCreatedEvent,

  stateChanged: (match: Match, previousState: MatchState): MatchStateChangedEvent =>
    createEvent("match.state_changed", { match, previousState }) as MatchStateChangedEvent,

  playerJoined: (match: Match, player: Player): PlayerJoinedLobbyEvent =>
    createEvent("match.player_joined", { match, player }) as PlayerJoinedLobbyEvent,

  rollCompleted: (match: Match, player: Player, roll: number): RollCompletedEvent =>
    createEvent("match.roll_completed", { match, player, roll }) as RollCompletedEvent,

  mapPicked: (match: Match, team: Team, map: OsuMap): MapPickedEvent =>
    createEvent("match.map_picked", { match, team, map }) as MapPickedEvent,

  mapBanned: (match: Match, team: Team, map: OsuMap): MapBannedEvent =>
    createEvent("match.map_banned", { match, team, map }) as MapBannedEvent,

  mapStarted: (match: Match, map: OsuMap): MapStartedEvent =>
    createEvent("match.map_started", { match, map }) as MapStartedEvent,

  mapCompleted: (match: Match, scores: MatchScore): MapCompletedEvent =>
    createEvent("match.map_completed", { match, scores }) as MapCompletedEvent,

  completed: (match: Match, winner: Team): MatchCompletedEvent =>
    createEvent("match.completed", { match, winner }) as MatchCompletedEvent,

  cancelled: (match: Match, reason: string): MatchCancelledEvent =>
    createEvent("match.cancelled", { match, reason }) as MatchCancelledEvent,
};
