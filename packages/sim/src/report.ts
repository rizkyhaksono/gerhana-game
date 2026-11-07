import { applyAction, botAction, createRun, type RunState } from "@gerhana/rules";

export interface RunLog {
  seed: number;
  result: "won" | "lost";
  stepReached: number;
  turns: number;            // combat turns
  nonCombatNodes: number;   // votes, rewards, rests, shops
  picks: string[];          // reward cards taken
  offered: string[];        // reward cards shown
  diedTo: string | null;    // first enemy of the fight the run was lost in
}

// Estimates for a pair of humans; recalibrate from playtest timings at M6.
export const SECONDS_PER_TURN = 20;
export const SECONDS_PER_NODE = 10;
export const PICK_RATE_LIMIT = 0.6;

/** Two bots play one full run. Deterministic for a seed. */
export function playRun(seed: number): RunLog {
  let { state: s, rng } = createRun(seed, ["pendekar", "dalang"]);
  const log: RunLog = { seed, result: "lost", stepReached: 0, turns: 0, nonCombatNodes: 0, picks: [], offered: [], diedTo: null };
  let lastFight = "";
  for (let i = 0; i < 5000 && s.phase.kind !== "ended"; i++) {
    const ph = s.phase;
    let who: 0 | 1 = 0;
    if (ph.kind === "combat") {
      log.turns++;
      lastFight = ph.combat.enemies[0].defId;
    } else {
      if (ph.kind === "vote") who = ph.votes[0] === null ? 0 : 1;
      else if (ph.kind === "reward" && ph.pusakaOffer) who = ph.pusakaChooser!;
      else if (ph.kind === "reward" || ph.kind === "rest" || ph.kind === "shop") who = ph.done[0] ? 1 : 0;
      if (ph.kind === "reward" && !ph.pusakaOffer) log.offered.push(...ph.offers[who]);
    }
    const a = botAction(s, who, rng);
    if (a.kind === "chooseCard" && a.defId) log.picks.push(a.defId);
    const before: RunState = s;
    const r = applyAction(s, a, rng);
    if ("error" in r) throw new Error(`seed ${seed}: ${before.phase.kind} → ${r.error}`);
    s = r.state;
    if (before.phase.kind !== "combat" && before.phase.kind !== s.phase.kind) log.nonCombatNodes++;
  }
  if (s.phase.kind !== "ended") throw new Error(`seed ${seed}: run did not end`);
  log.result = s.phase.result;
  log.stepReached = s.phase.stepReached;
  log.diedTo = s.phase.result === "lost" ? lastFight : null;
  return log;
}

export function summarize(logs: RunLog[]) {
  const n = logs.length;
  const offered = new Map<string, number>();
  const picked = new Map<string, number>();
  for (const l of logs) {
    for (const id of l.offered) offered.set(id, (offered.get(id) ?? 0) + 1);
    for (const id of l.picks) picked.set(id, (picked.get(id) ?? 0) + 1);
  }
  const overPicked = [...offered]
    .map(([defId, o]) => ({ defId, pickRate: (picked.get(defId) ?? 0) / o }))
    .filter((x) => x.pickRate > PICK_RATE_LIMIT)
    .sort((a, b) => b.pickRate - a.pickRate);
  const killers = new Map<string, number>();
  const steps = new Map<number, number>();
  for (const l of logs) {
    if (l.diedTo) killers.set(l.diedTo, (killers.get(l.diedTo) ?? 0) + 1);
    if (l.result === "lost") steps.set(l.stepReached, (steps.get(l.stepReached) ?? 0) + 1);
  }
  return {
    runs: n,
    winRate: logs.filter((l) => l.result === "won").length / n,
    avgMinutes: logs.reduce((m, l) => m + (l.turns * SECONDS_PER_TURN + l.nonCombatNodes * SECONDS_PER_NODE) / 60, 0) / n,
    overPicked,
    diedTo: Object.fromEntries([...killers].sort((a, b) => b[1] - a[1])),
    lostAtStep: Object.fromEntries([...steps].sort((a, b) => a[0] - b[0])),
  };
}
