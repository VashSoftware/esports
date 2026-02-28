import { env } from '$env/dynamic/private';

function sleep(ms: number) {
	return new Promise<void>((r) => setTimeout(r, ms));
}

// ── Singleton bancho.js connection ──────────────────────────────────────

let client: any = null;
let connecting: Promise<void> | null = null;
let reconnecting = false;

async function getClient() {
	if (client?.isConnected?.()) return client;
	if (connecting) {
		await connecting;
		return client!;
	}

	if (!env.OSU_IRC_USERNAME || !env.OSU_IRC_PASSWORD) {
		throw new Error('OSU_IRC_USERNAME and OSU_IRC_PASSWORD must be set in .env');
	}

	const banchoModule = await import('bancho.js');
	const BanchoClient =
		banchoModule.BanchoClient ??
		banchoModule.default?.BanchoClient ??
		banchoModule.default;

	client = new BanchoClient({
		username: env.OSU_IRC_USERNAME,
		password: env.OSU_IRC_PASSWORD,
		// bancho.js has built-in reconnect but we need to handle channel rejoin
		apiKey: undefined
	});

	// ── Lifecycle logging ──
	client.on('connected', () => {
		console.log('[Bancho] Connected as', env.OSU_IRC_USERNAME);
	});

	client.on('disconnected', () => {
		console.warn('[Bancho] Disconnected from IRC');
	});

	client.on('error', (err: any) => {
		console.error('[Bancho] IRC error:', err?.message ?? err);
	});

	// ── Reconnect: re-join all active lobby channels ──
	// bancho.js fires 'connected' again after an auto-reconnect
	let initialConnect = true;
	client.on('connected', async () => {
		if (initialConnect) {
			initialConnect = false;
			return; // skip the first connect, lobbies haven't been created yet
		}

		reconnecting = true;
		console.log('[Bancho] Reconnected — re-joining', lobbies.size, 'active lobby channels');

		for (const [matchId, lobby] of lobbies.entries()) {
			try {
				await lobby._rejoinChannel(client);
				console.log(`[Bancho] Re-joined channel for match ${matchId}`);
			} catch (err: any) {
				console.error(`[Bancho] Failed to re-join channel for match ${matchId}:`, err.message);
				// Channel may have been closed by Bancho while we were offline
				// Mark it as dead so orchestrator knows
				lobby._dead = true;
			}
		}
		reconnecting = false;
	});

	connecting = client.connect().then(() => {
		connecting = null;
	});

	await connecting;
	return client;
}

/**
 * Check if the IRC client is currently connected.
 */
export function isBanchoConnected(): boolean {
	return client?.isConnected?.() ?? false;
}

/**
 * Check if we're in the middle of a reconnect (channels may be temporarily unavailable).
 */
export function isBanchoReconnecting(): boolean {
	return reconnecting;
}

// ── Types ───────────────────────────────────────────────────────────────

export interface PlayerScore {
	username: string;
	score: number;
	passed: boolean;
}

// ── Tournament Lobby ────────────────────────────────────────────────────

export class TournamentLobby {
	private channel: any = null;
	private channelName = '';
	public osuMatchId = 0;

	/** Set to true if the channel couldn't be re-joined after reconnect */
	public _dead = false;

	// The message handler function (stored so we can re-attach after reconnect)
	private messageHandler: ((msg: any) => void) | null = null;

	// Score collection
	private collectedScores: PlayerScore[] = [];
	private matchFinishedResolve: ((scores: PlayerScore[]) => void) | null = null;

	// Ready tracking
	private allReadyResolve: (() => void) | null = null;

	// Event callbacks (set by orchestrator)
	public onRollResult: ((username: string, value: number) => void) | null = null;
	public onPickCommand: ((username: string, slotLabel: string) => void) | null = null;

	/**
	 * Create a new multiplayer lobby via !mp make.
	 */
	async create(name: string): Promise<{ matchId: number; channel: string }> {
		const c = await getClient();

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Lobby creation timed out')),
				15000
			);

			const banchoBot = c.getUser('BanchoBot');

			const onPM = (msg: any) => {
				const text: string = msg.message ?? String(msg);
				const m = text.match(/https:\/\/osu\.ppy\.sh\/mp\/(\d+)/);
				if (m) {
					clearTimeout(timeout);
					banchoBot.removeListener('message', onPM);

					this.osuMatchId = parseInt(m[1]);
					this.channelName = `#mp_${this.osuMatchId}`;

					this.joinChannel(c).then(() =>
						resolve({ matchId: this.osuMatchId, channel: this.channelName })
					);
				}
			};

