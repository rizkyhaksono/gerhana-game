// Balance report: bun run --filter @gerhana/sim sim -- --runs 2000 --seed 1
import { playRun, summarize } from "./report";

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
};

const runs = arg("runs", 2000);
const seed = arg("seed", 1);
const s = summarize(Array.from({ length: runs }, (_, i) => playRun(seed + i)));

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
console.log(`runs ${s.runs}  win rate ${pct(s.winRate)} (target 30-40%)  avg ${s.avgMinutes.toFixed(1)} min (target 15-20)`);
console.log("lost at step:", s.lostAtStep);
console.log("lost to:", s.diedTo);
console.log("over-picked (>60%):", s.overPicked.length ? s.overPicked.map((x) => `${x.defId} ${pct(x.pickRate)}`).join(", ") : "none");

const ok = s.winRate >= 0.3 && s.winRate <= 0.4 && s.avgMinutes >= 15 && s.avgMinutes <= 20 && s.overPicked.length === 0;
process.exit(ok ? 0 : 1);
