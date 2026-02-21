export default function AppLayout({ page, setPage, trades, notes, children }) {
  const unreviewed = trades.filter((t) => !(notes[t.id]?.grade || notes[t.id]?.setup?.trim())).length;
  const total = trades.reduce((acc, t) => acc + Number(t.pnl || 0), 0);
  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <aside style={{ width: 220, borderRight: "1px solid var(--border)", padding: 12 }}>
        <h2>EDGE.</h2>
        {[ ["dashboard", "Dashboard"], ["trade-log", "Trade Log"], ["journal", "Journal"] ].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setPage(id)} style={{ display: "block", width: "100%", textAlign: "left", padding: 8, borderRadius: 6, color: page === id ? "var(--text)" : "var(--muted)", border: "none", background: page === id ? "var(--surface2)" : "transparent" }}>{label}</button>
        ))}
        <div style={{ marginTop: 20, fontSize: 12 }}>Unreviewed: {unreviewed}</div>
        <div style={{ marginTop: 8 }}>Total: {total.toFixed(1)}</div>
      </aside>
      <main style={{ flex: 1, padding: 20, overflowY: "auto" }}>{children}</main>
    </div>
  );
}
