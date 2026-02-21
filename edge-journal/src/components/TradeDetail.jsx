export default function TradeDetail({ trade, dayMeta }) {
  if (!trade) return <div style={{ color: "var(--muted)" }}>Select a trade.</div>;
  const day = dayMeta.find((d) => d.date === trade.date) || { notesHtml: "", image: "" };
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
      <h3>{trade.symbol} · {trade.date}</h3>
      <div>Side: {trade.side} · Qty: {trade.contracts}</div>
      <div>P&L: <b style={{ color: trade.pnl >= 0 ? "var(--green)" : "var(--red)" }}>{trade.pnl}</b></div>
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>Day Notes</div>
      <div dangerouslySetInnerHTML={{ __html: day.notesHtml || "<i>No day notes yet.</i>" }} />
      {day.image ? <img alt="Day" src={day.image} style={{ maxWidth: 220, marginTop: 8, borderRadius: 6 }} /> : null}
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>Chart placeholder</div>
      <div style={{ height: 100, border: "1px dashed var(--border2)", borderRadius: 8 }} />
    </div>
  );
}
