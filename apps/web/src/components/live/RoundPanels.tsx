import { PHASES, describeEvent, shortId, usd, type Phase, type RoundRecord, type RoundView, type SwarmEvent } from "@ownify/shared";

const PHASE_LABEL: Record<Phase, string> = {
  open: "Open", demand: "Demand", locked: "Pool locked", bid: "Sealed bids",
  reveal: "Reveal", cleared: "Cleared", settled: "Settled", closed: "Closed",
};
const VOID: Record<string, string> = {
  hash_mismatch: "it did not match its seal", no_reveal: "it was never revealed",
  out_of_range: "it was out of range", insufficient_balance: "not enough balance to cover its demand",
};
const LEFT_OUT: Record<string, string> = {
  capacity: "no seller could fit the full pool", below_price: "its max price was below the clearing price",
  insufficient_balance: "not enough balance to cover its demand",
};
const FAIL: Record<string, string> = {
  no_demand: "nobody asked for hours", no_offers: "no seller made a valid offer", no_fit: "no seller could fit the pool",
};

export function RoundPanels({ view, record, full, feed }: { view: RoundView; record: RoundRecord | null; full: boolean; feed: SwarmEvent[] }) {
  const current = PHASES.indexOf(view.phase);
  const cleared = view.cleared;
  const winner = cleared?.winner;

  const leftOut: { buyerId: string; reason: string }[] = [];
  if (full && record) {
    for (const v of record.voidedDemands) leftOut.push(v);
    if (record.result) for (const r of record.result.removed) leftOut.push(r);
  }

  return (
    <div className="round">
      <ol className="stepper" aria-label="Round phases">
        {PHASES.map((p, i) => (
          <li key={p} className={i < current ? "done" : i === current ? "now" : undefined} aria-current={i === current ? "step" : undefined}>
            {PHASE_LABEL[p]}
            {i < current && <span className="sr"> (done)</span>}
          </li>
        ))}
      </ol>

      <div className="panels">
        <section className="panel" aria-labelledby="p-pool">
          <h3 id="p-pool">Pool</h3>
          {view.poolHours === null ? (
            <p>{view.demandsReceived} demands received so far. The pool is not locked yet.</p>
          ) : (
            <p><strong>{view.poolBuyers} buyers</strong> pooled <strong>{view.poolHours} GPU-hours</strong>.</p>
          )}
          {view.voidedDemands.length > 0 && (
            <p className="muted">Out at the lock: {view.voidedDemands.map((v) => shortId(v.buyerId)).join(", ")} (not enough balance).</p>
          )}
        </section>

        <section className="panel" aria-labelledby="p-bids">
          <h3 id="p-bids">Sealed bids</h3>
          <p>{view.commitments} sealed{view.offers.length > 0 ? `, ${view.offers.length} revealed` : ""}.</p>
          {view.offers.length > 0 && (
            <div className="table-wrap">
              <table>
                <caption className="sr">Revealed offers</caption>
                <thead><tr><th scope="col">Seller</th><th scope="col">Price per GPU-hour</th><th scope="col">Capacity</th></tr></thead>
                <tbody>
                  {[...view.offers].sort((a, b) => a.price - b.price).map((o) => (
                    <tr key={o.sellerId} className={o.sellerId === winner ? "win" : undefined}>
                      <th scope="row" title={o.sellerId}>{shortId(o.sellerId)}{o.sellerId === winner && <span className="tag">Winner</span>}</th>
                      <td>{usd(o.price)}</td>
                      <td>{o.capacity} h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {view.voidedOffers.length > 0 && (
            <ul className="plain muted">
              {view.voidedOffers.map((v) => <li key={v.sellerId}>{shortId(v.sellerId)}: void, {VOID[v.reason] ?? v.reason}</li>)}
            </ul>
          )}
        </section>

        <section className="panel wide" aria-labelledby="p-result">
          <h3 id="p-result">Result</h3>
          {cleared ? (
            <dl className="facts">
              <div><dt>Clearing price</dt><dd>{usd(cleared.price)}/h</dd></div>
              <div><dt>Winner</dt><dd title={cleared.winner}>{shortId(cleared.winner)}</dd></div>
              <div><dt>Pooled hours</dt><dd>{cleared.totalHours}</dd></div>
              <div><dt>Paid to winner</dt><dd>{usd(cleared.payout)}</dd></div>
            </dl>
          ) : view.failedReason ? (
            <p>No deal: {FAIL[view.failedReason] ?? view.failedReason}.</p>
          ) : (
            <p className="muted">Waiting for the round to clear.</p>
          )}
        </section>

        {cleared && (
          <section className="panel wide" aria-labelledby="p-who">
            <h3 id="p-who">Who got what</h3>
            <div className="table-wrap">
              <table>
                <caption className="sr">Each buyer pays only its share</caption>
                <thead><tr><th scope="col">Buyer</th><th scope="col">GPU-hours</th><th scope="col">Pays</th></tr></thead>
                <tbody>
                  {cleared.allocations.map((a) => (
                    <tr key={a.buyerId}><th scope="row" title={a.buyerId}>{shortId(a.buyerId)}</th><td>{a.hours} h</td><td>{usd(a.pays)}</td></tr>
                  ))}
                </tbody>
                <tfoot><tr><th scope="row">Total</th><td>{cleared.totalHours} h</td><td>{usd(cleared.payout)}</td></tr></tfoot>
              </table>
            </div>
          </section>
        )}

        {leftOut.length > 0 && (
          <section className="panel" aria-labelledby="p-left">
            <h3 id="p-left">Left out</h3>
            <ul className="plain">
              {leftOut.map((l, i) => <li key={i}>{shortId(l.buyerId)}: {LEFT_OUT[l.reason] ?? l.reason}</li>)}
            </ul>
          </section>
        )}

        {(view.settlements.length > 0 || view.defaults.length > 0) && (
          <section className="panel" aria-labelledby="p-settle">
            <h3 id="p-settle">Settlement</h3>
            <p className="muted">Simulated ledger entries. Nothing moves on a real network.</p>
            <ul className="plain">
              {view.settlements.map((s) => <li key={s.from}>{shortId(s.from)} pays {usd(s.amount)} to {shortId(s.to)}</li>)}
              {view.defaults.map((d) => <li key={d}>{shortId(d)} could not pay and is flagged</li>)}
            </ul>
          </section>
        )}

        <section className="panel wide" aria-labelledby="p-feed">
          <h3 id="p-feed">Event feed</h3>
          {feed.length === 0 ? (
            <p className="muted">Press replay to watch the round happen.</p>
          ) : (
            <ul className="feed">
              {[...feed].slice(-12).reverse().map((e) => <li key={e.seq}>{describeEvent(e)}</li>)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
