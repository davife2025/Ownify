import type { SimRun } from "./simulation";

export interface StoredRun extends SimRun { id: string; createdAt: string }

/** In memory for now: a restart loses runs. Persistence arrives with the dashboard (Session 6). */
export class RunStore {
  private runs = new Map<string, StoredRun>();
  private counter = 0;

  add(run: SimRun): StoredRun {
    const stored = { ...run, id: `run-${++this.counter}`, createdAt: new Date().toISOString() };
    this.runs.set(stored.id, stored);
    return stored;
  }
  get(id: string) { return this.runs.get(id); }
  list() { return [...this.runs.values()]; }
}
