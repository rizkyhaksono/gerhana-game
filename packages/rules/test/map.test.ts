import { expect, test } from "bun:test";
import { generateMap } from "../src/map";
import { createRng } from "../src/rng";

test("map constraints hold for 1000 seeds", () => {
  for (let seed = 0; seed < 1000; seed++) {
    const m = generateMap(createRng(seed));
    expect(m.length).toBe(7);
    expect(m[0]).toEqual(["pertarungan", "pertarungan"]);
    expect(m[6]).toEqual(["istirahat", "istirahat"]);
    const eliteSteps = m.map((s, i) => (s.includes("elite") ? i : -1)).filter((i) => i >= 0);
    expect(eliteSteps.length >= 1 && eliteSteps.length <= 2).toBe(true);
    expect(eliteSteps.every((i) => i >= 2)).toBe(true);
    expect(m.slice(2, 6).some((s) => s.includes("warung"))).toBe(true);
  }
});
