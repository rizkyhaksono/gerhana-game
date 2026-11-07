import type { EncounterDef } from "../types";

export const ENCOUNTERS: EncounterDef[] = [
  { id: "n1", rank: "normal", enemies: ["tuyul", "tuyul", "kuntilanak"] },
  { id: "n2", rank: "normal", enemies: ["pocong", "jenglot"] },
  { id: "n3", rank: "normal", enemies: ["kuntilanak", "jenglot"] },
  { id: "n4", rank: "normal", enemies: ["babi_ngepet", "tuyul"] },
  { id: "n5", rank: "normal", enemies: ["pocong", "pocong"] },
  { id: "n6", rank: "normal", enemies: ["kuntilanak", "babi_ngepet"] },
  { id: "n7", rank: "normal", enemies: ["tuyul", "jenglot", "jenglot"] },
  { id: "n8", rank: "normal", enemies: ["pocong", "kuntilanak"] },
  { id: "e1", rank: "elite", enemies: ["genderuwo"] },
  { id: "e2", rank: "elite", enemies: ["wewe_gombel"] },
  { id: "boss", rank: "boss", enemies: ["banaspati"] },
];
