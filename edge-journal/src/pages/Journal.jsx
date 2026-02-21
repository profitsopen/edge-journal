import { useEffect, useMemo, useState } from "react";
import DayList from "../components/DayList";
import NotesEditor from "../components/NotesEditor";
import ImageUploader from "../components/ImageUploader";
import TradeTable from "../components/TradeTable";

export default function Journal({ trades, dayMeta, setDayMeta }) {
  const days = useMemo(() => {
    const all = new Set(trades.map((t) => t.date));
    dayMeta.forEach((d) => all.add(d.date));
    return [...all].sort((a, b) => b.localeCompare(a));
  }, [trades, dayMeta]);
  const [selectedDay, setSelectedDay] = useState("");

  useEffect(() => {
    if (!selectedDay && days.length) setSelectedDay(days[0]);
    if (selectedDay && !days.includes(selectedDay)) setSelectedDay(days[0] || "");
  }, [days, selectedDay]);
  const selectedMeta = dayMeta.find((d) => d.date === selectedDay) || { date: selectedDay, notesHtml: "", image: "" };
  const dayTrades = trades.filter((t) => t.date === selectedDay);

  const updateMeta = (patch) => {
    setDayMeta((prev) => {
      const i = prev.findIndex((d) => d.date === selectedDay);
      if (i === -1) return [...prev, { ...selectedMeta, ...patch }];
      return prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d));
    });
  };

  const onImageUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => updateMeta({ image: String(e.target.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", border: "1px solid var(--border)", borderRadius: 8 }}>
      <DayList days={days} selectedDay={selectedDay} onSelect={setSelectedDay} dayStats={(day) => ({ net: trades.filter((t) => t.date === day).reduce((a, t) => a + Number(t.pnl || 0), 0), trades: trades.filter((t) => t.date === day).length })} />
      <div style={{ padding: 12 }}>
        <h1>Journal</h1>
        <NotesEditor value={selectedMeta.notesHtml} onChange={(v) => updateMeta({ notesHtml: v })} />
        <ImageUploader image={selectedMeta.image} onUpload={onImageUpload} onRemove={() => updateMeta({ image: "" })} />
        <h3 style={{ marginTop: 12 }}>Trades for {selectedDay}</h3>
        <TradeTable trades={dayTrades} onRowClick={() => {}} />
      </div>
    </div>
  );
}
