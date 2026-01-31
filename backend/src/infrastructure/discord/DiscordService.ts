import { Client, GatewayIntentBits, EmbedBuilder, type TextChannel } from "discord.js";
import type { INotificationService } from "../../domain/interfaces/INotificationService";
import type { Match } from "../../domain/models/Match";
import type { Team } from "../../domain/models/Team";
import type { MatchScore } from "../../domain/models/Score";
import type { EventBus } from "../../application/events/EventBus";
import { getTeamWins } from "../../domain/models/Match";

export interface DiscordConfig {
  token: string;
  guildId: string;
  announcementChannelId: string;
  matchResultsChannelId: string;
}

export class DiscordService implements INotificationService {
  private client: Client;
  private ready = false;

  constructor(
    private config: DiscordConfig,
    private eventBus?: EventBus
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.setupClient();
  }

  private async setupClient(): Promise<void> {
    this.client.on("ready", () => {
      console.log(`[DiscordService] Logged in as ${this.client.user?.tag}`);
      this.ready = true;
    });

    this.client.on("error", (error) => {
      console.error("[DiscordService] Client error:", error);
    });

    if (this.config.token) {
      try {
        await this.client.login(this.config.token);
      } catch (error) {
        console.error("[DiscordService] Failed to login:", error);
      }
    }
  }

  async announceMatch(match: Match): Promise<void> {
    if (!this.ready) {
      console.log("[DiscordService] Not ready, skipping announcement");
      return;
    }

    const channel = await this.client.channels.fetch(
      this.config.announcementChannelId
    );
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle("New Match Starting!")
      .setDescription(
        `**${match.teams[0].name}** vs **${match.teams[1].name}**`
      )
      .addFields(
        {
          name: match.teams[0].name,
          value: match.teams[0].players.map((p) => p.displayName).join("\n"),
          inline: true,
        },
        {
          name: match.teams[1].name,
          value: match.teams[1].players.map((p) => p.displayName).join("\n"),
          inline: true,
        }
      )
      .setColor(0x00ae86)
      .setTimestamp();

    await (channel as TextChannel).send({ embeds: [embed] });
  }

  async announceMatchResult(match: Match, winner: Team): Promise<void> {
    if (!this.ready) {
      console.log("[DiscordService] Not ready, skipping result announcement");
      return;
    }

    const channel = await this.client.channels.fetch(
      this.config.matchResultsChannelId
    );
    if (!channel || !channel.isTextBased()) return;

    const team1Wins = getTeamWins(match, match.teams[0].id);
    const team2Wins = getTeamWins(match, match.teams[1].id);

    const embed = new EmbedBuilder()
      .setTitle("Match Completed!")
      .setDescription(`**${winner.name}** wins!`)
      .addFields({
        name: "Final Score",
        value: `${match.teams[0].name} **${team1Wins}** - **${team2Wins}** ${match.teams[1].name}`,
      })
      .setColor(winner.id === match.teams[0].id ? 0x3498db : 0xe74c3c)
      .setTimestamp();

    await (channel as TextChannel).send({ embeds: [embed] });
  }

  async notifyPlayer(playerId: string, message: string): Promise<void> {
    if (!this.ready) {
      console.log("[DiscordService] Not ready, skipping player notification");
      return;
    }

    try {
      const user = await this.client.users.fetch(playerId);
      await user.send(message);
    } catch (error) {
      console.error(`[DiscordService] Failed to DM player ${playerId}:`, error);
    }
  }

  async notifyTeam(teamId: string, message: string): Promise<void> {
    // In a real implementation, you'd look up the team's players
    // and notify each one. For now, just log.
    console.log(`[DiscordService] Team ${teamId}: ${message}`);
  }

  async announceMapResult(match: Match, scores: MatchScore): Promise<void> {
    if (!this.ready) {
      console.log("[DiscordService] Not ready, skipping map result");
      return;
    }

    const channel = await this.client.channels.fetch(
      this.config.announcementChannelId
    );
    if (!channel || !channel.isTextBased()) return;

    const winner = match.teams.find((t) => t.id === scores.winner);
    const team1Score = scores.teamScores.get(match.teams[0].id) ?? 0;
    const team2Score = scores.teamScores.get(match.teams[1].id) ?? 0;
    const team1Wins = getTeamWins(match, match.teams[0].id);
    const team2Wins = getTeamWins(match, match.teams[1].id);

    const embed = new EmbedBuilder()
      .setTitle("Map Complete")
      .setDescription(`**${winner?.name}** wins the map!`)
      .addFields(
        {
          name: "Map Score",
          value: `${match.teams[0].name}: ${team1Score.toLocaleString()}\n${match.teams[1].name}: ${team2Score.toLocaleString()}`,
        },
        {
          name: "Match Score",
          value: `${match.teams[0].name} **${team1Wins}** - **${team2Wins}** ${match.teams[1].name}`,
        }
      )
      .setColor(0x9b59b6)
      .setTimestamp();

    await (channel as TextChannel).send({ embeds: [embed] });
  }

  async destroy(): Promise<void> {
    await this.client.destroy();
  }
}
