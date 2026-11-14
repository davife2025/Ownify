import type { ComputeId, LlmProvider } from "@ownify/shared";

export interface LlmRequest { system: string; user: string; maxTokens: number; temperature?: number; compute?: ComputeId }
export interface LlmResponse { text: string; model: string; usage?: { inputTokens: number; outputTokens: number } }

export interface LlmClient {
  readonly provider: LlmProvider;
  readonly model: string;
  /** The model id actually requested for a compute setting (Hugging Face appends a policy suffix). */
  modelFor?(compute?: ComputeId): string;
  complete(req: LlmRequest): Promise<LlmResponse>;
}

export class LlmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmError";
  }
}

export interface HuggingFaceConfig {
  token: string;
  model: string;
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Kimi K2 (or whatever HF_MODEL names) through Hugging Face Inference Providers' OpenAI-compatible router. */
export class HuggingFaceLlm implements LlmClient {
  readonly provider = "huggingface" as const;
  readonly model: string;
  constructor(private cfg: HuggingFaceConfig) {
    this.model = cfg.model;
  }

  /** No suffix = Hugging Face's default (fastest). ":cheapest" = lowest price per output token. */
  modelFor(compute?: ComputeId): string {
    return compute === "cheapest" ? `${this.cfg.model}:cheapest` : this.cfg.model;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const doFetch = this.cfg.fetchImpl ?? fetch;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.cfg.timeoutMs ?? 60_000);
    try {
      const res = await doFetch(`${this.cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { authorization: `Bearer ${this.cfg.token}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: this.modelFor(req.compute),
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
          max_tokens: req.maxTokens,
          temperature: req.temperature ?? 0.2,
        }),
      });
      if (!res.ok) throw new LlmError(`Hugging Face returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const json = (await res.json()) as {
        model?: string;
        choices?: { message?: { content?: unknown } }[];
        usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
      };
      const text = json.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) throw new LlmError("Hugging Face returned an empty answer");
      const pt = json.usage?.prompt_tokens;
      const ct = json.usage?.completion_tokens;
      return {
        text: text.trim(),
        model: json.model ?? this.cfg.model,
        usage: typeof pt === "number" && typeof ct === "number" ? { inputTokens: pt, outputTokens: ct } : undefined,
      };
    } catch (e) {
      if (e instanceof LlmError) throw e;
      throw new LlmError(`Could not reach Hugging Face: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Used when no Hugging Face token is set. Its answers are placeholders and are never counted as verified. */
export class MockLlm implements LlmClient {
  readonly provider = "mock" as const;
  readonly model = "mock";
  async complete(_req: LlmRequest): Promise<LlmResponse> {
    return {
      text: "Sample reply from the mock model. No Hugging Face token is set on the API, so this is not a real answer. Set HF_TOKEN to talk to the real agent.",
      model: this.model,
    };
  }
}
