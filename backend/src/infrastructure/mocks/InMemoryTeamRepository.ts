import type { ITeamRepository } from "../../domain/interfaces/ITeamRepository";
import type { Team } from "../../domain/models/Team";

export class InMemoryTeamRepository implements ITeamRepository {
  private teams: Map<string, Team> = new Map();

  async findById(id: string): Promise<Team | null> {
    return this.teams.get(id) ?? null;
  }

  async findByPlayer(playerId: string): Promise<Team[]> {
    const result: Team[] = [];
    for (const team of this.teams.values()) {
      if (team.players.some((p) => p.id === playerId)) {
        result.push(team);
      }
    }
    return result;
  }

  async save(team: Team): Promise<void> {
    this.teams.set(team.id, team);
  }

  async delete(teamId: string): Promise<void> {
    this.teams.delete(teamId);
  }

  async findAll(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  clear(): void {
    this.teams.clear();
  }
}
