import { formatJournalDate } from "../lib/date";

export default function DayList({ days, selectedDay, onSelect, dayStats }) {
  return (
    <div style={{ borderRight: "1px solid var(--border)", overflowY: "auto" }}>
      {days.map((day) => {
        const stats = dayStats(day);
        return (
          <button key={day} type="button" onClick={() => onSelect(day)} style={{ width: "100%", textAlign: "left", background: day === selectedDay ? "var(--surface3)" : "transparent", color: "var(--text)", border: "none", borderBottom: "1px solid var(--border)", padding: 12 }}>
            <div>{formatJournalDate(day)}</div>
            <div style={{ fontSize: 12, color: stats.net >= 0 ? "var(--green)" : "var(--red)" }}>{stats.net >= 0 ? "+" : ""}{stats.net.toFixed(1)} · {stats.trades} trades</div>
          </button>
        );
      })}
    </div>
  );
}
