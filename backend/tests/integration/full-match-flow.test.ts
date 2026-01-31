import { test, expect, beforeEach } from "bun:test";
import { TestHarness } from "../../src/testing/TestHarness";
import { MatchState } from "../../src/domain/models/MatchState";

let harness: TestHarness;

beforeEach(() => {
  harness = new TestHarness();
});

test("complete match flow from queue to completion", async () => {
  const players1 = harness.createPlayers(1, 1000);
  const players2 = harness.createPlayers(1, 1020);

  const team1 = harness.createTeam(players1, { name: "Team Alpha" });
  const team2 = harness.createTeam(players2, { name: "Team Beta" });

  await harness.queueService.joinQueue(team1, "ranked");
  await harness.queueService.joinQueue(team2, "ranked");

  const match = await harness.queueService.findMatch("ranked");

  expect(match).not.toBeNull();
  expect(match!.teams.length).toBe(2);
  expect(match!.lobbyId).toBeDefined();

  await harness.simulateAllPlayersJoin(match!);

  let updatedMatch = await harness.matchRepo.findById(match!.id);
  expect(updatedMatch!.state).toBe(MatchState.ROLLING);

  const rolls = new Map<string, number>();
  rolls.set(team1.id, 75);
  rolls.set(team2.id, 50);
  await harness.simulateRolls(match!, rolls);

  updatedMatch = await harness.matchRepo.findById(match!.id);
  expect(updatedMatch!.state).toBe(MatchState.PICKING);

  const events = harness.getEventsByType("match.created");
  expect(events.length).toBe(1);

  const stateChanges = harness.getEventsByType("match.state_changed");
  expect(stateChanges.length).toBeGreaterThan(0);
});

test("match creates lobby on start", async () => {
  const players1 = harness.createPlayers(1);
  const players2 = harness.createPlayers(1);

  const team1 = harness.createTeam(players1, { name: "Team 1" });
  const team2 = harness.createTeam(players2, { name: "Team 2" });

  await harness.queueService.joinQueue(team1, "ranked");
  await harness.queueService.joinQueue(team2, "ranked");

  const match = await harness.queueService.findMatch("ranked");

  expect(match!.lobbyId).toBeDefined();
  expect(harness.mockGameService.lobbies.has(match!.lobbyId!)).toBe(true);
});

test("notifications are sent when match is created", async () => {
  const players1 = harness.createPlayers(1);
  const players2 = harness.createPlayers(1);

  const team1 = harness.createTeam(players1, { name: "Team 1" });
  const team2 = harness.createTeam(players2, { name: "Team 2" });

  await harness.queueService.joinQueue(team1, "ranked");
  await harness.queueService.joinQueue(team2, "ranked");

  await harness.queueService.findMatch("ranked");

  expect(harness.mockNotificationService.announcements.length).toBe(1);
});

test("match state transitions correctly through rolling phase", async () => {
  const players1 = harness.createPlayers(1);
  const players2 = harness.createPlayers(1);

  const team1 = harness.createTeam(players1, { name: "Team 1" });
  const team2 = harness.createTeam(players2, { name: "Team 2" });

  await harness.queueService.joinQueue(team1, "ranked");
  await harness.queueService.joinQueue(team2, "ranked");

  const match = await harness.queueService.findMatch("ranked");
  expect(match!.state).toBe(MatchState.WAITING_PLAYERS);

  await harness.simulateAllPlayersJoin(match!);

  let updatedMatch = await harness.matchRepo.findById(match!.id);
  expect(updatedMatch!.state).toBe(MatchState.ROLLING);

  const rolls = new Map<string, number>();
  rolls.set(team1.id, 75);
  rolls.set(team2.id, 50);
  await harness.simulateRolls(match!, rolls);

  updatedMatch = await harness.matchRepo.findById(match!.id);
  expect(updatedMatch!.state).toBe(MatchState.PICKING);
  // In head-to-head protocol, roll winner picks first
  expect(updatedMatch!.currentPicker).toBe(team1.id);
});

test("queue status is empty after match found", async () => {
  const players1 = harness.createPlayers(1);
  const players2 = harness.createPlayers(1);

  const team1 = harness.createTeam(players1, { name: "Team 1" });
  const team2 = harness.createTeam(players2, { name: "Team 2" });

  await harness.queueService.joinQueue(team1, "ranked");
  await harness.queueService.joinQueue(team2, "ranked");

  await harness.queueService.findMatch("ranked");

  const status = await harness.queueService.getQueueStatus("ranked");
  expect(status.count).toBe(0);
});
