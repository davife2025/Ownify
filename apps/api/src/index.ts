import Fastify from "fastify";
import cors from "@fastify/cors";
import { APP_NAME, type HealthResponse } from "@ownify/shared";
import { env } from "./env";
import { supabaseConfigured } from "./lib/supabase";

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get("/health", async (): Promise<HealthResponse> => ({
    ok: true,
    service: `${APP_NAME} api`,
    supabaseConfigured,
    time: new Date().toISOString(),
  }));

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
