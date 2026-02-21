import { useMemo, useRef, useState, useEffect } from "react";

const STORAGE_KEY = "edge-journal-days";

const seedDays = [
  {
    id: "2026-02-20",
    date: "2026-02-20",
    notesHtml: "",
    image: "",
    trades: [
      { id: crypto.randomUUID(), time: "09:09", symbol: "MNQH6", side: "SHORT", qty: 1, entry: 24759.75, exit: 24722, pnl: 75.5 },
      { id: crypto.randomUUID(), time: "11:10", symbol: "MGCJ6", side: "LONG", qty: 1, entry: 5069.9, exit: 5086.1, pnl: 162 },
    ],
  },
  {
    id: "2026-02-19",
    date: "2026-02-19",
    notesHtml: "",
    image: "",
    trades: [{ id: crypto.randomUUID(), time: "08:02", symbol: "MNQH6", side: "SHORT", qty: 1, entry: 24867.5, exit: 24814.75, pnl: 105.5 }],
  },
  { id: "2026-02-18", date: "2026-02-18", notesHtml: "", image: "", trades: [] },
  { id: "2026-02-17", date: "2026-02-17", notesHtml: "", image: "", trades: [] },
];

const fmtMoney = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value || 0);

const formatDateTitle = (date) =>
  new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${date}T00:00:00`));

const createEmptyTrade = () => ({
  id: "",
  time: "",
  symbol: "",
  side: "LONG",
  qty: 1,
  entry: "",
  exit: "",
  pnl: "",
});

function App() {
  const [days, setDays] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return seedDays;
    try {
      return JSON.parse(saved);
    } catch {
      return seedDays;
    }
  });
  const [selectedDayId, setSelectedDayId] = useState(days[0]?.id ?? "");
  const [tradeDraft, setTradeDraft] = useState(createEmptyTrade());
  const [isTradeEditorOpen, setIsTradeEditorOpen] = useState(false);
  const notesRef = useRef(null);
  const imageInputRef = useRef(null);

  const selectedDay = useMemo(() => days.find((day) => day.id === selectedDayId) ?? days[0], [days, selectedDayId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
  }, [days]);

  useEffect(() => {
    if (!selectedDay) return;
    const editor = notesRef.current;
    if (!editor) return;
    if (editor.innerHTML !== selectedDay.notesHtml) {
      editor.innerHTML = selectedDay.notesHtml || "";
    }
  }, [selectedDay]);

  const updateSelectedDay = (updater) => {
    setDays((prevDays) =>
      prevDays.map((day) => {
        if (day.id !== selectedDay.id) return day;
        return updater(day);
      })
    );
  };

  const daySummary = (day) => {
    const net = day.trades.reduce((acc, trade) => acc + Number(trade.pnl || 0), 0);
    return { net, tradeCount: day.trades.length };
  };

  const handleNoteInput = (event) => {
    const html = event.currentTarget.innerHTML;
    updateSelectedDay((day) => ({ ...day, notesHtml: html === "<br>" ? "" : html }));
  };

  const applyFormat = (command) => {
    notesRef.current?.focus();
    document.execCommand(command, false);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    updateSelectedDay((day) => ({ ...day, image: base64 }));
    event.target.value = "";
  };

  const openTradeForm = (trade) => {
    setTradeDraft(
      trade
        ? { ...trade }
        : {
            ...createEmptyTrade(),
            id: crypto.randomUUID(),
          }
    );
    setIsTradeEditorOpen(true);
  };

  const saveTrade = (event) => {
    event.preventDefault();
    const normalized = {
      ...tradeDraft,
      qty: Number(tradeDraft.qty || 0),
      entry: Number(tradeDraft.entry || 0),
      exit: Number(tradeDraft.exit || 0),
      pnl: Number(tradeDraft.pnl || 0),
    };
    updateSelectedDay((day) => {
      const exists = day.trades.some((trade) => trade.id === normalized.id);
      const trades = exists
        ? day.trades.map((trade) => (trade.id === normalized.id ? normalized : trade))
        : [...day.trades, normalized];
      return { ...day, trades };
    });
    setIsTradeEditorOpen(false);
    setTradeDraft(createEmptyTrade());
  };

  const deleteTrade = (tradeId) => {
    updateSelectedDay((day) => ({ ...day, trades: day.trades.filter((trade) => trade.id !== tradeId) }));
  };

  if (!selectedDay) return null;

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar} aria-label="Trading day list">
        <h2 style={styles.sidebarTitle}>Journal Days</h2>
        <div style={styles.dayList}>
          {days.map((day) => {
            const summary = daySummary(day);
            const selected = day.id === selectedDay.id;
            return (
              <button
                key={day.id}
                type="button"
                style={{ ...styles.dayCard, ...(selected ? styles.dayCardSelected : {}) }}
                onClick={() => setSelectedDayId(day.id)}
                aria-pressed={selected}
              >
                <div style={styles.dayDate}>{formatDateTitle(day.date)}</div>
                <div style={{ ...styles.dayPnl, color: summary.net >= 0 ? "#00d08e" : "#ff597b" }}>{fmtMoney(summary.net)}</div>
                <div style={styles.smallStats}>Trades: {summary.tradeCount}</div>
              </button>
            );
          })}
        </div>
      </aside>

      <main style={styles.editorPanel}>
        <h1 style={styles.title}>{formatDateTitle(selectedDay.date)}</h1>

        <div style={styles.toolbar} role="toolbar" aria-label="Notes formatting toolbar">
          <ToolbarButton label="Bold" onClick={() => applyFormat("bold")}>B</ToolbarButton>
          <ToolbarButton label="Italic" onClick={() => applyFormat("italic")}><em>I</em></ToolbarButton>
          <ToolbarButton label="Underline" onClick={() => applyFormat("underline")}><u>U</u></ToolbarButton>
          <ToolbarButton label="Bulleted list" onClick={() => applyFormat("insertUnorderedList")}>• List</ToolbarButton>
          <ToolbarButton label="Numbered list" onClick={() => applyFormat("insertOrderedList")}>1. List</ToolbarButton>
        </div>

        <div
          ref={notesRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleNoteInput}
          style={styles.notesEditor}
          className="notes-editor"
          data-placeholder="Type your notes here..."
          aria-label="Journal notes editor"
          tabIndex={0}
        />

        <section style={styles.imageSection} aria-label="Journal image section">
          <div style={styles.sectionHeader}>Image</div>
          {!selectedDay.image ? (
            <button type="button" style={styles.addImageButton} onClick={() => imageInputRef.current?.click()}>
              Add Image
            </button>
          ) : (
            <div style={styles.imageWrap}>
              <img src={selectedDay.image} alt="Uploaded journal" style={styles.previewImage} />
              <div style={styles.imageActions}>
                <button type="button" style={styles.secondaryButton} onClick={() => imageInputRef.current?.click()}>
                  Replace
                </button>
                <button type="button" style={styles.secondaryButton} onClick={() => updateSelectedDay((day) => ({ ...day, image: "" }))}>
                  Remove
                </button>
              </div>
            </div>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
        </section>

        <section style={styles.tradesSection} aria-label="Trades list">
          <div style={{ ...styles.sectionHeader, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Trades
            <button type="button" style={styles.primaryButton} onClick={() => openTradeForm()}>
              Add Trade
            </button>
          </div>

          {selectedDay.trades.length === 0 ? (
            <div style={styles.emptyState}>No trades logged for this day yet.</div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {[
                      "Time",
                      "Symbol",
                      "Side",
                      "Qty",
                      "Entry",
                      "Exit",
                      "P&L",
                      "Actions",
                    ].map((header) => (
                      <th key={header} style={styles.th}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedDay.trades.map((trade) => (
                    <tr key={trade.id}>
                      <td style={styles.td}>{trade.time}</td>
                      <td style={styles.td}>{trade.symbol}</td>
                      <td style={styles.td}>{trade.side}</td>
                      <td style={styles.td}>{trade.qty}</td>
                      <td style={styles.td}>{trade.entry}</td>
                      <td style={styles.td}>{trade.exit}</td>
                      <td style={{ ...styles.td, color: trade.pnl >= 0 ? "#00d08e" : "#ff597b" }}>{fmtMoney(trade.pnl)}</td>
                      <td style={styles.td}>
                        <button type="button" style={styles.linkButton} onClick={() => openTradeForm(trade)}>
                          Edit
                        </button>
                        <button type="button" style={styles.linkButton} onClick={() => deleteTrade(trade.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isTradeEditorOpen && (
            <form style={styles.tradeForm} onSubmit={saveTrade}>
              {[
                ["time", "Time", "time"],
                ["symbol", "Symbol", "text"],
                ["side", "Side", "text"],
                ["qty", "Qty", "number"],
                ["entry", "Entry", "number"],
                ["exit", "Exit", "number"],
                ["pnl", "P&L", "number"],
              ].map(([key, label, type]) => (
                <label key={key} style={styles.formLabel}>
                  {label}
                  <input
                    type={type}
                    step={type === "number" ? "any" : undefined}
                    value={tradeDraft[key]}
                    onChange={(event) => setTradeDraft((prev) => ({ ...prev, [key]: event.target.value }))}
                    style={styles.input}
                    required={key !== "pnl"}
                  />
                </label>
              ))}
              <div style={styles.formActions}>
                <button type="submit" style={styles.primaryButton}>Save Trade</button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => {
                    setIsTradeEditorOpen(false);
                    setTradeDraft(createEmptyTrade());
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      </main>

      <style>{`
        body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #09111d; }
        .notes-editor:empty:before {
          content: attr(data-placeholder);
          color: #607089;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

function ToolbarButton({ children, onClick, label }) {
  return (
    <button type="button" onClick={onClick} style={styles.toolbarButton} aria-label={label}>
      {children}
    </button>
  );
}

const styles = {
  page: { display: "grid", gridTemplateColumns: "330px 1fr", minHeight: "100vh", color: "#dbe7f8" },
  sidebar: { borderRight: "1px solid #243047", background: "#111c33", padding: "18px 14px", display: "flex", flexDirection: "column", minHeight: 0 },
  sidebarTitle: { margin: "4px 8px 16px", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8ea1bd" },
  dayList: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 },
  dayCard: { textAlign: "left", border: "1px solid #1f2b41", background: "#0e1628", borderRadius: 10, padding: 14, color: "#dbe7f8" },
  dayCardSelected: { background: "#1a2850", border: "1px solid #3d5b99", boxShadow: "0 0 0 1px #3d5b99 inset" },
  dayDate: { fontSize: 14, marginBottom: 10 },
  dayPnl: { fontSize: 36, fontWeight: 700, marginBottom: 8 },
  smallStats: { color: "#8ea1bd", fontSize: 13 },
  editorPanel: { padding: "24px 28px", background: "#0a1323", overflowY: "auto" },
  title: { fontSize: 46, marginBottom: 16 },
  toolbar: { display: "flex", gap: 8, borderBottom: "1px solid #22314a", paddingBottom: 10, marginBottom: 16 },
  toolbarButton: { background: "#142238", border: "1px solid #2d4060", color: "#dbe7f8", borderRadius: 6, padding: "6px 10px", minWidth: 44 },
  notesEditor: { minHeight: 180, border: "1px solid #22314a", borderRadius: 10, padding: 14, marginBottom: 20, lineHeight: 1.5, outline: "none" },
  imageSection: { borderTop: "1px solid #22314a", paddingTop: 16, marginBottom: 20 },
  sectionHeader: { fontWeight: 700, marginBottom: 12 },
  addImageButton: { border: "1px dashed #4c5f7e", background: "transparent", color: "#9cb1cf", borderRadius: 10, padding: "22px 26px" },
  imageWrap: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" },
  previewImage: { width: 240, maxWidth: "100%", borderRadius: 10, border: "1px solid #22314a" },
  imageActions: { display: "flex", gap: 10 },
  tradesSection: { borderTop: "1px solid #22314a", paddingTop: 16, paddingBottom: 30 },
  emptyState: { border: "1px dashed #3c4f6f", borderRadius: 10, padding: 18, color: "#8396b5" },
  tableWrap: { overflowX: "auto", border: "1px solid #22314a", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", borderBottom: "1px solid #22314a", padding: 10, color: "#90a4c4", fontSize: 13 },
  td: { borderBottom: "1px solid #18253a", padding: 10, fontSize: 14 },
  linkButton: { background: "none", border: "none", color: "#8ac5ff", marginRight: 6 },
  tradeForm: { marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, border: "1px solid #22314a", padding: 12, borderRadius: 10 },
  formLabel: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#90a4c4" },
  input: { background: "#111f34", color: "#e6f0ff", border: "1px solid #2a3c59", borderRadius: 6, padding: "8px 10px" },
  formActions: { gridColumn: "1 / -1", display: "flex", gap: 8 },
  primaryButton: { background: "#2b8cf5", color: "white", border: "none", borderRadius: 7, padding: "8px 12px" },
  secondaryButton: { background: "#16253c", color: "#dbe7f8", border: "1px solid #2a3c59", borderRadius: 7, padding: "8px 12px" },
};

export default App;
