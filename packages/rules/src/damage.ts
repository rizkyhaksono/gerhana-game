import type { StatusId } from "./types";

export type Statuses = Partial<Record<StatusId, number>>;

/** base → Lemah ×0.75 → Rentan ×1.5 → evading ×0.5 → floor, never below 0 (spec §4.3). */
export function attackDamage(base: number, attacker: Statuses, defender: Statuses, opts: { evading?: boolean } = {}): number {
  let d = base;
  if (attacker.lemah) d *= 0.75;
  if (defender.rentan) d *= 1.5;
  if (opts.evading) d *= 0.5;
  return Math.max(0, Math.floor(d));
}

export function absorb(dmg: number, pools: { wayang: number; block: number; hp: number }) {
  let left = dmg;
  const wayang = Math.max(0, pools.wayang - left);
  left -= pools.wayang - wayang;
  const block = Math.max(0, pools.block - left);
  left -= pools.block - block;
  return { wayang, block, hp: Math.max(0, pools.hp - left) };
}

export function tickStatuses(s: Statuses): { burn: number; next: Statuses } {
  const next: Statuses = {};
  for (const [id, n] of Object.entries(s) as [StatusId, number][]) if (n > 1) next[id] = n - 1;
  return { burn: s.terbakar ?? 0, next };
}
