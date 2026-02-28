import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { genericOAuth } from 'better-auth/plugins';
import { team, teamMember } from './db/schema';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					const [personalTeam] = await db
						.insert(team)
						.values({
							name: user.name,
							isPersonal: true,
							ownerId: user.id,
							avatarUrl: user.image
						})
						.returning();

					await db.insert(teamMember).values({
						teamId: personalTeam.id,
						userId: user.id,
						role: 'owner'
					});
				}
			}
		}
	},
	plugins: [
		genericOAuth({
			config: [
				{
					providerId: 'osu',
					clientId: env.OSU_CLIENT_ID!,
					clientSecret: env.OSU_CLIENT_SECRET!,
					authorizationUrl: 'https://osu.ppy.sh/oauth/authorize',
					tokenUrl: 'https://osu.ppy.sh/oauth/token',
					userInfoUrl: 'https://osu.ppy.sh/api/v2/me',
					scopes: ['identify', 'public'],
					pkce: false,
					authentication: 'post',
					redirectURI: 'http://localhost:5173/api/auth/oauth2/callback/osu',
					getToken: async ({ code, redirectURI }) => {
						const res = await fetch('https://osu.ppy.sh/oauth/token', {
							method: 'POST',
							headers: {
								Accept: 'application/json',
								'Content-Type': 'application/x-www-form-urlencoded'
							},
							body: new URLSearchParams({
								client_id: env.OSU_CLIENT_ID!,
								client_secret: env.OSU_CLIENT_SECRET!,
								code,
								grant_type: 'authorization_code',
								redirect_uri: redirectURI
							})
						});
						const data = await res.json();
						if (!res.ok) {
							console.error('osu! token exchange failed:', data);
							throw new Error('Token exchange failed');
						}
						return {
							accessToken: data.access_token,
							refreshToken: data.refresh_token,
							accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
							scopes: ['identify', 'public'],
							raw: data
						};
					},
					mapProfileToUser(profile) {
						return {
							name: profile.username,
							image: profile.avatar_url,
							email: `${profile.id}@osu.local`
						};
					}
				}
			]
		}),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
