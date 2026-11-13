export function TopBar() {
  return (
    <div className="wrap topbar">
      <a className="brand" href="/">Ownify</a>
      <nav className="topnav" aria-label="Primary">
        <a href="/#start">Start here</a>
        <a href="/#docs">Docs and API</a>
        <a href="/agents">Agent shelf</a>
        <a href="/live">Live rounds</a>
      </nav>
    </div>
  );
}
