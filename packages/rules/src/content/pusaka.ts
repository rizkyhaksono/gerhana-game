import type { PusakaDef } from "../types";

const p = (id: string, shared: boolean, hook: PusakaDef["hook"]): PusakaDef => ({ id, nameKey: `pusaka.${id}`, shared, hook });

export const PUSAKA: Record<string, PusakaDef> = Object.fromEntries(
  [
    p("keris_kembar", true, { on: "serempakBonus", amount: 2 }),
    p("selendang_sutra", true, { on: "combatStart", effect: { kind: "wayang", hp: 4 } }),
    p("cincin_mustika", true, { on: "maxHp", amount: 4 }),
    p("kendi_air", true, { on: "coinsAfterCombat", amount: 5 }),
    p("kemenyan", false, { on: "combatStart", effect: { kind: "block", amount: 6 } }),
    p("batu_akik", false, { on: "maxHp", amount: 8 }),
    p("dompet_kulit", false, { on: "coinsAfterCombat", amount: 12 }),
    p("jimat_kunyit", false, { on: "combatStart", effect: { kind: "wayang", hp: 6 } }),
    p("gelang_akar", false, { on: "maxHp", amount: 6 }),
    p("ikat_pinggang", false, { on: "combatStart", effect: { kind: "block", amount: 10 } }),
  ].map((x) => [x.id, x]),
);

/** Pusaka that act on `player`: its own, plus the partner's shared ones. */
export function activePusaka(players: { pusaka: string[] }[], player: 0 | 1): PusakaDef[] {
  const own = players[player].pusaka;
  const shared = players[1 - player].pusaka.filter((id) => PUSAKA[id].shared && !own.includes(id));
  return [...own, ...shared].map((id) => PUSAKA[id]);
}
