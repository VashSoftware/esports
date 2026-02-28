const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["android-chrome-192x192.png","android-chrome-512x512.png","apple-touch-icon.png","favicon-16x16.png","favicon-32x32.png","favicon.ico","robots.txt","site.webmanifest"]),
	mimeTypes: {".png":"image/png",".txt":"text/plain",".webmanifest":"application/manifest+json"},
	_: {
		client: {start:"_app/immutable/entry/start.Df1GVxyt.js",app:"_app/immutable/entry/app.DL20j9gb.js",imports:["_app/immutable/entry/start.Df1GVxyt.js","_app/immutable/chunks/BkIq08el.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/DAtZQVjv.js","_app/immutable/entry/app.DL20j9gb.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/BQKoxf2Q.js","_app/immutable/chunks/kALFGdUG.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BWa0n_wG.js')),
			__memo(() => import('./chunks/1-dOPiiXyK.js')),
			__memo(() => import('./chunks/2-BiADR-CH.js')),
			__memo(() => import('./chunks/3-BPD8edaL.js')),
			__memo(() => import('./chunks/4-CQssXWUd.js')),
			__memo(() => import('./chunks/5-Dk6CJpPs.js')),
			__memo(() => import('./chunks/6-CW5Wcf44.js')),
			__memo(() => import('./chunks/7-DLfylrWu.js')),
			__memo(() => import('./chunks/8-Cct4CuMl.js')),
			__memo(() => import('./chunks/9-DztSgTEC.js')),
			__memo(() => import('./chunks/10-BGqcbnOp.js')),
			__memo(() => import('./chunks/11-DB2oh-6z.js')),
			__memo(() => import('./chunks/12-3YbOOB0i.js')),
			__memo(() => import('./chunks/13-CyOLqwjC.js')),
			__memo(() => import('./chunks/14-BMPOArNY.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/(app)",
				pattern: /^\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/(app)/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/api/health",
				pattern: /^\/api\/health\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Cp6RS2Xl.js'))
			},
			{
				id: "/api/mappools",
				pattern: /^\/api\/mappools\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CknVZIWY.js'))
			},
			{
				id: "/api/mappools/[id]",
				pattern: /^\/api\/mappools\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CYhG9EuN.js'))
			},
			{
				id: "/api/mappools/[id]/slots",
				pattern: /^\/api\/mappools\/([^/]+?)\/slots\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Chr3sGwY.js'))
			},
			{
				id: "/api/mappools/[id]/slots/[slotId]",
				pattern: /^\/api\/mappools\/([^/]+?)\/slots\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"slotId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-wwm7Wb6_.js'))
			},
			{
				id: "/api/matches",
				pattern: /^\/api\/matches\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BEoJR5yQ.js'))
			},
			{
				id: "/api/matches/[id]",
				pattern: /^\/api\/matches\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-KSG0NbEr.js'))
			},
			{
				id: "/api/matches/[id]/lobby",
				pattern: /^\/api\/matches\/([^/]+?)\/lobby\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CgeuSTTA.js'))
			},
			{
				id: "/api/matches/[id]/pick",
				pattern: /^\/api\/matches\/([^/]+?)\/pick\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BKWDSPwT.js'))
			},
			{
				id: "/api/matches/[id]/rolling",
				pattern: /^\/api\/matches\/([^/]+?)\/rolling\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-M_0oeLSe.js'))
			},
			{
				id: "/api/matches/[id]/roll",
				pattern: /^\/api\/matches\/([^/]+?)\/roll\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-kIjYmsyw.js'))
			},
			{
				id: "/api/matches/[id]/score",
				pattern: /^\/api\/matches\/([^/]+?)\/score\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C5pGCspz.js'))
			},
			{
				id: "/api/osu/beatmap/[id]",
				pattern: /^\/api\/osu\/beatmap\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DLwKwHxp.js'))
			},
			{
				id: "/api/queue",
				pattern: /^\/api\/queue\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DRKvzZ51.js'))
			},
			{
				id: "/demo",
				pattern: /^\/demo\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/demo/better-auth",
				pattern: /^\/demo\/better-auth\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/demo/better-auth/login",
				pattern: /^\/demo\/better-auth\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/(app)/mappools",
				pattern: /^\/mappools\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/(app)/mappools/[id]",
				pattern: /^\/mappools\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/(app)/matches",
				pattern: /^\/matches\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/(app)/matches/[id]",
				pattern: /^\/matches\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/(app)/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/(app)/teams",
				pattern: /^\/teams\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 10 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
