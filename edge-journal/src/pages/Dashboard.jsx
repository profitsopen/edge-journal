import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export default function Dashboard({ trades }) {
  const stats = useMemo(() => {
    const byDay = {};
    for (const t of trades) byDay[t.date] = (byDay[t.date] || 0) + Number(t.pnl || 0);
    let run = 0;
    const curve = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, day]) => ({ date: date.slice(5), day, cum: (run += day) }));
    return { total: trades.reduce((a, t) => a + Number(t.pnl || 0), 0), curve };
  }, [trades]);

  return (
    <div>
      <h1>Dashboard</h1>
      <div>Total P&L: {stats.total.toFixed(1)}</div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.curve}><XAxis dataKey="date" /><YAxis /><Tooltip /><Area dataKey="cum" stroke="#3b9eff" fill="#3b9eff30" /></AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
