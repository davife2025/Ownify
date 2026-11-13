import type { AskResponse, RunDetail, RunSummary, ShelfResponse, SwarmEvent, TierId } from "@ownify/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...(body === undefined
      ? {}
      : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = ((await res.json()) as { error?: string }).error ?? ""; } catch { /* no JSON body */ }
    throw new Error(detail || `${res.status} from ${path}`);
  }
  return (await res.json()) as T;
}

export const listRuns = async () => (await request<{ runs: RunSummary[] }>("/swarm/runs")).runs;
export const getRun = (id: string) => request<RunDetail>(`/swarm/runs/${id}`);
export const simulate = (body: { seed?: number; rounds?: number }) =>
  request<{ runId: string; seed: number }>("/swarm/simulate", body);

export async function getAllEvents(runId: string): Promise<SwarmEvent[]> {
  const all: SwarmEvent[] = [];
  let after = 0;
  for (;;) {
    const page = await request<{ events: SwarmEvent[]; next: number }>(`/swarm/runs/${runId}/events?after=${after}&limit=500`);
    all.push(...page.events);
    if (page.events.length < 500) return all;
    after = page.next;
  }
}

export const getShelf = () => request<ShelfResponse>("/shelf");
export const askAgent = (agentId: string, question: string, tier: TierId) =>
  request<AskResponse>(`/shelf/${agentId}/ask`, { question, tier });
