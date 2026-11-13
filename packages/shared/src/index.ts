export * from "./agents";
export * from "./swarm";
export * from "./shelf";
export * from "./format";
export * from "./describe";
export * from "./replay";

export const APP_NAME = "Ownify";

export interface HealthResponse {
  ok: boolean;
  service: string;
  supabaseConfigured: boolean;
  time: string;
}