			banchoBot.on('message', onPM);
			banchoBot.sendMessage(`!mp make ${name}`);
		});
	}

	private async joinChannel(c: any) {
		this.channel = c.getChannel(this.channelName);
		await this.channel.join();
		this.attachMessageHandler();
	}

	/**
	 * Re-join the channel after a reconnect.
	 * Called internally by the reconnect handler.
	 */
	async _rejoinChannel(c: any) {
		if (!this.channelName) return;

		// Remove old listener if any
		if (this.channel && this.messageHandler) {
			try {
				this.channel.removeListener('message', this.messageHandler);
			} catch {
				/* old channel may be completely dead */
			}
		}

		this.channel = c.getChannel(this.channelName);
		await this.channel.join();
		this.attachMessageHandler();
		this._dead = false;
	}

	private attachMessageHandler() {
		if (!this.channel) return;

		// Remove previous handler if exists (prevent duplicates)
		if (this.messageHandler) {
			try {
				this.channel.removeListener('message', this.messageHandler);
			} catch {
				/* ignore */
			}
		}

		this.messageHandler = (msg: any) => {
			const text: string = msg.message ?? String(msg);
			const sender: string = msg.user?.ircUsername ?? '';

			if (sender === 'BanchoBot') {
				this.parseBanchoMessage(text);
			} else if (sender) {
				this.parsePlayerMessage(sender, text);
			}
		};

		this.channel.on('message', this.messageHandler);
	}

	// ── Message Parsing ─────────────────────────────────────────────────

	private parseBanchoMessage(text: string) {
		// Player score: "<user> finished playing (Score: 1,234,567, ... PASSED)"
		const scoreMatch = text.match(
			/^(.+?) finished playing \(Score: ([\d,]+).*?(PASSED|FAILED)\)/i
		);
		if (scoreMatch) {
			this.collectedScores.push({
				username: scoreMatch[1].trim(),
				score: parseInt(scoreMatch[2].replace(/,/g, '')),
				passed: scoreMatch[3] === 'PASSED'
			});
			console.log(`[Bancho] Score: ${scoreMatch[1].trim()} = ${scoreMatch[2]}`);
			return;
		}

		// Game finished
		if (text.includes('The match has finished!')) {
			console.log('[Bancho] Game finished. Scores:', this.collectedScores);
			if (this.matchFinishedResolve) {
				this.matchFinishedResolve([...this.collectedScores]);
				this.matchFinishedResolve = null;
			}
			this.collectedScores = [];
			return;
		}

		// Roll result: "Stan rolls 42 point(s)"
		const rollMatch = text.match(/^(.+?) rolls (\d+) point\(s\)/);
		if (rollMatch) {
			const username = rollMatch[1].trim();
			const value = parseInt(rollMatch[2]);
			console.log(`[Bancho] Roll: ${username} = ${value}`);
			if (this.onRollResult) {
				this.onRollResult(username, value);
			}
			return;
		}

		// All players ready
		if (text.includes('All players are ready')) {
			console.log('[Bancho] All players ready');
			if (this.allReadyResolve) {
				this.allReadyResolve();
				this.allReadyResolve = null;
			}
			return;
		}

		// Room closed (by Bancho or timeout)
		if (text.includes('Closed the match')) {
			console.log(`[Bancho] Room ${this.channelName} was closed`);
			this._dead = true;
			return;
		}
	}

	private parsePlayerMessage(sender: string, text: string) {
		// !pick NM1, !pick HD2, !pick TB, etc.
		const pickMatch = text.match(/^!pick\s+([A-Z]{2})(\d*)/i);
		if (pickMatch) {
			const category = pickMatch[1].toUpperCase();
			const num = pickMatch[2] ? parseInt(pickMatch[2]) : 1;
			const label = `${category}${num}`;
			console.log(`[Bancho] Pick command from ${sender}: ${label}`);
			if (this.onPickCommand) {
				this.onPickCommand(sender, label);
			}
			return;
		}
	}

	// ── IRC Commands ────────────────────────────────────────────────────

	private ensureAlive() {
		if (this._dead) {
			throw new Error(`Lobby ${this.channelName} is dead (closed or lost after reconnect)`);
		}
		if (!this.channel) {
			throw new Error('Lobby not created');
		}
	}

	async send(cmd: string) {
		this.ensureAlive();

		// If we're in the middle of reconnecting, wait a bit
		if (reconnecting) {
			console.log(`[Bancho] Waiting for reconnect before sending to ${this.channelName}...`);
			const start = Date.now();
			while (reconnecting && Date.now() - start < 10_000) {
				await sleep(500);
			}
			if (reconnecting) {
				throw new Error('Timed out waiting for IRC reconnect');
			}
		}

		console.log(`[Bancho] ${this.channelName} > ${cmd}`);
		await this.channel.sendMessage(cmd);
	}

	async invite(username: string) {
		await this.send(`!mp invite ${username.replace(/ /g, '_')}`);
	}

	async setProperties(teamMode: number, scoreMode: number, size: number) {
		await this.send(`!mp set ${teamMode} ${scoreMode} ${size}`);
	}

	async setMap(beatmapId: string | number, playmode = 0) {
		await this.send(`!mp map ${beatmapId} ${playmode}`);
	}

	async setMods(mods: string[]) {
		const filtered = mods.filter((m) => !['NM', 'TB', 'None', 'NF'].includes(m));
		if (mods.includes('FM') || mods.includes('Freemod')) {
			await this.send('!mp mods Freemod NF');
		} else if (filtered.length > 0) {
			await this.send(`!mp mods NF ${filtered.join(' ')}`);
		} else {
			await this.send('!mp mods NF');
		}
	}

	async startGame(delaySec = 5) {
		await this.send(`!mp start ${delaySec}`);
	}

	async close() {
		try {
			if (this._dead) {
				console.log(`[Bancho] Lobby ${this.channelName} already dead, skipping close`);
				return;
			}
			await this.send('!mp close');
		} catch (err: any) {
			console.warn(`[Bancho] Failed to close ${this.channelName}:`, err.message);
		}
	}

	async chat(message: string) {
		await this.send(message);
	}

	/**
	 * Check if this lobby is still usable.
	 */
	get isAlive(): boolean {
		return !this._dead && this.channel != null;
	}

	// ── Async Waiters ───────────────────────────────────────────────────

	/**
	 * Wait for all players to click "Ready" in osu! client.
	 * BanchoBot sends "All players are ready" when they do.
	 */
	waitForReady(timeoutMs = 180_000): Promise<void> {
		return new Promise((resolve, reject) => {
			const t = setTimeout(() => {
				this.allReadyResolve = null;
				reject(new Error('Timed out waiting for players to ready'));
			}, timeoutMs);
			this.allReadyResolve = () => {
				clearTimeout(t);
				resolve();
			};
		});
	}

	/**
	 * Wait for "The match has finished!" and return all player scores.
	 */
	waitForScores(timeoutMs = 600_000): Promise<PlayerScore[]> {
		this.collectedScores = [];
		return new Promise((resolve, reject) => {
			const t = setTimeout(() => {
				this.matchFinishedResolve = null;
				reject(new Error('Timed out waiting for match scores'));
			}, timeoutMs);
			this.matchFinishedResolve = (scores) => {
				clearTimeout(t);
				resolve(scores);
			};
		});
	}
}

