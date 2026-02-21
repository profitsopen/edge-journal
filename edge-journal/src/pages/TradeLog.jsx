import { useState } from "react";
import TradeTable from "../components/TradeTable";
import TradeDetail from "../components/TradeDetail";

export default function TradeLog({ trades, dayMeta }) {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
      <div>
        <h1>Trade Log</h1>
        <TradeTable trades={trades} selectedTradeId={selected?.id} onRowClick={setSelected} />
      </div>
      <TradeDetail trade={selected} dayMeta={dayMeta} />
    </div>
  );
}
