export default function TradeTable({ trades, selectedTradeId, onRowClick }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead><tr>{["Date", "Symbol", "Side", "Qty", "Entry", "Exit", "P&L"].map((h) => <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid var(--border)" }}>{h}</th>)}</tr></thead>
      <tbody>
        {trades.map((t) => (
          <tr key={t.id} onClick={() => onRowClick(t)} style={{ background: t.id === selectedTradeId ? "var(--surface3)" : "transparent", cursor: "pointer" }}>
            <td style={{ padding: 8 }}>{t.date}</td><td>{t.symbol}</td><td>{t.side}</td><td>{t.contracts}</td><td>{t.entryPrice}</td><td>{t.exitPrice}</td>
            <td style={{ color: t.pnl >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{t.pnl >= 0 ? "+" : ""}{t.pnl}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
