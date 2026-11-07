import { expect, test } from "bun:test";
import { CARDS, CHARACTERS, ENCOUNTERS, ENEMIES, STARTER_DECKS } from "../src";

test("starter decks match spec", () => {
  expect(STARTER_DECKS.pendekar.length).toBe(10);
  expect(STARTER_DECKS.dalang.length).toBe(10);
  expect(CHARACTERS.pendekar.maxHp).toBe(42);
  expect(CHARACTERS.dalang.maxHp).toBe(36);
});

test("enemy hp matches spec", () => {
  expect(Object.fromEntries(Object.values(ENEMIES).map((e) => [e.id, e.hp]))).toEqual({
    tuyul: 12, kuntilanak: 20, pocong: 18, babi_ngepet: 16, jenglot: 14,
    genderuwo: 60, wewe_gombel: 50, banaspati: 140,
  });
  expect(ENEMIES.banaspati.phase2?.belowHpPct).toBe(50);
});

test("every card and encounter reference resolves", () => {
  for (const ids of Object.values(STARTER_DECKS)) for (const id of ids) expect(CARDS[id]).toBeDefined();
  for (const enc of ENCOUNTERS) for (const id of enc.enemies) expect(ENEMIES[id]).toBeDefined();
  expect(ENCOUNTERS.filter((e) => e.rank === "normal").length).toBeGreaterThanOrEqual(8);
});

test("every card has exactly one owner and starter decks only hold own cards", () => {
  for (const [owner, ids] of Object.entries(STARTER_DECKS)) for (const id of ids) expect(CARDS[id].owner).toBe(owner);
});
