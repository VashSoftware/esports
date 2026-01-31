import type { Match } from "../models/Match";
import type { MatchState } from "../models/MatchState";
import type { Team } from "../models/Team";
import type { OsuMap } from "../models/OsuMap";
import type { Score } from "../models/Score";

export interface RollResult {
  teamId: string;
  playerId: string;
  roll: number;
}

export interface ProtocolContext {
  sendMessage: (message: string) => Promise<void>;
  setMap: (mapId: number) => Promise<void>;
  startGame: () => Promise<void>;
}

export interface IMatchProtocol {
  readonly name: string;
  readonly description: string;

  readonly teamSize: number;
  readonly bestOf: number;
  readonly hasPickBan: boolean;
  readonly hasFreemod: boolean;

  onMatchStart(match: Match, context: ProtocolContext): Promise<MatchState | null>;
  onAllPlayersJoined(match: Match, context: ProtocolContext): Promise<MatchState | null>;
  onRollComplete(
    match: Match,
    rolls: RollResult[],
    context: ProtocolContext
  ): Promise<MatchState | null>;
  onPick(
    match: Match,
    team: Team,
    map: OsuMap,
    context: ProtocolContext
  ): Promise<MatchState | null>;
  onBan(
    match: Match,
    team: Team,
    map: OsuMap,
    context: ProtocolContext
  ): Promise<MatchState | null>;
  onMapComplete(
    match: Match,
    scores: Score[],
    context: ProtocolContext
  ): Promise<MatchState | null>;

  isValidPick(match: Match, team: Team, map: OsuMap): boolean;
  isValidBan(match: Match, team: Team, map: OsuMap): boolean;

  calculateMapWinner(match: Match, scores: Score[]): string;
  calculateMatchWinner(match: Match): string | null;

  getPickingTeam(match: Match): Team;
  getBanningTeam(match: Match): Team;

  getWinsNeeded(): number;
}
