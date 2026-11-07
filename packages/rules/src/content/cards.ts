import type { CardDef, CardType, CharacterId, Effect, Tag } from "../types";

// Starter cards from spec §3. Upgrades add +3 to the main number.
const STARTERS: CardDef[] = [
  { id: "tebas", nameKey: "card.tebas", owner: "pendekar", type: "serang", tags: [],
    effects: [{ kind: "damage", amount: 6 }], upgraded: { effects: [{ kind: "damage", amount: 9 }] } },
  { id: "tangkis_pendekar", nameKey: "card.tangkis", owner: "pendekar", type: "tahan", tags: [],
    effects: [{ kind: "block", amount: 5 }], upgraded: { effects: [{ kind: "block", amount: 8 }] } },
  { id: "jurus_harimau", nameKey: "card.jurus_harimau", owner: "pendekar", type: "serang", tags: ["jurus"],
    effects: [{ kind: "damage", amount: 8 }], upgraded: { effects: [{ kind: "damage", amount: 11 }] } },
  { id: "pukul_wayang", nameKey: "card.pukul_wayang", owner: "dalang", type: "serang", tags: [],
    effects: [{ kind: "damage", amount: 5 }], upgraded: { effects: [{ kind: "damage", amount: 8 }] } },
  { id: "tangkis_dalang", nameKey: "card.tangkis", owner: "dalang", type: "tahan", tags: [],
    effects: [{ kind: "block", amount: 5 }], upgraded: { effects: [{ kind: "block", amount: 8 }] } },
  { id: "panggil_wayang", nameKey: "card.panggil_wayang", owner: "dalang", type: "bantu", tags: [],
    effects: [{ kind: "wayang", hp: 6 }], upgraded: { effects: [{ kind: "wayang", hp: 9 }] } },
  { id: "restu", nameKey: "card.restu", owner: "dalang", type: "bantu", tags: [],
    effects: [{ kind: "buffAttack", amount: 3 }], upgraded: { effects: [{ kind: "buffAttack", amount: 6 }] } },
];

const dmg = (amount: number): Effect => ({ kind: "damage", amount });
const block = (amount: number): Effect => ({ kind: "block", amount });
const wayang = (hp: number): Effect => ({ kind: "wayang", hp });
const buff = (amount: number): Effect => ({ kind: "buffAttack", amount });
const onTarget = (status: "rentan" | "lemah" | "terbakar", stacks: number): Effect => ({ kind: "status", status, stacks, on: "target" });
const onSelf = (status: "rentan" | "lemah" | "terbakar", stacks: number): Effect => ({ kind: "status", status, stacks, on: "self" });

function card(id: string, owner: CharacterId, type: CardType, tags: Tag[], effects: Effect[], up: Effect[], bonus?: [number, number]): CardDef {
  return {
    id, nameKey: `card.${id}`, owner, type, tags, effects,
    ...(bonus ? { serempakBonus: bonus[0] } : {}),
    upgraded: { effects: up, ...(bonus ? { serempakBonus: bonus[1] } : {}) },
  };
}

