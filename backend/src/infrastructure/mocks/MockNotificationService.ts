import type { INotificationService } from "../../domain/interfaces/INotificationService";
import type { Match } from "../../domain/models/Match";
import type { Team } from "../../domain/models/Team";
import type { MatchScore } from "../../domain/models/Score";

interface Notification {
  type: string;
  targetId?: string;
  message?: string;
  match?: Match;
  winner?: Team;
  scores?: MatchScore;
}

export class MockNotificationService implements INotificationService {
  public notifications: Notification[] = [];
  public announcements: Match[] = [];
  public playerNotifications: Array<{ playerId: string; message: string }> = [];
  public teamNotifications: Array<{ teamId: string; message: string }> = [];

  async announceMatch(match: Match): Promise<void> {
    this.announcements.push(match);
    this.notifications.push({ type: "match_announced", match });
  }

  async announceMatchResult(match: Match, winner: Team): Promise<void> {
    this.notifications.push({ type: "match_result", match, winner });
  }

  async notifyPlayer(playerId: string, message: string): Promise<void> {
    this.playerNotifications.push({ playerId, message });
    this.notifications.push({ type: "player_notification", targetId: playerId, message });
  }

  async notifyTeam(teamId: string, message: string): Promise<void> {
    this.teamNotifications.push({ teamId, message });
    this.notifications.push({ type: "team_notification", targetId: teamId, message });
  }

  async announceMapResult(match: Match, scores: MatchScore): Promise<void> {
    this.notifications.push({ type: "map_result", match, scores });
  }

  clear(): void {
    this.notifications = [];
    this.announcements = [];
    this.playerNotifications = [];
    this.teamNotifications = [];
  }
}
