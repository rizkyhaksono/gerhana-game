import type { CardInstance, CharacterId } from "../src/types";
import type { CombatState, EnemyCombat, PlayerCombat } from "../src/combat";
import { ENEMIES } from "../src/content/enemies";

export const cards = (p: 0 | 1, ids: string[], from = 0): CardInstance[] =>
  ids.map((defId, i) => ({ uid: `${p}-${from + i}`, defId, upgraded: false }));

export function player(id: 0 | 1, over: Partial<PlayerCombat> = {}): PlayerCombat {
  const character: CharacterId = id === 0 ? "pendekar" : "dalang";
  return {
    id, character, hp: 30, maxHp: 40, block: 0, wayang: 0, statuses: {}, coins: 0, jurusStacks: 0,
    pingsan: false, draw: [], hand: [], discard: [], damageDealt: 0, pusaka: [], ...over,
  };
}

export function enemy(defId: string, uid: string, over: Partial<EnemyCombat> = {}): EnemyCombat {
  const hp = ENEMIES[defId].hp;
  return {
    uid, defId, hp, maxHp: hp, statuses: {}, patternIndex: 0, phase: 1, intent: null,
    stolen: [], evading: false, fled: false, ...over,
  };
}

export const combat = (players: [PlayerCombat, PlayerCombat], enemies: EnemyCombat[]): CombatState =>
  ({ turn: 1, players, enemies, outcome: "ongoing" });
