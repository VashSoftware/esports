import type { QueueEntry } from "../models/QueueEntry";

export interface IQueueRepository {
  add(entry: QueueEntry): Promise<void>;
  remove(teamId: string): Promise<void>;
  findByTeamId(teamId: string): Promise<QueueEntry | null>;
  findByType(queueType: string): Promise<QueueEntry[]>;
  findClosestByRating(
    rating: number,
    queueType: string,
    exclude?: string[]
  ): Promise<QueueEntry | null>;
  findAll(): Promise<QueueEntry[]>;
  clear(): Promise<void>;
}