// Reward pool (GDD §3): 15 per character, only effect kinds the engine knows.
const POOL: CardDef[] = [
  card("tendang", "pendekar", "serang", [], [dmg(9)], [dmg(12)]),
  card("jurus_elang", "pendekar", "serang", ["jurus"], [dmg(5), onTarget("lemah", 1)], [dmg(8), onTarget("lemah", 2)]),
  card("jurus_naga", "pendekar", "serang", ["jurus"], [dmg(12)], [dmg(16)]),
  card("sapuan", "pendekar", "serang", [], [dmg(7), onTarget("rentan", 1)], [dmg(10), onTarget("rentan", 2)]),
  card("serbu_bersama", "pendekar", "serang", ["serempak"], [dmg(6)], [dmg(8)], [6, 8]),
  card("hantam_kembar", "pendekar", "serang", ["serempak"], [dmg(4)], [dmg(5)], [8, 11]),
  card("pukulan_ganda", "pendekar", "serang", ["jurus", "serempak"], [dmg(7)], [dmg(9)], [4, 6]),
  card("jurus_kelabang", "pendekar", "serang", ["jurus"], [dmg(6), onTarget("terbakar", 2)], [dmg(8), onTarget("terbakar", 3)]),
  card("tusuk_golok", "pendekar", "serang", [], [dmg(14), onSelf("lemah", 2)], [dmg(18), onSelf("lemah", 2)]),
  card("jurus_harimau_putih", "pendekar", "serang", ["jurus", "serempak"], [dmg(10)], [dmg(13)], [4, 6]),
  card("kuda_kuda", "pendekar", "tahan", [], [block(8)], [block(11)]),
  card("bertahan", "pendekar", "tahan", [], [block(14), onSelf("lemah", 1)], [block(18), onSelf("lemah", 1)]),
  card("tangkis_cepat", "pendekar", "tahan", [], [block(6)], [block(10)]),
  card("semangat", "pendekar", "bantu", [], [buff(4)], [buff(6)]),
  card("sorak_juang", "pendekar", "bantu", [], [buff(2), block(3)], [buff(3), block(5)]),

  card("wayang_arjuna", "dalang", "bantu", [], [wayang(10)], [wayang(14)]),
  card("wayang_bima", "dalang", "bantu", [], [wayang(6), buff(2)], [wayang(9), buff(3)]),
  card("gamelan_semangat", "dalang", "bantu", [], [buff(5)], [buff(8)]),
  card("mantra_pelindung", "dalang", "bantu", [], [wayang(4), block(3)], [wayang(6), block(5)]),
  card("wayang_semar", "dalang", "bantu", [], [wayang(8), buff(1)], [wayang(11), buff(2)]),
  card("tembang", "dalang", "bantu", [], [buff(3), wayang(3)], [buff(4), wayang(5)]),
  card("lakon_kembar", "dalang", "serang", ["serempak"], [dmg(5)], [dmg(7)], [5, 7]),
  card("sabetan", "dalang", "serang", ["serempak"], [dmg(4)], [dmg(6)], [6, 8]),
  card("cempala", "dalang", "serang", ["serempak"], [dmg(6), onTarget("rentan", 1)], [dmg(8), onTarget("rentan", 2)], [4, 5]),
  card("pukul_gunungan", "dalang", "serang", [], [dmg(8)], [dmg(11)]),
  card("bayangan_wayang", "dalang", "serang", [], [dmg(4), onTarget("lemah", 2)], [dmg(6), onTarget("lemah", 3)]),
  card("blencong", "dalang", "serang", [], [dmg(3), onTarget("terbakar", 3)], [dmg(4), onTarget("terbakar", 4)]),
  card("dalang_murka", "dalang", "serang", [], [dmg(12), onSelf("lemah", 1)], [dmg(16), onSelf("lemah", 1)]),
  card("kelir", "dalang", "tahan", [], [block(7)], [block(10)]),
  card("suluk_panjang", "dalang", "tahan", [], [block(12), onSelf("lemah", 1)], [block(16), onSelf("lemah", 1)]),
];

export const CARDS: Record<string, CardDef> = Object.fromEntries([...STARTERS, ...POOL].map((c) => [c.id, c]));

export const REWARD_POOL: Record<CharacterId, string[]> = {
  pendekar: POOL.filter((c) => c.owner === "pendekar").map((c) => c.id),
  dalang: POOL.filter((c) => c.owner === "dalang").map((c) => c.id),
};

export const STARTER_DECKS: Record<CharacterId, string[]> = {
  pendekar: [...Array(5).fill("tebas"), ...Array(4).fill("tangkis_pendekar"), "jurus_harimau"],
  dalang: [...Array(4).fill("pukul_wayang"), ...Array(4).fill("tangkis_dalang"), "panggil_wayang", "restu"],
};
