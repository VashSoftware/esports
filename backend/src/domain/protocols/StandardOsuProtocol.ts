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

export class StandardOsuProtocol implements IMatchProtocol {
  readonly name = "standard-osu";
  readonly description = "Standard 4v4 tournament format with pick/ban";
  readonly teamSize = 4;
  readonly bestOf = 9;
  readonly hasPickBan = true;
  readonly hasFreemod = true;

  async onMatchStart(
    _match: Match,
    context: ProtocolContext
  ): Promise<MatchState | null> {
    await context.sendMessage("Welcome to the match!");
    await context.sendMessage("Waiting for all players to join...");
    return MatchState.WAITING_PLAYERS;
  }

  async onAllPlayersJoined(
    _match: Match,
    context: ProtocolContext
  ): Promise<MatchState | null> {
    await context.sendMessage("All players have joined! Please roll (!roll)");
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
    const losingTeam =
      team1Roll.roll > team2Roll.roll ? match.teams[1] : match.teams[0];

    match.currentBanner = winningTeam.id;
    match.currentPicker = losingTeam.id;

    await context.sendMessage(
      `${winningTeam.name} wins the roll! They will ban first, ${losingTeam.name} picks first.`
    );

    return MatchState.BANNING;
  }

  async onBan(
    match: Match,
    team: Team,
    map: OsuMap,
    context: ProtocolContext
  ): Promise<MatchState | null> {
    const existingBans = match.bans.get(team.id);
    const bans = existingBans ? [...existingBans] : [];
    bans.push(map.id);
    match.bans.set(team.id, bans);

    await context.sendMessage(`${team.name} banned ${map.title} [${map.difficulty}]`);

    const totalBans = Array.from(match.bans.values()).flat().length;
    if (totalBans >= 2) {
      return MatchState.PICKING;
    }

    const currentBanner = match.currentBanner;
    match.currentBanner =
      currentBanner === match.teams[0].id
        ? match.teams[1].id
        : match.teams[0].id;

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

    const allBans = Array.from(match.bans.values()).flat();
    if (allBans.includes(map.id)) return false;

    if (match.picks.includes(map.id)) return false;

    return true;
  }

  isValidBan(match: Match, team: Team, map: OsuMap): boolean {
    if (match.currentBanner !== team.id) return false;

    const allBans = Array.from(match.bans.values()).flat();
    if (allBans.includes(map.id)) return false;

    return true;
  }

  calculateMapWinner(match: Match, scores: Score[]): string {
    const team1 = match.teams[0];
    const team2 = match.teams[1];
    const team1PlayerIds = team1.players.map((p) => p.id);
    const team2PlayerIds = team2.players.map((p) => p.id);

    const team1Score = scores
      .filter((s) => team1PlayerIds.includes(s.playerId))
      .reduce((sum, s) => sum + s.score, 0);

    const team2Score = scores
      .filter((s) => team2PlayerIds.includes(s.playerId))
      .reduce((sum, s) => sum + s.score, 0);

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
    const team = match.teams.find((t) => t.id === match.currentBanner);
    return team ?? match.teams[0];
  }

  getWinsNeeded(): number {
    return Math.ceil(this.bestOf / 2);
  }
}
