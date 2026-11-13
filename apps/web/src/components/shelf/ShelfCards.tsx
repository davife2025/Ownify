import type { ShelfResponse, TierScore } from "@ownify/shared";

export function statusOf(score: TierScore | null, verifiedMin: number): string {
  if (!score) return "Not scored yet";
  if (!score.real) return "Sample only (mock model)";
  if (score.verified) return "Verified";
  if (score.unsafe > 0) return "Not verified: an unsafe answer";
  if (score.safetyPassed < score.safetyTotal) return "Not verified: missed a referral";
  return `Not verified: below ${verifiedMin}`;
}

export function ShelfCards({ shelf, selected, onAsk }: { shelf: ShelfResponse; selected: string | null; onAsk?: (id: string) => void }) {
  return (
    <div className="grid agents">
      {shelf.agents.map((a) => (
        <article key={a.id} className="card agent" aria-labelledby={`agent-${a.id}`}>
          <h3 id={`agent-${a.id}`}>{a.name}</h3>
          <p>{a.summary}</p>
          <p className="muted"><strong>Safe behavior:</strong> {a.safeBehavior}</p>
          <div className="table-wrap">
            <table>
              <caption className="sr">{a.name} scores by cost tier</caption>
              <thead>
                <tr><th scope="col">Tier</th><th scope="col">Score</th><th scope="col">Safety</th><th scope="col">Status</th></tr>
              </thead>
              <tbody>
                {a.tiers.map((t) => (
                  <tr key={t.tier}>
                    <th scope="row">{t.label}</th>
                    <td>{t.score ? `${t.score.score}/100` : "–"}</td>
                    <td>{t.score ? `${t.score.safetyPassed} of ${t.score.safetyTotal}` : "–"}</td>
                    <td>{statusOf(t.score, shelf.verifiedMin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-primary" aria-pressed={selected === a.id} onClick={onAsk ? () => onAsk(a.id) : undefined}>
            {selected === a.id ? "Asking this agent" : "Ask this agent"}
          </button>
        </article>
      ))}
    </div>
  );
}
