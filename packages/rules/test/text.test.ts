import { expect, test } from "bun:test";
import { cardName, describeCard, describePusaka, enemyName, pusakaName } from "../src/text";
import { PUSAKA } from "../src/content/pusaka";
import { CARDS } from "../src/content/cards";

test("card names and descriptions come from the effects", () => {
  expect(cardName("tebas")).toBe("Tebas");
  expect(describeCard(CARDS.tebas, false)).toBe("Serang 6");
  expect(describeCard(CARDS.tebas, true)).toBe("Serang 9");
  expect(describeCard(CARDS.tangkis_dalang, false)).toBe("Perisai 5");
  expect(describeCard(CARDS.panggil_wayang, false)).toBe("Wayang 6");
  expect(describeCard(CARDS.restu, false)).toBe("Serangan target +3");
  expect(describeCard(CARDS.jurus_harimau, false)).toBe("Serang 8");
  expect(describeCard(CARDS.tusuk_golok, false)).toBe("Serang 14. Kamu Lemah 2");
  expect(describeCard(CARDS.serbu_bersama, false)).toBe("Serang 6. Bareng +6");
});

test("every card and enemy has a name", () => {
  for (const id of Object.keys(CARDS)) expect(cardName(id)).not.toBe(id);
  expect(enemyName("babi_ngepet")).toBe("Babi Ngepet");
});

test("every pusaka has a name and a description", () => {
  for (const id of Object.keys(PUSAKA)) expect(pusakaName(id)).not.toBe(id);
  expect(describePusaka("keris_kembar")).toBe("Serempak +2 (kalian berdua)");
  expect(describePusaka("kemenyan")).toBe("Awal pertarungan: Perisai 6");
});

test("bantu block says it shields the player who plays it", () => {
  expect(describeCard(CARDS.sorak_juang, false)).toBe("Serangan target +2. Kamu Perisai 3");
});
