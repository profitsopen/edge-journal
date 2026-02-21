import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from "recharts";

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #080c10; --surface: #0e1419; --surface2: #141c24; --surface3: #1a2433;
      --border: #1e2d3d; --border2: #243447;
      --text: #e2eaf4; --muted: #5a7a9a; --dim: #2d4259;
      --green: #00e5a0; --green-dim: #00e5a015; --green-mid: #00e5a040;
      --red: #ff4d6a; --red-dim: #ff4d6a15; --red-mid: #ff4d6a40;
      --blue: #3b9eff; --blue-dim: #3b9eff15; --gold: #f5c842;
      --font-display: 'Syne', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    html, body, #root { height: 100%; background: var(--bg); color: var(--text); }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
    button { cursor: pointer; font-family: var(--font-mono); }
    input, textarea, select { font-family: var(--font-mono); color: var(--text); }
    .hover-row:hover { background: var(--surface2) !important; }
    .nav-item { transition: all 0.15s; }
    .nav-item:hover { color: var(--text) !important; background: var(--surface2) !important; }
    .mistake-tag { transition: all 0.15s; }
    .mistake-tag:hover { opacity: 0.85; }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .fade-up   { animation: fadeUp 0.35s ease both; }
    .fade-up-2 { animation: fadeUp 0.35s 0.07s ease both; }
    .fade-up-3 { animation: fadeUp 0.35s 0.14s ease both; }
    .journal-notes:empty::before { content: attr(data-placeholder); color: var(--muted); font-style: italic; }
  `}</style>
);

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const DEMO_TRADES = [
  { id:"t1",  date:"2026-02-17", symbol:"MNQH6", side:"SHORT", contracts:1, entryTime:"10:09:15", exitTime:"10:10:08", entryPrice:24517.25, exitPrice:24538.5,   pnl:-42.5, ticks:-85,  duration:"0:53",  win:false },
  { id:"t2",  date:"2026-02-17", symbol:"MNQH6", side:"SHORT", contracts:1, entryTime:"10:11:10", exitTime:"10:13:29", entryPrice:24507.25, exitPrice:24502,     pnl:10.5,  ticks:21,   duration:"2:19",  win:true  },
  { id:"t3",  date:"2026-02-17", symbol:"MNQH6", side:"SHORT", contracts:1, entryTime:"10:11:10", exitTime:"10:13:29", entryPrice:24507,    exitPrice:24502,     pnl:10,    ticks:20,   duration:"2:19",  win:true  },
  { id:"t4",  date:"2026-02-17", symbol:"MNQH6", side:"LONG",  contracts:2, entryTime:"10:16:02", exitTime:"10:17:53", entryPrice:24519.25, exitPrice:24569.625, pnl:201.5, ticks:201,  duration:"1:51",  win:true  },
  { id:"t5",  date:"2026-02-17", symbol:"MNQH6", side:"LONG",  contracts:2, entryTime:"13:12:21", exitTime:"13:22:47", entryPrice:24667.75, exitPrice:24740.5,   pnl:291,   ticks:291,  duration:"10:26", win:true  },
  { id:"t6",  date:"2026-02-18", symbol:"MNQH6", side:"LONG",  contracts:1, entryTime:"09:54:26", exitTime:"10:04:04", entryPrice:24867.25, exitPrice:24992.25,  pnl:250,   ticks:500,  duration:"9:38",  win:true  },
  { id:"t7",  date:"2026-02-19", symbol:"MNQH6", side:"SHORT", contracts:1, entryTime:"08:02:43", exitTime:"08:25:01", entryPrice:24867.5,  exitPrice:24814.75,  pnl:105.5, ticks:211,  duration:"22:18", win:true  },
  { id:"t8",  date:"2026-02-19", symbol:"MNQH6", side:"LONG",  contracts:1, entryTime:"08:51:56", exitTime:"08:55:45", entryPrice:24863.5,  exitPrice:24869,     pnl:11,    ticks:22,   duration:"3:49",  win:true  },
  { id:"t9",  date:"2026-02-19", symbol:"MNQH6", side:"SHORT", contracts:1, entryTime:"09:02:31", exitTime:"09:06:54", entryPrice:24847.75, exitPrice:24836.75,  pnl:22,    ticks:44,   duration:"4:23",  win:true  },
  { id:"t10", date:"2026-02-19", symbol:"MNQH6", side:"SHORT", contracts:1, entryTime:"09:35:27", exitTime:"09:37:55", entryPrice:24828.25, exitPrice:24806.75,  pnl:43,    ticks:86,   duration:"2:28",  win:true  },
  { id:"t11", date:"2026-02-19", symbol:"MGCJ6", side:"LONG",  contracts:1, entryTime:"10:22:32", exitTime:"10:30:50", entryPrice:5024.5,   exitPrice:5040.8,    pnl:163,   ticks:163,  duration:"8:18",  win:true  },
  { id:"t12", date:"2026-02-19", symbol:"MNQH6", side:"LONG",  contracts:1, entryTime:"10:24:16", exitTime:"10:26:42", entryPrice:24902.5,  exitPrice:24880,     pnl:-45,   ticks:-90,  duration:"2:26",  win:false },
  { id:"t13", date:"2026-02-20", symbol:"MNQH6", side:"SHORT", contracts:1, entryTime:"09:09:02", exitTime:"09:15:37", entryPrice:24759.75, exitPrice:24722,     pnl:75.5,  ticks:151,  duration:"6:35",  win:true  },
  { id:"t14", date:"2026-02-20", symbol:"MNQH6", side:"LONG",  contracts:1, entryTime:"09:54:32", exitTime:"10:00:03", entryPrice:24870,    exitPrice:24892.75,  pnl:45.5,  ticks:91,   duration:"5:31",  win:true  },
  { id:"t15", date:"2026-02-20", symbol:"MNQH6", side:"LONG",  contracts:1, entryTime:"09:58:06", exitTime:"10:00:03", entryPrice:24883.25, exitPrice:24892.75,  pnl:19,    ticks:38,   duration:"1:57",  win:true  },
  { id:"t16", date:"2026-02-20", symbol:"MGCJ6", side:"LONG",  contracts:1, entryTime:"11:10:46", exitTime:"11:34:08", entryPrice:5069.9,   exitPrice:5086.1,    pnl:162,   ticks:162,  duration:"23:22", win:true  },
  { id:"t17", date:"2026-02-20", symbol:"MGCJ6", side:"LONG",  contracts:1, entryTime:"11:10:46", exitTime:"11:32:59", entryPrice:5069.8,   exitPrice:5084.7,    pnl:149,   ticks:149,  duration:"22:13", win:true  },
];

const DEMO_PLAYBOOKS = [
  { id:"pb1", name:"ORB",            description:"Opening Range Breakout — first 5-min candle break with volume", color:"#3b9eff" },
  { id:"pb2", name:"VWAP Reclaim",   description:"Price drops under VWAP, reclaims it with momentum",            color:"#00e5a0" },
  { id:"pb3", name:"Break & Retest", description:"Key level breaks, pulls back, holds as new S/R",               color:"#f5c842" },
];

// ─── MISTAKE TAGS ─────────────────────────────────────────────────────────────
const MISTAKE_OPTIONS = [
  { id:"chased",    label:"Chased Entry",      color:"#f87171" },
  { id:"movedstop", label:"Moved Stop",        color:"#fb923c" },
  { id:"earlyexit", label:"Exited Too Early",  color:"#fbbf24" },
  { id:"lateexit",  label:"Exited Too Late",   color:"#a78bfa" },
  { id:"oversize",  label:"Oversized",         color:"#f43f5e" },
  { id:"revenge",   label:"Revenge Trade",     color:"#ef4444" },
  { id:"noplan",    label:"No Plan",           color:"#f97316" },
  { id:"fomo",      label:"FOMO",              color:"#ec4899" },
  { id:"overtraded",label:"Overtraded",        color:"#e879f9" },
  { id:"ignored",   label:"Ignored Signal",    color:"#94a3b8" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt        = (n, d=2)  => n == null ? "—" : (n >= 0 ? "+" : "") + "$" + Math.abs(n).toFixed(d);
const fmtAbs     = (n, d=0)  => n == null ? "—" : "$" + Math.abs(n).toFixed(d);
const pct        = (n)       => (n * 100).toFixed(1) + "%";
const gradeColor = g => ({ A:"#00e5a0", B:"#3b9eff", C:"#f5c842", D:"#ff9a3b", F:"#ff4d6a" }[g] || "#5a7a9a");
const sideColor  = s => s === "LONG" ? "var(--green)" : "var(--red)";

// R-multiple: P&L / initial risk (1R in dollars). Returns null if no risk set.
const calcR = (pnl, risk1R) => {
  const r = parseFloat(risk1R);
  if (!r || r <= 0) return null;
  return pnl / r;
};
const fmtR = (r) => {
  if (r == null) return "—";
  return (r >= 0 ? "+" : "") + r.toFixed(2) + "R";
};
const rColor = (r) => {
  if (r == null) return "var(--muted)";
  if (r >= 2)  return "#00e5a0";
  if (r >= 1)  return "#60d394";
  if (r >= 0)  return "#fbbf24";
  if (r >= -1) return "#fb923c";
  return "#ff4d6a";
};

// A trade is "reviewed" if it has a grade OR a setup tag filled in
const isReviewed = (n) => !!(n?.grade || n?.setup?.trim());

function parseCSV(text) {
  const lines   = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  return lines.slice(1)
    .map(l => {
      const vals = l.split(",").map(v => v.trim().replace(/"/g, ""));
      const r = {};
      headers.forEach((h, i) => { r[h] = vals[i]; });
      return r;
    })
    .filter(r => r[headers[0]])
    .map((r, i) => {
      const symbol     = r.symbol    || r.Symbol    || r.instrument || r.Instrument || "UNKNOWN";
      const rawSide    = (r.side     || r.Side      || r.action     || r.Action     || "LONG").toUpperCase();
      const side       = rawSide.includes("SELL") || rawSide.includes("SHORT") ? "SHORT" : "LONG";
      const pnl        = parseFloat(r.pnl       || r.PnL  || r["P&L"]       || r.profit || 0);
      const entryPrice = parseFloat(r.entryPrice || r.entry_price || r["Entry Price"] || 0);
      const exitPrice  = parseFloat(r.exitPrice  || r.exit_price  || r["Exit Price"]  || 0);
      const contracts  = parseInt  (r.contracts  || r.qty         || r.Qty            || 1);
      const date       = r.date || r.Date || new Date().toISOString().slice(0,10);
      const entryTime  = r.entryTime || r.entry_time || r["Entry Time"] || "00:00:00";
      const exitTime   = r.exitTime  || r.exit_time  || r["Exit Time"]  || "00:00:00";
      return { id:`imp_${i}`, date, symbol, side, contracts, entryTime, exitTime, entryPrice, exitPrice, pnl, ticks:0, duration:"—", win: pnl > 0 };
    });
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const Chip = ({ children, color="var(--muted)" }) => (
  <span style={{ fontFamily:"var(--font-mono)", fontSize:11, fontWeight:600, color, background:color+"20", padding:"2px 8px", borderRadius:4, display:"inline-flex", alignItems:"center" }}>
    {children}
  </span>
);

const StatCard = ({ label, value, sub, color, delay="0s", big }) => (
  <div className="fade-up" style={{ animationDelay:delay, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"18px 20px" }}>
    <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>{label}</div>
    <div style={{ fontFamily:"var(--font-display)", fontSize:big?32:24, fontWeight:700, color:color||"var(--text)", lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", marginTop:6 }}>{sub}</div>}
  </div>
);

const SectionTitle = ({ title, action }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
    <div style={{ fontFamily:"var(--font-display)", fontSize:12, fontWeight:700, color:"var(--muted)", letterSpacing:"0.12em", textTransform:"uppercase" }}>{title}</div>
    {action}
  </div>
);

const Btn = ({ children, onClick, variant="default", style:sx={}, ...rest }) => {
  const styles = {
    default: { background:"var(--surface2)", border:"1px solid var(--border2)", color:"var(--text)" },
    primary: { background:"var(--green)",    border:"1px solid var(--green)",   color:"#000", fontWeight:700 },
    ghost:   { background:"transparent",     border:"1px solid var(--border)",  color:"var(--muted)" },
    active:  { background:"var(--blue-dim)", border:"1px solid var(--blue)",    color:"var(--blue)", fontWeight:700 },
  };
  return (
    <button type="button" onClick={onClick} style={{ ...styles[variant], padding:"8px 16px", borderRadius:7, fontSize:12, fontWeight:600, display:"inline-flex", alignItems:"center", gap:6, transition:"all 0.15s", ...sx }} {...rest}>
      {children}
    </button>
  );
};

// ─── IMPORT MODAL ─────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImport }) {
  const [dragging, setDragging] = useState(false);
  const [parsed,   setParsed]   = useState(null);
  const fileRef = useRef();

  const handleFile = file => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try { setParsed(parseCSV(e.target.result)); }
      catch { alert("Could not parse file — make sure it's a CSV with headers."); }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000b", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:14, padding:32, width:520 }}>
        <div style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, marginBottom:4 }}>Import Trades</div>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", marginBottom:24 }}>CSV · Tradovate · Rithmic · NinjaTrader · Sierra Chart</div>
        <div
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0]);}}
          onClick={()=>fileRef.current.click()}
          style={{ border:`2px dashed ${dragging?"var(--green)":"var(--border2)"}`, borderRadius:10, padding:"36px 24px", textAlign:"center", cursor:"pointer", transition:"all 0.2s", background:dragging?"var(--green-dim)":"transparent", marginBottom:20 }}
        >
          <div style={{ fontSize:36, marginBottom:10 }}>📂</div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:13, color:dragging?"var(--green)":"var(--muted)" }}>Drop CSV here or click to browse</div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])} />
        </div>
        {parsed ? (
          <div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--green)", marginBottom:10 }}>✓ Found {parsed.length} trades</div>
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:12, fontSize:11, fontFamily:"var(--font-mono)", marginBottom:16, maxHeight:120, overflowY:"auto" }}>
              {parsed.slice(0,4).map((t,i)=>(
                <div key={i} style={{ marginBottom:4, color:"var(--text)" }}>{t.date} · {t.symbol} · {t.side} · {fmt(t.pnl,1)}</div>
              ))}
              {parsed.length > 4 && <div style={{ color:"var(--muted)" }}>… and {parsed.length-4} more</div>}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn variant="primary" onClick={()=>{onImport(parsed);onClose();}}>Import {parsed.length} Trades</Btn>
              <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            </div>
          </div>
        ) : (
          <Btn variant="ghost" onClick={onClose} style={{ width:"100%", justifyContent:"center" }}>Cancel</Btn>
        )}
      </div>
    </div>
  );
}

// ─── TRADE DETAIL PANEL ───────────────────────────────────────────────────────
const JOURNAL_FIELDS = [
  { key:"setup",         label:"Setup / Playbook Tag",  ph:"e.g. ORB, VWAP Reclaim, Break & Retest…", type:"datalist" },
  { key:"entryTrigger",  label:"Entry Trigger",         ph:"What had to be true to enter?" },
  { key:"plannedStop",   label:"Planned Stop",          ph:"Where was your invalidation?" },
  { key:"plannedTarget", label:"Planned Target",        ph:"What was your target level?" },
  { key:"exitReason",    label:"Exit Reason",           ph:"TP / SL / Manual / Trailing / Time…" },
  { key:"marketContext", label:"Market Context",        ph:"Trend, key levels, news flow, volatility…" },
  { key:"screenshot",    label:"Chart Screenshot/Link", ph:"Paste filename or URL", type:"input" },
  { key:"didWell",       label:"✓ What I Did Well",     ph:"Be specific and honest…" },
  { key:"improve",       label:"↗ What to Improve",     ph:"One actionable thing for next time…" },
];

function TradeDetail({ trade, notes, playbooks, onUpdate, onClose, onPrev, onNext, hasPrev, hasNext }) {
  const n   = notes[trade.id] || {};
  const upd = (k, v) => onUpdate(trade.id, k, v);

  const risk1R = parseFloat(n.risk1R) || null;
  const rVal   = calcR(trade.pnl, n.risk1R);

  const toggleMistake = (mid) => {
    const current = n.mistakes || [];
    const next = current.includes(mid) ? current.filter(x=>x!==mid) : [...current, mid];
    upd("mistakes", next);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000b", zIndex:500, display:"flex", alignItems:"flex-start", justifyContent:"flex-end" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ width:500, height:"100vh", background:"var(--surface)", borderLeft:"1px solid var(--border2)", overflowY:"auto", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--border)", position:"sticky", top:0, background:"var(--surface)", zIndex:10 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Chip color={sideColor(trade.side)}>{trade.side === "LONG" ? "▲" : "▼"} {trade.side}</Chip>
              <Chip color="var(--muted)">{trade.symbol}</Chip>
              <Chip color="var(--muted)">{trade.date}</Chip>
              {isReviewed(n)
                ? <Chip color="var(--green)">✓ Reviewed</Chip>
                : <Chip color="var(--gold)">○ Unreviewed</Chip>
              }
            </div>
            <div style={{ display:"flex", gap:4, alignItems:"center" }}>
              <button onClick={onPrev} disabled={!hasPrev} style={{ background:"none", border:"none", color:hasPrev?"var(--muted)":"var(--dim)", fontSize:18 }}>‹</button>
              <button onClick={onNext} disabled={!hasNext} style={{ background:"none", border:"none", color:hasNext?"var(--muted)":"var(--dim)", fontSize:18 }}>›</button>
              <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:22, lineHeight:1 }}>×</button>
            </div>
          </div>

          {/* Snapshot — now includes R-multiple */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
            {[
              { l:"P&L",      v:fmt(trade.pnl,1),                    c:trade.pnl>=0?"var(--green)":"var(--red)" },
              { l:"R-MULTIPLE",v:fmtR(rVal),                          c:rColor(rVal) },
              { l:"TICKS",    v:(trade.ticks>=0?"+":"")+trade.ticks,  c:trade.ticks>=0?"var(--green)":"var(--red)" },
              { l:"DURATION", v:trade.duration,                        c:"var(--text)" },
              { l:"ENTRY",    v:trade.entryPrice,                      c:"var(--text)" },
              { l:"EXIT",     v:trade.exitPrice,                       c:"var(--text)" },
              { l:"CONTRACTS",v:trade.contracts,                       c:"var(--text)" },
              { l:"1R RISK",  v:risk1R?`$${risk1R}`:"set below",      c:risk1R?"var(--text)":"var(--dim)" },
            ].map(s=>(
              <div key={s.l} style={{ background:"var(--surface2)", borderRadius:7, padding:"10px 12px" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.08em", marginBottom:4 }}>{s.l}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:13, fontWeight:600, color:s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:"20px 24px", flex:1 }}>

          {/* ── R-MULTIPLE INPUT ── */}
          <div style={{ background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:9, padding:"14px 16px", marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:2 }}>R-MULTIPLE CALCULATOR</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--dim)" }}>R = P&L ÷ Initial Risk (1R)</div>
              </div>
              {rVal != null && (
                <div style={{ fontFamily:"var(--font-display)", fontSize:26, fontWeight:800, color:rColor(rVal) }}>{fmtR(rVal)}</div>
              )}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", marginBottom:5, letterSpacing:"0.08em" }}>MY 1R RISK ON THIS TRADE ($)</div>
                <div style={{ display:"flex", alignItems:"center", gap:0, background:"var(--bg)", border:"1px solid var(--border)", borderRadius:7, overflow:"hidden" }}>
                  <span style={{ padding:"9px 12px", fontFamily:"var(--font-mono)", fontSize:13, color:"var(--muted)", borderRight:"1px solid var(--border)" }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={n.risk1R||""}
                    onChange={e=>upd("risk1R", e.target.value)}
                    placeholder="e.g. 50"
                    style={{ flex:1, background:"transparent", border:"none", padding:"9px 12px", fontSize:13, outline:"none" }}
                  />
                </div>
              </div>
              {rVal != null && (
                <div style={{ background:rColor(rVal)+"15", border:`1px solid ${rColor(rVal)}40`, borderRadius:8, padding:"12px 16px", textAlign:"center", minWidth:90 }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", marginBottom:4 }}>RESULT</div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, color:rColor(rVal) }}>{fmtR(rVal)}</div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", marginTop:2 }}>
                    {rVal>=2?"Great R":rVal>=1?"Positive R":rVal>=0?"Scratch":rVal>=-1?"Small loss":"Large loss"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grade + Rule Adherence */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>GRADE</div>
              <div style={{ display:"flex", gap:5 }}>
                {["A","B","C","D","F"].map(g=>(
                  <button key={g} onClick={()=>upd("grade", n.grade===g?null:g)} style={{ flex:1, padding:"7px 0", border:`1px solid ${n.grade===g?gradeColor(g):"var(--border)"}`, borderRadius:6, background:n.grade===g?gradeColor(g)+"22":"transparent", color:n.grade===g?gradeColor(g):"var(--muted)", fontSize:13, fontWeight:700, transition:"all 0.15s" }}>{g}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>RULE ADHERENCE</div>
              <div style={{ display:"flex", gap:8 }}>
                {[{v:"Y",l:"✓ YES",c:"var(--green)"},{v:"N",l:"✗ NO",c:"var(--red)"}].map(o=>(
                  <button key={o.v} onClick={()=>upd("rules", n.rules===o.v?null:o.v)} style={{ flex:1, padding:"7px 0", border:`1px solid ${n.rules===o.v?o.c:"var(--border)"}`, borderRadius:6, background:n.rules===o.v?o.c+"22":"transparent", color:n.rules===o.v?o.c:"var(--muted)", fontSize:12, fontWeight:700, transition:"all 0.15s" }}>{o.l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ── MISTAKE TAGS ── */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:10 }}>MISTAKE TAGS <span style={{ color:"var(--dim)", fontWeight:400 }}>— select all that apply</span></div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {MISTAKE_OPTIONS.map(m => {
                const active = (n.mistakes||[]).includes(m.id);
                return (
                  <button
                    key={m.id}
                    className="mistake-tag"
                    onClick={()=>toggleMistake(m.id)}
                    style={{
                      padding:"5px 12px",
                      borderRadius:20,
                      border:`1px solid ${active ? m.color : "var(--border)"}`,
                      background: active ? m.color+"22" : "transparent",
                      color: active ? m.color : "var(--muted)",
                      fontSize:11,
                      fontWeight: active ? 700 : 400,
                      fontFamily:"var(--font-mono)",
                    }}
                  >
                    {active ? "✕ " : ""}{m.label}
                  </button>
                );
              })}
            </div>
            {(n.mistakes||[]).length > 0 && (
              <div style={{ marginTop:10, fontFamily:"var(--font-mono)", fontSize:10, color:"var(--red)" }}>
                ⚠ {(n.mistakes||[]).length} mistake{(n.mistakes||[]).length>1?"s":""} tagged — cost: {fmt(trade.pnl < 0 ? trade.pnl : 0, 1)}
              </div>
            )}
          </div>

          {/* Journal fields */}
          {JOURNAL_FIELDS.map(f=>(
            <div key={f.key} style={{ marginBottom:14 }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:6 }}>{f.label.toUpperCase()}</div>
              {f.type === "input" || f.type === "datalist" ? (
                <>
                  <input
                    value={n[f.key]||""}
                    onChange={e=>upd(f.key,e.target.value)}
                    placeholder={f.ph}
                    list={f.type==="datalist"?"pb-list":undefined}
                    style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:7, padding:"9px 12px", fontSize:12, outline:"none", transition:"border 0.15s" }}
                    onFocus={e=>e.target.style.borderColor="var(--blue)"}
                    onBlur={e=>e.target.style.borderColor="var(--border)"}
                  />
                  {f.type==="datalist" && (
                    <datalist id="pb-list">{playbooks.map(p=><option key={p.id} value={p.name}/>)}</datalist>
                  )}
                </>
              ) : (
                <textarea
                  value={n[f.key]||""}
                  onChange={e=>upd(f.key,e.target.value)}
                  placeholder={f.ph}
                  rows={f.key==="marketContext"||f.key==="didWell"||f.key==="improve"?3:2}
                  style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:7, padding:"9px 12px", fontSize:12, resize:"vertical", lineHeight:1.6, outline:"none", transition:"border 0.15s" }}
                  onFocus={e=>e.target.style.borderColor="var(--blue)"}
                  onBlur={e=>e.target.style.borderColor="var(--border)"}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ trades, notes }) {
  const s = useMemo(()=>{
    if (!trades.length) return null;
    const wins   = trades.filter(t=>t.win);
    const losses = trades.filter(t=>!t.win);
    const total  = trades.reduce((a,t)=>a+t.pnl,0);
    const avgW   = wins.length   ? wins.reduce((a,t)=>a+t.pnl,0)/wins.length : 0;
    const avgL   = losses.length ? Math.abs(losses.reduce((a,t)=>a+t.pnl,0)/losses.length) : 0;
    const pf     = avgL > 0 ? wins.reduce((a,t)=>a+t.pnl,0) / Math.abs(losses.reduce((a,t)=>a+t.pnl,0)) : 0;

    // R-multiple stats
    const rTrades = trades.filter(t=>calcR(t.pnl, notes[t.id]?.risk1R) != null);
    const rVals   = rTrades.map(t=>calcR(t.pnl, notes[t.id]?.risk1R));
    const avgR    = rVals.length ? rVals.reduce((a,b)=>a+b,0)/rVals.length : null;
    const totalR  = rVals.length ? rVals.reduce((a,b)=>a+b,0) : null;

    // Reviewed stats
    const reviewed   = trades.filter(t=>isReviewed(notes[t.id]));
    const unreviewed = trades.length - reviewed.length;

    // Mistake stats
    const mistakeCounts = {};
    trades.forEach(t=>{
      (notes[t.id]?.mistakes||[]).forEach(m=>{
        mistakeCounts[m] = (mistakeCounts[m]||0)+1;
      });
    });
    const topMistakes = Object.entries(mistakeCounts).sort(([,a],[,b])=>b-a).slice(0,4);

    const byDate = {};
    trades.forEach(t=>{
      if (!byDate[t.date]) byDate[t.date]={pnl:0,count:0,wins:0};
      byDate[t.date].pnl+=t.pnl; byDate[t.date].count++; if(t.win) byDate[t.date].wins++;
    });
    const days = Object.entries(byDate).sort(([a],[b])=>a.localeCompare(b));
    let run=0;
    const curve = days.map(([date,d])=>{ run+=d.pnl; return {date:date.slice(5),cum:run,day:d.pnl}; });
    const bySymbol = {};
    trades.forEach(t=>{ if(!bySymbol[t.symbol]) bySymbol[t.symbol]={pnl:0,count:0,wins:0}; bySymbol[t.symbol].pnl+=t.pnl; bySymbol[t.symbol].count++; if(t.win) bySymbol[t.symbol].wins++; });
    const gradeMap = {};
    trades.forEach(t=>{ const g=notes[t.id]?.grade; if(g){ if(!gradeMap[g]) gradeMap[g]={pnl:0,count:0}; gradeMap[g].pnl+=t.pnl; gradeMap[g].count++; } });
    const best  = days.reduce((a,b)=>a[1].pnl>b[1].pnl?a:b, days[0]);
    const worst = days.reduce((a,b)=>a[1].pnl<b[1].pnl?a:b, days[0]);

    return { total, winRate:wins.length/trades.length, avgW, avgL, pf, wCount:wins.length, lCount:losses.length, tCount:trades.length, curve, bySymbol, gradeMap, best, worst, avgR, totalR, rCount:rVals.length, reviewed:reviewed.length, unreviewed, topMistakes };
  },[trades,notes]);

  if (!s) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60vh", gap:12 }}>
      <div style={{ fontSize:48 }}>📊</div>
      <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--muted)" }}>No trades yet — import a CSV to get started</div>
    </div>
  );

  const TT = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:8, padding:"10px 14px", fontFamily:"var(--font-mono)", fontSize:12 }}>
        <div style={{ color:"var(--muted)", marginBottom:4 }}>{d.date}</div>
        <div style={{ color:d.cum>=0?"var(--green)":"var(--red)", fontWeight:600 }}>Cumulative: {fmt(d.cum,0)}</div>
        <div style={{ color:d.day>=0?"var(--green)":"var(--red)" }}>Day: {fmt(d.day,0)}</div>
      </div>
    );
  };

  return (
    <div>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:12 }}>
        <StatCard label="NET P&L"       value={fmtAbs(s.total,0)}   color={s.total>=0?"var(--green)":"var(--red)"}     delay="0s"    big />
        <StatCard label="WIN RATE"      value={pct(s.winRate)}       color="var(--blue)"                                delay="0.05s"    />
        <StatCard label="PROFIT FACTOR" value={s.pf.toFixed(2)}      color={s.pf>=2?"var(--green)":"var(--gold)"}       delay="0.10s"    />
        <StatCard label="AVG WIN"       value={fmtAbs(s.avgW,0)}     color="var(--green)" sub={`${s.wCount} winners`}   delay="0.15s"    />
        <StatCard label="AVG LOSS"      value={fmtAbs(s.avgL,0)}     color="var(--red)"   sub={`${s.lCount} losers`}    delay="0.20s"    />
      </div>

      {/* R-Multiple + Review row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:12 }}>
        <div className="fade-up" style={{ animationDelay:"0.05s", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"18px 20px" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>AVG R-MULTIPLE</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:700, color:s.avgR!=null?rColor(s.avgR):"var(--dim)", lineHeight:1 }}>
            {s.avgR!=null ? fmtR(s.avgR) : "—"}
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", marginTop:6 }}>
            {s.rCount > 0 ? `${s.rCount} trades with 1R set` : "Set 1R in trade detail to track"}
          </div>
        </div>
        <div className="fade-up" style={{ animationDelay:"0.08s", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"18px 20px" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>TOTAL R EARNED</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:700, color:s.totalR!=null&&s.totalR>=0?"var(--green)":s.totalR!=null?"var(--red)":"var(--dim)", lineHeight:1 }}>
            {s.totalR!=null ? fmtR(s.totalR) : "—"}
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", marginTop:6 }}>across {s.rCount} graded trades</div>
        </div>
        <div className="fade-up" style={{ animationDelay:"0.11s", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"18px 20px" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>REVIEWED</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:700, color:"var(--green)", lineHeight:1 }}>{s.reviewed}<span style={{ fontSize:14, color:"var(--muted)", fontWeight:400 }}>/{s.tCount}</span></div>
          <div style={{ marginTop:8, height:4, background:"var(--border)", borderRadius:2 }}>
            <div style={{ height:"100%", width:`${s.reviewed/s.tCount*100}%`, background:"var(--green)", borderRadius:2, transition:"width 0.5s ease" }}/>
          </div>
        </div>
        <div className="fade-up" style={{ animationDelay:"0.14s", background:"var(--surface)", border:`1px solid ${s.unreviewed>0?"var(--gold)40":"var(--border)"}`, borderRadius:10, padding:"18px 20px" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>NEEDS REVIEW</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:700, color:s.unreviewed>0?"var(--gold)":"var(--green)", lineHeight:1 }}>{s.unreviewed}</div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", marginTop:6 }}>
            {s.unreviewed===0 ? "All caught up ✓" : `trade${s.unreviewed!==1?"s":""} without review`}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12, marginBottom:12 }}>
        <div className="fade-up-2" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"20px 20px 12px" }}>
          <SectionTitle title="Equity Curve" />
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={s.curve} margin={{top:4,right:4,bottom:0,left:-20}}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00e5a0" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#00e5a0" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{fontFamily:"var(--font-mono)",fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontFamily:"var(--font-mono)",fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
              <Tooltip content={<TT/>}/>
              <ReferenceLine y={0} stroke="var(--border2)" strokeDasharray="3 3"/>
              <Area type="monotone" dataKey="cum" stroke="#00e5a0" strokeWidth={2} fill="url(#g1)" dot={{fill:"#00e5a0",r:4}}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="fade-up-2" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"20px 20px 12px" }}>
          <SectionTitle title="Daily P&L" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={s.curve} margin={{top:4,right:4,bottom:0,left:-20}}>
              <XAxis dataKey="date" tick={{fontFamily:"var(--font-mono)",fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontFamily:"var(--font-mono)",fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
              <Tooltip content={({active,payload})=>active&&payload?.length?<div style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:8,padding:"8px 12px",fontFamily:"var(--font-mono)",fontSize:12,color:payload[0].value>=0?"var(--green)":"var(--red)",fontWeight:600}}>{fmt(payload[0].value,0)}</div>:null}/>
              <ReferenceLine y={0} stroke="var(--border2)"/>
              <Bar dataKey="day" radius={[4,4,0,0]}>
                {s.curve.map((d,i)=><Cell key={i} fill={d.day>=0?"#00e5a0":"#ff4d6a"}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
        {/* By symbol */}
        <div className="fade-up-3" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:20 }}>
          <SectionTitle title="By Symbol"/>
          {Object.entries(s.bySymbol).map(([sym,d])=>(
            <div key={sym} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:600 }}>{sym}</span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:12, color:d.pnl>=0?"var(--green)":"var(--red)", fontWeight:600 }}>{fmt(d.pnl,0)}</span>
              </div>
              <div style={{ height:3, background:"var(--border)", borderRadius:2 }}>
                <div style={{ height:"100%", width:`${d.wins/d.count*100}%`, background:d.pnl>=0?"var(--green)":"var(--red)", borderRadius:2 }}/>
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", marginTop:4 }}>{d.count} trades · {Math.round(d.wins/d.count*100)}% WR</div>
            </div>
          ))}
        </div>

        {/* Top mistakes */}
        <div className="fade-up-3" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:20 }}>
          <SectionTitle title="Top Mistakes"/>
          {s.topMistakes.length === 0 ? (
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--dim)", paddingTop:8 }}>Tag mistakes in trade detail to see patterns</div>
          ) : (
            s.topMistakes.map(([mid, count])=>{
              const m = MISTAKE_OPTIONS.find(x=>x.id===mid);
              if (!m) return null;
              const maxCount = s.topMistakes[0][1];
              return (
                <div key={mid} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:m.color, fontWeight:600 }}>{m.label}</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{count}×</span>
                  </div>
                  <div style={{ height:3, background:"var(--border)", borderRadius:2 }}>
                    <div style={{ height:"100%", width:`${count/maxCount*100}%`, background:m.color, borderRadius:2 }}/>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Grade breakdown */}
        <div className="fade-up-3" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:20 }}>
          <SectionTitle title="By Grade"/>
          {Object.keys(s.gradeMap).length === 0
            ? <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--dim)", paddingTop:8 }}>Grade trades in the detail panel to see breakdown</div>
            : ["A","B","C","D","F"].filter(g=>s.gradeMap[g]).map(g=>(
              <div key={g} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:13, fontWeight:700, color:gradeColor(g), width:16 }}>{g}</span>
                <div style={{ flex:1, height:3, background:"var(--border)", borderRadius:2 }}>
                  <div style={{ height:"100%", width:`${s.gradeMap[g].count/s.tCount*100}%`, background:gradeColor(g), borderRadius:2 }}/>
                </div>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", width:30, textAlign:"right" }}>{s.gradeMap[g].count}x</span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:s.gradeMap[g].pnl>=0?"var(--green)":"var(--red)", width:56, textAlign:"right" }}>{fmt(s.gradeMap[g].pnl,0)}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── TRADE LOG ────────────────────────────────────────────────────────────────
function TradeLog({ trades, notes, playbooks, onSelect, onImport }) {
  const [fSide,     setFSide]     = useState("all");
  const [fSym,      setFSym]      = useState("all");
  const [fDate,     setFDate]     = useState("all");
  const [fReviewed, setFReviewed] = useState("all"); // "all" | "reviewed" | "unreviewed"
  const [modal,     setModal]     = useState(false);

  const symbols = [...new Set(trades.map(t=>t.symbol))];
  const dates   = [...new Set(trades.map(t=>t.date))].sort();

  const filtered = trades.filter(t => {
    const rev = isReviewed(notes[t.id]);
    return (
      (fSide==="all"      || t.side===fSide) &&
      (fSym ==="all"      || t.symbol===fSym) &&
      (fDate==="all"      || t.date===fDate) &&
      (fReviewed==="all"  || (fReviewed==="reviewed" ? rev : !rev))
    );
  });

  const unreviewedCount = trades.filter(t=>!isReviewed(notes[t.id])).length;

  return (
    <div>
      {modal && <ImportModal onClose={()=>setModal(false)} onImport={onImport}/>}

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <Btn variant="primary" onClick={()=>setModal(true)}>⬆ Import CSV</Btn>
        <div style={{ flex:1 }}/>

        {/* Reviewed filter — most prominent */}
        <div style={{ display:"flex", gap:4, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:3 }}>
          {[
            { v:"all",        l:"All Trades" },
            { v:"unreviewed", l:`Needs Review${unreviewedCount>0?` (${unreviewedCount})`:""}` },
            { v:"reviewed",   l:"Reviewed" },
          ].map(o=>(
            <button key={o.v} onClick={()=>setFReviewed(o.v)} style={{ padding:"5px 12px", borderRadius:6, border:"none", background:fReviewed===o.v?(o.v==="unreviewed"?"var(--gold)22":"var(--surface3)"):"transparent", color:fReviewed===o.v?(o.v==="unreviewed"?"var(--gold)":"var(--text)"):"var(--muted)", fontSize:11, fontFamily:"var(--font-mono)", fontWeight:fReviewed===o.v?700:400, transition:"all 0.15s" }}>
              {o.l}
            </button>
          ))}
        </div>

        {[{v:"all",l:"All"},{v:"LONG",l:"Long"},{v:"SHORT",l:"Short"}].map(o=>(
          <button key={o.v} onClick={()=>setFSide(o.v)} style={{ background:fSide===o.v?"var(--surface3)":"var(--surface)", border:`1px solid ${fSide===o.v?"var(--border2)":"var(--border)"}`, color:fSide===o.v?"var(--text)":"var(--muted)", padding:"6px 14px", borderRadius:6, fontSize:11, fontFamily:"var(--font-mono)", fontWeight:600 }}>{o.l}</button>
        ))}
        <select value={fSym} onChange={e=>setFSym(e.target.value)} style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--muted)", padding:"6px 12px", borderRadius:6, fontSize:11 }}>
          <option value="all">All Symbols</option>
          {symbols.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fDate} onChange={e=>setFDate(e.target.value)} style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--muted)", padding:"6px 12px", borderRadius:6, fontSize:11 }}>
          <option value="all">All Dates</option>
          {dates.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"80px 90px 64px 50px 90px 90px 86px 86px 100px 56px 60px 60px 54px", padding:"10px 16px", borderBottom:"1px solid var(--border)", gap:0 }}>
          {["DATE","SYMBOL","SIDE","QTY","ENTRY TIME","EXIT TIME","ENTRY $","EXIT $","P&L","R-MULT","STATUS","NOTES","GRADE"].map(h=>(
            <div key={h} style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.08em", fontWeight:700 }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding:40, textAlign:"center", fontFamily:"var(--font-mono)", fontSize:12, color:"var(--dim)" }}>No trades match filters</div>
        )}

        {filtered.map(t=>{
          const n      = notes[t.id]||{};
          const filled = Object.values(n).filter(v=>v&&v!==null&&v!==""&&(!Array.isArray(v)||v.length>0)).length;
          const rev    = isReviewed(n);
          const rVal   = calcR(t.pnl, n.risk1R);
          const mistakes = n.mistakes||[];
          return (
            <div key={t.id} className="hover-row" onClick={()=>onSelect(t)} style={{ display:"grid", gridTemplateColumns:"80px 90px 64px 50px 90px 90px 86px 86px 100px 56px 60px 60px 54px", padding:"11px 16px", borderBottom:"1px solid var(--border)", gap:0, alignItems:"center", cursor:"pointer", background:!t.win?"#ff4d6a05":"transparent", transition:"background 0.1s" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{t.date.slice(5)}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:600 }}>{t.symbol}</span>
              <Chip color={sideColor(t.side)}>{t.side==="LONG"?"▲L":"▼S"}</Chip>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{t.contracts}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{t.entryTime}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{t.exitTime}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11 }}>{t.entryPrice}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11 }}>{t.exitPrice}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:13, fontWeight:700, color:t.pnl>=0?"var(--green)":"var(--red)" }}>{fmt(t.pnl,1)}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:700, color:rColor(rVal) }}>{fmtR(rVal)}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:rev?"var(--green)":"var(--gold)" }}>{rev?"✓ done":"○ open"}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:filled>0?"var(--blue)":"var(--dim)" }}>
                {mistakes.length>0&&<span style={{ color:"var(--red)", marginRight:2 }}>⚠</span>}
                {filled>0?`●${filled}`:"○"}
              </span>
              {n.grade
                ? <span style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:700, color:gradeColor(n.grade), background:gradeColor(n.grade)+"22", padding:"2px 7px", borderRadius:4, display:"inline-block" }}>{n.grade}</span>
                : <span style={{ color:"var(--dim)", fontSize:11 }}>—</span>
              }
            </div>
          );
        })}
      </div>

      <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", marginTop:10, paddingLeft:4 }}>
        {filtered.length} trades · Net:{" "}
        <span style={{ color:filtered.reduce((a,t)=>a+t.pnl,0)>=0?"var(--green)":"var(--red)", fontWeight:600 }}>
          {fmt(filtered.reduce((a,t)=>a+t.pnl,0),1)}
        </span>
        {fReviewed==="unreviewed" && unreviewedCount>0 && (
          <span style={{ color:"var(--gold)", marginLeft:16 }}>⚠ {unreviewedCount} trades need review</span>
        )}
      </div>
    </div>
  );
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
function Calendar({ trades, notes }) {
  const [month,    setMonth]    = useState(new Date().getMonth()+1);
  const [year,     setYear]     = useState(new Date().getFullYear());
  const [selDay,   setSelDay]   = useState(null);
  const [dayNotes, setDayNotes] = useState({});

  const byDate = useMemo(()=>{
    const m={};
    trades.forEach(t=>{
      if(!m[t.date]) m[t.date]={pnl:0,trades:[],wins:0};
      m[t.date].pnl+=t.pnl; m[t.date].trades.push(t); if(t.win) m[t.date].wins++;
    });
    return m;
  },[trades]);

  const dim    = new Date(year, month, 0).getDate();
  const first  = new Date(year, month-1, 1).getDay();
  const maxAbs = Math.max(...Object.values(byDate).map(d=>Math.abs(d.pnl)),1);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const selKey  = selDay ? `${year}-${String(month).padStart(2,"0")}-${String(selDay).padStart(2,"0")}` : null;
  const selData = selKey ? byDate[selKey] : null;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:24 }}>
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
          <button onClick={()=>{if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1);}} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:20 }}>‹</button>
          <div style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, minWidth:160, textAlign:"center" }}>{MONTHS[month-1]} {year}</div>
          <button onClick={()=>{if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1);}} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:20 }}>›</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5, marginBottom:5 }}>
          {["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d=>(
            <div key={d} style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", textAlign:"center", padding:"4px 0", letterSpacing:"0.08em" }}>{d}</div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5 }}>
          {Array(first).fill(null).map((_,i)=><div key={"e"+i}/>)}
          {Array(dim).fill(null).map((_,i)=>{
            const day=i+1;
            const dateKey=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const d=byDate[dateKey];
            const sel=selDay===day;
            const intensity=d?Math.min(Math.abs(d.pnl)/maxAbs,1):0;
            const weekend=((first+i)%7===0)||((first+i)%7===6);
            const dayUnreviewed = d ? d.trades.filter(t=>!isReviewed(notes[t.id])).length : 0;
            return (
              <div key={day} onClick={()=>d&&setSelDay(day===selDay?null:day)} style={{ aspectRatio:"1", borderRadius:8, padding:6, border:`1px solid ${sel?"var(--blue)":d?"var(--border2)":"var(--border)"}`, background:d?(d.pnl>=0?`rgba(0,229,160,${intensity*0.3})`:`rgba(255,77,106,${intensity*0.3})`):weekend?"transparent":"var(--surface)", cursor:d?"pointer":"default", display:"flex", flexDirection:"column", justifyContent:"space-between", transition:"all 0.15s", opacity:weekend&&!d?0.3:1, position:"relative" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:d?"var(--text)":"var(--dim)" }}>{day}</div>
                {d&&<>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:10, fontWeight:700, color:d.pnl>=0?"var(--green)":"var(--red)", lineHeight:1 }}>{d.pnl>=0?"+":""}{Math.round(d.pnl)}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)" }}>{d.trades.length}T</span>
                    {dayUnreviewed>0&&<span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--gold)" }}>○{dayUnreviewed}</span>}
                  </div>
                </>}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        {selKey&&selData ? (
          <div className="fade-up">
            <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:700, marginBottom:16 }}>{selKey}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
              <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:12 }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", marginBottom:4 }}>NET P&L</div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:700, color:selData.pnl>=0?"var(--green)":"var(--red)" }}>{selData.pnl>=0?"+":""}{Math.round(selData.pnl)}</div>
              </div>
              <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:12 }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", marginBottom:4 }}>WIN RATE</div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:700, color:"var(--blue)" }}>{Math.round(selData.wins/selData.trades.length*100)}%</div>
              </div>
            </div>
            {selData.trades.map(t=>{
              const rVal = calcR(t.pnl, notes[t.id]?.risk1R);
              const rev  = isReviewed(notes[t.id]);
              return (
                <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:7, marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)" }}>{t.entryTime}</span>
                    <Chip color={sideColor(t.side)}>{t.side}</Chip>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:11 }}>{t.symbol}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {rVal!=null&&<span style={{ fontFamily:"var(--font-mono)", fontSize:11, fontWeight:700, color:rColor(rVal) }}>{fmtR(rVal)}</span>}
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:700, color:t.pnl>=0?"var(--green)":"var(--red)" }}>{fmt(t.pnl,1)}</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:rev?"var(--green)":"var(--gold)" }}>{rev?"✓":"○"}</span>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop:14 }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>DAILY REVIEW</div>
              <textarea value={dayNotes[selKey]||""} onChange={e=>setDayNotes(p=>({...p,[selKey]:e.target.value}))} placeholder="Overall read, how you felt, themes that worked, what to carry forward…" rows={5} style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:8, padding:"10px 12px", fontSize:12, resize:"vertical", lineHeight:1.7, outline:"none" }} onFocus={e=>e.target.style.borderColor="var(--blue)"} onBlur={e=>e.target.style.borderColor="var(--border)"} />
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:300, gap:10, color:"var(--dim)" }}>
            <div style={{ fontSize:40 }}>📅</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:12 }}>Click a trading day to review</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PLAYBOOK ─────────────────────────────────────────────────────────────────
const PALETTE = ["#3b9eff","#00e5a0","#f5c842","#ff4d6a","#a855f7","#fb923c","#ec4899"];

function Playbook({ trades, notes, playbooks, setPlaybooks }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newPb,   setNewPb]   = useState({ name:"", description:"", color:"#3b9eff" });

  const pbStats = useMemo(()=>playbooks.map(pb=>{
    const tagged = trades.filter(t=>(notes[t.id]?.setup||"").toLowerCase().includes(pb.name.toLowerCase()));
    const wins   = tagged.filter(t=>t.win);
    const pnl    = tagged.reduce((a,t)=>a+t.pnl,0);
    const rVals  = tagged.map(t=>calcR(t.pnl,notes[t.id]?.risk1R)).filter(r=>r!=null);
    const avgR   = rVals.length ? rVals.reduce((a,b)=>a+b,0)/rVals.length : null;
    return { ...pb, count:tagged.length, wins:wins.length, pnl, wr:tagged.length?wins.length/tagged.length:0, avgR };
  }),[trades,notes,playbooks]);

  const add = () => {
    if (!newPb.name.trim()) return;
    setPlaybooks(p=>[...p,{id:"pb_"+Date.now(),...newPb}]);
    setNewPb({name:"",description:"",color:"#3b9eff"});
    setShowAdd(false);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>Tag trades by typing a setup name in the detail panel → stats auto-populate here</div>
        <Btn variant="primary" onClick={()=>setShowAdd(!showAdd)}>+ New Setup</Btn>
      </div>

      {showAdd && (
        <div className="fade-up" style={{ background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:10, padding:24, marginBottom:20 }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:15, fontWeight:700, marginBottom:16 }}>New Setup</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:12, marginBottom:14 }}>
            <div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", marginBottom:6, letterSpacing:"0.08em" }}>NAME</div>
              <input value={newPb.name} onChange={e=>setNewPb(p=>({...p,name:e.target.value}))} placeholder="ORB" style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:7, padding:"9px 12px", fontSize:13, outline:"none" }} />
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", marginBottom:6, letterSpacing:"0.08em" }}>DESCRIPTION</div>
              <input value={newPb.description} onChange={e=>setNewPb(p=>({...p,description:e.target.value}))} placeholder="Opening Range Breakout — first 5-min candle break" style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:7, padding:"9px 12px", fontSize:12, outline:"none" }} />
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", marginBottom:8, letterSpacing:"0.08em" }}>COLOR</div>
            <div style={{ display:"flex", gap:8 }}>
              {PALETTE.map(c=><div key={c} onClick={()=>setNewPb(p=>({...p,color:c}))} style={{ width:24, height:24, borderRadius:6, background:c, border:`2px solid ${newPb.color===c?"white":"transparent"}`, cursor:"pointer" }}/>)}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="primary" onClick={add}>Save Setup</Btn>
            <Btn variant="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        {pbStats.map(pb=>(
          <div key={pb.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderTop:`2px solid ${pb.color}`, borderRadius:10, padding:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:700, color:pb.color, marginBottom:4 }}>{pb.name}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", lineHeight:1.5 }}>{pb.description}</div>
              </div>
              <button onClick={()=>setPlaybooks(p=>p.filter(x=>x.id!==pb.id))} style={{ background:"none", border:"none", color:"var(--dim)", fontSize:18 }}>×</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6 }}>
              {[
                { l:"TRADES",   v:pb.count },
                { l:"WIN RATE", v:pb.count?Math.round(pb.wr*100)+"%":"—", c:pb.count?pb.color:undefined },
                { l:"NET P&L",  v:pb.count?fmt(pb.pnl,0):"—", c:pb.count?(pb.pnl>=0?"var(--green)":"var(--red)"):undefined },
                { l:"AVG R",    v:pb.avgR!=null?fmtR(pb.avgR):"—", c:pb.avgR!=null?rColor(pb.avgR):undefined },
              ].map(s=>(
                <div key={s.l} style={{ background:"var(--surface2)", borderRadius:7, padding:"10px 6px", textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:8, color:"var(--muted)", marginBottom:4 }}>{s.l}</div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:700, color:s.c||"var(--text)" }}>{s.v}</div>
                </div>
              ))}
            </div>
            {pb.count===0&&<div style={{ marginTop:10, fontFamily:"var(--font-mono)", fontSize:10, color:"var(--dim)", textAlign:"center" }}>Tag trades with "{pb.name}" to populate stats</div>}
          </div>
        ))}
      </div>
      {playbooks.length===0&&<div style={{ textAlign:"center", padding:60, color:"var(--dim)", fontFamily:"var(--font-mono)", fontSize:12 }}>No setups yet — create your first one above</div>}
    </div>
  );
}

// ─── JOURNAL PAGE ────────────────────────────────────────────────────────────
const JOURNAL_STORAGE_KEY = "ej_journal_days";

const toJournalDate = d => new Date(`${d}T00:00:00`);
const fmtJournalDate = d => toJournalDate(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });

function JournalPage({ trades }) {
  const initialDays = useMemo(() => {
    const byDate = trades.reduce((acc, t) => {
      if (!acc[t.date]) acc[t.date] = [];
      acc[t.date].push(t);
      return acc;
    }, {});

    return Object.entries(byDate)
      .map(([date, dayTrades]) => ({
        id: date,
        date,
        notesHtml: "",
        image: "",
        trades: dayTrades.map(t => ({
          id: `jr_${t.id}`,
          time: t.entryTime?.slice(0,5) || "",
          symbol: t.symbol,
          side: t.side,
          qty: t.contracts,
          entry: t.entryPrice,
          exit: t.exitPrice,
          pnl: t.pnl,
        })),
      }))
      .sort((a,b)=>toJournalDate(b.date)-toJournalDate(a.date));
  }, [trades]);

  const [days, setDays] = useState(() => {
    try {
      const saved = localStorage.getItem(JOURNAL_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      if (!parsed.length) return initialDays;
      const savedMap = new Map(parsed.map(d=>[d.date,d]));
      const merged = initialDays.map(d => savedMap.get(d.date) || d);
      const extras = parsed.filter(d=>!merged.some(x=>x.date===d.date));
      return [...merged, ...extras].sort((a,b)=>toJournalDate(b.date)-toJournalDate(a.date));
    } catch {
      return initialDays;
    }
  });
  const [selectedDayId, setSelectedDayId] = useState(initialDays[0]?.id || "");
  const [editingTrade, setEditingTrade] = useState(null);
  const notesRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    setDays(prev => {
      const savedMap = new Map(prev.map(d=>[d.date,d]));
      const merged = initialDays.map(d => savedMap.get(d.date) || d);
      const extras = prev.filter(d=>!merged.some(x=>x.date===d.date));
      return [...merged, ...extras].sort((a,b)=>toJournalDate(b.date)-toJournalDate(a.date));
    });
  }, [initialDays]);

  useEffect(() => {
    if (!days.length) return;
    if (!days.some(d=>d.id===selectedDayId)) setSelectedDayId(days[0].id);
  }, [days, selectedDayId]);

  useEffect(() => {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(days));
  }, [days]);

  const selected = days.find(d=>d.id===selectedDayId) || days[0];

  useEffect(() => {
    if (notesRef.current && selected) notesRef.current.innerHTML = selected.notesHtml || "";
  }, [selectedDayId, selected?.notesHtml]);

  const updateDay = (dayId, updater) => {
    setDays(prev => prev.map(d => (d.id===dayId ? updater(d) : d)));
  };

  const applyFormat = cmd => {
    notesRef.current?.focus();
    document.execCommand(cmd, false);
  };

  const onImageUpload = file => {
    if (!file || !selected) return;
    const reader = new FileReader();
    reader.onload = e => updateDay(selected.id, d => ({ ...d, image: String(e.target.result) }));
    reader.readAsDataURL(file);
  };

  if (!selected) {
    return <div style={{ color:"var(--muted)", fontFamily:"var(--font-mono)" }}>No trading days available yet.</div>;
  }

  return (
    <div style={{ display:"grid", gridTemplateColumns:"430px 1fr", height:"calc(100vh - 146px)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
      <div style={{ borderRight:"1px solid var(--border)", background:"#111a36", overflowY:"auto" }}>
        {days.map(day => {
          const net = day.trades.reduce((a,t)=>a+Number(t.pnl||0),0);
          const selectedCard = day.id===selected.id;
          return (
            <button
              key={day.id}
              onClick={()=>setSelectedDayId(day.id)}
              style={{ width:"100%", textAlign:"left", background:selectedCard?"#182451":"#0f1831", border:"none", borderBottom:"1px solid var(--border)", padding:"16px 14px", color:"var(--text)" }}
              aria-pressed={selectedCard}
              aria-label={`Open ${fmtJournalDate(day.date)}`}
              type="button"
            >
              <div style={{ fontFamily:"var(--font-display)", fontSize:34, color:net>=0?"#06b2c9":"var(--red)", fontWeight:700, margin:"8px 0 12px" }}>{fmt(net,2)}</div>
              <div style={{ display:"flex", justifyContent:"space-between", color:"#a6b9d8", fontFamily:"var(--font-mono)", fontSize:11 }}>
                <span>{fmtJournalDate(day.date)}</span>
                <span>{day.trades.length} trades</span>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ padding:"0", background:"#101a33", overflowY:"auto" }}>
        <div style={{ borderBottom:"1px solid var(--border)", padding:"8px 14px", display:"flex", gap:8 }}>
          {[
            ["B","bold","Bold"],
            [<i key="i">I</i>,"italic","Italic"],
            [<u key="u">U</u>,"underline","Underline"],
            ["•","insertUnorderedList","Bulleted list"],
            ["1.","insertOrderedList","Numbered list"],
          ].map(([label, cmd, aria], i)=>(<Btn key={i} onClick={()=>applyFormat(cmd)} style={{ padding:"6px 10px", minWidth:32 }} aria-label={aria}>{label}</Btn>))}
        </div>

        <div style={{ padding:"16px" }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:48, fontWeight:700, marginBottom:10 }}>{toJournalDate(selected.date).toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })}</div>
          <div
            ref={notesRef}
            contentEditable
            suppressContentEditableWarning
            onInput={e=>updateDay(selected.id, d=>({ ...d, notesHtml:e.currentTarget.innerHTML==="<br>"?"":e.currentTarget.innerHTML }))}
            data-placeholder="Type your notes here..."
            style={{ minHeight:220, outline:"none", color:"var(--text)", fontFamily:"var(--font-mono)", fontSize:15 }}
            className="journal-notes"
            aria-label="Journal notes"
          />

          <div style={{ borderTop:"1px solid #0a1226", paddingTop:16, marginTop:16 }}>
            <div style={{ marginBottom:10, fontFamily:"var(--font-display)", fontSize:16 }}>Image</div>
            {!selected.image ? (
              <button type="button" onClick={()=>fileRef.current?.click()} style={{ width:140, height:140, border:"1px dashed var(--muted)", background:"transparent", color:"var(--muted)", fontFamily:"var(--font-mono)" }}>ADD IMAGE</button>
            ) : (
              <div>
                <img src={selected.image} alt="Journal upload" style={{ maxWidth:360, borderRadius:8, border:"1px solid var(--border)" }} />
                <div style={{ marginTop:8, display:"flex", gap:8 }}>
                  <Btn onClick={()=>fileRef.current?.click()}>Replace</Btn>
                  <Btn onClick={()=>updateDay(selected.id, d=>({ ...d, image:"" }))} variant="ghost">Remove</Btn>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{onImageUpload(e.target.files?.[0]); e.target.value="";}} />
          </div>

          <div style={{ marginTop:20 }}>
            <SectionTitle title="Trades" action={<Btn onClick={()=>setEditingTrade({ id:`jr_${Date.now()}`, time:"", symbol:"", side:"LONG", qty:1, entry:"", exit:"", pnl:"" })}>+ Add Trade</Btn>} />
            {!selected.trades.length ? (
              <div style={{ border:"1px dashed var(--border2)", borderRadius:8, padding:16, color:"var(--muted)", fontFamily:"var(--font-mono)", fontSize:12 }}>No trades logged for this day yet.</div>
            ) : (
              <div style={{ border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"var(--font-mono)", fontSize:12 }}>
                  <thead>
                    <tr style={{ background:"var(--surface)" }}>
                      {["Time","Symbol","Side","Qty","Entry","Exit","P&L","Actions"].map(h=><th key={h} style={{ textAlign:"left", padding:"10px", borderBottom:"1px solid var(--border)" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.trades.map(t=>(
                      <tr key={t.id} className="hover-row">
                        <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)" }}>{t.time}</td>
                        <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)" }}>{t.symbol}</td>
                        <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)" }}>{t.side}</td>
                        <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)" }}>{t.qty}</td>
                        <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)" }}>{t.entry}</td>
                        <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)" }}>{t.exit}</td>
                        <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)", color:t.pnl>=0?"var(--green)":"var(--red)" }}>{fmt(t.pnl,2)}</td>
                        <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)" }}>
                          <button type="button" onClick={()=>setEditingTrade({ ...t })} style={{ background:"transparent", border:"none", color:"var(--blue)", marginRight:8 }}>Edit</button>
                          <button type="button" onClick={()=>updateDay(selected.id, d=>({ ...d, trades:d.trades.filter(x=>x.id!==t.id) }))} style={{ background:"transparent", border:"none", color:"var(--red)" }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {editingTrade && (
              <div style={{ marginTop:12, border:"1px solid var(--border)", borderRadius:8, padding:12, display:"grid", gridTemplateColumns:"repeat(7,minmax(0,1fr))", gap:8 }}>
                {[
                  ["time","Time"],["symbol","Symbol"],["side","Side"],["qty","Qty"],["entry","Entry"],["exit","Exit"],["pnl","P&L"],
                ].map(([k,l])=>(
                  <label key={k} style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", display:"flex", flexDirection:"column", gap:4 }}>
                    {l}
                    <input value={editingTrade[k]} onChange={e=>setEditingTrade(p=>({...p,[k]:e.target.value}))} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:6, padding:"8px", fontSize:12 }} />
                  </label>
                ))}
                <div style={{ gridColumn:"1 / -1", display:"flex", gap:8 }}>
                  <Btn onClick={()=>{
                    const trade = { ...editingTrade, qty:Number(editingTrade.qty||0), entry:Number(editingTrade.entry||0), exit:Number(editingTrade.exit||0), pnl:Number(editingTrade.pnl||0) };
                    updateDay(selected.id, d=>{
                      const exists = d.trades.some(x=>x.id===trade.id);
                      return { ...d, trades: exists ? d.trades.map(x=>x.id===trade.id?trade:x) : [...d.trades, trade] };
                    });
                    setEditingTrade(null);
                  }} variant="primary">Save Trade</Btn>
                  <Btn onClick={()=>setEditingTrade(null)} variant="ghost">Cancel</Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"dashboard", icon:"◈", label:"Dashboard" },
  { id:"trades",    icon:"≡", label:"Trade Log"  },
  { id:"calendar",  icon:"▦", label:"Calendar"   },
  { id:"playbook",  icon:"◆", label:"Playbook"   },
  { id:"journal",   icon:"✎", label:"Journal"    },
];

export default function App() {
  const [page,      setPage]      = useState("dashboard");
  const [trades,    setTrades]    = useState(DEMO_TRADES);
  const [notes,     setNotes]     = useState({});
  const [playbooks, setPlaybooks] = useState(DEMO_PLAYBOOKS);
  const [selTrade,  setSelTrade]  = useState(null);

  useEffect(()=>{
    if (page !== "trades") setSelTrade(null);
  }, [page]);

  useEffect(()=>{
    try {
      const t = localStorage.getItem("ej_trades");
      const n = localStorage.getItem("ej_notes");
      const p = localStorage.getItem("ej_playbooks");
      if (t) setTrades(JSON.parse(t));
      if (n) setNotes(JSON.parse(n));
      if (p) setPlaybooks(JSON.parse(p));
    } catch(e) {}
  },[]);

  useEffect(()=>{
    try {
      localStorage.setItem("ej_trades",    JSON.stringify(trades));
      localStorage.setItem("ej_notes",     JSON.stringify(notes));
      localStorage.setItem("ej_playbooks", JSON.stringify(playbooks));
    } catch(e) {}
  },[trades,notes,playbooks]);

  const updateNote = useCallback((id,k,v)=>{
    setNotes(prev=>({...prev,[id]:{...(prev[id]||{}),[k]:v}}));
  },[]);

  const importTrades = useCallback(incoming=>{
    setTrades(prev=>{
      const existing = new Set(prev.map(t=>t.id));
      return [...prev, ...incoming.filter(t=>!existing.has(t.id))];
    });
  },[]);

  const idx      = selTrade ? trades.indexOf(selTrade) : -1;
  const totalPnl = trades.reduce((a,t)=>a+t.pnl,0);
  const wins     = trades.filter(t=>t.win).length;
  const unreviewed = trades.filter(t=>!isReviewed(notes[t.id])).length;

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <GlobalStyles/>

      {/* Sidebar */}
      <div style={{ width:220, background:"var(--surface)", borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"24px 20px 20px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:800, letterSpacing:"-0.5px" }}>
            EDGE<span style={{ color:"var(--green)" }}>.</span>
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", marginTop:2, letterSpacing:"0.1em" }}>TRADE JOURNAL</div>
        </div>

        <nav style={{ padding:"12px 10px", flex:1 }}>
          {NAV_ITEMS.map(n=>(
            <div key={n.id} className="nav-item" onClick={()=>setPage(n.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8, marginBottom:3, cursor:"pointer", background:page===n.id?"var(--surface2)":"transparent", color:page===n.id?"var(--text)":"var(--muted)", position:"relative" }}>
              <span style={{ fontSize:14, color:page===n.id?"var(--green)":"inherit" }}>{n.icon}</span>
              <span style={{ fontFamily:"var(--font-display)", fontSize:13, fontWeight:600 }}>{n.label}</span>
              {/* Badge for unreviewed on Trade Log */}
              {n.id==="trades" && unreviewed > 0 && (
                <span style={{ marginLeft:"auto", background:"var(--gold)", color:"#000", borderRadius:10, fontSize:9, fontWeight:800, padding:"2px 6px", fontFamily:"var(--font-mono)" }}>{unreviewed}</span>
              )}
            </div>
          ))}
        </nav>

        <div style={{ padding:"16px 20px", borderTop:"1px solid var(--border)" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:6 }}>TOTAL P&L</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:700, color:totalPnl>=0?"var(--green)":"var(--red)", marginBottom:2 }}>
            {totalPnl>=0?"+":""}{Math.round(totalPnl)}
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)" }}>
            {wins}/{trades.length} wins · {Math.round(wins/trades.length*100)}% WR
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"16px 28px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--bg)", flexShrink:0 }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:700 }}>
            {NAV_ITEMS.find(n=>n.id===page)?.label}
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>
            {trades.length} trades · {unreviewed > 0 ? <span style={{ color:"var(--gold)" }}>{unreviewed} unreviewed</span> : <span style={{ color:"var(--green)" }}>all reviewed ✓</span>}
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
          {page==="dashboard" && <Dashboard  trades={trades} notes={notes}/>} 
          {page==="trades"    && <TradeLog   trades={trades} notes={notes} playbooks={playbooks} onSelect={setSelTrade} onImport={importTrades}/>} 
          {page==="calendar"  && <Calendar   trades={trades} notes={notes}/>} 
          {page==="playbook"  && <Playbook   trades={trades} notes={notes} playbooks={playbooks} setPlaybooks={setPlaybooks}/>} 
          {page==="journal"   && <JournalPage trades={trades}/>} 
        </div>
      </div>

      {/* Detail panel */}
      {selTrade && (
        <TradeDetail
          trade={selTrade}
          notes={notes}
          playbooks={playbooks}
          onUpdate={updateNote}
          onClose={()=>setSelTrade(null)}
          onPrev={()=>idx>0&&setSelTrade(trades[idx-1])}
          onNext={()=>idx<trades.length-1&&setSelTrade(trades[idx+1])}
          hasPrev={idx>0}
          hasNext={idx<trades.length-1}
        />
      )}
    </div>
  );
}
