import { expect, test } from "bun:test";
import { botAction, botPicks } from "../src/bot";
import { applyAction, createRun } from "../src/run";
import { validatePicks } from "../src/picks";
import { createRng } from "../src/rng";
import { cards, combat, enemy, player } from "./fixtures";
import type { ResolvedIntent } from "../src/combat";

const hit = (amount: number, targets: (0 | 1)[]) => ({ kind: "attack", amount, target: "random", targets }) as ResolvedIntent;

test("bot picks always validate", () => {
  for (let seed = 1; seed <= 30; seed++) {
    let { state: s, rng } = createRun(seed, ["pendekar", "dalang"]);
    for (let i = 0; i < 3000 && s.phase.kind !== "ended"; i++) {
      if (s.phase.kind === "combat") {
        const c = s.phase.combat;
        for (const id of [0, 1] as const) expect(validatePicks(c, id, botPicks(c, id))).toBeNull();
        const r = applyAction(s, { kind: "playCards", picks: [botPicks(c, 0), botPicks(c, 1)] }, rng);
        if ("error" in r) throw new Error(r.error);
        s = r.state;
      } else {
        const ph = s.phase;
        const who = (ph.kind === "vote" ? (ph.votes[0] === null ? 0 : 1)
          : ph.kind === "reward" && ph.pusakaOffer ? ph.pusakaChooser!
          : (ph as { done: boolean[] }).done[0] ? 1 : 0) as 0 | 1;
        const r = applyAction(s, botAction(s, who, rng), rng);
        if ("error" in r) throw new Error(`${ph.kind}: ${r.error}`);
        s = r.state;
      }
    }
    expect(s.phase.kind).toBe("ended");
  }
});

test("bot blocks when a big hit is coming at it", () => {
  const p0 = player(0, { hand: cards(0, ["tebas", "tangkis_pendekar", "tebas", "tebas"]) });
  const c = combat([p0, player(1)], [enemy("genderuwo", "e0", { intent: hit(20, [0]) })]);
  expect(botPicks(c, 0).map((p) => p.cardUid)).toContain("0-1");
});

test("bot attacks the weakest enemy when nothing threatens it", () => {
  const p0 = player(0, { hand: cards(0, ["tebas", "tangkis_pendekar", "tebas", "tangkis_pendekar"]) });
  const c = combat([p0, player(1)], [enemy("kuntilanak", "e0", { intent: hit(7, [1]) }), enemy("tuyul", "e1", { hp: 4, intent: hit(3, [1]) })]);
  const picks = botPicks(c, 0);
  expect(picks.filter((p) => p.target.kind === "enemy").map((p) => (p.target as { uid: string }).uid)).toEqual(["e1", "e1"]);
});

test("dalang buffs the partner with Restu and shields the threatened one with Panggil Wayang", () => {
  const p1 = player(1, { hand: cards(1, ["restu", "panggil_wayang", "pukul_wayang", "tangkis_dalang"]) });
  const c = combat([player(0), p1], [enemy("genderuwo", "e0", { intent: hit(20, [0]) })]);
  const picks = botPicks(c, 1);
  expect(picks).toContainEqual({ cardUid: "1-1", target: { kind: "player", id: 0 } });
});

test("rest heals when hurt, upgrades when healthy", () => {
  const { state, rng } = createRun(1, ["pendekar", "dalang"]);
  state.phase = { kind: "rest", done: [false, false] };
  state.players[0].hp = 10;
  expect(botAction(state, 0, rng)).toEqual({ kind: "rest", player: 0, choice: "heal" });
  expect(botAction(state, 1, createRng(1))).toMatchObject({ kind: "rest", player: 1, choice: { upgrade: expect.any(String) } });
});