// ── Active lobby registry (in-memory, per server instance) ──────────────

const lobbies = new Map<string, TournamentLobby>();

export function getLobby(matchId: string) {
	const lobby = lobbies.get(matchId);
	if (lobby?._dead) {
		console.warn(`[Bancho] Lobby for match ${matchId} is dead, removing from registry`);
		lobbies.delete(matchId);
		return undefined;
	}
	return lobby;
}

export function setLobby(matchId: string, lobby: TournamentLobby) {
	lobbies.set(matchId, lobby);
}

export function removeLobby(matchId: string) {
	lobbies.delete(matchId);
}

/**
 * Get count of active (non-dead) lobbies.
 * Useful for checking against the 4-lobby limit for non-bot accounts.
 */
export function getActiveLobbyCount(): number {
	let count = 0;
	for (const [id, lobby] of lobbies.entries()) {
		if (lobby._dead) {
			lobbies.delete(id);
		} else {
			count++;
		}
	}
	return count;
}

/**
 * Close all active lobbies. Useful for graceful shutdown.
 */
export async function closeAllLobbies() {
	console.log(`[Bancho] Closing all ${lobbies.size} active lobbies...`);
	for (const [matchId, lobby] of lobbies.entries()) {
		try {
			await lobby.close();
		} catch (err: any) {
			console.warn(`[Bancho] Failed to close lobby ${matchId}:`, err.message);
		}
		lobbies.delete(matchId);
	}
}
