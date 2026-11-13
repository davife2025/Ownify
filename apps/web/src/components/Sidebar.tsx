import { nearDocs } from "../content/links";

export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Docs">
      <h2>Start</h2>
      <ul>
        <li><a href="#start">Start here</a></li>
        <li><a href="#docs">Docs and API</a></li>
      </ul>
      <h2>NEAR Intents docs</h2>
      <ul>
        {nearDocs.map((d) => (
          <li key={d.href}><a href={d.href}>{d.title}</a></li>
        ))}
      </ul>
      <h2>Ownify</h2>
      <ul>
        <li><a href="#ownify-api">Ownify API</a></li>
        <li><span className="soon">RULES.md (soon)</span></li>
        <li><span className="soon">Live rounds (soon)</span></li>
      </ul>
    </nav>
  );
}
