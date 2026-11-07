import { expect, test } from "bun:test";
import { stateView } from "../src/protocol";
import { clientIp } from "../src/server";
import type { CombatState } from "@gerhana/rules";

test("steal intents show the hit as amount and the coins separately", () => {
  const c = {
    turn: 1, outcome: "ongoing",
    players: [0, 1].map((id) => ({ id, character: "pendekar", hp: 1, maxHp: 1, block: 0, wayang: 0, statuses: {}, coins: 0, jurusStacks: 0, pingsan: false, draw: [], hand: [], discard: [], damageDealt: 0, pusaka: [] })),
    enemies: [{ uid: "e0", defId: "tuyul", hp: 1, maxHp: 1, statuses: {}, patternIndex: 0, phase: 1, stolen: [], evading: false, fled: false,
      intent: { kind: "steal", amount: 10, attack: 3, targets: [0] } }],
  } as unknown as CombatState;
  expect(stateView(c, ["a", "b"]).enemies[0].intent).toMatchObject({ kind: "steal", amount: 3, coins: 10 });
});

test("client ip trusts X-Forwarded-For only from a loopback proxy", () => {
  expect(clientIp("127.0.0.1", "203.0.113.9, 10.0.0.1")).toBe("203.0.113.9");
  expect(clientIp("::1", "203.0.113.9")).toBe("203.0.113.9");
  expect(clientIp("198.51.100.4", "203.0.113.9")).toBe("198.51.100.4");
  expect(clientIp("127.0.0.1", null)).toBe("127.0.0.1");
});
