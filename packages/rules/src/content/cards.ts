import type { CardDef, CharacterId } from "../types";

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

export const CARDS: Record<string, CardDef> = Object.fromEntries(STARTERS.map((c) => [c.id, c]));

export const STARTER_DECKS: Record<CharacterId, string[]> = {
  pendekar: [...Array(5).fill("tebas"), ...Array(4).fill("tangkis_pendekar"), "jurus_harimau"],
  dalang: [...Array(4).fill("pukul_wayang"), ...Array(4).fill("tangkis_dalang"), "panggil_wayang", "restu"],
};
