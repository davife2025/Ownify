import { Sidebar } from "../components/Sidebar";
import { Ticker } from "../components/Ticker";
import { API_URL, nearDocs, steps } from "../content/links";

export default function Home() {
  return (
    <>
      <div className="wrap topbar">
        <a className="brand" href="#top">Ownify</a>
        <nav className="topnav" aria-label="Primary">
          <a href="#start">Start here</a>
          <a href="#docs">Docs and API</a>
        </nav>
      </div>

      <Ticker />

      <main id="top">
        <div className="wrap">
          <header className="hero">
            <h1>AI agents you own, proven before you trust them.</h1>
            <p>
              Housing, study and food agents on standby for you. You choose what they run on,
              what each task costs, and who sees your data.
            </p>
            <div className="actions">
              <a className="btn btn-primary" href="#start">Get started</a>
              <a className="btn btn-ghost" href="#docs">Read the docs</a>
            </div>
          </header>

          <div className="layout">
            <Sidebar />
            <div>
              <section id="start" className="block">
                <h2>Start here</h2>
                <p className="lede">Three steps from opening Ownify to owning your results.</p>
                <ol className="grid steps">
                  {steps.map((s, i) => (
                    <li key={s.title} className="card">
                      <span className="step-num" aria-hidden="true">{i + 1}</span>
                      <h3>{s.title}</h3>
                      <p>{s.text}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section id="docs" className="block">
                <h2>Docs and API</h2>
                <p className="lede">What Ownify builds on, and what it exposes.</p>

                <h3 className="group">NEAR Intents docs</h3>
                <div className="grid">
                  {nearDocs.map((d) => (
                    <a key={d.href} className="card" href={d.href}>
                      <h3>{d.title}</h3>
                      <p>{d.text}</p>
                    </a>
                  ))}
                </div>

                <h3 className="group">Ownify</h3>
                <div className="grid">
                  <a id="ownify-api" className="card" href={`${API_URL}/health`}>
                    <h3>Ownify API</h3>
                    <p>{API_URL}, starting with GET /health.</p>
                  </a>
                  <div className="card card-soon">
                    <h3>RULES.md</h3>
                    <p>How a group-buying round works. Arrives with the swarm rules.</p>
                  </div>
                  <div className="card card-soon">
                    <h3>Live rounds</h3>
                    <p>Bids, clearing price and who got what. Arrives with the dashboard.</p>
                  </div>
                </div>
              </section>

              <p className="note">The NEAR Intents Agent API is a mainnet-only beta. Use small test amounts only.</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
