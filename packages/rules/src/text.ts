import { CARDS } from "./content/cards";
import { PUSAKA } from "./content/pusaka";
import type { CardDef, Effect } from "./types";

// Bahasa Indonesia only for the slice; English joins when i18n lands (GDD §7).
const NAMES: Record<string, string> = {
  tebas: "Tebas", tangkis_pendekar: "Tangkis", tangkis_dalang: "Tangkis", jurus_harimau: "Jurus Harimau",
  pukul_wayang: "Pukul Wayang", panggil_wayang: "Panggil Wayang", restu: "Restu",
  tuyul: "Tuyul", kuntilanak: "Kuntilanak", pocong: "Pocong", babi_ngepet: "Babi Ngepet", jenglot: "Jenglot",
  genderuwo: "Genderuwo", wewe_gombel: "Wewe Gombel", banaspati: "Banaspati",
  pendekar: "Pendekar", dalang: "Dalang",
  tendang: "Tendang", jurus_elang: "Jurus Elang", jurus_naga: "Jurus Naga", sapuan: "Sapuan",
  serbu_bersama: "Serbu Bersama", hantam_kembar: "Hantam Kembar", pukulan_ganda: "Pukulan Ganda",
  jurus_kelabang: "Jurus Kelabang", tusuk_golok: "Tusuk Golok", jurus_harimau_putih: "Harimau Putih",
  kuda_kuda: "Kuda-kuda", bertahan: "Bertahan", tangkis_cepat: "Tangkis Cepat", semangat: "Semangat",
  sorak_juang: "Sorak Juang", wayang_arjuna: "Wayang Arjuna", wayang_bima: "Wayang Bima",
  gamelan_semangat: "Gamelan", mantra_pelindung: "Mantra Pelindung", wayang_semar: "Wayang Semar",
  tembang: "Tembang", lakon_kembar: "Lakon Kembar", sabetan: "Sabetan", cempala: "Cempala",
  pukul_gunungan: "Pukul Gunungan", bayangan_wayang: "Bayangan", blencong: "Blencong",
  dalang_murka: "Dalang Murka", kelir: "Kelir", suluk_panjang: "Suluk Panjang",
  keris_kembar: "Keris Kembar", selendang_sutra: "Selendang Sutra", cincin_mustika: "Cincin Mustika",
  kendi_air: "Kendi Air", kemenyan: "Kemenyan", batu_akik: "Batu Akik", dompet_kulit: "Dompet Kulit",
  jimat_kunyit: "Jimat Kunyit", gelang_akar: "Gelang Akar", ikat_pinggang: "Ikat Pinggang",
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
    case "status": return fx.on === "self" ? `Kamu ${STATUS[fx.status]} ${fx.stacks}` : `${STATUS[fx.status]} ${fx.stacks}`;
  }
};

/** Rules text short enough for a 60px card. The Jurus tag is shown as an icon on the card, not in words. */
export function describeCard(def: CardDef, upgraded: boolean): string {
  const v = upgraded ? def.upgraded : def;
  const parts = [v.effects.map(effectText).join(". ")];
  if (def.tags.includes("serempak")) parts.push(`Bareng +${v.serempakBonus ?? 0}`);
  return parts.join(". ");
}

export const describeCardId = (defId: string, upgraded: boolean) => describeCard(CARDS[defId], upgraded);

export const pusakaName = (id: string) => NAMES[id] ?? id;

export function describePusaka(id: string): string {
  const { hook, shared } = PUSAKA[id];
  const who = shared ? " (kalian berdua)" : "";
  switch (hook.on) {
    case "combatStart": return `Awal pertarungan: ${effectText(hook.effect)}${who}`;
    case "serempakBonus": return `Serempak +${hook.amount}${who}`;
    case "maxHp": return `HP maks +${hook.amount}${who}`;
    case "coinsAfterCombat": return `+${hook.amount} koin tiap menang${who}`;
  }
}
