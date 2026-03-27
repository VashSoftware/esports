// ── Global Permissions ──────────────────────────────────────────────────
export const GlobalPermission = {
	// Match
	MATCH_CREATE: 'match:create',
	MATCH_REFEREE: 'match:referee',
	MATCH_CANCEL_ANY: 'match:cancel_any',

	// Mappool
	MAPPOOL_CREATE: 'mappool:create',
	MAPPOOL_DELETE_ANY: 'mappool:delete_any',

	// Tournament
	TOURNAMENT_CREATE: 'tournament:create',

	// Admin
	ADMIN_VIEW: 'admin:view',
	ADMIN_MANAGE_USERS: 'admin:manage_users',
	ADMIN_MANAGE_ROLES: 'admin:manage_roles',
	ADMIN_CANCEL_MATCHES: 'admin:cancel_matches',
	ADMIN_CLEAR_QUEUE: 'admin:clear_queue',
	ADMIN_RESET_RATINGS: 'admin:reset_ratings',
	ADMIN_CLEAR_DATA: 'admin:clear_data'
} as const;

export type GlobalPermission = (typeof GlobalPermission)[keyof typeof GlobalPermission];

const PLAYER_PERMISSIONS: Set<GlobalPermission> = new Set([GlobalPermission.MAPPOOL_CREATE]);

const REFEREE_PERMISSIONS: Set<GlobalPermission> = new Set([
	...PLAYER_PERMISSIONS,
	GlobalPermission.MATCH_CREATE,
	GlobalPermission.MATCH_REFEREE,
	GlobalPermission.TOURNAMENT_CREATE
]);

const ADMIN_PERMISSIONS: Set<GlobalPermission> = new Set(
	Object.values(GlobalPermission) as GlobalPermission[]
);

export const ROLE_PERMISSIONS: Record<string, Set<GlobalPermission>> = {
	player: PLAYER_PERMISSIONS,
	referee: REFEREE_PERMISSIONS,
	admin: ADMIN_PERMISSIONS
};

// ── Tournament-scoped Permissions ──────────────────────────────────────
export const TournamentPermission = {
	MANAGE_SETTINGS: 'tournament:manage_settings',
	MANAGE_STAFF: 'tournament:manage_staff',
	MANAGE_ROUNDS: 'tournament:manage_rounds',
	MANAGE_MAPPOOL: 'tournament:manage_mappool',
	MANAGE_REGISTRATIONS: 'tournament:manage_registrations',
	MANAGE_BRACKET: 'tournament:manage_bracket',
	REFEREE_MATCHES: 'tournament:referee_matches',
	STREAM: 'tournament:stream'
} as const;

export type TournamentPermission = (typeof TournamentPermission)[keyof typeof TournamentPermission];

export const TOURNAMENT_ROLE_PERMISSIONS: Record<string, Set<TournamentPermission>> = {
	organizer: new Set(Object.values(TournamentPermission) as TournamentPermission[]),
	admin: new Set([
		TournamentPermission.MANAGE_SETTINGS,
		TournamentPermission.MANAGE_STAFF,
		TournamentPermission.MANAGE_ROUNDS,
		TournamentPermission.MANAGE_MAPPOOL,
		TournamentPermission.MANAGE_REGISTRATIONS,
		TournamentPermission.MANAGE_BRACKET,
		TournamentPermission.REFEREE_MATCHES
	]),
	referee: new Set([TournamentPermission.REFEREE_MATCHES]),
	pooler: new Set([TournamentPermission.MANAGE_MAPPOOL]),
	streamer: new Set([TournamentPermission.STREAM])
};
