export interface TournamentConfig {
	teamSize: number;
	scoringType: 'score' | 'score_v2' | 'accuracy' | 'combo';
	freemod?: boolean;
	forceNoFail?: boolean;
	qualifiers?: {
		enabled: boolean;
		mappoolId?: string;
		lobbySizeMax?: number; // players per qualifier lobby (default 8)
	};
	groupStage?: {
		groupCount: number;
		advanceCount: number; // top N per group advance to bracket
	};
	scheduling?: {
		matchIntervalMinutes: number; // gap between matches (default 30)
		maxConcurrentLobbies: number; // respect IRC limits (default 3)
	};
}

export const TOURNAMENT_STATES = {
	DRAFT: 'DRAFT',
	REGISTRATION: 'REGISTRATION',
	QUALIFIERS: 'QUALIFIERS',
	SEEDING: 'SEEDING',
	BRACKET: 'BRACKET',
	FINISHED: 'FINISHED',
	CANCELLED: 'CANCELLED'
} as const;

export type TournamentState = (typeof TOURNAMENT_STATES)[keyof typeof TOURNAMENT_STATES];

export const TOURNAMENT_MATCH_STATES = {
	PENDING: 'PENDING',
	READY: 'READY',
	SCHEDULED: 'SCHEDULED',
	LIVE: 'LIVE',
	FINISHED: 'FINISHED',
	BYE: 'BYE'
} as const;

export type TournamentMatchState =
	(typeof TOURNAMENT_MATCH_STATES)[keyof typeof TOURNAMENT_MATCH_STATES];

export const TOURNAMENT_FORMATS = {
	SINGLE_ELIM: 'single_elim',
	DOUBLE_ELIM: 'double_elim',
	GROUPS_BRACKET: 'groups_bracket'
} as const;

export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[keyof typeof TOURNAMENT_FORMATS];

export const TOURNAMENT_STAFF_ROLES = {
	ORGANIZER: 'organizer',
	ADMIN: 'admin',
	REFEREE: 'referee',
	POOLER: 'pooler',
	STREAMER: 'streamer'
} as const;

export type TournamentStaffRole =
	(typeof TOURNAMENT_STAFF_ROLES)[keyof typeof TOURNAMENT_STAFF_ROLES];

export const REGISTRATION_STATUSES = {
	REGISTERED: 'registered',
	CONFIRMED: 'confirmed',
	ELIMINATED: 'eliminated',
	WITHDRAWN: 'withdrawn'
} as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[keyof typeof REGISTRATION_STATUSES];
