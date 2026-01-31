import type { Team } from "../models/Team";

export interface ITeamRepository {
  findById(id: string): Promise<Team | null>;
  findByPlayer(playerId: string): Promise<Team[]>;
  save(team: Team): Promise<void>;
  delete(teamId: string): Promise<void>;
  findAll(): Promise<Team[]>;
}
