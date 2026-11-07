import { expect, test } from "bun:test";
import { createRng } from "../src/rng";

test("same seed gives same sequence", () => {
  const a = createRng(42), b = createRng(42);
  expect([a.next(), a.next(), a.int(1, 6)]).toEqual([b.next(), b.next(), b.int(1, 6)]);
});

test("int stays in range", () => {
  const r = createRng(1);
  for (let i = 0; i < 1000; i++) {
    const v = r.int(15, 25);
    expect(v >= 15 && v <= 25).toBe(true);
  }
});

test("shuffle keeps elements and does not mutate", () => {
  const xs = [1, 2, 3, 4, 5];
  const out = createRng(7).shuffle(xs);
  expect(xs).toEqual([1, 2, 3, 4, 5]);
  expect([...out].sort()).toEqual(xs);
});
