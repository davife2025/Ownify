import { DEFAULT_RATE_CARD, type RateCard } from "@ownify/shared";

export interface RateEnv {
  PRICE_INPUT_USD_PER_MTOK?: number;
  PRICE_OUTPUT_USD_PER_MTOK?: number;
  PRICE_CHEAPEST_INPUT_USD_PER_MTOK?: number;
  PRICE_CHEAPEST_OUTPUT_USD_PER_MTOK?: number;
}

/** A pair of prices counts only when both halves are set; otherwise the reference rates (or none) apply. */
export function rateCardFromEnv(e: RateEnv): RateCard {
  const main = e.PRICE_INPUT_USD_PER_MTOK !== undefined && e.PRICE_OUTPUT_USD_PER_MTOK !== undefined;
  const cheap = e.PRICE_CHEAPEST_INPUT_USD_PER_MTOK !== undefined && e.PRICE_CHEAPEST_OUTPUT_USD_PER_MTOK !== undefined;
  return {
    fastest: main
      ? { inputPerMTok: e.PRICE_INPUT_USD_PER_MTOK!, outputPerMTok: e.PRICE_OUTPUT_USD_PER_MTOK! }
      : DEFAULT_RATE_CARD.fastest,
    cheapest: cheap
      ? { inputPerMTok: e.PRICE_CHEAPEST_INPUT_USD_PER_MTOK!, outputPerMTok: e.PRICE_CHEAPEST_OUTPUT_USD_PER_MTOK! }
      : null,
    source: main ? "configured" : "reference",
  };
}
