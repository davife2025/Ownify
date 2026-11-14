import { COMPUTES, TIERS, usdFine, type TaskReceipt } from "@ownify/shared";

export function ReceiptCard({ receipt: r, apiUrl }: { receipt: TaskReceipt; apiUrl: string }) {
  return (
    <section className="panel receipt" aria-labelledby="receipt-title">
      <h3 id="receipt-title">Receipt {r.id}</h3>
      {!r.real && <p className="muted">Mock model: the numbers below are placeholders.</p>}
      <dl className="facts">
        <div><dt>Cost</dt><dd>{usdFine(r.costUsd)}</dd></div>
        <div><dt>Tokens</dt><dd>{r.inputTokens} in, {r.outputTokens} out</dd></div>
        <div><dt>Time</dt><dd>{(r.latencyMs / 1000).toFixed(1)} s</dd></div>
      </dl>
      <ul className="plain">
        <li>Tokens were {r.tokensSource === "reported" ? "reported by the model provider" : "estimated from text length"}.</li>
        <li>Priced at ${r.rates.inputPerMTok} and ${r.rates.outputPerMTok} per million input and output tokens ({r.rateSource === "reference" ? "reference rates, not a quote" : "configured rates"}).</li>
        <li>Answer budget: {TIERS[r.tier].label}. Provider setting: {COMPUTES[r.compute].label}. Model requested: {r.modelRequested}; served: {r.modelServed}.</li>
        <li>The receipt holds no question or answer text. Question hash {r.questionHash.slice(0, 12)}, prompt hash {r.promptHash.slice(0, 12)}, receipt hash {r.receiptHash.slice(0, 12)}.</li>
      </ul>
      <p><a href={`${apiUrl}/receipts/${r.id}`}>Open the receipt as JSON</a>, which also says whether it still matches its hash.</p>
    </section>
  );
}
