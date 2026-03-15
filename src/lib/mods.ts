/**
 * Shared mod constants and utilities — used by both server and client.
 */

/** All individual mod codes recognized by the system. */
export const INDIVIDUAL_MODS = ['NM', 'HD', 'HR', 'DT', 'FM', 'EZ', 'FL', 'RX', 'TB'] as const;

/** Canonical display order for mod categories (including common compounds). */
export const MOD_ORDER = [
	'NM',
	'HD',
	'HR',
	'DT',
	'HDHR',
	'HDDT',
	'FM',
	'EZ',
	'FL',
	'EZFL',
	'RX',
	'RXHR',
	'RXHDHR',
	'TB'
];

/** Categories available in the "Add Slot" dropdown. */
export const ADD_CATEGORIES = [
	'NM',
	'HD',
	'HR',
	'DT',
	'HDHR',
	'FM',
	'EZ',
	'FL',
	'EZFL',
	'RX',
	'RXHR',
	'RXHDHR',
	'TB'
];

/** Score multipliers per mod (applied when a slot's mods include this mod). */
export const MOD_MULTIPLIERS: Record<string, number> = {
	EZ: 2
};

/**
 * Parse a compound category string into individual mod codes for the mods array.
 * "HDHR" → ["HD", "HR"], "NM" → [], "TB" → [], "RXHDHR" → ["RX", "HD", "HR"]
 */
export function categoryToMods(category: string): string[] {
	if (category === 'NM' || category === 'TB') return [];
	const mods: string[] = [];
	let remaining = category;
	while (remaining.length >= 2) {
		const chunk = remaining.slice(0, 2);
		if (
			(INDIVIDUAL_MODS as readonly string[]).includes(chunk) &&
			chunk !== 'NM' &&
			chunk !== 'TB'
		) {
			mods.push(chunk);
		} else {
			return [category]; // fallback: not a valid compound, treat category as single mod
		}
		remaining = remaining.slice(2);
	}
	return mods.length > 0 ? mods : [category];
}

/**
 * Validate a category string — must be NM, TB, or a valid concatenation of known mods.
 */
export function isValidCategory(category: string): boolean {
	if ((INDIVIDUAL_MODS as readonly string[]).includes(category)) return true;
	let remaining = category;
	while (remaining.length >= 2) {
		const chunk = remaining.slice(0, 2);
		if (!(INDIVIDUAL_MODS as readonly string[]).includes(chunk)) return false;
		remaining = remaining.slice(2);
	}
	return remaining.length === 0;
}

/** Regex for matching category codes in bulk import (one or more 2-letter mod codes + optional number). */
export const MOD_REGEX = /^((?:NM|HD|HR|DT|FM|EZ|FL|RX|TB)+)\d*$/i;

/**
 * Get sort order index for a category. Lower = earlier.
 */
export function categorySort(category: string): number {
	const idx = MOD_ORDER.indexOf(category);
	if (idx !== -1) return idx;
	// For unknown compounds, sort by first component
	if (category.length >= 2) {
		const first = category.slice(0, 2);
		const firstIdx = MOD_ORDER.indexOf(first);
		if (firstIdx !== -1) return firstIdx + 0.5;
	}
	return MOD_ORDER.length;
}

/**
 * Calculate score multiplier for a set of mods.
 */
export function getScoreMultiplier(mods: string[]): number {
	let multiplier = 1;
	for (const mod of mods) {
		if (MOD_MULTIPLIERS[mod]) {
			multiplier *= MOD_MULTIPLIERS[mod];
		}
	}
	return multiplier;
}

/** Category colors for UI badges. */
export const CATEGORY_COLORS: Record<string, string> = {
	NM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
	HD: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
	HR: 'bg-red-500/20 text-red-400 border-red-500/30',
	DT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
	HDHR: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
	HDDT: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
	FM: 'bg-green-500/20 text-green-400 border-green-500/30',
	EZ: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
	FL: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
	EZFL: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
	RX: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
	RXHR: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
	RXHDHR: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
	TB: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
};
