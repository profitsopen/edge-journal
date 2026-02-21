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
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .fade-up   { animation: fadeUp 0.35s ease both; }
    .fade-up-2 { animation: fadeUp 0.35s 0.07s ease both; }
    .fade-up-3 { animation: fadeUp 0.35s 0.14s ease both; }
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
  { id:"pb1", name:"ORB",           description:"Opening Range Breakout — first 5-min candle break with volume", color:"#3b9eff" },
  { id:"pb2", name:"VWAP Reclaim",  description:"Price drops under VWAP, reclaims it with momentum",            color:"#00e5a0" },
  { id:"pb3", name:"Break & Retest",description:"Key level breaks, pulls back, holds as new S/R",               color:"#f5c842" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt     = (n, d=2)  => n == null ? "—" : (n >= 0 ? "+" : "") + "$" + Math.abs(n).toFixed(d);
const fmtAbs  = (n, d=0)  => n == null ? "—" : "$" + Math.abs(n).toFixed(d);
const pct     = (n)       => (n * 100).toFixed(1) + "%";
const gradeColor = g => ({ A:"#00e5a0", B:"#3b9eff", C:"#f5c842", D:"#ff9a3b", F:"#ff4d6a" }[g] || "#5a7a9a");
const sideColor  = s => s === "LONG" ? "var(--green)" : "var(--red)";

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
      const symbol    = r.symbol    || r.Symbol    || r.instrument  || r.Instrument || "UNKNOWN";
      const rawSide   = (r.side     || r.Side      || r.action      || r.Action     || "LONG").toUpperCase();
      const side      = rawSide.includes("SELL") || rawSide.includes("SHORT") ? "SHORT" : "LONG";
      const pnl       = parseFloat(r.pnl       || r.PnL   || r["P&L"]      || r.profit  || 0);
      const entryPrice= parseFloat(r.entryPrice || r.entry_price    || r["Entry Price"] || 0);
      const exitPrice = parseFloat(r.exitPrice  || r.exit_price     || r["Exit Price"]  || 0);
      const contracts = parseInt  (r.contracts  || r.qty            || r.Qty            || 1);
      const date      = r.date    || r.Date      || new Date().toISOString().slice(0,10);
      const entryTime = r.entryTime || r.entry_time || r["Entry Time"] || "00:00:00";
      const exitTime  = r.exitTime  || r.exit_time  || r["Exit Time"]  || "00:00:00";
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

const Btn = ({ children, onClick, variant="default", style:sx={} }) => {
  const styles = {
    default: { background:"var(--surface2)", border:"1px solid var(--border2)", color:"var(--text)" },
    primary: { background:"var(--green)",    border:"1px solid var(--green)",   color:"#000",        fontWeight:700 },
    ghost:   { background:"transparent",     border:"1px solid var(--border)",  color:"var(--muted)" },
  };
  return (
    <button onClick={onClick} style={{ ...styles[variant], padding:"8px 16px", borderRadius:7, fontSize:12, fontWeight:600, display:"inline-flex", alignItems:"center", gap:6, transition:"all 0.15s", ...sx }}>
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

  return (
    <div style={{ position:"fixed", inset:0, background:"#000b", zIndex:500, display:"flex", alignItems:"flex-start", justifyContent:"flex-end" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ width:480, height:"100vh", background:"var(--surface)", borderLeft:"1px solid var(--border2)", overflowY:"auto", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--border)", position:"sticky", top:0, background:"var(--surface)", zIndex:10 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ display:"flex", gap:8 }}>
              <Chip color={sideColor(trade.side)}>{trade.side === "LONG" ? "▲" : "▼"} {trade.side}</Chip>
              <Chip color="var(--muted)">{trade.symbol}</Chip>
              <Chip color="var(--muted)">{trade.date}</Chip>
            </div>
            <div style={{ display:"flex", gap:4, alignItems:"center" }}>
              <button onClick={onPrev} disabled={!hasPrev} style={{ background:"none", border:"none", color:hasPrev?"var(--muted)":"var(--dim)", fontSize:18 }}>‹</button>
              <button onClick={onNext} disabled={!hasNext} style={{ background:"none", border:"none", color:hasNext?"var(--muted)":"var(--dim)", fontSize:18 }}>›</button>
              <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:22, lineHeight:1 }}>×</button>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {[
              { l:"P&L",       v:fmt(trade.pnl,1),                              c:trade.pnl>=0?"var(--green)":"var(--red)" },
              { l:"TICKS",     v:(trade.ticks>=0?"+":"")+trade.ticks,           c:trade.ticks>=0?"var(--green)":"var(--red)" },
              { l:"DURATION",  v:trade.duration,                                 c:"var(--text)" },
              { l:"ENTRY",     v:trade.entryPrice,                               c:"var(--text)" },
              { l:"EXIT",      v:trade.exitPrice,                                c:"var(--text)" },
              { l:"CONTRACTS", v:trade.contracts,                                c:"var(--text)" },
            ].map(s=>(
              <div key={s.l} style={{ background:"var(--surface2)", borderRadius:7, padding:"10px 12px" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.08em", marginBottom:4 }}>{s.l}</div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:14, fontWeight:600, color:s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:"20px 24px", flex:1 }}>
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
    return { total, winRate:wins.length/trades.length, avgW, avgL, pf, wCount:wins.length, lCount:losses.length, tCount:trades.length, curve, bySymbol, gradeMap, best, worst };
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
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:20 }}>
        <StatCard label="NET P&L"       value={fmtAbs(s.total,0)}    color={s.total>=0?"var(--green)":"var(--red)"}        delay="0s"     big />
        <StatCard label="WIN RATE"      value={pct(s.winRate)}        color="var(--blue)"                                   delay="0.05s"     />
        <StatCard label="PROFIT FACTOR" value={s.pf.toFixed(2)}       color={s.pf>=2?"var(--green)":"var(--gold)"}          delay="0.10s"     />
        <StatCard label="AVG WIN"       value={fmtAbs(s.avgW,0)}      color="var(--green)" sub={`${s.wCount} winners`}      delay="0.15s"     />
        <StatCard label="AVG LOSS"      value={fmtAbs(s.avgL,0)}      color="var(--red)"   sub={`${s.lCount} losers`}       delay="0.20s"     />
      </div>

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12, marginBottom:12 }}>
        <div className="fade-up-2" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"20px 20px 12px" }}>
          <SectionTitle title="Equity Curve" />
          <ResponsiveContainer width="100%" height={200}>
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
          <ResponsiveContainer width="100%" height={200}>
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

        {/* Day extremes */}
        <div className="fade-up-3" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:20 }}>
          <SectionTitle title="Day Extremes"/>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>BEST DAY</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:26, fontWeight:700, color:"var(--green)" }}>{fmt(s.best[1].pnl,0)}</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", marginTop:4 }}>{s.best[0]} · {s.best[1].count} trades</div>
          </div>
          <div style={{ height:1, background:"var(--border)", marginBottom:16 }}/>
          <div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>WORST DAY</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:26, fontWeight:700, color:"var(--red)" }}>{fmt(s.worst[1].pnl,0)}</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", marginTop:4 }}>{s.worst[0]} · {s.worst[1].count} trades</div>
          </div>
        </div>

        {/* By grade */}
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
  const [fSide, setFSide] = useState("all");
  const [fSym,  setFSym]  = useState("all");
  const [fDate, setFDate] = useState("all");
  const [modal, setModal] = useState(false);

  const symbols = [...new Set(trades.map(t=>t.symbol))];
  const dates   = [...new Set(trades.map(t=>t.date))].sort();
  const filtered = trades.filter(t=>
    (fSide==="all"||t.side===fSide) &&
    (fSym ==="all"||t.symbol===fSym) &&
    (fDate==="all"||t.date===fDate)
  );

  return (
    <div>
      {modal && <ImportModal onClose={()=>setModal(false)} onImport={onImport}/>}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <Btn variant="primary" onClick={()=>setModal(true)}>⬆ Import CSV</Btn>
        <div style={{ flex:1 }}/>
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

      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"80px 90px 64px 50px 94px 94px 90px 90px 110px 60px 60px 54px", padding:"10px 16px", borderBottom:"1px solid var(--border)", gap:0 }}>
          {["DATE","SYMBOL","SIDE","QTY","ENTRY TIME","EXIT TIME","ENTRY $","EXIT $","P&L","TICKS","NOTES","GRADE"].map(h=>(
            <div key={h} style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.08em", fontWeight:700 }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding:40, textAlign:"center", fontFamily:"var(--font-mono)", fontSize:12, color:"var(--dim)" }}>No trades match filters</div>
        )}

        {filtered.map(t=>{
          const n = notes[t.id]||{};
          const filled = Object.values(n).filter(v=>v&&v!==null&&v!=="").length;
          return (
            <div key={t.id} className="hover-row" onClick={()=>onSelect(t)} style={{ display:"grid", gridTemplateColumns:"80px 90px 64px 50px 94px 94px 90px 90px 110px 60px 60px 54px", padding:"11px 16px", borderBottom:"1px solid var(--border)", gap:0, alignItems:"center", cursor:"pointer", background:!t.win?"#ff4d6a05":"transparent", transition:"background 0.1s" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{t.date.slice(5)}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:600 }}>{t.symbol}</span>
              <Chip color={sideColor(t.side)}>{t.side==="LONG"?"▲L":"▼S"}</Chip>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{t.contracts}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{t.entryTime}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{t.exitTime}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11 }}>{t.entryPrice}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11 }}>{t.exitPrice}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:13, fontWeight:700, color:t.pnl>=0?"var(--green)":"var(--red)" }}>{fmt(t.pnl,1)}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:t.ticks>=0?"var(--green)":"var(--red)" }}>{t.ticks>=0?"+":""}{t.ticks}</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:filled>0?"var(--blue)":"var(--dim)" }}>{filled>0?`●${filled}`:"○"}</span>
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
      </div>
    </div>
  );
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
function Calendar({ trades }) {
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

  const dim      = new Date(year, month, 0).getDate();
  const first    = new Date(year, month-1, 1).getDay();
  const maxAbs   = Math.max(...Object.values(byDate).map(d=>Math.abs(d.pnl)),1);
  const MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
            const day     = i+1;
            const dateKey = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const d       = byDate[dateKey];
            const sel     = selDay===day;
            const intensity = d ? Math.min(Math.abs(d.pnl)/maxAbs,1) : 0;
            const weekend   = ((first+i)%7===0)||((first+i)%7===6);
            return (
              <div key={day} onClick={()=>d&&setSelDay(day===selDay?null:day)} style={{ aspectRatio:"1", borderRadius:8, padding:6, border:`1px solid ${sel?"var(--blue)":d?"var(--border2)":"var(--border)"}`, background:d?(d.pnl>=0?`rgba(0,229,160,${intensity*0.3})`:`rgba(255,77,106,${intensity*0.3})`):weekend?"transparent":"var(--surface)", cursor:d?"pointer":"default", display:"flex", flexDirection:"column", justifyContent:"space-between", transition:"all 0.15s", opacity:weekend&&!d?0.3:1 }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:d?"var(--text)":"var(--dim)" }}>{day}</div>
                {d&&<>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:10, fontWeight:700, color:d.pnl>=0?"var(--green)":"var(--red)", lineHeight:1 }}>{d.pnl>=0?"+":""}{Math.round(d.pnl)}</div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)" }}>{d.trades.length}T</div>
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
            {selData.trades.map(t=>(
              <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:7, marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)" }}>{t.entryTime}</span>
                  <Chip color={sideColor(t.side)}>{t.side}</Chip>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:11 }}>{t.symbol}</span>
                </div>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:700, color:t.pnl>=0?"var(--green)":"var(--red)" }}>{fmt(t.pnl,1)}</span>
              </div>
            ))}
            <div style={{ marginTop:14 }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>DAILY REVIEW</div>
              <textarea
                value={dayNotes[selKey]||""}
                onChange={e=>setDayNotes(p=>({...p,[selKey]:e.target.value}))}
                placeholder="Overall read, how you felt, themes that worked, what to carry forward…"
                rows={6}
                style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:8, padding:"10px 12px", fontSize:12, resize:"vertical", lineHeight:1.7, outline:"none" }}
                onFocus={e=>e.target.style.borderColor="var(--blue)"}
                onBlur={e=>e.target.style.borderColor="var(--border)"}
              />
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
    return { ...pb, count:tagged.length, wins:wins.length, pnl, wr:tagged.length?wins.length/tagged.length:0 };
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
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[{l:"TRADES",v:pb.count},{l:"WIN RATE",v:pb.count?Math.round(pb.wr*100)+"%":"—"},{l:"NET P&L",v:pb.count?fmt(pb.pnl,0):"—"}].map(s=>(
                <div key={s.l} style={{ background:"var(--surface2)", borderRadius:7, padding:"10px 8px", textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", marginBottom:4 }}>{s.l}</div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:700, color:s.l==="WIN RATE"&&pb.count?pb.color:s.l==="NET P&L"&&pb.count?(pb.pnl>=0?"var(--green)":"var(--red)"):"var(--text)" }}>{s.v}</div>
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

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"dashboard", icon:"◈", label:"Dashboard" },
  { id:"trades",    icon:"≡", label:"Trade Log"  },
  { id:"calendar",  icon:"▦", label:"Calendar"   },
  { id:"playbook",  icon:"◆", label:"Playbook"   },
];

export default function App() {
  const [page,      setPage]      = useState("dashboard");
  const [trades,    setTrades]    = useState(DEMO_TRADES);
  const [notes,     setNotes]     = useState({});
  const [playbooks, setPlaybooks] = useState(DEMO_PLAYBOOKS);
  const [selTrade,  setSelTrade]  = useState(null);

  // Persist to localStorage (works in a real browser)
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

  const idx     = selTrade ? trades.indexOf(selTrade) : -1;
  const totalPnl = trades.reduce((a,t)=>a+t.pnl,0);
  const wins     = trades.filter(t=>t.win).length;

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <GlobalStyles/>

      {/* ── Sidebar ── */}
      <div style={{ width:220, background:"var(--surface)", borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"24px 20px 20px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:800, letterSpacing:"-0.5px" }}>
            EDGE<span style={{ color:"var(--green)" }}>.</span>
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", marginTop:2, letterSpacing:"0.1em" }}>TRADE JOURNAL</div>
        </div>

        <nav style={{ padding:"12px 10px", flex:1 }}>
          {NAV_ITEMS.map(n=>(
            <div key={n.id} className="nav-item" onClick={()=>setPage(n.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8, marginBottom:3, cursor:"pointer", background:page===n.id?"var(--surface2)":"transparent", color:page===n.id?"var(--text)":"var(--muted)" }}>
              <span style={{ fontSize:14, color:page===n.id?"var(--green)":"inherit" }}>{n.icon}</span>
              <span style={{ fontFamily:"var(--font-display)", fontSize:13, fontWeight:600 }}>{n.label}</span>
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

      {/* ── Main ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"16px 28px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--bg)", flexShrink:0 }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:700 }}>
            {NAV_ITEMS.find(n=>n.id===page)?.label}
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>
            {trades.length} trades loaded
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
          {page==="dashboard" && <Dashboard  trades={trades} notes={notes}/>}
          {page==="trades"    && <TradeLog   trades={trades} notes={notes} playbooks={playbooks} onSelect={setSelTrade} onImport={importTrades}/>}
          {page==="calendar"  && <Calendar   trades={trades} notes={notes}/>}
          {page==="playbook"  && <Playbook   trades={trades} notes={notes} playbooks={playbooks} setPlaybooks={setPlaybooks}/>}
        </div>
      </div>

      {/* ── Detail panel ── */}
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
