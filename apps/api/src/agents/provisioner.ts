import { connect, keyStores, KeyPair, utils, type Near } from "near-api-js";
import { agentAccountId, type AgentRecord, type AgentRole, type ProvisionMode } from "@ownify/shared";

export interface Provisioner {
  readonly mode: ProvisionMode;
  provision(role: AgentRole, index: number): Promise<AgentRecord>;
}

/** No network. Produces the same account ids a testnet run would, for simulation and development. */
export class SimulatedProvisioner implements Provisioner {
  readonly mode = "simulated" as const;
  constructor(private parent: string) {}

  async provision(role: AgentRole, index: number): Promise<AgentRecord> {
    return {
      accountId: agentAccountId(this.parent, role, index),
      role,
      index,
      mode: this.mode,
      publicKey: null,
      createdAt: new Date().toISOString(),
    };
  }
}

export interface TestnetConfig {
  parent: string;
  parentPrivateKey: string;
  rpcUrl: string;
  fundingNear: string;
  keysDir: string;
}

/**
 * Creates real sub-accounts under the parent on NEAR testnet.
 * Compiles against near-api-js, but has not been run: it needs a funded testnet parent account.
 * Sub-account keys are written to keysDir (gitignored, testnet only). The parent key stays in memory.
 */
export class TestnetProvisioner implements Provisioner {
  readonly mode = "testnet" as const;
  private near?: Near;
  private memory = new keyStores.InMemoryKeyStore();
  private files: keyStores.UnencryptedFileSystemKeyStore;

  constructor(private cfg: TestnetConfig) {
    this.files = new keyStores.UnencryptedFileSystemKeyStore(cfg.keysDir);
  }

  private async connection(): Promise<Near> {
    if (!this.near) {
      const parentKey = KeyPair.fromString(this.cfg.parentPrivateKey as Parameters<typeof KeyPair.fromString>[0]);
      await this.memory.setKey("testnet", this.cfg.parent, parentKey);
      this.near = await connect({ networkId: "testnet", nodeUrl: this.cfg.rpcUrl, keyStore: this.memory });
    }
    return this.near;
  }

  async provision(role: AgentRole, index: number): Promise<AgentRecord> {
    const accountId = agentAccountId(this.cfg.parent, role, index);
    const record = (publicKey: string | null): AgentRecord => ({
      accountId,
      role,
      index,
      mode: this.mode,
      publicKey,
      createdAt: new Date().toISOString(),
    });

    const near = await this.connection();
    const parent = await near.account(this.cfg.parent);
    const keyPair = KeyPair.fromRandom("ed25519");
    const amount = BigInt(utils.format.parseNearAmount(this.cfg.fundingNear) ?? "0");

    try {
      await parent.createAccount(accountId, keyPair.getPublicKey(), amount);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/already exists|AccountAlreadyExists/i.test(msg)) throw e;
      const existing = await this.files.getKey("testnet", accountId);
      return record(existing ? existing.getPublicKey().toString() : null);
    }
    await this.files.setKey("testnet", accountId, keyPair);
    return record(keyPair.getPublicKey().toString());
  }
}
