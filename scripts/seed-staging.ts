/**
 * Seed the staging database with realistic volumes of test data.
 * Generates 1000 users, 3000 mappools, 3000 matches with full scores.
 *
 * Usage:
 *   DATABASE_URL="..." bun scripts/seed-staging.ts
 *   DATABASE_URL="..." bun scripts/seed-staging.ts --fresh   # clear first
 */

import { drizzle } from 'drizzle-orm/bun-sql';
import { sql } from 'drizzle-orm';
import {
	pgTable,
	text,
	uuid,
	boolean,
	timestamp,
	integer,
	real,
	jsonb,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';

// ── Config ──────────────────────────────────────────────────────────────

const USER_COUNT = 1000;
const TEAM_COUNT = 100; // non-personal teams
const MAPPOOL_COUNT = 3000;
const FINISHED_MATCH_COUNT = 2800;
const CANCELLED_MATCH_COUNT = 100;
const ACTIVE_MATCH_COUNT = 100;
const INVITE_COUNT = 200;
const BATCH_SIZE = 500;

// ── DB setup ────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set');
const db = drizzle(DATABASE_URL);

// ── Inline table defs (mirrors schema.ts, avoids $lib imports) ──────────

const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	role: text('role').default('player').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id').notNull(),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

const team = pgTable('team', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	isPersonal: boolean('is_personal').default(false).notNull(),
	ownerId: text('owner_id'),
	avatarUrl: text('avatar_url'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

const teamMember = pgTable('team_member', {
	id: uuid('id').primaryKey().defaultRandom(),
	teamId: uuid('team_id').notNull(),
	userId: text('user_id').notNull(),
	role: text('role').default('member'),
	joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow()
});

const mappool = pgTable('mappool', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	createdBy: text('created_by'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	verifiedAt: timestamp('verified_at', { withTimezone: true })
});

const mappoolSlot = pgTable('mappool_slot', {
	id: uuid('id').primaryKey().defaultRandom(),
	mappoolId: uuid('mappool_id').notNull(),
	category: text('category').notNull(),
	orderInCategory: integer('order_in_category').notNull(),
	beatmapId: text('beatmap_id').notNull(),
	starRating: real('star_rating'),
	bpm: real('bpm'),
	totalLength: integer('total_length'),
	mods: text('mods').array().default([]).notNull(),
	title: text('title'),
	artist: text('artist'),
	version: text('version'),
	coverUrl: text('cover_url'),
	listCoverUrl: text('list_cover_url')
});

const match = pgTable('match', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name'),
	state: text('state').default('CREATED').notNull(),
	config: jsonb('config').notNull(),
	mappoolId: uuid('mappool_id'),
	osuLobbyId: integer('osu_lobby_id'),
	scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
	startedAt: timestamp('started_at', { withTimezone: true }),
	finishedAt: timestamp('finished_at', { withTimezone: true }),
	winnerId: uuid('winner_id'),
	createdBy: text('created_by'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

const matchParticipant = pgTable('match_participant', {
	id: uuid('id').primaryKey().defaultRandom(),
	matchId: uuid('match_id').notNull(),
	teamId: uuid('team_id').notNull(),
	slot: integer('slot').notNull(),
	score: integer('score').default(0).notNull(),
	rollValue: integer('roll_value'),
	pickOrder: integer('pick_order')
});

const matchParticipantPlayer = pgTable('match_participant_player', {
	id: uuid('id').primaryKey().defaultRandom(),
	participantId: uuid('participant_id').notNull(),
	userId: text('user_id').notNull()
});

const matchGame = pgTable('match_game', {
	id: uuid('id').primaryKey().defaultRandom(),
	matchId: uuid('match_id').notNull(),
	gameNumber: integer('game_number').notNull(),
	mappoolSlotId: uuid('mappool_slot_id').notNull(),
	pickedByParticipantId: uuid('picked_by_participant_id'),
	winnerParticipantId: uuid('winner_participant_id'),
	state: text('state').default('PENDING').notNull(),
	startedAt: timestamp('started_at', { withTimezone: true }),
	finishedAt: timestamp('finished_at', { withTimezone: true })
});

const matchGameScore = pgTable('match_game_score', {
	id: uuid('id').primaryKey().defaultRandom(),
	matchGameId: uuid('match_game_id').notNull(),
	playerId: uuid('player_id').notNull(),
	score: integer('score').default(0).notNull(),
	accuracy: real('accuracy').default(0).notNull(),
	maxCombo: integer('max_combo').default(0).notNull(),
	count300: integer('count_300').default(0).notNull(),
	count100: integer('count_100').default(0).notNull(),
	count50: integer('count_50').default(0).notNull(),
	countMiss: integer('count_miss').default(0).notNull(),
	mods: text('mods').array().default([]).notNull(),
	passed: boolean('passed').default(false).notNull(),
	pp: real('pp')
});

const playerRating = pgTable('player_rating', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id').notNull().unique(),
	elo: integer('elo').default(1000).notNull(),
	wins: integer('wins').default(0).notNull(),
	losses: integer('losses').default(0).notNull(),
	initialElo: integer('initial_elo'),
	osuRankAtSeed: integer('osu_rank_at_seed'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

const notification = pgTable('notification', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id').notNull(),
	type: text('type').notNull(),
	title: text('title').notNull(),
	message: text('message'),
	referenceId: text('reference_id'),
	read: boolean('read').default(false).notNull(),
	actionedAt: timestamp('actioned_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

const matchInvite = pgTable('match_invite', {
	id: uuid('id').primaryKey().defaultRandom(),
	createdBy: text('created_by').notNull(),
	creatorTeamId: uuid('creator_team_id').notNull(),
	invitedTeamId: uuid('invited_team_id').notNull(),
	config: jsonb('config').notNull(),
	mappoolId: uuid('mappool_id').notNull(),
	name: text('name'),
	message: text('message'),
	scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	status: text('status').default('pending').notNull(),
	matchId: uuid('match_id'),
	respondedAt: timestamp('responded_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

const matchQueue = pgTable('match_queue', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id').notNull(),
	teamId: uuid('team_id').notNull(),
	elo: integer('elo').default(1000).notNull(),
	joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Helpers ─────────────────────────────────────────────────────────────

/** Seeded PRNG for reproducible data */
function createRng(seed: number) {
	let s = seed;
	return () => {
		s = (s * 1664525 + 1013904223) & 0x7fffffff;
		return s / 0x7fffffff;
	};
}

const rng = createRng(42);

function pick<T>(arr: T[]): T {
	return arr[Math.floor(rng() * arr.length)];
}

function randInt(min: number, max: number): number {
	return Math.floor(rng() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
	return rng() * (max - min) + min;
}

function randomDate(daysAgo: number): Date {
	const now = Date.now();
	return new Date(now - rng() * daysAgo * 24 * 60 * 60 * 1000);
}

function pad(n: number, len = 4): string {
	return String(n).padStart(len, '0');
}

function rankToElo(rank: number): number {
	return Math.round(Math.max(0, Math.min(3500, 3500 - Math.log10(rank) * 500)));
}

function generateSyntheticRank(index: number, total: number): number {
	const p = index / total;
	if (p < 0.05) return randInt(1000, 10000);
	if (p < 0.2) return randInt(10000, 50000);
	if (p < 0.6) return randInt(50000, 300000);
	if (p < 0.85) return randInt(300000, 1000000);
	return randInt(1000000, 5000000);
}

/** Batch insert in chunks to avoid Postgres param limits */
async function batchInsert<T extends Record<string, any>>(
	table: any,
	rows: T[],
	chunkSize = BATCH_SIZE
): Promise<any[]> {
	const results: any[] = [];
	for (let i = 0; i < rows.length; i += chunkSize) {
		const chunk = rows.slice(i, i + chunkSize);
		const res = await db.insert(table).values(chunk).returning();
		results.push(...res);
	}
	return results;
}

function timer() {
	const start = performance.now();
	return () => `${((performance.now() - start) / 1000).toFixed(1)}s`;
}

// ── Name generators ─────────────────────────────────────────────────────

const PREFIXES = ['', '', '', 'xx', 'xX', 'ii', 'oO', 'Xx', '-', '_', 'Mr', 'Dr', 'DJ'];
const WORDS = [
	'Ace',
	'Arrow',
	'Blaze',
	'Bolt',
	'Cat',
	'Cloud',
	'Comet',
	'Crow',
	'Crystal',
	'Cyber',
	'Dark',
	'Dawn',
	'Demon',
	'Diamond',
	'Dragon',
	'Dream',
	'Eagle',
	'Echo',
	'Edge',
	'Elite',
	'Ember',
	'Fang',
	'Fire',
	'Flash',
	'Fox',
	'Frost',
	'Ghost',
	'Gold',
	'Hawk',
	'Haze',
	'Hero',
	'Hunt',
	'Ice',
	'Iron',
	'Jade',
	'Jet',
	'King',
	'Knight',
	'Leo',
	'Light',
	'Luna',
	'Lynx',
	'Mist',
	'Moon',
	'Neo',
	'Night',
	'Nova',
	'Omega',
	'Onyx',
	'Phantom',
	'Phoenix',
	'Pixel',
	'Prime',
	'Pulse',
	'Rage',
	'Rain',
	'Raven',
	'Rex',
	'Rise',
	'River',
	'Rock',
	'Ruby',
	'Rush',
	'Sage',
	'Shade',
	'Shadow',
	'Silver',
	'Sky',
	'Snap',
	'Snow',
	'Solar',
	'Soul',
	'Spark',
	'Star',
	'Steel',
	'Storm',
	'Strike',
	'Sun',
	'Swift',
	'Sword',
	'Thunder',
	'Tiger',
	'Titan',
	'Turbo',
	'Venom',
	'Viper',
	'Void',
	'Wave',
	'Wild',
	'Wind',
	'Wolf',
	'Wrath',
	'Zen',
	'Zero',
	'Zeta',
	'Zoom',
	'Apex',
	'Atlas',
	'Aura',
	'Blade'
];
const SUFFIXES = ['', '', '', '_', '-', 'HD', 'osu', 'pp', 'x', 'z', '69', '420', 'YT', 'TTV'];

function generateUsername(index: number): string {
	const w1 = WORDS[(index * 7 + 3) % WORDS.length];
	const w2 = WORDS[(index * 13 + 11) % WORDS.length];
	const prefix = PREFIXES[index % PREFIXES.length];
	const suffix = SUFFIXES[(index * 3) % SUFFIXES.length];
	const num = index % 5 === 0 ? String(randInt(1, 999)) : '';
	return `${prefix}${w1}${w2}${num}${suffix}`;
}

const TEAM_NAMES = [
	'Team Absolute',
	'Velocity Gaming',
	'Rising Phoenix',
	'Dark Matter',
	'Quantum Flux',
	'Storm Chasers',
	'Neon Knights',
	'Solar Flare',
	'Arctic Wolves',
	'Thunder Strike',
	'Crimson Tide',
	'Iron Fortress',
	'Shadow Realm',
	'Crystal Edge',
	'Blazing Stars',
	'Night Owls',
	'Golden Eagles',
	'Frost Bite',
	'Wild Cards',
	'Steel Legion',
	'Moon Riders',
	'Star Dust',
	'Fire Hawks',
	'Ice Breakers',
	'Wind Walkers',
	'Dragon Scale',
	'Raven Wing',
	'Silver Bullet',
	'Ghost Protocol',
	'Prime Time',
	'Echo Chamber',
	'Volt Force',
	'Sky Runners',
	'Omega Squad',
	'Alpha Pack',
	'Zero Gravity',
	'Dawn Patrol',
	'Pixel Perfect',
	'Cyber Monks',
	'Neo Tokyo',
	'Mist Walkers',
	'Pulse Wave',
	'Zenith',
	'Apex Legends',
	'Void Runners',
	'Soul Reapers',
	'Blade Dancers',
	'Turbo Charged',
	'Snap Dragons',
	'Rush Hour',
	'Phantom Force',
	'Diamond Dogs',
	'Cosmic Rays',
	'Hyper Beam',
	'Sonic Boom',
	'Prism',
	'Eclipse',
	'Nebula',
	'Supernova',
	'Horizon',
	'Catalyst',
	'Entropy',
	'Vanguard',
	'Sentinel',
	'Oracle',
	'Maelstrom',
	'Tempest',
	'Cascade',
	'Enigma',
	'Paradox',
	'Mirage',
	'Nexus',
	'Vertex',
	'Cipher',
	'Stratos',
	'Helix',
	'Spectrum',
	'Polaris',
	'Inferno',
	'Tsunami',
	'Rampage',
	'Havoc',
	'Fury',
	'Blitz',
	'Reign',
	'Rapture',
	'Genesis',
	'Onslaught',
	'Vendetta',
	'Oblivion',
	'Dominion',
	'Ascension',
	'Redemption',
	'Revolution',
	'Evolution',
	'Dynasty',
	'Empire',
	'Republic',
	'Alliance',
	'Syndicate',
	'Collective',
	'Foundation',
	'Initiative',
	'Consortium',
	'Federation'
];

// Beatmap metadata templates — used to generate pool slots with varied data
const ARTISTS = [
	'xi',
	'DragonForce',
	'UNDEAD CORPORATION',
	'Imperial Circus Dead Decadence',
	'Camellia',
	'FELT',
	'Halozy',
	'Sound Horizon',
	'Reol',
	'DECO*27',
	'ClariS',
	'LiSA',
	'Aimer',
	'EGOIST',
	'supercell',
	'Linked Horizon',
	'Foreground Eclipse',
	'BABYMETAL',
	'Hana',
	'IOSYS',
	'Mafumafu',
	'Eve',
	'Yorushika',
	'YOASOBI',
	'Kenshi Yonezu',
	'Aqours',
	'Roselia',
	'Raise A Suilen',
	'Pastel*Palettes',
	'Poppin Party'
];
const TITLES = [
	'FREEDOM DiVE',
	'Blue Zenith',
	'Uta',
	'Image Material',
	'Brain Power',
	'The Big Black',
	'Airman ga Taosenai',
	'Kira Kira Days',
	'Senbonzakura',
	'Harumachi Clover',
	'Storytellers',
	'Highscore',
	'Louder than Steel',
	'Snow Drive',
	'Night of Knights',
	'Yuki no Hana',
	'Rainbow Road',
	'Galaxy Collapse',
	'Last Goodbye',
	'Shinbatsu',
	'Crystallize',
	'Overkill',
	'Plasma Gun',
	'Time Freeze',
	'Diamond',
	'United',
	'Alchemy',
	'Scarlet Rose',
	'Infinite Dream',
	'Lost Umbrella',
	'Through the Fire and Flames',
	'Cry Thunder',
	'Soldiers of the Wasteland',
	'Valley of the Damned',
	'Black Fire',
	'Akasha',
	'Ethereal',
	'Chrono Trigger',
	'Solar System',
	'Phantom Rider'
];
const VERSIONS = [
	'Normal',
	'Hard',
	'Insane',
	'Expert',
	'Expert+',
	'Lunatic',
	"Someone's Extra",
	'Another',
	'Extreme',
	"Lasse's Insane",
	'Reform',
	'Deluge',
	'Overdose',
	'Rain',
	'Platter',
	"Monstrata's Expert",
	"Sotarks' Insane",
	"fieryrage's Extra",
	"Kroytz's Insane",
	'Kalibe',
	'Cataclysm'
];

// ── PHASE FUNCTIONS ─────────────────────────────────────────────────────

interface UserData {
	id: string;
	name: string;
	email: string;
	role: string;
	createdAt: Date;
}

interface TeamData {
	id: string;
	name: string;
	isPersonal: boolean;
	ownerId: string;
}

interface RatingData {
	userId: string;
	elo: number;
	wins: number;
	losses: number;
	rank: number;
}

interface PoolData {
	id: string;
	avgSr: number;
	slotIds: string[];
}

async function seedUsers(): Promise<UserData[]> {
	const t = timer();
	const users: any[] = [];
	const accounts: any[] = [];
	const now = new Date();

	for (let i = 1; i <= USER_COUNT; i++) {
		const id = `seed-user-${pad(i)}`;
		const name = generateUsername(i);
		const created = randomDate(180);
		const role = i <= 3 ? 'admin' : i <= 13 ? 'referee' : 'player';

		users.push({
			id,
			name,
			email: `seed-${pad(i)}@staging.local`,
			emailVerified: false,
			image: null,
			role,
			createdAt: created,
			updatedAt: now
		});

		accounts.push({
			id: `seed-account-${pad(i)}`,
			accountId: String(1000000 + i),
			providerId: 'osu',
			userId: id,
			createdAt: created,
			updatedAt: now
		});
	}

	await batchInsert(user, users);
	await batchInsert(account, accounts);

	console.log(`  Users + accounts: ${USER_COUNT} (${t()})`);
	return users.map((u) => ({
		id: u.id,
		name: u.name,
		email: u.email,
		role: u.role,
		createdAt: u.createdAt
	}));
}

async function seedPersonalTeams(users: UserData[]): Promise<TeamData[]> {
	const t = timer();
	const teams: any[] = [];
	const members: any[] = [];

	for (const u of users) {
		teams.push({
			name: u.name,
			isPersonal: true,
			ownerId: u.id
		});
	}

	const inserted = await batchInsert(team, teams);
	for (let i = 0; i < inserted.length; i++) {
		members.push({
			teamId: inserted[i].id,
			userId: users[i].id,
			role: 'owner'
		});
	}

	await batchInsert(teamMember, members);
	console.log(`  Personal teams: ${USER_COUNT} (${t()})`);
	return inserted.map((t: any, i: number) => ({
		id: t.id,
		name: t.name,
		isPersonal: true,
		ownerId: users[i].id
	}));
}

async function seedNonPersonalTeams(users: UserData[]): Promise<TeamData[]> {
	const t = timer();
	const teams: any[] = [];

	for (let i = 0; i < TEAM_COUNT; i++) {
		teams.push({
			name:
				TEAM_NAMES[i % TEAM_NAMES.length] +
				(i >= TEAM_NAMES.length ? ` ${Math.floor(i / TEAM_NAMES.length) + 1}` : ''),
			isPersonal: false,
			ownerId: users[i].id
		});
	}

	const inserted = await batchInsert(team, teams);

	// Add members — 2-5 per team, owner always included
	const members: any[] = [];
	const userTeamCount = new Map<string, number>();

	for (let i = 0; i < inserted.length; i++) {
		const memberCount = randInt(2, 5);
		const teamUsers = new Set<string>();
		teamUsers.add(users[i].id); // owner

		members.push({
			teamId: inserted[i].id,
			userId: users[i].id,
			role: 'owner'
		});

		let attempts = 0;
		while (teamUsers.size < memberCount && attempts < 50) {
			const candidate = users[randInt(0, users.length - 1)];
			const existing = userTeamCount.get(candidate.id) || 0;
			if (!teamUsers.has(candidate.id) && existing < 2) {
				teamUsers.add(candidate.id);
				userTeamCount.set(candidate.id, existing + 1);
				members.push({
					teamId: inserted[i].id,
					userId: candidate.id,
					role: 'member'
				});
			}
			attempts++;
		}
	}

	await batchInsert(teamMember, members);
	console.log(`  Non-personal teams: ${TEAM_COUNT} (${t()})`);
	return inserted.map((t: any, i: number) => ({
		id: t.id,
		name: t.name,
		isPersonal: false,
		ownerId: users[i].id
	}));
}

async function seedRatings(users: UserData[]): Promise<RatingData[]> {
	const t = timer();
	const ratings: any[] = [];
	const result: RatingData[] = [];

	for (let i = 0; i < users.length; i++) {
		const rank = generateSyntheticRank(i, users.length);
		const elo = rankToElo(rank);

		ratings.push({
			userId: users[i].id,
			elo,
			wins: 0,
			losses: 0,
			initialElo: elo,
			osuRankAtSeed: rank
		});

		result.push({ userId: users[i].id, elo, wins: 0, losses: 0, rank });
	}

	await batchInsert(playerRating, ratings);
	console.log(`  Player ratings: ${USER_COUNT} (${t()})`);
	return result;
}

async function seedMappools(users: UserData[]): Promise<PoolData[]> {
	const t = timer();
	const BANDS = [
		{ name: 'Beginner', srMin: 1.5, srMax: 2.5 },
		{ name: 'Easy', srMin: 2.5, srMax: 3.0 },
		{ name: 'Normal', srMin: 3.0, srMax: 3.5 },
		{ name: 'Advanced', srMin: 3.5, srMax: 4.0 },
		{ name: 'Hard', srMin: 4.0, srMax: 4.5 },
		{ name: 'Insane', srMin: 4.5, srMax: 5.0 },
		{ name: 'Expert', srMin: 5.0, srMax: 5.5 },
		{ name: 'Expert+', srMin: 5.5, srMax: 6.5 },
		{ name: 'Pro', srMin: 6.5, srMax: 7.5 },
		{ name: 'Champion', srMin: 7.5, srMax: 8.5 }
	];

	const poolsPerBand = Math.ceil(MAPPOOL_COUNT / BANDS.length);
	const pools: any[] = [];

	for (let b = 0; b < BANDS.length; b++) {
		const band = BANDS[b];
		for (let j = 0; j < poolsPerBand && pools.length < MAPPOOL_COUNT; j++) {
			pools.push({
				name: `${band.name} Pool ${j + 1}`,
				createdBy: pick(users.slice(0, 13)).id, // admins/referees create pools
				verifiedAt: new Date(),
				createdAt: randomDate(180)
			});
		}
	}

	const insertedPools = await batchInsert(mappool, pools);

	// Generate slots for each pool
	const SLOT_TEMPLATE = [
		{ cat: 'NM', order: 1 },
		{ cat: 'NM', order: 2 },
		{ cat: 'NM', order: 3 },
		{ cat: 'HD', order: 1 },
		{ cat: 'HD', order: 2 },
		{ cat: 'HR', order: 1 },
		{ cat: 'HR', order: 2 },
		{ cat: 'DT', order: 1 },
		{ cat: 'DT', order: 2 },
		{ cat: 'FM', order: 1 },
		{ cat: 'TB', order: 1 }
	];

	const allSlots: any[] = [];
	const poolData: PoolData[] = [];

	for (let p = 0; p < insertedPools.length; p++) {
		const bandIndex = Math.floor(p / poolsPerBand);
		const band = BANDS[Math.min(bandIndex, BANDS.length - 1)];
		const poolSlotIds: string[] = [];

		for (const tmpl of SLOT_TEMPLATE) {
			const sr = randFloat(band.srMin, band.srMax);
			const beatmapId = String(randInt(1, 4000000));
			const mods = tmpl.cat === 'NM' || tmpl.cat === 'TB' ? [] : [tmpl.cat];

			allSlots.push({
				mappoolId: insertedPools[p].id,
				category: tmpl.cat,
				orderInCategory: tmpl.order,
				beatmapId,
				starRating: Math.round(sr * 100) / 100,
				bpm: randInt(120, 260),
				totalLength: randInt(60, 300),
				mods,
				title: pick(TITLES),
				artist: pick(ARTISTS),
				version: pick(VERSIONS)
			});
		}
	}

	const insertedSlots = await batchInsert(mappoolSlot, allSlots);

	// Group slot IDs back to pools
	let slotIdx = 0;
	for (let p = 0; p < insertedPools.length; p++) {
		const bandIndex = Math.floor(p / poolsPerBand);
		const band = BANDS[Math.min(bandIndex, BANDS.length - 1)];
		const ids = insertedSlots.slice(slotIdx, slotIdx + SLOT_TEMPLATE.length).map((s: any) => s.id);
		poolData.push({
			id: insertedPools[p].id,
			avgSr: (band.srMin + band.srMax) / 2,
			slotIds: ids
		});
		slotIdx += SLOT_TEMPLATE.length;
	}

	console.log(`  Mappools: ${insertedPools.length}, slots: ${insertedSlots.length} (${t()})`);
	return poolData;
}

function selectPoolForElo(pools: PoolData[], avgElo: number): PoolData {
	const targetSr = Math.max(2, Math.min(8, 2 + avgElo / 700));
	let bestDist = Math.abs(pools[0].avgSr - targetSr);
	for (const p of pools) {
		const dist = Math.abs(p.avgSr - targetSr);
		if (dist < bestDist) {
			bestDist = dist;
		}
	}
	// Pick randomly from pools within 0.5 of best match
	const candidates = pools.filter((p) => Math.abs(p.avgSr - targetSr) <= bestDist + 0.5);
	return pick(candidates);
}

function generateGameScore(starRating: number, playerElo: number, mods: string[]) {
	// Higher ELO = higher accuracy = higher score
	const skillFactor = Math.min(1, playerElo / 3000);
	const baseAcc = 0.85 + skillFactor * 0.14 + randFloat(-0.03, 0.03);
	const accuracy = Math.max(0.7, Math.min(1, baseAcc));

	const totalNotes = randInt(200, 1500);
	const count300 = Math.round(totalNotes * accuracy);
	const remaining = totalNotes - count300;
	const count100 = Math.round(remaining * 0.5);
	const count50 = Math.round(remaining * 0.3);
	const countMiss = remaining - count100 - count50;

	const maxPossibleCombo = totalNotes + randInt(0, 200);
	const comboRatio = 0.6 + skillFactor * 0.35 + randFloat(-0.1, 0.1);
	const maxCombo = Math.round(maxPossibleCombo * Math.min(1, comboRatio));

	const baseScore = Math.round(
		(300 * count300 + 100 * count100 + 50 * count50) * (1 + maxCombo / 500) * (1 + starRating / 10)
	);
	const score = Math.max(10000, Math.min(1200000, baseScore + randInt(-50000, 50000)));

	const passed = rng() < 0.95;
	const pp = starRating > 4 ? Math.round(starRating * skillFactor * 80 + randFloat(-20, 40)) : null;

	return {
		score,
		accuracy: Math.round(accuracy * 10000) / 10000,
		maxCombo,
		count300: Math.max(0, count300),
		count100: Math.max(0, count100),
		count50: Math.max(0, count50),
		countMiss: Math.max(0, countMiss),
		mods,
		passed,
		pp
	};
}

async function seedMatches(
	users: UserData[],
	personalTeams: TeamData[],
	ratings: RatingData[],
	pools: PoolData[],
	state: 'FINISHED' | 'CANCELLED' | 'ACTIVE',
	count: number
): Promise<void> {
	const t = timer();
	const ratingMap = new Map(ratings.map((r) => [r.userId, r]));
	const personalTeamMap = new Map(personalTeams.map((t) => [t.ownerId, t]));

	const allMatches: any[] = [];
	const allParticipants: any[] = [];
	const allPlayers: any[] = [];
	const allGames: any[] = [];
	const allScores: any[] = [];

	// Track wins/losses for rating updates
	const winsMap = new Map<string, number>();
	const lossesMap = new Map<string, number>();

	for (let m = 0; m < count; m++) {
		// Pick 2 random users
		const u1 = users[randInt(0, users.length - 1)];
		const u2 = users[randInt(0, users.length - 1)];
		if (u1.id === u2.id) continue; // skip self-match

		const t1 = personalTeamMap.get(u1.id)!;
		const t2 = personalTeamMap.get(u2.id)!;
		if (!t1 || !t2) continue;

		const r1 = ratingMap.get(u1.id)!;
		const r2 = ratingMap.get(u2.id)!;
		const avgElo = Math.round((r1.elo + r2.elo) / 2);
		const pool = selectPoolForElo(pools, avgElo);

		const bestOf = pick([5, 7, 9]);
		const winsNeeded = Math.ceil(bestOf / 2);
		const matchDate = randomDate(180);

		// Determine match state
		let matchState: string;
		const winnerId: string | null = null;
		let finishedAt: Date | null = null;
		let startedAt: Date | null;
		let gamesToPlay: number;

		if (state === 'FINISHED') {
			matchState = 'FINISHED';
			startedAt = matchDate;
			finishedAt = new Date(matchDate.getTime() + randInt(15, 60) * 60000);

			// Higher ELO wins more often
			const expected = 1 / (1 + Math.pow(10, (r2.elo - r1.elo) / 400));
			const p1Wins = rng() < expected;
			gamesToPlay = winsNeeded + randInt(0, winsNeeded - 1); // 3-5 for bo5
			if (gamesToPlay > bestOf) gamesToPlay = bestOf;
		} else if (state === 'CANCELLED') {
			const cancelStates = ['CREATED', 'LOBBY', 'PICKING', 'PLAYING'];
			matchState = 'CANCELLED';
			startedAt = rng() > 0.3 ? matchDate : null;
			gamesToPlay = pick([0, 0, 1, 2]);
		} else {
			// Active matches
			const activeStates = ['CREATED', 'LOBBY', 'ROLLING', 'PICKING', 'PLAYING'];
			matchState = pick(activeStates);
			startedAt = matchState !== 'CREATED' ? matchDate : null;
			gamesToPlay = matchState === 'PICKING' || matchState === 'PLAYING' ? randInt(0, 2) : 0;
		}

		// Use a placeholder for match ID, will get real ID from insert
		const matchRow = {
			name: `${u1.name} vs ${u2.name}`,
			state: matchState,
			config: { bestOf, teamSize: 1, scoringType: 'score_v2' },
			mappoolId: pool.id,
			startedAt,
			finishedAt,
			createdBy: u1.id,
			createdAt: matchDate
		};

		allMatches.push({
			matchRow,
			u1,
			u2,
			t1,
			t2,
			r1,
			r2,
			pool,
			gamesToPlay,
			winsNeeded,
			bestOf,
			matchState
		});
	}

	// Insert matches in batches, then build related data
	const matchRows = allMatches.map((m) => m.matchRow);
	const insertedMatches = await batchInsert(match, matchRows);

	// Now build participants, players, games, scores
	for (let i = 0; i < insertedMatches.length; i++) {
		const mi = insertedMatches[i];
		const md = allMatches[i];

		const roll1 = randInt(1, 100);
		const roll2 = randInt(1, 100);
		const p1First = roll1 >= roll2;

		allParticipants.push(
			{
				matchId: mi.id,
				teamId: md.t1.id,
				slot: 1,
				score: 0, // will be set after games
				rollValue: roll1,
				pickOrder: p1First ? 1 : 2,
				_tempIdx: allParticipants.length,
				_matchDataIdx: i,
				_side: 1
			},
			{
				matchId: mi.id,
				teamId: md.t2.id,
				slot: 2,
				score: 0,
				rollValue: roll2,
				pickOrder: p1First ? 2 : 1,
				_tempIdx: allParticipants.length + 1,
				_matchDataIdx: i,
				_side: 2
			}
		);
	}

	// Strip temp fields for insert
	const participantRows = allParticipants.map(
		({ _tempIdx, _matchDataIdx, _side, ...rest }) => rest
	);
	const insertedParticipants = await batchInsert(matchParticipant, participantRows);

	// Build players
	for (let i = 0; i < insertedParticipants.length; i++) {
		const pData = allParticipants[i];
		const md = allMatches[pData._matchDataIdx];
		const userId = pData._side === 1 ? md.u1.id : md.u2.id;

		allPlayers.push({
			participantId: insertedParticipants[i].id,
			userId,
			_participantInsertIdx: i,
			_matchDataIdx: pData._matchDataIdx,
			_side: pData._side
		});
	}

	const playerRows = allPlayers.map(
		({ _participantInsertIdx, _matchDataIdx, _side, ...rest }) => rest
	);
	const insertedPlayers = await batchInsert(matchParticipantPlayer, playerRows);

	// Build a lookup: matchDataIdx + side -> participant ID and player ID
	const participantLookup = new Map<string, { participantId: string; playerId: string }>();
	for (let i = 0; i < allPlayers.length; i++) {
		const key = `${allPlayers[i]._matchDataIdx}-${allPlayers[i]._side}`;
		participantLookup.set(key, {
			participantId: insertedParticipants[allPlayers[i]._participantInsertIdx].id,
			playerId: insertedPlayers[i].id
		});
	}

	// Build games and scores
	const matchWinners = new Map<number, { winnerId: string; p1Score: number; p2Score: number }>();

	for (let i = 0; i < allMatches.length; i++) {
		const md = allMatches[i];
		const p1 = participantLookup.get(`${i}-1`)!;
		const p2 = participantLookup.get(`${i}-2`)!;
		const mi = insertedMatches[i];

		let p1Score = 0;
		let p2Score = 0;
		const usedSlots = new Set<number>();

		for (let g = 0; g < md.gamesToPlay; g++) {
			// Pick a slot not yet used
			let slotIdx = randInt(0, md.pool.slotIds.length - 1);
			let attempts = 0;
			while (usedSlots.has(slotIdx) && attempts < 20) {
				slotIdx = randInt(0, md.pool.slotIds.length - 1);
				attempts++;
			}
			usedSlots.add(slotIdx);

			const pickerSide = g % 2 === 0 ? 1 : 2;
			const pickerParticipant = pickerSide === 1 ? p1 : p2;
			const slotSr = md.pool.avgSr + randFloat(-0.5, 0.5);
			const mods = g % 3 === 0 ? [] : [pick(['HD', 'HR', 'DT', 'FM'])];

			const score1 = generateGameScore(slotSr, md.r1.elo, mods);
			const score2 = generateGameScore(slotSr, md.r2.elo, mods);

			let gameWinner: typeof p1;
			if (md.matchState === 'FINISHED') {
				// Determine who wins to reach the right final score
				const p1NeedsWin = p1Score < md.winsNeeded;
				const p2NeedsWin = p2Score < md.winsNeeded;
				if (!p1NeedsWin) {
					gameWinner = p2;
					p2Score++;
				} else if (!p2NeedsWin) {
					gameWinner = p1;
					p1Score++;
				} else if (g === md.gamesToPlay - 1 && p1Score === p2Score) {
					// Last game decides it — use ELO expected to pick
					const expected = 1 / (1 + Math.pow(10, (md.r2.elo - md.r1.elo) / 400));
					if (rng() < expected) {
						gameWinner = p1;
						p1Score++;
					} else {
						gameWinner = p2;
						p2Score++;
					}
				} else {
					if (score1.score > score2.score) {
						gameWinner = p1;
						p1Score++;
					} else {
						gameWinner = p2;
						p2Score++;
					}
				}
			} else {
				// Cancelled/active — no winner needed for last game
				if (g < md.gamesToPlay - 1 || md.matchState === 'CANCELLED') {
					gameWinner = score1.score > score2.score ? p1 : p2;
					if (score1.score > score2.score) p1Score++;
					else p2Score++;
				} else {
					// Active match, last game still in progress
					gameWinner = null as any;
				}
			}

			const gameState = gameWinner ? 'FINISHED' : 'PLAYING';
			const gameStarted = new Date(mi.createdAt.getTime() + g * randInt(5, 15) * 60000);

			allGames.push({
				matchId: mi.id,
				gameNumber: g + 1,
				mappoolSlotId: md.pool.slotIds[slotIdx],
				pickedByParticipantId: pickerParticipant.participantId,
				winnerParticipantId: gameWinner?.participantId || null,
				state: gameState,
				startedAt: gameStarted,
				finishedAt:
					gameState === 'FINISHED' ? new Date(gameStarted.getTime() + randInt(2, 8) * 60000) : null,
				_scores: [
					{ playerId: p1.playerId, ...score1 },
					{ playerId: p2.playerId, ...score2 }
				]
			});
		}

		// Track match winner
		if (md.matchState === 'FINISHED') {
			const winnerId = p1Score > p2Score ? md.t1.id : md.t2.id;
			const winnerUserId = p1Score > p2Score ? md.u1.id : md.u2.id;
			const loserUserId = p1Score > p2Score ? md.u2.id : md.u1.id;
			matchWinners.set(i, { winnerId, p1Score, p2Score });

			winsMap.set(winnerUserId, (winsMap.get(winnerUserId) || 0) + 1);
			lossesMap.set(loserUserId, (lossesMap.get(loserUserId) || 0) + 1);
		}
	}

	// Insert games
	const gameRows = allGames.map(({ _scores, ...rest }) => rest);
	const insertedGames = await batchInsert(matchGame, gameRows);

	// Build scores
	for (let i = 0; i < insertedGames.length; i++) {
		const scores = allGames[i]._scores;
		for (const s of scores) {
			allScores.push({
				matchGameId: insertedGames[i].id,
				...s
			});
		}
	}

	await batchInsert(matchGameScore, allScores);

	// Update match winners and participant scores
	for (const [idx, winner] of matchWinners) {
		const mi = insertedMatches[idx];
		await db.execute(sql`UPDATE match SET winner_id = ${winner.winnerId} WHERE id = ${mi.id}`);

		const p1 = participantLookup.get(`${idx}-1`)!;
		const p2 = participantLookup.get(`${idx}-2`)!;
		await db.execute(
			sql`UPDATE match_participant SET score = ${winner.p1Score} WHERE id = ${p1.participantId}`
		);
		await db.execute(
			sql`UPDATE match_participant SET score = ${winner.p2Score} WHERE id = ${p2.participantId}`
		);
	}

	// Update player ratings with win/loss counts
	if (state === 'FINISHED') {
		for (const [userId, wins] of winsMap) {
			await db.execute(
				sql`UPDATE player_rating SET wins = wins + ${wins} WHERE user_id = ${userId}`
			);
		}
		for (const [userId, losses] of lossesMap) {
			await db.execute(
				sql`UPDATE player_rating SET losses = losses + ${losses} WHERE user_id = ${userId}`
			);
		}
	}

	const label = state === 'FINISHED' ? 'Finished' : state === 'CANCELLED' ? 'Cancelled' : 'Active';
	console.log(
		`  ${label} matches: ${insertedMatches.length}, games: ${insertedGames.length}, scores: ${allScores.length} (${t()})`
	);
}

async function seedNotifications(users: UserData[]): Promise<void> {
	const t = timer();
	const types = [
		'match_created',
		'match_finished',
		'match_cancelled',
		'team_invite',
		'match_invite'
	];
	const rows: any[] = [];

	for (const u of users) {
		const count = randInt(1, 6);
		for (let j = 0; j < count; j++) {
			const type = pick(types);
			rows.push({
				userId: u.id,
				type,
				title:
					type === 'match_created'
						? 'New match created'
						: type === 'match_finished'
							? 'Match finished'
							: type === 'match_cancelled'
								? 'Match cancelled'
								: type === 'team_invite'
									? 'Team invitation'
									: 'Match invitation',
				message: `Notification for ${u.name}`,
				read: rng() < 0.4,
				createdAt: randomDate(30)
			});
		}
	}

	await batchInsert(notification, rows);
	console.log(`  Notifications: ${rows.length} (${t()})`);
}

async function seedInvites(
	users: UserData[],
	personalTeams: TeamData[],
	pools: PoolData[]
): Promise<void> {
	const t = timer();
	const rows: any[] = [];
	const now = new Date();

	for (let i = 0; i < INVITE_COUNT; i++) {
		const creator = users[randInt(0, users.length - 1)];
		const invited = users[randInt(0, users.length - 1)];
		if (creator.id === invited.id) continue;

		const creatorTeam = personalTeams.find((t) => t.ownerId === creator.id)!;
		const invitedTeam = personalTeams.find((t) => t.ownerId === invited.id)!;
		if (!creatorTeam || !invitedTeam) continue;

		const pool = pick(pools);
		let status: string;
		let respondedAt: Date | null = null;
		const created = randomDate(30);
		let expiresAt: Date;

		const p = i / INVITE_COUNT;
		if (p < 0.4) {
			status = 'pending';
			expiresAt = new Date(now.getTime() + randInt(1, 7) * 24 * 60 * 60 * 1000);
		} else if (p < 0.7) {
			status = 'accepted';
			respondedAt = new Date(created.getTime() + randInt(1, 24) * 60 * 60 * 1000);
			expiresAt = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
		} else if (p < 0.9) {
			status = 'declined';
			respondedAt = new Date(created.getTime() + randInt(1, 48) * 60 * 60 * 1000);
			expiresAt = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
		} else {
			status = 'expired';
			expiresAt = new Date(now.getTime() - randInt(1, 14) * 24 * 60 * 60 * 1000);
		}

		rows.push({
			createdBy: creator.id,
			creatorTeamId: creatorTeam.id,
			invitedTeamId: invitedTeam.id,
			config: { bestOf: pick([5, 7]), teamSize: 1, scoringType: 'score_v2' },
			mappoolId: pool.id,
			name: `${creator.name} vs ${invited.name}`,
			expiresAt,
			status,
			respondedAt,
			createdAt: created
		});
	}

	await batchInsert(matchInvite, rows);
	console.log(`  Invites: ${rows.length} (${t()})`);
}

// ── Clear logic (same as clear-db.ts --full) ────────────────────────────

async function clearAll() {
	const t = timer();
	await db.execute(sql`DELETE FROM match_game_score`);
	await db.execute(sql`DELETE FROM match_game`);
	await db.execute(sql`DELETE FROM match_participant_player`);
	await db.execute(sql`DELETE FROM match_participant`);
	await db.execute(sql`UPDATE match SET winner_id = NULL`);
	await db.execute(sql`DELETE FROM match`);
	await db.execute(sql`DELETE FROM match_queue`);
	await db.execute(sql`DELETE FROM match_invite`);
	await db.execute(sql`DELETE FROM notification`);
	await db.execute(sql`DELETE FROM player_rating`);
	await db.execute(sql`DELETE FROM team_member`);
	await db.execute(sql`DELETE FROM team`);
	await db.execute(sql`DELETE FROM mappool_slot`);
	await db.execute(sql`DELETE FROM mappool`);
	await db.execute(sql`DELETE FROM account WHERE id LIKE 'seed-%'`);
	await db.execute(sql`DELETE FROM session WHERE user_id LIKE 'seed-%'`);
	await db.execute(sql`DELETE FROM "user" WHERE id LIKE 'seed-%'`);
	console.log(`  Cleared existing data (${t()})`);
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
	const fresh = process.argv.includes('--fresh');
	const totalTimer = timer();

	console.log('=== Seeding staging database ===');
	console.log(
		`  Target: ${USER_COUNT} users, ${MAPPOOL_COUNT} pools, ${FINISHED_MATCH_COUNT + CANCELLED_MATCH_COUNT + ACTIVE_MATCH_COUNT} matches`
	);
	console.log('');

	if (fresh) {
		console.log('Phase 0: Clearing...');
		await clearAll();
		console.log('');
	}

	console.log('Phase 1: Users & accounts...');
	const users = await seedUsers();

	console.log('Phase 2: Teams...');
	const personalTeams = await seedPersonalTeams(users);
	const nonPersonalTeams = await seedNonPersonalTeams(users);

	console.log('Phase 3: Player ratings...');
	const ratings = await seedRatings(users);

	console.log('Phase 4: Mappools...');
	const pools = await seedMappools(users);

	console.log('Phase 5: Finished matches...');
	await seedMatches(users, personalTeams, ratings, pools, 'FINISHED', FINISHED_MATCH_COUNT);

	console.log('Phase 6: Cancelled matches...');
	await seedMatches(users, personalTeams, ratings, pools, 'CANCELLED', CANCELLED_MATCH_COUNT);

	console.log('Phase 7: Active matches...');
	await seedMatches(users, personalTeams, ratings, pools, 'ACTIVE', ACTIVE_MATCH_COUNT);

	console.log('Phase 8: Notifications...');
	await seedNotifications(users);

	console.log('Phase 9: Invites...');
	await seedInvites(users, personalTeams, pools);

	console.log('');
	console.log(`=== Done in ${totalTimer()} ===`);
	process.exit(0);
}

main().catch((err) => {
	console.error('Seed failed:', err);
	process.exit(1);
});
