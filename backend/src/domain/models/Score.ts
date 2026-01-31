export interface Score {
  playerId: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  misses: number;
  mods?: string[];
}

export interface MatchScore {
  id: string;
  mapId: number;
  teamScores: Map<string, number>;
  playerScores: Map<string, Score>;
  winner: string;
}

export function createMatchScore(params: {
  id?: string;
  mapId: number;
  teamScores: Map<string, number>;
  playerScores: Map<string, Score>;
  winner: string;
}): MatchScore {
  return {
    id: params.id ?? crypto.randomUUID(),
    mapId: params.mapId,
    teamScores: params.teamScores,
    playerScores: params.playerScores,
    winner: params.winner,
  };
}

export function calculateTeamScore(scores: Score[], teamPlayerIds: string[]): number {
  return scores
    .filter((s) => teamPlayerIds.includes(s.playerId))
    .reduce((sum, s) => sum + s.score, 0);
}
