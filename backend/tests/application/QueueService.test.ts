import { test, expect, beforeEach } from "bun:test";
import { TestHarness } from "../../src/testing/TestHarness";

let harness: TestHarness;

beforeEach(() => {
  harness = new TestHarness();
});

test("team can join queue", async () => {
  const players = harness.createPlayers(1);
  const team = harness.createTeam(players, { name: "Test Team" });

  const entry = await harness.queueService.joinQueue(team, "ranked");

  expect(entry.team.id).toBe(team.id);
  expect(entry.queueType).toBe("ranked");
});

test("team cannot join queue twice", async () => {
  const players = harness.createPlayers(1);
  const team = harness.createTeam(players, { name: "Test Team" });

  await harness.queueService.joinQueue(team, "ranked");

  expect(async () => {
    await harness.queueService.joinQueue(team, "ranked");
  }).toThrow();
});

test("team can leave queue", async () => {
  const players = harness.createPlayers(1);
  const team = harness.createTeam(players, { name: "Test Team" });

  await harness.queueService.joinQueue(team, "ranked");
  await harness.queueService.leaveQueue(team.id);

  const status = await harness.queueService.getQueueStatus("ranked");
  expect(status.count).toBe(0);
});

test("findMatch returns null when less than 2 teams in queue", async () => {
  const players = harness.createPlayers(1);
  const team = harness.createTeam(players, { name: "Test Team" });

  await harness.queueService.joinQueue(team, "ranked");

  const match = await harness.queueService.findMatch("ranked");
  expect(match).toBeNull();
});

test("findMatch creates match when 2 teams in queue", async () => {
  const players1 = harness.createPlayers(1, 1000);
  const players2 = harness.createPlayers(1, 1010);

  const team1 = harness.createTeam(players1, { name: "Team 1" });
  const team2 = harness.createTeam(players2, { name: "Team 2" });

  await harness.queueService.joinQueue(team1, "ranked");
  await harness.queueService.joinQueue(team2, "ranked");

  const match = await harness.queueService.findMatch("ranked");

  expect(match).not.toBeNull();
  expect(match!.teams.length).toBe(2);
});

test("getQueueStatus returns correct count", async () => {
  const players1 = harness.createPlayers(1);
  const players2 = harness.createPlayers(1);

  const team1 = harness.createTeam(players1, { name: "Team 1" });
  const team2 = harness.createTeam(players2, { name: "Team 2" });

  await harness.queueService.joinQueue(team1, "ranked");
  await harness.queueService.joinQueue(team2, "ranked");

  const status = await harness.queueService.getQueueStatus("ranked");

  expect(status.count).toBe(2);
  expect(status.entries.length).toBe(2);
});

test("queue events are published", async () => {
  const players = harness.createPlayers(1);
  const team = harness.createTeam(players, { name: "Test Team" });

  await harness.queueService.joinQueue(team, "ranked");

  const joinEvents = harness.getEventsByType("queue.team_joined");
  expect(joinEvents.length).toBe(1);

  await harness.queueService.leaveQueue(team.id);

  const leaveEvents = harness.getEventsByType("queue.team_left");
  expect(leaveEvents.length).toBe(1);
});
