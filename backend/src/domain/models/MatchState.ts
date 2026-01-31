export enum MatchState {
  CREATED = "created",
  LOBBY_CREATED = "lobby_created",
  WAITING_PLAYERS = "waiting_players",
  ROLLING = "rolling",
  PICKING = "picking",
  BANNING = "banning",
  PLAYING = "playing",
  MAP_COMPLETE = "map_complete",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export function isTerminalState(state: MatchState): boolean {
  return state === MatchState.COMPLETED || state === MatchState.CANCELLED;
}

export function isActiveState(state: MatchState): boolean {
  return !isTerminalState(state);
}
