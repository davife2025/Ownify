import {
  COMPUTES, COMPUTE_IDS, TIERS, TIER_IDS, quote, usdFine,
  type AgentDomain, type ComputeId, type PricingResponse, type TierId,
} from "@ownify/shared";

export function CostDial({ pricing, agent, question, tier, compute, onTier, onCompute }: {
  pricing: PricingResponse;
  agent: AgentDomain | null;
  question: string;
  tier: TierId;
  compute: ComputeId;
  onTier: (t: TierId) => void;
  onCompute: (c: ComputeId) => void;
}) {
  const q = (t: TierId, c: ComputeId) =>
    agent ? quote({ systemTokens: pricing.systemTokens[agent][t], question, tier: t, compute: c, card: pricing.rates }) : null;
  const current = q(tier, compute);
  const { fastest, cheapest } = pricing.rates;
  const basis = pricing.rates.source === "reference" ? "reference rates, not a quote" : "your configured rates";

  return (
    <div className="dial">
      <fieldset className="tiers">
        <legend>Answer budget (same model, shorter or longer answers)</legend>
        {TIER_IDS.map((t) => {
          const x = q(t, compute);
          return (
            <label key={t} className="choice">
              <input type="radio" name="tier" value={t} checked={tier === t} onChange={() => onTier(t)} />
              {TIERS[t].label}
              {x && <span className="muted"> · up to {usdFine(x.maxCostUsd)}</span>}
            </label>
          );
        })}
      </fieldset>

      <fieldset className="tiers">
        <legend>Provider (which backend serves the model)</legend>
        {COMPUTE_IDS.map((c) => {
          const x = q(tier, c);
          return (
            <label key={c} className="choice">
              <input type="radio" name="compute" value={c} checked={compute === c} onChange={() => onCompute(c)} />
              {COMPUTES[c].label}
              {x && c === "cheapest" && x.cheaperRateKnown && <span className="muted"> · up to {usdFine(x.maxCostUsd)}</span>}
            </label>
          );
        })}
        <p className="muted dial-note">{COMPUTES[compute].note}</p>
        {compute === "cheapest" && !cheapest && (
          <p className="muted dial-note">The saving is not quantified here, so the estimate uses the standard rates. Your Hugging Face billing shows what was charged.</p>
        )}
      </fieldset>

      <p className="estimate" aria-live="polite">
        {current ? (
          <>
            Estimated cost: <strong>up to {usdFine(current.maxCostUsd)}</strong> (about {current.inputTokens} input tokens plus up to {current.maxOutputTokens} output tokens).
          </>
        ) : (
          "Pick an agent to see the price."
        )}
      </p>
      <p className="muted dial-note">
        Rates: ${(compute === "cheapest" && cheapest ? cheapest : fastest).inputPerMTok} per million input tokens and ${(compute === "cheapest" && cheapest ? cheapest : fastest).outputPerMTok} per million output tokens ({basis}). Energy use is not measured here, so there is no energy setting.
      </p>
    </div>
  );
}
