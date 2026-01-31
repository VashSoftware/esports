import { test, expect, beforeEach } from "bun:test";
import { StandardOsuProtocol } from "../../../src/domain/protocols/StandardOsuProtocol";
import { createMatch } from "../../../src/domain/models/Match";
import { createTeam } from "../../../src/domain/models/Team";
import { createPlayer } from "../../../src/domain/models/Player";
import type { Score } from "../../../src/domain/models/Score";

let protocol: StandardOsuProtocol;

beforeEach(() => {
  protocol = new StandardOsuProtocol();
});

test("has correct configuration", () => {
  expect(protocol.name).toBe("standard-osu");
  expect(protocol.teamSize).toBe(4);
  expect(protocol.bestOf).toBe(9);
  expect(protocol.hasPickBan).toBe(true);
  expect(protocol.hasFreemod).toBe(true);
});

test("getWinsNeeded returns correct value for best of 9", () => {
  expect(protocol.getWinsNeeded()).toBe(5);
});

test("calculateMapWinner returns winning team based on scores", () => {
  const players1 = [
    createPlayer({ id: "p1", discordId: "d1", osuId: 1, osuName: "Player1" }),
    createPlayer({ id: "p2", discordId: "d2", osuId: 2, osuName: "Player2" }),
  ];
  const players2 = [
    createPlayer({ id: "p3", discordId: "d3", osuId: 3, osuName: "Player3" }),
    createPlayer({ id: "p4", discordId: "d4", osuId: 4, osuName: "Player4" }),
  ];

  const team1 = createTeam({ id: "team1", name: "Team 1", players: players1 });
  const team2 = createTeam({ id: "team2", name: "Team 2", players: players2 });

  const match = createMatch({
    teams: [team1, team2],
    protocol: "standard-osu",
  });

  const scores: Score[] = [
    { playerId: "p1", score: 500000, accuracy: 95, maxCombo: 800, misses: 2 },
    { playerId: "p2", score: 450000, accuracy: 94, maxCombo: 750, misses: 3 },
    { playerId: "p3", score: 400000, accuracy: 92, maxCombo: 700, misses: 5 },
    { playerId: "p4", score: 380000, accuracy: 91, maxCombo: 680, misses: 6 },
  ];

  const winner = protocol.calculateMapWinner(match, scores);
  expect(winner).toBe("team1");
});

test("calculateMatchWinner returns null when no team has enough wins", () => {
  const players1 = [createPlayer({ id: "p1", discordId: "d1", osuId: 1, osuName: "P1" })];
  const players2 = [createPlayer({ id: "p2", discordId: "d2", osuId: 2, osuName: "P2" })];

  const team1 = createTeam({ id: "team1", name: "Team 1", players: players1 });
  const team2 = createTeam({ id: "team2", name: "Team 2", players: players2 });

  const match = createMatch({
    teams: [team1, team2],
    protocol: "standard-osu",
  });

  expect(protocol.calculateMatchWinner(match)).toBeNull();
});

test("isValidPick returns false when not the picking team", () => {
  const players1 = [createPlayer({ id: "p1", discordId: "d1", osuId: 1, osuName: "P1" })];
  const players2 = [createPlayer({ id: "p2", discordId: "d2", osuId: 2, osuName: "P2" })];

  const team1 = createTeam({ id: "team1", name: "Team 1", players: players1 });
  const team2 = createTeam({ id: "team2", name: "Team 2", players: players2 });

  const match = createMatch({
    teams: [team1, team2],
    protocol: "standard-osu",
  });

  match.currentPicker = "team1";

  const map = {
    id: 123,
    beatmapSetId: 456,
    title: "Test Map",
    artist: "Artist",
    difficulty: "Hard",
    starRating: 5.5,
    bpm: 180,
    length: 120,
  };

  expect(protocol.isValidPick(match, team1, map)).toBe(true);
  expect(protocol.isValidPick(match, team2, map)).toBe(false);
});

test("isValidPick returns false for banned maps", () => {
  const players1 = [createPlayer({ id: "p1", discordId: "d1", osuId: 1, osuName: "P1" })];
  const players2 = [createPlayer({ id: "p2", discordId: "d2", osuId: 2, osuName: "P2" })];

  const team1 = createTeam({ id: "team1", name: "Team 1", players: players1 });
  const team2 = createTeam({ id: "team2", name: "Team 2", players: players2 });

  const match = createMatch({
    teams: [team1, team2],
    protocol: "standard-osu",
  });

  match.currentPicker = "team1";
  match.bans.set("team2", [123]);

  const map = {
    id: 123,
    beatmapSetId: 456,
    title: "Test Map",
    artist: "Artist",
    difficulty: "Hard",
    starRating: 5.5,
    bpm: 180,
    length: 120,
  };

  expect(protocol.isValidPick(match, team1, map)).toBe(false);
});

test("isValidPick returns false for already picked maps", () => {
  const players1 = [createPlayer({ id: "p1", discordId: "d1", osuId: 1, osuName: "P1" })];
  const players2 = [createPlayer({ id: "p2", discordId: "d2", osuId: 2, osuName: "P2" })];

  const team1 = createTeam({ id: "team1", name: "Team 1", players: players1 });
  const team2 = createTeam({ id: "team2", name: "Team 2", players: players2 });

  const match = createMatch({
    teams: [team1, team2],
    protocol: "standard-osu",
  });

  match.currentPicker = "team1";
  match.picks.push(123);

  const map = {
    id: 123,
    beatmapSetId: 456,
    title: "Test Map",
    artist: "Artist",
    difficulty: "Hard",
    starRating: 5.5,
    bpm: 180,
    length: 120,
  };

  expect(protocol.isValidPick(match, team1, map)).toBe(false);
});
