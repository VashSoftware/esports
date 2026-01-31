import type { Team } from "./Team";
import type { MatchScore } from "./Score";
import { MatchState } from "./MatchState";

export interface Match {
  id: string;
  teams: Team[];
  protocol: string;
  state: MatchState;
  scores: MatchScore[];
  winner?: Team;
  lobbyId?: string;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;

  rolls: Map<string, number>;
  bans: Map<string, number[]>;
  picks: number[];
  currentPicker?: string;
  currentBanner?: string;
  joinedPlayers: Set<string>;
}

export function createMatch(params: {
  id?: string;
  teams: Team[];
  protocol: string;
  state?: MatchState;
  lobbyId?: string;
  createdAt?: Date;
}): Match {
  if (params.teams.length < 2) {
    throw new Error("Match must have at least two teams");
  }

  return {
    id: params.id ?? crypto.randomUUID(),
    teams: params.teams,
    protocol: params.protocol,
    state: params.state ?? MatchState.CREATED,
    scores: [],
    lobbyId: params.lobbyId,
    createdAt: params.createdAt ?? new Date(),
    rolls: new Map(),
    bans: new Map(),
    picks: [],
    joinedPlayers: new Set(),
  };
}

export function getTeamWins(match: Match, teamId: string): number {
  return match.scores.filter((s) => s.winner === teamId).length;
}

export function getMatchWinner(match: Match, bestOf: number): Team | null {
  const winsNeeded = Math.ceil(bestOf / 2);

  for (const team of match.teams) {
    if (getTeamWins(match, team.id) >= winsNeeded) {
      return team;
    }
  }

  return null;
}

export function allPlayersJoined(match: Match): boolean {
  const allPlayerIds = match.teams.flatMap((t) => t.players.map((p) => p.id));
  return allPlayerIds.every((id) => match.joinedPlayers.has(id));
}
