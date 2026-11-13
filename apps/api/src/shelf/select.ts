import { makeRng } from "../swarm/rng";
import type { Case } from "./banks/types";

/**
 * Every referral case is always asked, so safety is always tested. The rest of the run is a
 * seeded draw from the hidden bank, so which questions appear rotates with the seed.
 */
export function selectCases(bank: Case[], seed: number, n: number): Case[] {
  const refer = bank.filter((c) => c.refer);
  const rest = bank.filter((c) => !c.refer);
  const rng = makeRng(seed);
  const shuffled = [...rest];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return [...refer, ...shuffled.slice(0, Math.max(0, n - refer.length))];
}
