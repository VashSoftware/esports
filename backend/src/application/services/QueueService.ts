import type { IQueueRepository } from "../../domain/interfaces/IQueueRepository";
import type { MatchService } from "./MatchService";
import type { EventBus } from "../events/EventBus";
import type { Team } from "../../domain/models/Team";
import type { Match } from "../../domain/models/Match";
import { type QueueEntry, createQueueEntry } from "../../domain/models/QueueEntry";
import { getAverageRating } from "../../domain/models/Team";
import { QueueEvents } from "../../domain/events/QueueEvents";

export interface MatchmakingConfig {
  maxRatingDifference: number;
  ratingExpansionRate: number;
  minQueueTime: number;
  protocol: string;
}

const DEFAULT_CONFIG: MatchmakingConfig = {
  maxRatingDifference: 200,
  ratingExpansionRate: 50,
  minQueueTime: 10000,
  protocol: "standard-osu",
};

export class QueueService {
  private config: MatchmakingConfig;
  private matchmakingInterval?: ReturnType<typeof setInterval>;

  constructor(
    private queueRepo: IQueueRepository,
    private matchService: MatchService,
    private eventBus: EventBus,
    config?: Partial<MatchmakingConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async joinQueue(team: Team, queueType: string): Promise<QueueEntry> {
    const existing = await this.queueRepo.findByTeamId(team.id);
    if (existing) {
      throw new Error(`Team ${team.id} is already in queue`);
    }

    const entry = createQueueEntry({
      team,
      queueType,
    });

    await this.queueRepo.add(entry);
    await this.eventBus.publish(QueueEvents.teamJoined(entry));

    return entry;
  }

  async leaveQueue(teamId: string): Promise<void> {
    const entry = await this.queueRepo.findByTeamId(teamId);
    if (!entry) {
      throw new Error(`Team ${teamId} is not in queue`);
    }

    await this.queueRepo.remove(teamId);
    await this.eventBus.publish(QueueEvents.teamLeft(teamId, entry.queueType));
  }

  async findMatch(queueType: string): Promise<Match | null> {
    const entries = await this.queueRepo.findByType(queueType);
    if (entries.length < 2) {
      return null;
    }

    const matchPair = this.findBestMatch(entries);
    if (!matchPair) {
      return null;
    }

    const [entry1, entry2] = matchPair;

    await this.queueRepo.remove(entry1.team.id);
    await this.queueRepo.remove(entry2.team.id);

    const teams = [entry1.team, entry2.team];
    await this.eventBus.publish(QueueEvents.matchFound(teams, queueType));

    const match = await this.matchService.createMatch(teams, this.config.protocol);
    await this.matchService.startMatch(match.id);

    return match;
  }

  async runMatchmaking(): Promise<void> {
    const queueTypes = new Set<string>();
    const allEntries = await this.queueRepo.findAll();

    for (const entry of allEntries) {
      queueTypes.add(entry.queueType);
    }

    for (const queueType of queueTypes) {
      await this.findMatch(queueType);
    }
  }

  startAutoMatchmaking(intervalMs: number = 5000): void {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
    }
    this.matchmakingInterval = setInterval(() => {
      this.runMatchmaking().catch(console.error);
    }, intervalMs);
  }

  stopAutoMatchmaking(): void {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
      this.matchmakingInterval = undefined;
    }
  }

  private findBestMatch(entries: QueueEntry[]): [QueueEntry, QueueEntry] | null {
    const now = Date.now();
    let bestPair: [QueueEntry, QueueEntry] | null = null;
    let bestScore = Infinity;

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i];
        const entry2 = entries[j];

        if (!entry1 || !entry2) continue;

        const rating1 = getAverageRating(entry1.team);
        const rating2 = getAverageRating(entry2.team);
        const ratingDiff = Math.abs(rating1 - rating2);

        const waitTime1 = now - entry1.joinedAt.getTime();
        const waitTime2 = now - entry2.joinedAt.getTime();
        const minWaitTime = Math.min(waitTime1, waitTime2);

        if (minWaitTime < this.config.minQueueTime) {
          continue;
        }

        const expansionMultiplier = Math.floor(minWaitTime / this.config.minQueueTime);
        const maxAllowedDiff =
          this.config.maxRatingDifference +
          expansionMultiplier * this.config.ratingExpansionRate;

        if (ratingDiff > maxAllowedDiff) {
          continue;
        }

        const score = ratingDiff - minWaitTime / 1000;

        if (score < bestScore) {
          bestScore = score;
          bestPair = [entry1, entry2];
        }
      }
    }

    return bestPair;
  }

  async getQueueStatus(queueType: string): Promise<{
    count: number;
    entries: Array<{
      teamName: string;
      rating: number;
      waitTime: number;
    }>;
  }> {
    const entries = await this.queueRepo.findByType(queueType);
    const now = Date.now();

    return {
      count: entries.length,
      entries: entries.map((e) => ({
        teamName: e.team.name,
        rating: getAverageRating(e.team),
        waitTime: now - e.joinedAt.getTime(),
      })),
    };
  }
}
