export interface MatchConfig {
	bestOf: number;
	teamSize: number;
	scoringType: 'score' | 'score_v2' | 'accuracy' | 'combo';
}

export const MATCH_STATES = {
	CREATED: 'CREATED',
	LOBBY: 'LOBBY',
	ROLLING: 'ROLLING',
	PICKING: 'PICKING',
	PLAYING: 'PLAYING',
	FINISHED: 'FINISHED',
	CANCELLED: 'CANCELLED'
} as const;

export const GAME_STATES = {
	PENDING: 'PENDING',
	PLAYING: 'PLAYING',
	FINISHED: 'FINISHED'
} as const;

export type MatchState = (typeof MATCH_STATES)[keyof typeof MATCH_STATES];
export type GameState = (typeof GAME_STATES)[keyof typeof GAME_STATES];
