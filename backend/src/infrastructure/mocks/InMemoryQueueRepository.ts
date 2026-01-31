import type { IQueueRepository } from "../../domain/interfaces/IQueueRepository";
import type { QueueEntry } from "../../domain/models/QueueEntry";
import { getAverageRating } from "../../domain/models/Team";

export class InMemoryQueueRepository implements IQueueRepository {
  private entries: Map<string, QueueEntry> = new Map();

  async add(entry: QueueEntry): Promise<void> {
    this.entries.set(entry.team.id, entry);
  }

  async remove(teamId: string): Promise<void> {
    this.entries.delete(teamId);
  }

  async findByTeamId(teamId: string): Promise<QueueEntry | null> {
    return this.entries.get(teamId) ?? null;
  }

  async findByType(queueType: string): Promise<QueueEntry[]> {
    const result: QueueEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.queueType === queueType) {
        result.push(entry);
      }
    }
    return result.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  }

  async findClosestByRating(
    rating: number,
    queueType: string,
    exclude?: string[]
  ): Promise<QueueEntry | null> {
    let closest: QueueEntry | null = null;
    let closestDiff = Infinity;

    for (const entry of this.entries.values()) {
      if (entry.queueType !== queueType) continue;
      if (exclude?.includes(entry.team.id)) continue;

      const teamRating = getAverageRating(entry.team);
      const diff = Math.abs(teamRating - rating);

      if (diff < closestDiff) {
        closestDiff = diff;
        closest = entry;
      }
    }

    return closest;
  }

  async findAll(): Promise<QueueEntry[]> {
    return Array.from(this.entries.values());
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }
}
