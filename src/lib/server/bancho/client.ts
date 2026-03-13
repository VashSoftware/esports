import { env } from '$env/dynamic/private';

function sleep(ms: number) {
	return new Promise<void>((r) => setTimeout(r, ms));
}

// ── Singleton bancho.js connection ──────────────────────────────────────

let client: any = null;
let connecting: Promise<void> | null = null;
let reconnecting = false;
let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

/** Global DM handler — set by dm-handler.ts on startup */
let dmHandler: ((username: string, message: string) => void) | null = null;

export function setDMHandler(handler: (username: string, message: string) => void) {
	dmHandler = handler;
}

export async function getClient() {
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
		banchoModule.BanchoClient ?? banchoModule.default?.BanchoClient ?? banchoModule.default;

	client = new BanchoClient({
		username: env.OSU_IRC_USERNAME,
		password: env.OSU_IRC_PASSWORD
	});

	// ── Lifecycle logging ──
	client.on('disconnected', () => {
		console.warn('[Bancho] Disconnected from IRC');
		stopKeepalive();
	});

	client.on('error', (err: any) => {
		console.error('[Bancho] IRC error:', err?.message ?? err);
	});

	// ── DM listener: route private messages to dmHandler ──
	client.on('PM', (msg: any) => {
		const sender: string = msg.user?.ircUsername ?? '';
		const text: string = msg.message ?? String(msg);
		if (sender && sender !== 'BanchoBot' && dmHandler) {
			dmHandler(sender, text);
		}
	});

	// ── Reconnect: re-join all active lobby channels ──
	let initialConnect = true;
	client.on('connected', async () => {
		if (initialConnect) {
			initialConnect = false;
			console.log('[Bancho] Connected as', env.OSU_IRC_USERNAME);
			startKeepalive();
			return;
		}

		reconnecting = true;
		console.log('[Bancho] Reconnected — re-joining', lobbies.size, 'active lobby channels');
		startKeepalive();

		for (const [matchId, lobby] of lobbies.entries()) {
			try {
				await lobby._rejoinChannel(client);
				console.log(`[Bancho] Re-joined channel for match ${matchId}`);
			} catch (err: any) {
				console.error(`[Bancho] Failed to re-join channel for match ${matchId}:`, err.message);
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
 * Send a DM to a user via IRC.
 */
export async function sendDM(username: string, message: string) {
	const c = await getClient();
	const user = c.getUser(username.replace(/ /g, '_'));
	await user.sendMessage(message);
}

// ── Keepalive: prevent IRC timeout ──────────────────────────────────────

function startKeepalive() {
	stopKeepalive();
	keepaliveTimer = setInterval(async () => {
		try {
			if (client?.isConnected?.()) {
				client.send?.(`PING :keepalive-${Date.now()}`);
			}
		} catch {
			// If connection is dead, the reconnect handler will fire
		}
	}, 30_000);
}

function stopKeepalive() {
	if (keepaliveTimer) {
		clearInterval(keepaliveTimer);
		keepaliveTimer = null;
	}
}

export function isBanchoConnected(): boolean {
	return client?.isConnected?.() ?? false;
}

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

	// Stored so we can re-attach after reconnect
	private messageHandler: ((msg: any) => void) | null = null;

	// Score collection
	private collectedScores: PlayerScore[] = [];
	private matchFinishedResolve: ((scores: PlayerScore[]) => void) | null = null;

	// Ready tracking
	private allReadyResolve: (() => void) | null = null;

	// Lobby status tracking
	public inLobby: Set<string> = new Set();
	public readyPlayers: Set<string> = new Set();
	public gameInProgress = false;

	// Event callbacks (set by orchestrator)
	public onRollResult: ((username: string, value: number) => void) | null = null;
	public onPickCommand: ((username: string, slotLabel: string) => void) | null = null;
	/** Called when BanchoBot reports a player joined the lobby slot */
	public onPlayerJoined: ((username: string) => void) | null = null;

	/**
	 * Create a new multiplayer lobby via !mp make.
	 */
	async create(name: string): Promise<{ matchId: number; channel: string }> {
		const c = await getClient();

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('Lobby creation timed out')), 15000);

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

	async _rejoinChannel(c: any) {
		if (!this.channelName) return;

		if (this.channel && this.messageHandler) {
			try {
				this.channel.removeListener('message', this.messageHandler);
			} catch {
				/* old channel may be dead */
			}
		}

		this.channel = c.getChannel(this.channelName);
		await this.channel.join();
		this.attachMessageHandler();
		this._dead = false;
	}

	private attachMessageHandler() {
		if (!this.channel) return;

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
		const scoreMatch = text.match(/^(.+?) finished playing \(Score: ([\d,]+).*?(PASSED|FAILED)\)/i);
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
			this.gameInProgress = false;
			this.readyPlayers.clear();
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

		// Player joined: "Stan joined in slot 1."
		const joinMatch = text.match(/^(.+?) joined in slot \d+/);
		if (joinMatch) {
			const username = joinMatch[1].trim();
			console.log(`[Bancho] Player joined: ${username}`);
			this.inLobby.add(username);
			this.readyPlayers.delete(username);
			if (this.onPlayerJoined) {
				this.onPlayerJoined(username);
			}
			return;
		}

		// Player left: "Stan left the game."
		const leftMatch = text.match(/^(.+?) left the game\./);
		if (leftMatch) {
			const username = leftMatch[1].trim();
			console.log(`[Bancho] Player left: ${username}`);
			this.inLobby.delete(username);
			this.readyPlayers.delete(username);
			return;
		}

		// Player ready: "Stan is Ready."
		const readyMatch = text.match(/^(.+?) is Ready\.?$/i);
		if (readyMatch) {
			this.readyPlayers.add(readyMatch[1].trim());
			return;
		}

		// Player not ready: "Stan is not Ready."
		const notReadyMatch = text.match(/^(.+?) is not Ready\.?$/i);
		if (notReadyMatch) {
			this.readyPlayers.delete(notReadyMatch[1].trim());
			return;
		}

		// All players ready
		if (text.includes('All players are ready')) {
			console.log('[Bancho] All players ready');
			for (const u of this.inLobby) this.readyPlayers.add(u);
			if (this.allReadyResolve) {
				this.allReadyResolve();
				this.allReadyResolve = null;
			}
			return;
		}

		// Game started
		if (text.includes('The match has started!')) {
			this.gameInProgress = true;
			this.readyPlayers.clear();
			return;
		}

		// Room closed
		if (text.includes('Closed the match')) {
			console.log(`[Bancho] Room ${this.channelName} was closed`);
			this._dead = true;
			return;
		}
	}

	private parsePlayerMessage(sender: string, text: string) {
		// !pick NM1, !pick HD2, etc.
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

	get isAlive(): boolean {
		return !this._dead && this.channel != null;
	}

	// ── Async Waiters ───────────────────────────────────────────────────

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

// ── Active lobby registry ───────────────────────────────────────────────

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

export function getLobbyStatus(matchId: string): {
	inLobby: string[];
	readyPlayers: string[];
	gameInProgress: boolean;
} | null {
	const lobby = lobbies.get(matchId);
	if (!lobby || lobby._dead) return null;
	return {
		inLobby: [...lobby.inLobby],
		readyPlayers: [...lobby.readyPlayers],
		gameInProgress: lobby.gameInProgress
	};
}

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
