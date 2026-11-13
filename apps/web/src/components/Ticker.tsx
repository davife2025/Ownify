import { sampleRoundEvents } from "../content/sample-events";

export function Ticker() {
  return (
    <div className="ticker" role="region" aria-label="Live round ticker">
      <div className="wrap ticker-inner">
        <span className="ticker-tag">Sample round</span>
        <div className="ticker-view" tabIndex={0}>
          <div className="ticker-track">
            <ul className="ticker-list">
              {sampleRoundEvents.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <ul className="ticker-list" aria-hidden="true">
              {sampleRoundEvents.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
