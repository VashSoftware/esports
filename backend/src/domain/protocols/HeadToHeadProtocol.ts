import type {
  IMatchProtocol,
  ProtocolContext,
  RollResult,
} from "./IMatchProtocol";
import type { Match } from "../models/Match";
import { MatchState } from "../models/MatchState";
import type { Team } from "../models/Team";
import type { OsuMap } from "../models/OsuMap";
import type { Score } from "../models/Score";
import { getTeamWins } from "../models/Match";

export class HeadToHeadProtocol implements IMatchProtocol {
  readonly name = "head-to-head";
  readonly description = "1v1 head-to-head format";
  readonly teamSize = 1;
  readonly bestOf = 5;
  readonly hasPickBan = false;
  readonly hasFreemod = false;

  async onMatchStart(
    match: Match,
    context: ProtocolContext
  ): Promise<MatchState | null> {
    const team1 = match.teams[0];
    const team2 = match.teams[1];
    await context.sendMessage(`1v1 Match: ${team1.name} vs ${team2.name}`);
    await context.sendMessage("Waiting for players to join...");
    return MatchState.WAITING_PLAYERS;
  }

  async onAllPlayersJoined(
    _match: Match,
    context: ProtocolContext
  ): Promise<MatchState | null> {
    await context.sendMessage("Both players have joined! Please roll (!roll)");
    return MatchState.ROLLING;
  }

  async onRollComplete(
    match: Match,
    rolls: RollResult[],
    context: ProtocolContext
  ): Promise<MatchState | null> {
    const team1Roll = rolls.find((r) => r.teamId === match.teams[0].id);
    const team2Roll = rolls.find((r) => r.teamId === match.teams[1].id);

    if (!team1Roll || !team2Roll) {
      return null;
    }

    const winningTeam =
      team1Roll.roll > team2Roll.roll ? match.teams[0] : match.teams[1];

    match.currentPicker = winningTeam.id;

    await context.sendMessage(
      `${winningTeam.name} wins the roll and picks first!`
    );

    return MatchState.PICKING;
  }

  async onBan(
    _match: Match,
    _team: Team,
    _map: OsuMap,
    _context: ProtocolContext
  ): Promise<MatchState | null> {
    return null;
  }

  async onPick(
    match: Match,
    team: Team,
    map: OsuMap,
    context: ProtocolContext
  ): Promise<MatchState | null> {
    match.picks.push(map.id);
    await context.sendMessage(`${team.name} picked ${map.title} [${map.difficulty}]`);
    await context.setMap(map.id);

    return MatchState.PLAYING;
  }

  async onMapComplete(
    match: Match,
    _scores: Score[],
    context: ProtocolContext
  ): Promise<MatchState | null> {
    const winner = this.calculateMatchWinner(match);
    if (winner) {
      return MatchState.COMPLETED;
    }

    const currentPicker = match.currentPicker;
    match.currentPicker =
      currentPicker === match.teams[0].id
        ? match.teams[1].id
        : match.teams[0].id;

    const team1 = match.teams[0];
    const team2 = match.teams[1];
    await context.sendMessage(
      `Score: ${team1.name} ${getTeamWins(match, team1.id)} - ${getTeamWins(match, team2.id)} ${team2.name}`
    );

    return MatchState.PICKING;
  }

  isValidPick(match: Match, team: Team, map: OsuMap): boolean {
    if (match.currentPicker !== team.id) return false;
    if (match.picks.includes(map.id)) return false;
    return true;
  }

  isValidBan(_match: Match, _team: Team, _map: OsuMap): boolean {
    return false;
  }

  calculateMapWinner(match: Match, scores: Score[]): string {
    const team1 = match.teams[0];
    const team2 = match.teams[1];

    const team1Score = scores.find((s) =>
      team1.players.some((p) => p.id === s.playerId)
    )?.score ?? 0;

    const team2Score = scores.find((s) =>
      team2.players.some((p) => p.id === s.playerId)
    )?.score ?? 0;

    return team1Score > team2Score ? team1.id : team2.id;
  }

  calculateMatchWinner(match: Match): string | null {
    const winsNeeded = this.getWinsNeeded();

    for (const team of match.teams) {
      if (getTeamWins(match, team.id) >= winsNeeded) {
        return team.id;
      }
    }

    return null;
  }

  getPickingTeam(match: Match): Team {
    const team = match.teams.find((t) => t.id === match.currentPicker);
    return team ?? match.teams[0];
  }

  getBanningTeam(match: Match): Team {
    return match.teams[0];
  }

  getWinsNeeded(): number {
    return Math.ceil(this.bestOf / 2);
  }
}
