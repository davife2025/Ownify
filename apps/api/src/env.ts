import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

export const env = schema.parse(process.env);
