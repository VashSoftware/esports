import type { Match } from "../models/Match";
import type { Team } from "../models/Team";
import type { MatchScore } from "../models/Score";

export interface INotificationService {
  announceMatch(match: Match): Promise<void>;
  announceMatchResult(match: Match, winner: Team): Promise<void>;
  notifyPlayer(playerId: string, message: string): Promise<void>;
  notifyTeam(teamId: string, message: string): Promise<void>;
  announceMapResult(match: Match, scores: MatchScore): Promise<void>;
}
