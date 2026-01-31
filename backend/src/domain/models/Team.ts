import type { Player } from "./Player";

export interface Team {
  id: string;
  name: string;
  players: Player[];
  captain: Player;
  createdAt: Date;
}

export function createTeam(params: {
  id?: string;
  name: string;
  players: Player[];
  captain?: Player;
  createdAt?: Date;
}): Team {
  if (params.players.length === 0) {
    throw new Error("Team must have at least one player");
  }

  return {
    id: params.id ?? crypto.randomUUID(),
    name: params.name,
    players: params.players,
    captain: params.captain ?? params.players[0],
    createdAt: params.createdAt ?? new Date(),
  };
}

export function getAverageRating(team: Team): number {
  if (team.players.length === 0) return 0;
  const total = team.players.reduce((sum, p) => sum + p.rating, 0);
  return Math.round(total / team.players.length);
}
