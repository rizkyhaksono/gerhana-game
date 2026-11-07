import { expect, test } from "bun:test";
import { absorb, attackDamage, tickStatuses } from "../src/damage";

test("lemah and rentan stack then floor", () => {
  expect(attackDamage(10, { lemah: 1 }, { rentan: 1 })).toBe(11); // 10*.75=7.5*1.5=11.25
  expect(attackDamage(7, {}, {}, { evading: true })).toBe(3);
  expect(attackDamage(0, {}, { rentan: 2 })).toBe(0);
});

test("absorb drains wayang, block, then hp", () => {
  expect(absorb(10, { wayang: 3, block: 4, hp: 20 })).toEqual({ wayang: 0, block: 0, hp: 17 });
  expect(absorb(99, { wayang: 0, block: 0, hp: 5 })).toEqual({ wayang: 0, block: 0, hp: 0 });
});

test("tick burns then decays and drops zeros", () => {
  expect(tickStatuses({ terbakar: 2, lemah: 1 })).toEqual({ burn: 2, next: { terbakar: 1 } });
});
