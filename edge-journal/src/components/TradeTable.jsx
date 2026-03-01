export default function TradeTable({ trades, selectedTradeId, onRowClick }) {
  const cellStyle = { padding: "12px 16px", borderBottom: "1px solid var(--border)" };
  const headerStyle = { ...cellStyle, textAlign: "left", fontWeight: 600, fontSize: 13 };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead><tr>{["Date", "Symbol", "Side", "Qty", "Entry", "Exit", "P&L"].map((h) => <th key={h} style={headerStyle}>{h}</th>)}</tr></thead>
      <tbody>
        {trades.map((t) => (
          <tr key={t.id} onClick={() => onRowClick(t)} style={{ background: t.id === selectedTradeId ? "var(--surface3)" : "transparent", cursor: "pointer" }}>
            <td style={cellStyle}>{t.date}</td>
            <td style={cellStyle}>{t.symbol}</td>
            <td style={cellStyle}>{t.side}</td>
            <td style={cellStyle}>{t.contracts}</td>
            <td style={cellStyle}>{t.entryPrice}</td>
            <td style={cellStyle}>{t.exitPrice}</td>
            <td style={{ ...cellStyle, color: t.pnl >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{t.pnl >= 0 ? "+" : ""}{t.pnl}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
