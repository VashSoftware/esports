import type { Team } from "./Team";

export interface QueueEntry {
  id: string;
  team: Team;
  queueType: string;
  joinedAt: Date;
}

export function createQueueEntry(params: {
  id?: string;
  team: Team;
  queueType: string;
  joinedAt?: Date;
}): QueueEntry {
  return {
    id: params.id ?? crypto.randomUUID(),
    team: params.team,
    queueType: params.queueType,
    joinedAt: params.joinedAt ?? new Date(),
  };
}
