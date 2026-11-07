import { CARDS, REWARD_POOL } from "./content/cards";
import { attackDamage } from "./damage";
import { isActive, type CombatState, type Pick } from "./combat";
import type { Rng } from "./rng";
import type { RunAction, RunState } from "./run";
import type { CardDef, Effect } from "./types";

/**
 * A partner that plays like a careful beginner: shields whoever is about to be hit hard,
 * otherwise focuses the weakest enemy so both pendekar land Bareng bonuses on the same target.
 * Used by the server for empty seats and by the balance simulator.
 */

const effectsOf = (defId: string, upgraded: boolean) => (upgraded ? CARDS[defId].upgraded : CARDS[defId]).effects;

/** Damage each player is about to take this turn, after their block and wayang. */
function threats(c: CombatState): [number, number] {
  const t: [number, number] = [0, 0];
  for (const e of c.enemies) {
    if (!isActive(e) || !e.intent) continue;
    const it = e.intent;
    const amount = it.kind === "attack" || it.kind === "attackStatus" || it.kind === "drain" ? it.amount : it.kind === "steal" ? it.attack : 0;
    for (const id of it.targets) t[id] += attackDamage(amount, e.statuses, c.players[id].statuses);
  }
  return t.map((n, id) => Math.max(0, n - c.players[id].block - c.players[id].wayang)) as [number, number];
}

function cardValue(def: CardDef, effects: Effect[]): number {
  let v = 0;
  for (const fx of effects) {
    if (fx.kind === "damage") v += fx.amount;
    else if (fx.kind === "block") v += fx.amount * 0.8;
    else if (fx.kind === "wayang") v += fx.hp;
    else if (fx.kind === "buffAttack") v += fx.amount * 1.5;
    else if (fx.kind === "status") v += fx.on === "self" ? -fx.stacks * 2 : fx.stacks * 2.5;
  }
  if (def.tags.includes("serempak")) v += (def.serempakBonus ?? 0) * 0.6;
  if (def.tags.includes("jurus")) v += 1;
  return v;
}

export function botPicks(c: CombatState, id: 0 | 1): Pick[] {
  const me = c.players[id];
  if (me.pingsan) return [];
  const partnerId = (1 - id) as 0 | 1;
  const partnerUp = !c.players[partnerId].pingsan;
  const danger = threats(c);
  const alive = c.enemies.filter(isActive);
  const weakest = alive.reduce<(typeof alive)[number] | undefined>((a, e) => (!a || e.hp < a.hp ? e : a), undefined);

  const options = me.hand.map((card, order) => {
    const def = CARDS[card.defId];
    const fx = effectsOf(card.defId, card.upgraded);
    if (def.type === "serang") {
      const v = cardValue(def, fx) + me.jurusStacks;
      return { pick: { cardUid: card.uid, target: { kind: "enemy" as const, uid: weakest?.uid ?? "" } }, v, order };
    }
    if (def.type === "tahan") {
      const block = fx.reduce((n, f) => n + (f.kind === "block" ? f.amount : 0), 0);
      return { pick: { cardUid: card.uid, target: { kind: "player" as const, id } }, v: Math.min(block, danger[id]) * 1.2 + 0.5, order };
    }
    // Bantu: aim it where it does the most good
    let best = { target: id, v: -Infinity };
    for (const t of partnerUp ? [id, partnerId] : [id]) {
      let v = 0;
      for (const f of fx) {
        if (f.kind === "wayang") v += Math.min(f.hp, danger[t]) * 1.2 + f.hp * 0.3;
        else if (f.kind === "buffAttack") v += f.amount * (t === partnerId ? 1.6 : 1.2);
        else if (f.kind === "block") v += Math.min(f.amount, danger[id]) * 1.2;
      }
      if (v > best.v) best = { target: t, v };
    }
    return { pick: { cardUid: card.uid, target: { kind: "player" as const, id: best.target as 0 | 1 } }, v: best.v, order };
  });

  const need = Math.min(2, me.hand.length);
  return options
    .filter((o) => o.pick.target.kind !== "enemy" || weakest)
    .sort((a, b) => b.v - a.v || a.order - b.order)
    .slice(0, need)
    .map((o) => o.pick);
}

const bestOffer = (offers: string[], rng: Rng) =>
  offers
    .map((id) => ({ id, v: cardValue(CARDS[id], CARDS[id].effects) + rng.next() * 6 }))
    .sort((a, b) => b.v - a.v)[0]?.id ?? null;

/** Non-combat choices for a bot seat (and both picks when the run is in combat). */
export function botAction(s: RunState, id: 0 | 1, rng: Rng): RunAction {
  const ph = s.phase;
  const me = s.players[id];
  switch (ph.kind) {
    case "combat":
      return { kind: "playCards", picks: [botPicks(ph.combat, 0), botPicks(ph.combat, 1)] };
    case "vote": {
      const partner = ph.votes[1 - id];
      if (partner !== null) return { kind: "vote", player: id, choice: partner as 0 | 1 }; // stay together
      const opts = s.map[ph.step];
      const want = (k: string) => opts.indexOf(k as never);
      const hurt = me.hp < me.maxHp * 0.5;
      const choice =
        hurt && want("istirahat") >= 0 ? want("istirahat")
        : !hurt && me.hp > me.maxHp * 0.7 && want("elite") >= 0 ? want("elite")
        : me.coins >= 75 && want("warung") >= 0 ? want("warung")
        : want("pertarungan") >= 0 ? want("pertarungan") : 0;
      return { kind: "vote", player: id, choice: choice as 0 | 1 };
    }
    case "reward":
      if (ph.pusakaOffer && ph.pusakaChooser === id) return { kind: "choosePusaka", player: id, id: ph.pusakaOffer[0] };
      return { kind: "chooseCard", player: id, defId: me.deck.length >= 18 ? null : bestOffer(ph.offers[id], rng) };
    case "rest": {
      if (me.hp < me.maxHp * 0.5) return { kind: "rest", player: id, choice: "heal" };
      const up = me.deck
        .filter((c) => !c.upgraded)
        .sort((a, b) => cardValue(CARDS[b.defId], CARDS[b.defId].effects) - cardValue(CARDS[a.defId], CARDS[a.defId].effects))[0];
      return up ? { kind: "rest", player: id, choice: { upgrade: up.uid } } : { kind: "rest", player: id, choice: "heal" };
    }
    case "shop": {
      const buy = me.coins >= 50 ? bestOffer(ph.offers[id], rng) : null;
      if (buy) return { kind: "shopBuy", player: id, defId: buy };
      const weak = me.deck.find((c) => !c.upgraded && REWARD_POOL[me.character].indexOf(c.defId) < 0 && CARDS[c.defId].type === "tahan");
      if (me.coins >= 75 && me.deck.length > 8 && weak) return { kind: "shopRemove", player: id, cardUid: weak.uid };
      return { kind: "leave", player: id };
    }
    default:
      return { kind: "leave", player: id };
  }
}
