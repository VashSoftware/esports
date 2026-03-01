import { env } from '$env/dynamic/private';
import { Client, GatewayIntentBits, EmbedBuilder, type TextChannel } from 'discord.js';

let client: Client | null = null;
let ready: Promise<void> | null = null;

function getDiscordClient(): Promise<Client> {
	if (!env.DISCORD_BOT_TOKEN) {
		throw new Error('DISCORD_BOT_TOKEN is not set');
	}

	if (client && ready) {
		return ready.then(() => client!);
	}

	client = new Client({ intents: [GatewayIntentBits.Guilds] });

	ready = new Promise<void>((resolve, reject) => {
		client!.once('ready', () => resolve());
		client!.once('error', reject);
		client!.login(env.DISCORD_BOT_TOKEN).catch(reject);
	});

	return ready.then(() => client!);
}

async function getChannel(channelId: string): Promise<TextChannel> {
	const discord = await getDiscordClient();
	const channel = await discord.channels.fetch(channelId);
	if (!channel || !channel.isTextBased()) {
		throw new Error(`Discord channel ${channelId} not found or is not a text channel`);
	}
	return channel as TextChannel;
}

export async function notifyMatchCreated(match: {
	id: string;
	name: string | null;
	participants: { team: { name: string } }[];
	config: any;
}) {
	if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_MATCH_CHANNEL_ID) return;

	try {
		const channel = await getChannel(env.DISCORD_MATCH_CHANNEL_ID);
		const teams = match.participants.map((p) => p.team.name).join(' vs ');
		const config = match.config as { bestOf?: number };

		const embed = new EmbedBuilder()
			.setTitle('Match Created')
			.setColor(0x5865f2)
			.addFields(
				{ name: 'Match', value: match.name ?? match.id, inline: true },
				{ name: 'Teams', value: teams || 'TBD', inline: true },
				{ name: 'Format', value: config.bestOf ? `BO${config.bestOf}` : 'Unknown', inline: true }
			)
			.setTimestamp();

		await channel.send({ embeds: [embed] });
	} catch (err: any) {
		console.error('[Discord] Failed to send match created notification:', err.message);
	}
}

export async function notifyMatchFinished(match: {
	id: string;
	name: string | null;
	participants: { team: { name: string }; score: number; teamId: string }[];
	winnerId: string | null;
}) {
	if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_MATCH_CHANNEL_ID) return;

	try {
		const channel = await getChannel(env.DISCORD_MATCH_CHANNEL_ID);
		const winner = match.participants.find((p) => p.teamId === match.winnerId);
		const scoreStr = match.participants.map((p) => `${p.team.name}: ${p.score}`).join(' — ');

		const embed = new EmbedBuilder()
			.setTitle('Match Finished')
			.setColor(0x57f287)
			.addFields(
				{ name: 'Match', value: match.name ?? match.id, inline: true },
				{ name: 'Winner', value: winner?.team.name ?? 'Unknown', inline: true },
				{ name: 'Score', value: scoreStr, inline: false }
			)
			.setTimestamp();

		await channel.send({ embeds: [embed] });
	} catch (err: any) {
		console.error('[Discord] Failed to send match finished notification:', err.message);
	}
}
