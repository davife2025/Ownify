import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AgentDomain, TierId } from "@ownify/shared";
import type { StoredScore } from "./verify";

export interface ScoreStore {
  get(agent: AgentDomain, tier: TierId): StoredScore | null;
  set(agent: AgentDomain, tier: TierId, value: StoredScore): void;
}

export class MemoryScoreStore implements ScoreStore {
  protected data: Record<string, StoredScore> = {};
  get(agent: AgentDomain, tier: TierId) { return this.data[`${agent}/${tier}`] ?? null; }
  set(agent: AgentDomain, tier: TierId, value: StoredScore) { this.data[`${agent}/${tier}`] = value; }
}

/** Scores live in one JSON file, so verified results survive restarts and can be committed for a hosted demo. */
export class FileScoreStore extends MemoryScoreStore {
  constructor(private path: string) {
    super();
    if (existsSync(path)) this.data = JSON.parse(readFileSync(path, "utf8")) as Record<string, StoredScore>;
  }
  override set(agent: AgentDomain, tier: TierId, value: StoredScore) {
    super.set(agent, tier, value);
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.data, null, 2) + "\n");
  }
}
