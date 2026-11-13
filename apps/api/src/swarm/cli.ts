import { runSimulation } from "./simulation";

const args = process.argv.slice(2);
const num = (k: string, d: number) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? Number(args[i + 1]) : d;
};

const run = runSimulation({ seed: num("seed", 1), rounds: num("rounds", 3), buyers: num("buyers", 20), sellers: num("sellers", 5), parent: "swarm.testnet" });
console.log(`seed ${run.seed}, ${run.config.buyers} buyers, ${run.config.sellers} sellers, ${run.events.length} events`);
for (const s of run.summary) {
  const out = s.status === "cleared"
    ? `winner ${s.winner}, price ${s.price}, ${s.buyers} buyers, ${s.poolHours} h, payout ${s.payout}`
    : `no deal (${s.reason})`;
  console.log(`round ${s.round}: ${s.status}, ${out}; voided demands ${s.voidedDemands}, voided offers ${s.voidedOffers}, defaults ${s.defaults}`);
}
