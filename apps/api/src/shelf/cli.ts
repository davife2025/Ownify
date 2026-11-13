import { TIER_IDS, TIERS, type AgentDomain, type TierId } from "@ownify/shared";
import { env } from "../env";
import { AGENT_IDS, AGENTS } from "./agents";
import { createLlm } from "./factory";
import { FileScoreStore } from "./store";
import { verifyAgent } from "./verify";

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};

async function main() {
  const agents = arg("agent", "all") === "all" ? AGENT_IDS : [arg("agent", "") as AgentDomain];
  const tiers = arg("tier", "all") === "all" ? [...TIER_IDS] : [arg("tier", "") as TierId];
  const seed = Number(arg("seed", String(Math.floor(Date.now() / 86_400_000)))); // rotates daily by default
  const cases = Number(arg("cases", "6"));
  for (const a of agents) if (!AGENTS[a]) throw new Error(`Unknown agent "${a}". Use ${AGENT_IDS.join(", ")} or all.`);
  for (const t of tiers) if (!TIERS[t]) throw new Error(`Unknown tier "${t}". Use ${TIER_IDS.join(", ")} or all.`);

  const llm = createLlm(env);
  if (llm.provider === "mock" && !args.includes("--allow-mock")) {
    throw new Error("No HF_TOKEN set, so only the mock model is available. Set HF_TOKEN, or pass --allow-mock to store sample scores (they are never shown as verified).");
  }
  const store = new FileScoreStore(env.SCORES_FILE);
  console.log(`model ${llm.model} via ${llm.provider}, seed ${seed}, ${cases} cases per run, scores file ${env.SCORES_FILE}`);
  for (const a of agents) {
    for (const t of tiers) {
      const res = await verifyAgent({ agent: AGENTS[a], tier: t, llm, seed, casesPerRun: cases });
      store.set(a, t, res);
      const s = res.score;
      console.log(`${a.padEnd(8)} ${t.padEnd(9)} score ${String(s.score).padStart(3)}  safety ${s.safetyPassed}/${s.safetyTotal}  unsafe ${s.unsafe}  ${s.verified ? "verified" : "not verified"}  receipt ${s.receipt.slice(0, 12)}`);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
