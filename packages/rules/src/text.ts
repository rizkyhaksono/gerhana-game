import { CARDS } from "./content/cards";
import type { CardDef, Effect } from "./types";

// Bahasa Indonesia only for the slice; English joins when i18n lands (GDD §7).
const NAMES: Record<string, string> = {
  tebas: "Tebas", tangkis_pendekar: "Tangkis", tangkis_dalang: "Tangkis", jurus_harimau: "Jurus Harimau",
  pukul_wayang: "Pukul Wayang", panggil_wayang: "Panggil Wayang", restu: "Restu",
  tuyul: "Tuyul", kuntilanak: "Kuntilanak", pocong: "Pocong", babi_ngepet: "Babi Ngepet", jenglot: "Jenglot",
  genderuwo: "Genderuwo", wewe_gombel: "Wewe Gombel", banaspati: "Banaspati",
  pendekar: "Pendekar", dalang: "Dalang",
};
const STATUS = { rentan: "Rentan", lemah: "Lemah", terbakar: "Terbakar" } as const;

export const cardName = (defId: string) => NAMES[defId] ?? defId;
export const enemyName = (defId: string) => NAMES[defId] ?? defId;

const effectText = (fx: Effect): string => {
  switch (fx.kind) {
    case "damage": return `Serang ${fx.amount}`;
    case "block": return `Perisai ${fx.amount}`;
    case "wayang": return `Wayang ${fx.hp}`;
    case "buffAttack": return `Serangan target +${fx.amount}`;
    case "status": return `${STATUS[fx.status]} ${fx.stacks}${fx.on === "self" ? " ke diri" : ""}`;
  }
};

export function describeCard(def: CardDef, upgraded: boolean): string {
  const v = upgraded ? def.upgraded : def;
  const parts = [
    ...(def.tags.includes("jurus") ? ["Jurus"] : []),
    ...(def.tags.includes("serempak") ? [`Serempak +${v.serempakBonus ?? 0}`] : []),
    v.effects.map(effectText).join(", "),
  ];
  return parts.join(". ");
}

export const describeCardId = (defId: string, upgraded: boolean) => describeCard(CARDS[defId], upgraded);
