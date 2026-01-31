export interface Player {
  id: string;
  discordId: string;
  osuId: number;
  osuName: string;
  displayName: string;
  rating: number;
  createdAt: Date;
}

export function createPlayer(params: {
  id?: string;
  discordId: string;
  osuId: number;
  osuName: string;
  displayName?: string;
  rating?: number;
  createdAt?: Date;
}): Player {
  return {
    id: params.id ?? crypto.randomUUID(),
    discordId: params.discordId,
    osuId: params.osuId,
    osuName: params.osuName,
    displayName: params.displayName ?? params.osuName,
    rating: params.rating ?? 1000,
    createdAt: params.createdAt ?? new Date(),
  };
}
