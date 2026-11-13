import { HuggingFaceLlm, MockLlm, type LlmClient } from "./llm";

export interface LlmEnv {
  LLM_PROVIDER?: "huggingface" | "mock";
  HF_TOKEN?: string;
  HF_MODEL: string;
  HF_BASE_URL: string;
}

/** Real Kimi K2 when a token is set, otherwise the labelled mock. */
export function createLlm(env: LlmEnv): LlmClient {
  const wantsMock = env.LLM_PROVIDER === "mock" || (!env.LLM_PROVIDER && !env.HF_TOKEN);
  if (wantsMock) return new MockLlm();
  if (!env.HF_TOKEN) throw new Error("LLM_PROVIDER=huggingface needs HF_TOKEN");
  return new HuggingFaceLlm({ token: env.HF_TOKEN, model: env.HF_MODEL, baseUrl: env.HF_BASE_URL });
}
