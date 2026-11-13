import { SIMULATION_SIZE, type AgentRecord } from "@ownify/shared";
import type { Provisioner } from "./provisioner";
import type { AgentStore } from "./store";

/** Sequential on purpose: testnet account creation signs with the parent's nonce. */
export async function provisionSwarm(
  provisioner: Provisioner,
  store: AgentStore,
  counts: { buyers: number; sellers: number } = SIMULATION_SIZE,
): Promise<AgentRecord[]> {
  const created: AgentRecord[] = [];
  for (let i = 1; i <= counts.buyers; i++) created.push(await provisioner.provision("buyer", i));
  for (let i = 1; i <= counts.sellers; i++) created.push(await provisioner.provision("seller", i));
  for (const agent of created) await store.upsert(agent);
  return created;
}
