export const APP_NAME = "Ownify";

export interface HealthResponse {
  ok: boolean;
  service: string;
  supabaseConfigured: boolean;
  time: string;
}
