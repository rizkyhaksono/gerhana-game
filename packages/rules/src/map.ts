import type { Rng } from "./rng";

export type NodeKind = "pertarungan" | "elite" | "istirahat" | "warung";
export type MapStep = [NodeKind, NodeKind];
export const MAP_STEPS = 7; // the boss is the implicit 8th step

/** GDD §6.2: step 1 fight, step 7 rest, 1–2 elites from step 3, at least one warung in steps 3–6. */
export function generateMap(rng: Rng): MapStep[] {
  const filler: NodeKind[] = ["pertarungan", "pertarungan", "istirahat", "warung"];
  const map: MapStep[] = [["pertarungan", "pertarungan"]];
  for (let i = 1; i < MAP_STEPS - 1; i++) map.push([rng.pick(filler), rng.pick(filler)]);
  map.push(["istirahat", "istirahat"]);
  const middle = rng.shuffle([2, 3, 4, 5]);
  const elites = middle.slice(0, rng.int(1, 2));
  for (const i of elites) map[i][rng.int(0, 1)] = "elite";
  if (!middle.some((i) => map[i].includes("warung"))) {
    const i = middle[middle.length - 1]; // never an elite step when there are 4 candidates and ≤2 elites
    map[i][rng.int(0, 1)] = "warung";
  }
  return map;
}
