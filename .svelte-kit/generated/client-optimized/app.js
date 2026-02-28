export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14')
];

export const server_loads = [2];

export const dictionary = {
		"/(app)": [~3,[2]],
		"/(app)/admin": [~4,[2]],
		"/demo": [11],
		"/demo/better-auth": [~12],
		"/demo/better-auth/login": [~13],
		"/login": [~14],
		"/(app)/mappools": [~5,[2]],
		"/(app)/mappools/[id]": [~6,[2]],
		"/(app)/matches": [~7,[2]],
		"/(app)/matches/[id]": [~8,[2]],
		"/(app)/settings": [~9,[2]],
		"/(app)/teams": [~10,[2]]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));
export const encoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.encode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';