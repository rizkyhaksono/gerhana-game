import { expect, test } from "bun:test";
import { playRun, summarize, type RunLog } from "../src/report";

const log = (over: Partial<RunLog>): RunLog => ({
  seed: 1, result: "lost", stepReached: 3, turns: 30, nonCombatNodes: 7, picks: [], offered: [], diedTo: null, ...over,
});

test("summarize computes rates and minutes", () => {
  const logs = [log({ result: "won", turns: 30 }), log({ turns: 40 })];
  const s = summarize(logs);
  expect(s.winRate).toBe(0.5);
  expect(s.avgMinutes).toBeCloseTo((35 * 20 + 7 * 10) / 60);
});

test("pick rate flags cards taken more than 60% of the time they are offered", () => {
  const logs = [log({ offered: ["a", "b", "a", "a"], picks: ["a", "a", "a"] })];
  expect(summarize(logs).overPicked).toEqual([{ defId: "a", pickRate: 1 }]);
});

test("same seed replays to the same run", () => {
  expect(playRun(42)).toEqual(playRun(42));
});

test("a run always ends", () => {
  for (let seed = 1; seed <= 10; seed++) expect(["won", "lost"]).toContain(playRun(seed).result);
});
