import type { SimRun } from "./simulation";

export interface StoredRun extends SimRun { id: string; createdAt: string }

/** In memory for now: a restart loses runs. Persistence arrives with the dashboard (Session 6). */
const MAX_RUNS = 50;

export class RunStore {
  private runs = new Map<string, StoredRun>();
  private counter = 0;

  add(run: SimRun): StoredRun {
    const stored = { ...run, id: `run-${++this.counter}`, createdAt: new Date().toISOString() };
    this.runs.set(stored.id, stored);
    while (this.runs.size > MAX_RUNS) this.runs.delete(this.runs.keys().next().value as string);
    return stored;
  }
  get(id: string) { return this.runs.get(id); }
  list() { return [...this.runs.values()]; }
}
