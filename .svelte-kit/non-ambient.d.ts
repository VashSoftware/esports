
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/(app)" | "/" | "/(app)/admin" | "/api" | "/api/health" | "/api/mappools" | "/api/mappools/[id]" | "/api/mappools/[id]/slots" | "/api/mappools/[id]/slots/[slotId]" | "/api/matches" | "/api/matches/[id]" | "/api/matches/[id]/lobby" | "/api/matches/[id]/pick" | "/api/matches/[id]/rolling" | "/api/matches/[id]/roll" | "/api/matches/[id]/score" | "/api/osu" | "/api/osu/beatmap" | "/api/osu/beatmap/[id]" | "/api/queue" | "/demo" | "/demo/better-auth" | "/demo/better-auth/login" | "/login" | "/(app)/mappools" | "/(app)/mappools/[id]" | "/(app)/matches" | "/(app)/matches/[id]" | "/(app)/settings" | "/(app)/teams";
		RouteParams(): {
			"/api/mappools/[id]": { id: string };
			"/api/mappools/[id]/slots": { id: string };
			"/api/mappools/[id]/slots/[slotId]": { id: string; slotId: string };
			"/api/matches/[id]": { id: string };
			"/api/matches/[id]/lobby": { id: string };
			"/api/matches/[id]/pick": { id: string };
			"/api/matches/[id]/rolling": { id: string };
			"/api/matches/[id]/roll": { id: string };
			"/api/matches/[id]/score": { id: string };
			"/api/osu/beatmap/[id]": { id: string };
			"/(app)/mappools/[id]": { id: string };
			"/(app)/matches/[id]": { id: string }
		};
		LayoutParams(): {
			"/(app)": { id?: string };
			"/": { id?: string; slotId?: string };
			"/(app)/admin": Record<string, never>;
			"/api": { id?: string; slotId?: string };
			"/api/health": Record<string, never>;
			"/api/mappools": { id?: string; slotId?: string };
			"/api/mappools/[id]": { id: string; slotId?: string };
			"/api/mappools/[id]/slots": { id: string; slotId?: string };
			"/api/mappools/[id]/slots/[slotId]": { id: string; slotId: string };
			"/api/matches": { id?: string };
			"/api/matches/[id]": { id: string };
			"/api/matches/[id]/lobby": { id: string };
			"/api/matches/[id]/pick": { id: string };
			"/api/matches/[id]/rolling": { id: string };
			"/api/matches/[id]/roll": { id: string };
			"/api/matches/[id]/score": { id: string };
			"/api/osu": { id?: string };
			"/api/osu/beatmap": { id?: string };
			"/api/osu/beatmap/[id]": { id: string };
			"/api/queue": Record<string, never>;
			"/demo": Record<string, never>;
			"/demo/better-auth": Record<string, never>;
			"/demo/better-auth/login": Record<string, never>;
			"/login": Record<string, never>;
			"/(app)/mappools": { id?: string };
			"/(app)/mappools/[id]": { id: string };
			"/(app)/matches": { id?: string };
			"/(app)/matches/[id]": { id: string };
			"/(app)/settings": Record<string, never>;
			"/(app)/teams": Record<string, never>
		};
		Pathname(): "/" | "/admin" | "/api/health" | "/api/mappools" | `/api/mappools/${string}` & {} | `/api/mappools/${string}/slots` & {} | `/api/mappools/${string}/slots/${string}` & {} | "/api/matches" | `/api/matches/${string}` & {} | `/api/matches/${string}/lobby` & {} | `/api/matches/${string}/pick` & {} | `/api/matches/${string}/rolling` & {} | `/api/matches/${string}/roll` & {} | `/api/matches/${string}/score` & {} | `/api/osu/beatmap/${string}` & {} | "/api/queue" | "/demo" | "/demo/better-auth" | "/demo/better-auth/login" | "/login" | "/mappools" | `/mappools/${string}` & {} | "/matches" | `/matches/${string}` & {} | "/settings" | "/teams";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/android-chrome-192x192.png" | "/android-chrome-512x512.png" | "/apple-touch-icon.png" | "/favicon-16x16.png" | "/favicon-32x32.png" | "/favicon.ico" | "/robots.txt" | "/site.webmanifest" | string & {};
	}
}