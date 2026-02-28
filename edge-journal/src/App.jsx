import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "./layout/AppLayout";
import Journal from "./pages/Journal";
import { Area, AreaChart, Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { auth, signInWithGoogle, signOutUser, onAuthStateChanged } from "./lib/firebase";
import { loadUserData, saveTrades, saveNotes, savePlaybooks, saveJournalDays } from "./lib/firestore";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --bg: #080c10; --surface: #0e1419; --surface2: #141c24; --surface3: #1a2433; --border: #1e2d3d; --border2: #243447; --text: #e2eaf4; --muted: #5a7a9a; --dim: #2d4259; --green: #00e5a0; --green-dim: #00e5a015; --green-mid: #00e5a040; --red: #ff4d6a; --red-dim: #ff4d6a15; --red-mid: #ff4d6a40; --blue: #3b9eff; --blue-dim: #3b9eff15; --gold: #f5c842; --font-display: "Syne", sans-serif; --font-mono: "JetBrains Mono", monospace; }
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

// ─── INSTRUMENT SPECS ─────────────────────────────────────────────────────────
const INSTRUMENT_SPECS = {
  MGC: { tickSize: 0.10, tickValue: 1.00, hint: "MGC: $10/point, 0.10 tick" },
  MNQ: { tickSize: 0.25, tickValue: 0.50, hint: "MNQ: $2/point, 0.25 tick" },
};

const getInstrumentSpec = (symbol) => {
  const normalized = String(symbol || "").trim().toUpperCase();
  if (normalized.startsWith("MGC")) return INSTRUMENT_SPECS.MGC;
  if (normalized.startsWith("MNQ")) return INSTRUMENT_SPECS.MNQ;
  return null;
};

const calculatePnlAndTicks = ({ symbol, side, entryPrice, exitPrice, contracts, explicitPnl }) => {
  const spec = getInstrumentSpec(symbol);
  let ticks = 0;

  if (spec && Number.isFinite(entryPrice) && Number.isFinite(exitPrice)) {
    const direction = side === "SHORT" ? -1 : 1;
    const signedPoints = (exitPrice - entryPrice) * direction;
    const ticksRaw = signedPoints / spec.tickSize;
    ticks = Number.isFinite(ticksRaw) ? Math.round(ticksRaw) : 0;
  }

  if (explicitPnl != null && String(explicitPnl).trim() !== "") {
    const pnl = Number(explicitPnl);
    return { pnl: Number.isFinite(pnl) ? pnl : 0, ticks };
  }

  if (!spec) return { pnl: 0, ticks: 0 };

  const pnl = ticks * spec.tickValue * contracts;
  return { pnl: Number(pnl.toFixed(2)), ticks };
};

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
  const parseRows = (csvText) => {
    const rows = [];
    let row = [];
    let cur = "";
    let quoted = false;

    for (let i = 0; i < csvText.length; i += 1) {
      const ch = csvText[i];
      const next = csvText[i + 1];

      if (ch === '"') {
        if (quoted && next === '"') {
          cur += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
        continue;
      }

      if (ch === "," && !quoted) {
        row.push(cur.trim());
        cur = "";
        continue;
      }

      if ((ch === "\n" || ch === "\r") && !quoted) {
        if (ch === "\r" && next === "\n") i += 1;
        row.push(cur.trim());
        const hasData = row.some((cell) => String(cell).trim() !== "");
        if (hasData) rows.push(row);
        row = [];
        cur = "";
        continue;
      }

      cur += ch;
    }

    row.push(cur.trim());
    if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
    return rows;
  };

  const toNum = (v, fallback = 0) => {
    if (v == null || v === "") return fallback;
    const s = String(v).replace(/[$,\s]/g, "");
    const negParen = /^\(.*\)$/.test(s);
    const n = parseFloat(s.replace(/[()]/g, ""));
    if (!Number.isFinite(n)) return fallback;
    return negParen ? -n : n;
  };

  const get = (row, keys) => {
    for (const k of keys) {
      if (row[k] != null && String(row[k]).trim() !== "") return String(row[k]).trim();
    }
    return "";
  };

  const toIsoDate = (value) => {
    const s = String(value || "").trim();
    if (!s) return "";

    const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (mdy) {
      const mm = String(parseInt(mdy[1], 10)).padStart(2, "0");
      const dd = String(parseInt(mdy[2], 10)).padStart(2, "0");
      const yyyy = mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3];
      return `${yyyy}-${mm}-${dd}`;
    }

    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  };

  const toClock = (value) => {
    const s = String(value || "").trim();
    if (!s) return "00:00:00";

    const explicit = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (explicit) {
      let h = parseInt(explicit[1], 10);
      const m = explicit[2];
      const sec = explicit[3] || "00";
      const ampm = (explicit[4] || "").toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${m}:${sec}`;
    }

    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "00:00:00";
    return d.toISOString().slice(11, 19);
  };

  const makeTradeId = (trade) => [
    trade.date,
    trade.symbol,
    trade.entryTime,
    trade.exitTime,
    trade.side,
    Number(trade.entryPrice).toFixed(6),
    Number(trade.exitPrice).toFixed(6),
    trade.contracts,
  ].join("_").replace(/\s+/g, "");

  const normalizeFillSide = (row) => {
    const bs = get(row, ["B/S", "bs", "side", "Side"]);
    if (bs) return bs.toUpperCase().includes("S") ? "SELL" : "BUY";
    const action = get(row, ["_action", "action", "Action"]);
    if (action === "1") return "SELL";
    if (action === "0") return "BUY";
    return "BUY";
  };

  const parsedRows = parseRows(text || "");
  if (!parsedRows.length) return { trades: [], skipped: 0, error: "Could not recognize Tradovate CSV columns." };
  const headers = parsedRows[0].map((h) => h.replace(/"/g, "").trim());

  const rows = parsedRows.slice(1).map((vals) => {
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  }).filter((r) => r[headers[0]]);

  const normalizedHeaders = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const isTradovate = normalizedHeaders.includes("symbol")
    && (normalizedHeaders.includes("side") || normalizedHeaders.includes("buysell") || normalizedHeaders.includes("action"))
    && (normalizedHeaders.includes("avgeentryprice") || normalizedHeaders.includes("avgentryprice") || normalizedHeaders.includes("entryprice"))
    && (normalizedHeaders.includes("avgexitprice") || normalizedHeaders.includes("exitprice"))
    && (normalizedHeaders.includes("profitloss") || normalizedHeaders.includes("pnl") || normalizedHeaders.includes("pl") || normalizedHeaders.includes("realizedpandl"));

  const hasRoundTripColumns = headers.some((h) => ["entryPrice", "Entry Price", "exitPrice", "Exit Price", "P&L", "pnl"].includes(h));

  if (isTradovate) {
    const trades = [];
    let skipped = 0;

    for (const r of rows) {
      const symbol = get(r, ["Symbol", "symbol", "Instrument", "Contract"]).toUpperCase() || "UNKNOWN";
      const sideRaw = get(r, ["Side", "BuySell", "B/S", "Action", "side", "buySell"]).toUpperCase();
      const side = (sideRaw.includes("SELL") || sideRaw.includes("SHORT")) ? "SHORT" : "LONG";
      const contracts = Math.max(1, Math.round(toNum(get(r, ["Qty", "Quantity", "Contracts", "qty"]), 1)));
      const entryPrice = toNum(get(r, ["AvgEntryPrice", "AverageEntryPrice", "EntryPrice", "Entry Price"]), NaN);
      const exitPrice = toNum(get(r, ["AvgExitPrice", "AverageExitPrice", "ExitPrice", "Exit Price"]), NaN);
      const csvPnl = toNum(get(r, ["ProfitLoss", "PnL", "P&L", "NetProfit", "RealizedPnL"]), NaN);
      const csvCommission = toNum(get(r, ["Commission", "Commissions", "Fees", "Fee", "TotalFees", "Total Fees", "TotalCommission", "Total Commission"]), 0);
      const date = toIsoDate(get(r, ["Date", "TradeDate", "EntryTime", "ExitTime", "Opened", "Closed"]));
      const entryTime = toClock(get(r, ["EntryTime", "Opened", "Open Time", "StartTime"]));
      const exitTime = toClock(get(r, ["ExitTime", "Closed", "Close Time", "EndTime"])) || entryTime;

      if (!date || !Number.isFinite(entryPrice) || !Number.isFinite(exitPrice)) {
        skipped += 1;
        continue;
      }

      // Recalculate P&L and ticks using proper instrument specs (entry/exit prices are more reliable than CSV P&L)
      const { pnl: grossPnl, ticks } = calculatePnlAndTicks({ symbol, side, entryPrice, exitPrice, contracts, explicitPnl: csvPnl });
      // Subtract commission/fees to get net P&L
      const pnl = Number((grossPnl - Math.abs(csvCommission)).toFixed(2));

      const trade = {
        id: "",
        date,
        symbol,
        side,
        contracts,
        entryTime,
        exitTime,
        entryPrice,
        exitPrice,
        pnl,
        ticks,
        duration: "—",
        win: pnl > 0,
      };
      trade.id = makeTradeId(trade);
      trades.push(trade);
    }

    const grouped = groupFills(trades);
    return grouped.length
      ? { trades: grouped, skipped }
      : { trades: [], skipped, error: "Could not recognize Tradovate CSV columns." };
  }

  if (hasRoundTripColumns) {
    const trades = rows.map((r) => {
      const symbol     = get(r, ["symbol", "Symbol", "instrument", "Instrument", "Contract"]) || "UNKNOWN";
      const rawSide    = get(r, ["side", "Side", "action", "Action", "B/S"]).toUpperCase();
      const side       = rawSide.includes("SELL") || rawSide.includes("SHORT") ? "SHORT" : "LONG";
      const pnl        = toNum(get(r, ["pnl", "PnL", "P&L", "profit"]));
      const entryPrice = toNum(get(r, ["entryPrice", "entry_price", "Entry Price"]));
      const exitPrice  = toNum(get(r, ["exitPrice", "exit_price", "Exit Price"]));
      const contracts  = Math.max(1, Math.round(toNum(get(r, ["contracts", "qty", "Qty", "Quantity"]), 1)));
      const stamp      = get(r, ["Timestamp", "timestamp", "_timestamp"]);
      const date       = get(r, ["date", "Date", "_tradeDate"]) || toIsoDate(stamp || new Date()) || new Date().toISOString().slice(0, 10);
      const entryTime  = get(r, ["entryTime", "entry_time", "Entry Time"]) || toClock(stamp || new Date());
      const exitTime   = get(r, ["exitTime", "exit_time", "Exit Time"]) || entryTime;
      const trade = { id:"", date, symbol, side, contracts, entryTime, exitTime, entryPrice, exitPrice, pnl, ticks:0, duration:"—", win: pnl > 0 };
      trade.id = makeTradeId(trade);
      return trade;
    });
    return { trades, skipped: 0 };
  }

  const fills = rows.map((r, i) => {
    const symbol = get(r, ["Contract", "symbol", "Symbol", "instrument", "Instrument"]) || "UNKNOWN";
    const account = get(r, ["Account", "_accountId", "accountId"]);
    const qty = Math.max(1, Math.round(toNum(get(r, ["Quantity", "_qty", "qty", "Qty"]), 1)));
    const price = toNum(get(r, ["Price", "_price", "price"]));
    const side = normalizeFillSide(r);
    const stamp = get(r, ["Timestamp", "_timestamp", "timestamp"]);
    const date = get(r, ["Date", "_tradeDate", "date"]) || toIsoDate(stamp || new Date());
    const sec = Number.isNaN(new Date(stamp).getTime()) ? i : Math.floor(new Date(stamp).getTime() / 1000);
    return { i, rowId: get(r, ["Fill ID", "_id", "id"]) || String(i), symbol, account, qty, price, side, stamp, date, sec };
  }).filter((f) => Number.isFinite(f.price) && f.price > 0 && f.qty > 0);

  fills.sort((a, b) => a.sec - b.sec || a.i - b.i);

  const openByKey = new Map();
  const trades = [];

  for (const fill of fills) {
    const key = `${fill.account}::${fill.symbol}`;
    const open = openByKey.get(key) || [];
    let remaining = fill.qty;

    while (remaining > 0) {
      const idxOpp = open.findIndex((lot) => lot.side !== fill.side && lot.qty > 0);
      if (idxOpp === -1) break;
      const lot = open[idxOpp];
      const matched = Math.min(remaining, lot.qty);
      const longTrade = lot.side === "BUY";
      const entryPrice = lot.price;
      const exitPrice = fill.price;
      const tradeSide = longTrade ? "LONG" : "SHORT";
      const { pnl: calcPnl, ticks: calcTicks } = calculatePnlAndTicks({
        symbol: fill.symbol,
        side: tradeSide,
        entryPrice,
        exitPrice,
        contracts: matched,
      });
      const rawPnl = longTrade ? (exitPrice - entryPrice) * matched : (entryPrice - exitPrice) * matched;
      const pnl = getInstrumentSpec(fill.symbol) ? calcPnl : rawPnl;
      trades.push({
        id: `imp_${lot.rowId}_${fill.rowId}_${trades.length}`,
        date: toIsoDate(lot.stamp || fill.stamp || fill.date),
        symbol: fill.symbol,
        side: tradeSide,
        contracts: matched,
        entryTime: toClock(lot.stamp || fill.stamp),
        exitTime: toClock(fill.stamp || lot.stamp),
        entryPrice,
        exitPrice,
        pnl: Number(pnl.toFixed(2)),
        ticks: calcTicks,
        duration: "—",
        win: pnl > 0,
      });
      lot.qty -= matched;
      remaining -= matched;
      if (lot.qty <= 0) open.splice(idxOpp, 1);
    }

    if (remaining > 0) open.push({ ...fill, qty: remaining });
    openByKey.set(key, open);
  }

  return { trades, skipped: 0 };
}

// ─── GROUP FILLS ──────────────────────────────────────────────────────────────
// Collapses raw per-contract fills that share (date + symbol + side + entryTime)
// into one grouped trade. Summed QTY, summed P&L, latest exitTime.
// Entry price = weighted average across fills.
// Exit price = last fill's price; scaledExit:true when fills have different exits.
// Original fills are preserved in trade.fills[] for the audit-expand UI.
function groupFills(rawTrades) {
  const groups = new Map();
  for (const t of rawTrades) {
    const key = `${t.date}::${t.symbol}::${t.side}::${t.entryTime}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const result = [];
  for (const fills of groups.values()) {
    if (fills.length === 1) {
      result.push({ ...fills[0], fills: [] });
      continue;
    }

    const first          = fills[0];
    const totalContracts = fills.reduce((a, t) => a + t.contracts, 0);
    const totalPnl       = Number(fills.reduce((a, t) => a + t.pnl, 0).toFixed(2));
    const totalTicks     = fills.reduce((a, t) => a + (t.ticks || 0), 0);
    const latestExitTime = fills.map(t => t.exitTime || "").sort().at(-1) || first.exitTime;
    const uniqueExits    = [...new Set(fills.map(t => t.exitPrice))];
    const exitPrice      = fills.at(-1).exitPrice;
    const scaledExit     = uniqueExits.length > 1;
    // Weighted average entry price across fills (handles scaled-in entries)
    const avgEntryPrice  = Number(
      (fills.reduce((a, t) => a + t.entryPrice * t.contracts, 0) / totalContracts).toFixed(2)
    );

    const grouped = {
      ...first,
      contracts:  totalContracts,
      pnl:        totalPnl,
      ticks:      totalTicks,
      exitTime:   latestExitTime,
      entryPrice: avgEntryPrice,
      exitPrice,
      scaledExit,
      win:       totalPnl > 0,
      fills:     fills.map(({ fills: _nested, ...f }) => f),
    };
    // Stable ID from grouped properties
    grouped.id = [
      grouped.date, grouped.symbol, grouped.entryTime, grouped.exitTime,
      grouped.side, Number(grouped.entryPrice).toFixed(6),
      Number(grouped.exitPrice).toFixed(6), grouped.contracts,
    ].join("_").replace(/\s+/g, "");
    result.push(grouped);
  }
  return result;
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const Chip = ({ children, color="var(--muted)" }) => (
  <span style={{ fontFamily:"var(--font-mono)", fontSize:11, fontWeight:600, color, background:color+"20", padding:"2px 8px", borderRadius:4, display:"inline-flex", alignItems:"center" }}>
    {children}
  </span>
);

const StatCard = ({ label, value, sub, color, delay="0s", big }) => (
  <div className="fade-up" style={{ animationDelay:delay, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"18px 20px" }}>
    <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--dim)", letterSpacing:"0.12em", marginBottom:6, textTransform:"uppercase" }}>{label}</div>
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
  const [error,    setError]    = useState("");
  const fileRef = useRef();

  const handleFile = file => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        setError("");
        const result = parseCSV(e.target.result);
        setParsed(result);
        if (result.error) setError(result.error);
      }
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
            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:parsed.trades.length ? "var(--green)" : "#ff8a80", marginBottom:10 }}>
              {parsed.trades.length
                ? `✓ Imported ${parsed.trades.length} trades${parsed.skipped ? `, skipped ${parsed.skipped} invalid rows` : ""}`
                : (error || "Could not recognize Tradovate CSV columns.")}
            </div>
            <div style={{ background:"var(--surface2)", borderRadius:8, padding:12, fontSize:11, fontFamily:"var(--font-mono)", marginBottom:16, maxHeight:120, overflowY:"auto" }}>
              {parsed.trades.slice(0,4).map((t,i)=>(
                <div key={i} style={{ marginBottom:4, color:"var(--text)" }}>{t.date} · {t.symbol} · {t.side} · {fmt(t.pnl,1)}</div>
              ))}
              {parsed.trades.length > 4 && <div style={{ color:"var(--muted)" }}>… and {parsed.trades.length-4} more</div>}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn variant="primary" onClick={()=>{onImport(parsed.trades);onClose();}} disabled={!parsed.trades.length}>Import {parsed.trades.length} Trades</Btn>
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
function Dashboard({ trades, notes, dayMeta, setDayMeta, onSelectTrade }) {
  const s = useMemo(()=>{
    if (!trades.length) return null;
    const wins   = trades.filter(t=>t.win);
    const losses = trades.filter(t=>!t.win);
    const total  = trades.reduce((a,t)=>a+t.pnl,0);
    const avgW   = wins.length   ? wins.reduce((a,t)=>a+t.pnl,0)/wins.length : 0;
    const avgL   = losses.length ? Math.abs(losses.reduce((a,t)=>a+t.pnl,0)/losses.length) : 0;
    const pf     = avgL > 0 ? wins.reduce((a,t)=>a+t.pnl,0) / Math.abs(losses.reduce((a,t)=>a+t.pnl,0)) : 0;

    const rTrades = trades.filter(t=>calcR(t.pnl, notes[t.id]?.risk1R) != null);
    const rVals   = rTrades.map(t=>calcR(t.pnl, notes[t.id]?.risk1R));
    const avgR    = rVals.length ? rVals.reduce((a,b)=>a+b,0)/rVals.length : null;
    const totalR  = rVals.length ? rVals.reduce((a,b)=>a+b,0) : null;

    const reviewed   = trades.filter(t=>isReviewed(notes[t.id]));
    const unreviewed = trades.length - reviewed.length;

    const mistakeCounts = {};
    trades.forEach(t=>{ (notes[t.id]?.mistakes||[]).forEach(m=>{ mistakeCounts[m] = (mistakeCounts[m]||0)+1; }); });
    const topMistakes = Object.entries(mistakeCounts).sort(([,a],[,b])=>b-a).slice(0,4);

    const byDate = {};
    trades.forEach(t=>{ if (!byDate[t.date]) byDate[t.date]={pnl:0,count:0,wins:0}; byDate[t.date].pnl+=t.pnl; byDate[t.date].count++; if(t.win) byDate[t.date].wins++; });
    const days = Object.entries(byDate).sort(([a],[b])=>a.localeCompare(b));
    let run=0;
    const curve = days.map(([date,d])=>{ run+=d.pnl; return {date:date.slice(5),cum:run,day:d.pnl}; });
    const bySymbol = {};
    trades.forEach(t=>{ if(!bySymbol[t.symbol]) bySymbol[t.symbol]={pnl:0,count:0,wins:0}; bySymbol[t.symbol].pnl+=t.pnl; bySymbol[t.symbol].count++; if(t.win) bySymbol[t.symbol].wins++; });

    return { total, winRate:wins.length/trades.length, avgW, avgL, pf, wCount:wins.length, lCount:losses.length, tCount:trades.length, curve, bySymbol, avgR, totalR, rCount:rVals.length, reviewed:reviewed.length, unreviewed, topMistakes };
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
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:12 }}>
        <StatCard label="NET P&L" value={fmtAbs(s.total,0)} color={s.total>=0?"var(--green)":"var(--red)"} delay="0s" big />
        <StatCard label="WIN RATE" value={pct(s.winRate)} color="var(--blue)" delay="0.05s" />
        <StatCard label="PROFIT FACTOR" value={s.pf.toFixed(2)} color={s.pf>=2?"var(--green)":"var(--gold)"} delay="0.10s" />
        <StatCard label="AVG WIN" value={fmtAbs(s.avgW,0)} color="var(--green)" sub={`${s.wCount} winners`} delay="0.15s" />
        <StatCard label="AVG LOSS" value={fmtAbs(s.avgL,0)} color="var(--red)" sub={`${s.lCount} losers`} delay="0.20s" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:12 }}>
        {/* AVG R-MULTIPLE — muted when no data */}
        <div className="fade-up" style={{ animationDelay:"0.05s", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"18px 20px", opacity:s.rCount>0?1:0.45, transition:"opacity 0.2s" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--dim)", letterSpacing:"0.12em", marginBottom:6, textTransform:"uppercase" }}>Avg R-Multiple</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:700, color:s.avgR!=null?rColor(s.avgR):"var(--dim)", lineHeight:1 }}>{s.avgR!=null ? fmtR(s.avgR) : "—"}</div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", marginTop:6 }}>{s.rCount > 0 ? `${s.rCount} trades with 1R set` : "Set 1R in trade detail to track"}</div>
        </div>
        {/* TOTAL R EARNED — muted when no data */}
        <div className="fade-up" style={{ animationDelay:"0.08s", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"18px 20px", opacity:s.rCount>0?1:0.45, transition:"opacity 0.2s" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--dim)", letterSpacing:"0.12em", marginBottom:6, textTransform:"uppercase" }}>Total R Earned</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:700, color:s.totalR!=null&&s.totalR>=0?"var(--green)":s.totalR!=null?"var(--red)":"var(--dim)", lineHeight:1 }}>{s.totalR!=null ? fmtR(s.totalR) : "—"}</div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", marginTop:6 }}>across {s.rCount} graded trades</div>
        </div>
        {/* REVIEWED */}
        <div className="fade-up" style={{ animationDelay:"0.11s", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"18px 20px" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--dim)", letterSpacing:"0.12em", marginBottom:6, textTransform:"uppercase" }}>Reviewed</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:700, color:"var(--green)", lineHeight:1 }}>{s.reviewed}<span style={{ fontSize:14, color:"var(--muted)", fontWeight:400 }}>/{s.tCount}</span></div>
        </div>
        {/* NEEDS REVIEW — circular progress ring */}
        <div className="fade-up" style={{ animationDelay:"0.14s", background:"var(--surface)", border:`1px solid ${s.unreviewed>0?"var(--gold)40":"var(--border)"}`, borderRadius:10, padding:"18px 20px", display:"flex", alignItems:"center", gap:14 }}>
          <div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--dim)", letterSpacing:"0.12em", marginBottom:6, textTransform:"uppercase" }}>Needs Review</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:700, color:s.unreviewed>0?"var(--gold)":"var(--green)", lineHeight:1 }}>{s.unreviewed} left</div>
          </div>
          {(() => {
            const ring = s.tCount > 0 ? s.reviewed / s.tCount : 0;
            const r = 18; const circ = 2 * Math.PI * r;
            return (
              <svg width={44} height={44} style={{ flexShrink:0 }}>
                <circle cx={22} cy={22} r={r} fill="none" stroke="var(--border2)" strokeWidth={3}/>
                <circle cx={22} cy={22} r={r} fill="none" stroke={ring===1?"var(--green)":"var(--gold)"} strokeWidth={3}
                  strokeDasharray={circ} strokeDashoffset={circ*(1-ring)}
                  transform="rotate(-90 22 22)" strokeLinecap="round"/>
                <text x={22} y={26} textAnchor="middle" fill="var(--text)" fontSize={9} fontFamily="var(--font-mono)" fontWeight="600">{s.reviewed}/{s.tCount}</text>
              </svg>
            );
          })()}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12, marginBottom:12 }}>
        <div style={{ display:"grid", gap:12 }}>
          <div className="fade-up-2" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"20px 20px 12px" }}>
            <SectionTitle title="Equity Curve" />
            {(() => {
              const yVals = s.curve.map(d=>d.cum);
              const yMin  = yVals.length ? Math.min(...yVals) : 0;
              const yMax  = yVals.length ? Math.max(...yVals) : 100;
              const yPad  = Math.max((yMax - yMin) * 0.14, 30);
              const domain = [Math.floor(yMin - yPad), Math.ceil(yMax + yPad)];
              return (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={s.curve} margin={{top:4,right:4,bottom:0,left:-20}}>
                    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00e5a0" stopOpacity={0.2}/><stop offset="95%" stopColor="#00e5a0" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="date" tick={{fontFamily:"var(--font-mono)",fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
                    <YAxis domain={domain} tick={{fontFamily:"var(--font-mono)",fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<TT/>}/><ReferenceLine y={0} stroke="var(--border2)" strokeDasharray="3 3"/>
                    <Area type="monotone" dataKey="cum" stroke="#00e5a0" strokeWidth={2} fill="url(#g1)" dot={{fill:"#00e5a0",r:4}} activeDot={{r:6,stroke:"#00e5a0",strokeWidth:2,fill:"var(--surface)"}}/>
                  </AreaChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
          <div className="fade-up-3" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}><span aria-hidden="true" style={{ fontSize:12, lineHeight:1 }}>📅</span><div style={{ fontFamily:"var(--font-display)", fontSize:12, fontWeight:700, color:"var(--muted)", letterSpacing:"0.12em", textTransform:"uppercase" }}>Calendar</div></div>
            <DashboardCalendar trades={trades} notes={notes} dayMeta={dayMeta} setDayMeta={setDayMeta} onSelectTrade={onSelectTrade} />
          </div>
        </div>

        <div style={{ display:"grid", gap:12, alignContent:"start" }}>
          <div className="fade-up-2" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"20px 20px 12px" }}>
            <SectionTitle title="Daily P&L" />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={s.curve} margin={{top:4,right:4,bottom:0,left:-20}}>
                <XAxis dataKey="date" tick={{fontFamily:"var(--font-mono)",fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontFamily:"var(--font-mono)",fontSize:10,fill:"var(--muted)"}} axisLine={false} tickLine={false}/>
                <Tooltip content={({active,payload})=>active&&payload?.length?<div style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:8,padding:"8px 12px",fontFamily:"var(--font-mono)",fontSize:12,color:payload[0].value>=0?"var(--green)":"var(--red)",fontWeight:600}}>{fmt(payload[0].value,0)}</div>:null}/>
                <ReferenceLine y={0} stroke="var(--border2)"/>
                <Bar dataKey="day" radius={[4,4,0,0]}>{s.curve.map((d,i)=><Cell key={i} fill={d.day>=0?"#00e5a0":"#ff4d6a"}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="fade-up-3" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:20 }}>
            <SectionTitle title="By Symbol"/>
            {Object.entries(s.bySymbol).map(([sym,d])=>(
              <div key={sym} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}><span style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:600 }}>{sym}</span><span style={{ fontFamily:"var(--font-mono)", fontSize:12, color:d.pnl>=0?"var(--green)":"var(--red)", fontWeight:600 }}>{fmt(d.pnl,0)}</span></div>
                <div style={{ height:3, background:"var(--border)", borderRadius:2 }}><div style={{ height:"100%", width:`${d.wins/d.count*100}%`, background:d.pnl>=0?"var(--green)":"var(--red)", borderRadius:2 }}/></div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", marginTop:4 }}>{d.count} trades · {Math.round(d.wins/d.count*100)}% WR</div>
              </div>
            ))}
          </div>

          <div className="fade-up-3" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:20 }}>
            <SectionTitle title="Top Mistakes"/>
            {s.topMistakes.length === 0 ? <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--dim)", paddingTop:8 }}>Tag mistakes in trade detail to see patterns</div> : s.topMistakes.map(([mid, count])=>{
              const m = MISTAKE_OPTIONS.find(x=>x.id===mid);
              if (!m) return null;
              const maxCount = s.topMistakes[0][1];
              return (
                <div key={mid} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}><span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:m.color, fontWeight:600 }}>{m.label}</span><span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{count}×</span></div>
                  <div style={{ height:3, background:"var(--border)", borderRadius:2 }}><div style={{ height:"100%", width:`${count/maxCount*100}%`, background:m.color, borderRadius:2 }}/></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


function TradeDetailPage({ trades, selectedDayId, selectedTradeId, onBack, dayMeta, setDayMeta, notes, onUpdate, onClearTradeNotes, playbooks }) {
  const [draftDayHtml, setDraftDayHtml] = useState("");
  const notesRef = useRef(null);
  const fileRef = useRef(null);
  const lastLoadedDayRef = useRef("");

  const selectedTrade = trades.find(t => t.id === selectedTradeId) || null;
  const dayId = selectedDayId || selectedTrade?.date;
  const selectedMeta = normalizeJournalDays(dayMeta).find(d => d.date === dayId) || { date: dayId, notesHtml: "", image: "", chartImages: [] };
  const n = selectedTrade ? (notes[selectedTrade.id] || {}) : {};
  const upd = (k, v) => selectedTrade && onUpdate(selectedTrade.id, k, v);

  useEffect(() => {
    const nextHtml = selectedMeta.notesHtml || "";
    const editor = notesRef.current;
    const switchedDays = lastLoadedDayRef.current !== dayId;

    if (switchedDays) {
      lastLoadedDayRef.current = dayId;
      setDraftDayHtml(nextHtml);
      if (editor && editor.innerHTML !== nextHtml) editor.innerHTML = nextHtml;
      return;
    }

    if (!editor) return;
    if (document.activeElement === editor) return;

    if (editor.innerHTML !== nextHtml) editor.innerHTML = nextHtml;
    setDraftDayHtml(nextHtml);
  }, [selectedMeta.notesHtml, dayId]);

  useEffect(() => {
    if (!dayId) return;
    const nextHtml = draftDayHtml === "<br>" ? "" : draftDayHtml;
    const timer = setTimeout(() => {
      updateMeta(dayId, d => (d.notesHtml === nextHtml ? d : { ...d, notesHtml: nextHtml }));
    }, 300);
    return () => clearTimeout(timer);
  }, [draftDayHtml, dayId]);

  const updateMeta = (date, updater) => {
    if (!date) return;
    setDayMeta(prev => {
      const i = prev.findIndex(d=>d.date===date);
      if (i === -1) return [...prev, updater({ date, notesHtml:"", image:"", chartImages:[] })];
      return prev.map((d, idx)=>idx===i ? updater(d) : d);
    });
  };

  if (!selectedTrade) return null;
  const rVal = calcR(selectedTrade.pnl, n.risk1R);

  const applyFormat = cmd => {
    notesRef.current?.focus();
    document.execCommand(cmd, false);
  };

  const toggleMistake = (mid) => {
    const current = n.mistakes || [];
    const next = current.includes(mid) ? current.filter(x=>x!==mid) : [...current, mid];
    upd("mistakes", next);
  };

  return (
    <div>
      <SectionTitle title="Trade Detail" action={<Btn onClick={onBack} variant="ghost">← Back to Day</Btn>} />

      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:16, marginBottom:12 }}>
        <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:700 }}>{selectedTrade.date} · {selectedTrade.symbol}</div>
        <div style={{ marginTop:8, display:"flex", gap:14, flexWrap:"wrap", fontFamily:"var(--font-mono)", fontSize:12, color:"var(--muted)" }}>
          <span>Side: <b style={{ color: sideColor(selectedTrade.side) }}>{selectedTrade.side}</b></span>
          <span>Qty: {selectedTrade.contracts}</span>
          <span>Entry: {selectedTrade.entryPrice} @ {selectedTrade.entryTime}</span>
          <span>Exit: {selectedTrade.exitPrice} @ {selectedTrade.exitTime || "—"}</span>
          <span>P&L: <b style={{ color: selectedTrade.pnl >= 0 ? "var(--green)" : "var(--red)" }}>{fmt(selectedTrade.pnl,1)}</b></span>
        </div>
      </div>


      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:16, marginBottom:12 }}>
        <SectionTitle title="Journal (Day)" />
        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
          {[ ["B","bold"], [<i key="i">I</i>,"italic"], [<u key="u">U</u>,"underline"], ["•","insertUnorderedList"], ["1.","insertOrderedList"] ].map(([label,cmd],i)=>(
            <Btn key={i} onClick={()=>applyFormat(cmd)} style={{ padding:"6px 10px", minWidth:32 }}>{label}</Btn>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:14, alignItems:"start" }}>
          <div ref={notesRef} contentEditable dir="ltr" suppressContentEditableWarning onInput={e=>{ const html = e.currentTarget.innerHTML; setDraftDayHtml(html==="<br>"?"":html); }} data-placeholder="Type your notes here..." className="journal-notes" style={{ minHeight:120, border:"1px solid var(--border)", borderRadius:8, padding:10, direction:"ltr", unicodeBidi:"plaintext" }} />

          <div style={{ border:"1px solid var(--border)", borderRadius:8, padding:10 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", letterSpacing:"0.08em", marginBottom:8 }}>CHART REFERENCES</div>
            <button
              type="button"
              onClick={()=>fileRef.current?.click()}
              style={{ background:"none", border:"none", color:"var(--blue)", textDecoration:"underline", padding:0, fontSize:12, fontFamily:"var(--font-mono)" }}
            >
              Add Images
            </button>
            {!!selectedMeta.chartImages?.length && (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
                  {selectedMeta.chartImages.map((img, idx)=>(
                    <div key={idx} style={{ position:"relative" }}>
                      <img src={img} alt={`Chart reference ${idx + 1}`} style={{ width:"100%", borderRadius:6, border:"1px solid var(--border)", display:"block" }} />
                      <button type="button" onClick={()=>updateMeta(dayId, d=>({ ...d, chartImages:(d.chartImages||[]).filter((_,i)=>i!==idx) }))} style={{ position:"absolute", top:6, right:6, background:"#000b", border:"1px solid var(--border2)", color:"var(--red)", borderRadius:4, fontSize:11, padding:"1px 5px" }}>×</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={()=>updateMeta(dayId, d=>({ ...d, chartImages:[] }))} style={{ marginTop:8, background:"none", border:"none", color:"var(--red)", textDecoration:"underline", padding:0, fontSize:12, fontFamily:"var(--font-mono)" }}>Remove All</button>
              </>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e=>{ const files=Array.from(e.target.files||[]); if(!files.length) return; Promise.all(files.map(file=>new Promise(resolve=>{ const r=new FileReader(); r.onload=ev=>resolve(String(ev.target.result)); r.readAsDataURL(file); }))).then(images=>updateMeta(dayId,d=>({ ...d, chartImages:[...(d.chartImages||[]), ...images] }))); e.target.value=""; }} />
      </div>

      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:16 }}>
        <SectionTitle title="Trade Review Form" action={<Btn variant="ghost" onClick={()=>{ onClearTradeNotes?.(selectedTrade.id); setDraftDayHtml(""); if (notesRef.current) notesRef.current.innerHTML = ""; updateMeta(dayId, d=>({ ...d, notesHtml:"", image:"", chartImages:[] })); }}>Clear All Inputs</Btn>} />

        <div style={{ background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:9, padding:"14px 16px", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:2 }}>R-MULTIPLE CALCULATOR</div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--dim)" }}>R = P&L ÷ Initial Risk (1R)</div>
            </div>
            {rVal != null && <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:800, color:rColor(rVal) }}>{fmtR(rVal)}</div>}
          </div>
          <input type="number" min="0" step="0.5" value={n.risk1R||""} onChange={e=>upd("risk1R", e.target.value)} placeholder="My 1R risk in dollars" style={{ width:"100%", background:"var(--bg)", border:"1px solid var(--border)", borderRadius:7, padding:"9px 12px", fontSize:13, outline:"none" }} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>GRADE</div>
            <div style={{ display:"flex", gap:5 }}>{["A","B","C","D","F"].map(g=><button key={g} type="button" onClick={()=>upd("grade", n.grade===g?null:g)} style={{ flex:1, padding:"7px 0", border:`1px solid ${n.grade===g?gradeColor(g):"var(--border)"}`, borderRadius:6, background:n.grade===g?gradeColor(g)+"22":"transparent", color:n.grade===g?gradeColor(g):"var(--muted)", fontSize:13, fontWeight:700 }}>{g}</button>)}</div>
          </div>
          <div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8 }}>RULE ADHERENCE</div>
            <div style={{ display:"flex", gap:8 }}>{[{v:"Y",l:"✓ YES",c:"var(--green)"},{v:"N",l:"✗ NO",c:"var(--red)"}].map(o=><button key={o.v} type="button" onClick={()=>upd("rules", n.rules===o.v?null:o.v)} style={{ flex:1, padding:"7px 0", border:`1px solid ${n.rules===o.v?o.c:"var(--border)"}`, borderRadius:6, background:n.rules===o.v?o.c+"22":"transparent", color:n.rules===o.v?o.c:"var(--muted)", fontSize:12, fontWeight:700 }}>{o.l}</button>)}</div>
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:10 }}>MISTAKE TAGS</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            {MISTAKE_OPTIONS.map(m=>{
              const active = (n.mistakes||[]).includes(m.id);
              return <button key={m.id} type="button" onClick={()=>toggleMistake(m.id)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${active?m.color:"var(--border)"}`, background:active?m.color+"22":"transparent", color:active?m.color:"var(--muted)", fontSize:11 }}>{active?"✕ ":""}{m.label}</button>;
            })}
          </div>
        </div>

        {JOURNAL_FIELDS.map(f=> (
          <div key={f.key} style={{ marginBottom:12 }}>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:6 }}>{f.label.toUpperCase()}</div>
            {f.type === "input" || f.type === "datalist" ? (
              <>
                <input value={n[f.key]||""} onChange={e=>upd(f.key,e.target.value)} placeholder={f.ph} list={f.type==="datalist"?"pb-list-trade-detail":undefined} style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:7, padding:"9px 12px", fontSize:12, outline:"none" }} />
                {f.type==="datalist" && <datalist id="pb-list-trade-detail">{playbooks.map(p=><option key={p.id} value={p.name}/>)}</datalist>}
              </>
            ) : (
              <textarea value={n[f.key]||""} onChange={e=>upd(f.key,e.target.value)} placeholder={f.ph} rows={f.key==="marketContext"||f.key==="didWell"||f.key==="improve"?3:2} style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:7, padding:"9px 12px", fontSize:12, resize:"vertical", lineHeight:1.6, outline:"none" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TRADE LOG ────────────────────────────────────────────────────────────────
function TradeLog({ trades, notes, playbooks, onSelect, onImport, onDeleteAll }) {
  const [fSide,          setFSide]          = useState("all");
  const [fSym,           setFSym]           = useState("all");
  const [fReviewed,      setFReviewed]      = useState("all");
  const [modal,          setModal]          = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [sortBy,         setSortBy]         = useState(null);
  const [expandedFills,  setExpandedFills]  = useState(new Set());

  const toggleFills = id => setExpandedFills(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });
  const [sortDir,        setSortDir]        = useState("desc");

  const symbols = [...new Set(trades.map(t=>t.symbol))];

  const filtered = useMemo(() => {
    const base = trades.filter(t => {
      const rev = isReviewed(notes[t.id]);
      return (
        (fSide==="all"     || t.side===fSide) &&
        (fSym ==="all"     || t.symbol===fSym) &&
        (fReviewed==="all" || (fReviewed==="reviewed" ? rev : !rev))
      );
    });
    if (!sortBy) return base;
    return [...base].sort((a, b) => {
      const av = sortBy === "pnl" ? a.pnl : sortBy === "symbol" ? a.symbol : a.date;
      const bv = sortBy === "pnl" ? b.pnl : sortBy === "symbol" ? b.symbol : b.date;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
  }, [trades, notes, fSide, fSym, fReviewed, sortBy, sortDir]);

  const unreviewedCount = trades.filter(t=>!isReviewed(notes[t.id])).length;
  const hasAnyR = filtered.some(t => calcR(t.pnl, notes[t.id]?.risk1R) !== null);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const SortHd = ({ label, col }) => {
    const active = sortBy === col;
    return (
      <div onClick={() => toggleSort(col)} style={{ fontFamily:"var(--font-mono)", fontSize:9, color:active?"var(--blue)":"var(--muted)", letterSpacing:"0.08em", fontWeight:700, cursor:"pointer", userSelect:"none", display:"flex", alignItems:"center", gap:2 }}>
        {label}
        <span style={{ fontSize:8, opacity:active?1:0.35 }}>{active ? (sortDir==="asc" ? "↑" : "↓") : "↕"}</span>
      </div>
    );
  };

  const hasGroupedFills = filtered.some(t => t.fills?.length > 0);
  const gridCols = (hasGroupedFills ? "20px " : "") + (hasAnyR
    ? "80px 90px 64px 50px 90px 90px 86px 86px 112px 56px 72px 60px 54px"
    : "80px 90px 64px 50px 90px 90px 86px 86px 112px 72px 60px 54px");

  // Show empty state if no trades yet
  if (trades.length === 0) {
    return (
      <div>
        {modal && <ImportModal onClose={()=>setModal(false)} onImport={onImport}/>}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:300, gap:24, padding:"60px 40px", textAlign:"center" }}>
          <div style={{ fontSize:56, opacity:0.5 }}>📊</div>
          <div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:700, marginBottom:8 }}>No trades yet</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--muted)", marginBottom:24, maxWidth:400 }}>Import your Tradovate CSV to get started. Your trades will appear here with P&amp;L analysis and review tracking.</div>
            <Btn variant="primary" onClick={()=>setModal(true)}>⬆ Import CSV</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {modal && <ImportModal onClose={()=>setModal(false)} onImport={onImport}/>}

      {/* Delete All confirmation modal */}
      {confirmDelete && (
        <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setConfirmDelete(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:14, padding:"32px 36px", width:420, textAlign:"center" }}>
            <div style={{ fontSize:36, marginBottom:16 }}>🗑</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:700, marginBottom:10 }}>Delete All Trades?</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--muted)", marginBottom:28, lineHeight:1.6 }}>
              Are you sure you want to delete all trades?<br/>This action cannot be undone.
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <button onClick={()=>{ onDeleteAll(); setConfirmDelete(false); }} style={{ background:"var(--red)", border:"1px solid var(--red)", color:"#fff", padding:"10px 22px", borderRadius:8, fontSize:13, fontWeight:700, fontFamily:"var(--font-mono)", cursor:"pointer" }}>
                Yes, Delete All
              </button>
              <button onClick={()=>setConfirmDelete(false)} style={{ background:"transparent", border:"1px solid var(--border2)", color:"var(--muted)", padding:"10px 22px", borderRadius:8, fontSize:13, fontFamily:"var(--font-mono)", cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Delete All only, right-aligned */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
        <button onClick={()=>setConfirmDelete(true)}
          style={{ background:"transparent", border:"1px solid var(--red)77", color:"var(--red)", padding:"6px 14px", borderRadius:6, fontSize:11, fontFamily:"var(--font-mono)", fontWeight:700, cursor:"pointer", transition:"all 0.2s" }}
          onMouseEnter={e=>{e.currentTarget.style.background="var(--red-dim)";e.currentTarget.style.borderColor="var(--red)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="var(--red)77";}}>
          🗑 Delete All
        </button>
      </div>

      {/* Row 2: All filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"center" }}>
        <Btn variant="primary" onClick={()=>setModal(true)}>⬆ Import CSV</Btn>
        <div style={{ flex:1 }}/>
        <div style={{ display:"flex", gap:4, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:3 }}>
          {[
            { v:"all",        l:"All Trades" },
            { v:"unreviewed", l:`Needs Review${unreviewedCount>0?` (${unreviewedCount})`:""}` },
            { v:"reviewed",   l:"Reviewed" },
          ].map(o=>(
            <button key={o.v} onClick={()=>setFReviewed(o.v)} style={{ padding:"5px 12px", borderRadius:6, border:"none", background:fReviewed===o.v?(o.v==="unreviewed"?"var(--gold)22":"var(--surface3)"):"transparent", color:fReviewed===o.v?(o.v==="unreviewed"?"var(--gold)":"var(--text)"):"var(--muted)", fontSize:11, fontFamily:"var(--font-mono)", fontWeight:fReviewed===o.v?700:400, transition:"all 0.15s", cursor:"pointer" }}>
              {o.l}
            </button>
          ))}
        </div>
        {[{v:"all",l:"All"},{v:"LONG",l:"Long"},{v:"SHORT",l:"Short"}].map(o=>(
          <button key={o.v} onClick={()=>setFSide(o.v)} style={{ background:fSide===o.v?"var(--surface3)":"var(--surface)", border:`1px solid ${fSide===o.v?"var(--border2)":"var(--border)"}`, color:fSide===o.v?"var(--text)":"var(--muted)", padding:"6px 14px", borderRadius:6, fontSize:11, fontFamily:"var(--font-mono)", fontWeight:600, cursor:"pointer" }}>{o.l}</button>
        ))}
        <select value={fSym} onChange={e=>setFSym(e.target.value)} style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--muted)", padding:"6px 12px", borderRadius:6, fontSize:11, cursor:"pointer" }}>
          <option value="all">All Symbols</option>
          {symbols.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:gridCols, padding:"10px 16px", borderBottom:"1px solid var(--border)", gap:0 }}>
          {hasGroupedFills && <div/>}
          <SortHd label="DATE"   col="date"   />
          <SortHd label="SYMBOL" col="symbol" />
          {["SIDE","QTY","ENTRY TIME","EXIT TIME","ENTRY $","EXIT $"].map(h=>(
            <div key={h} style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.08em", fontWeight:700 }}>{h}</div>
          ))}
          <SortHd label="P&L" col="pnl" />
          {hasAnyR && <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.08em", fontWeight:700 }}>R-MULT</div>}
          {["STATUS","NOTES","GRADE"].map(h=>(
            <div key={h} style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", letterSpacing:"0.08em", fontWeight:700 }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding:40, textAlign:"center", fontFamily:"var(--font-mono)", fontSize:12, color:"var(--dim)" }}>No trades match filters</div>
        )}

        {filtered.map(t=>{
          const n        = notes[t.id]||{};
          const filled   = Object.values(n).filter(v=>v&&v!==null&&v!==""&&(!Array.isArray(v)||v.length>0)).length;
          const rev      = isReviewed(n);
          const rVal     = calcR(t.pnl, n.risk1R);
          const mistakes = n.mistakes||[];
          const hasFills = t.fills?.length > 0;
          const isOpen   = expandedFills.has(t.id);
          return (
            <div key={t.id}>
              {/* ── Main trade row ── */}
              <div className="hover-row" onClick={()=>onSelect(t)} style={{ display:"grid", gridTemplateColumns:gridCols, padding:"11px 16px", borderBottom: hasFills && isOpen ? "none" : "1px solid var(--border)", gap:0, alignItems:"center", cursor:"pointer", background:!t.win?"#ff4d6a05":"transparent", transition:"background 0.1s" }}>
                {hasGroupedFills && (
                  <span style={{ display:"flex", alignItems:"center" }}>
                    {hasFills && (
                      <button type="button" onClick={e=>{e.stopPropagation(); toggleFills(t.id);}}
                        style={{ background:"transparent", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:11, lineHeight:1, padding:"1px 3px", borderRadius:3 }}>
                        {isOpen ? "▾" : "▸"}
                      </button>
                    )}
                  </span>
                )}
                <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{t.date.slice(5)}</span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:600 }}>{t.symbol}</span>
                <Chip color={sideColor(t.side)}>{t.side==="LONG"?"▲L":"▼S"}</Chip>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{t.contracts}</span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{t.entryTime}</span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{t.exitTime}</span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:11 }}>{t.entryPrice}</span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:11 }}>
                  {t.scaledExit
                    ? <span style={{ fontSize:9, fontWeight:700, color:"var(--blue)", background:"var(--blue)15", border:"1px solid var(--blue)35", borderRadius:4, padding:"2px 6px" }}>SCALED</span>
                    : t.exitPrice}
                </span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:13, fontWeight:700, color:t.pnl>=0?"var(--green)":"var(--red)" }}>{fmt(t.pnl,1)}</span>
                {hasAnyR && <span style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:700, color:rColor(rVal) }}>{fmtR(rVal)}</span>}
                <span style={{ display:"inline-flex" }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:10, fontWeight:600, color:rev?"var(--green)":"var(--gold)", background:rev?"var(--green)15":"var(--gold)15", border:`1px solid ${rev?"var(--green)35":"var(--gold)35"}`, borderRadius:10, padding:"2px 8px" }}>
                    {rev ? "done" : "open"}
                  </span>
                </span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:filled>0?"var(--blue)":"var(--dim)", fontWeight:filled>0?700:500 }}>
                  {mistakes.length>0&&<span style={{ color:"var(--red)", marginRight:2 }}>⚠</span>}
                  {filled>0?`●${filled}`:"○"}
                </span>
                {n.grade
                  ? <span style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:700, color:gradeColor(n.grade), background:gradeColor(n.grade)+"22", padding:"2px 7px", borderRadius:4, display:"inline-block" }}>{n.grade}</span>
                  : <span style={{ color:"var(--dim)", fontSize:11 }}>—</span>
                }
              </div>

              {/* ── Raw fill sub-rows (expandable) ── */}
              {hasFills && isOpen && t.fills.map((fill, fi) => (
                <div key={fi} style={{ display:"grid", gridTemplateColumns:gridCols, padding:"7px 16px", borderBottom: fi===t.fills.length-1?"1px solid var(--border)":"1px solid var(--border)22", gap:0, alignItems:"center", background:"var(--surface2)", cursor:"default" }}>
                  {hasGroupedFills && <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--dim)", paddingLeft:6 }}>{fi===t.fills.length-1?"└":"├"}</span>}
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--dim)" }}>fill {fi+1}</span>
                  <span/>
                  <Chip color={sideColor(fill.side)}>{fill.side==="LONG"?"▲L":"▼S"}</Chip>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)" }}>{fill.contracts}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)" }}>{fill.entryTime}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)" }}>{fill.exitTime}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)" }}>{fill.entryPrice}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)" }}>{fill.exitPrice}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:11, fontWeight:600, color:fill.pnl>=0?"var(--green)":"var(--red)" }}>{fmt(fill.pnl,1)}</span>
                  {hasAnyR && <span/>}
                  <span/><span/><span/>
                </div>
              ))}
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
function DashboardCalendar({ trades, notes, dayMeta, setDayMeta, onSelectTrade }) {
  const [month, setMonth] = useState(new Date().getMonth()+1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selDay, setSelDay] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const byDate = useMemo(() => {
    const m = {};
    trades.forEach(t => {
      if(!m[t.date]) m[t.date] = { pnl:0, trades:[], wins:0 };
      m[t.date].pnl += t.pnl;
      m[t.date].trades.push(t);
      if (t.win) m[t.date].wins++;
    });
    return m;
  }, [trades]);

  const updateMeta = (date, updater) => {
    if (!date) return;
    setDayMeta(prev => {
      const i = prev.findIndex(d=>d.date===date);
      if (i === -1) return [...prev, updater({ date, notesHtml:"", image:"" })];
      return prev.map((d, idx)=>idx===i ? updater(d) : d);
    });
  };

  const toPlain = (html="") => html.replace(/<br\s*\/?>(\n)?/g, "\n").replace(/<[^>]+>/g, "");
  const toHtml = (txt="") => txt.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");

  const dim = new Date(year, month, 0).getDate();
  const first = new Date(year, month-1, 1).getDay();
  const maxAbs = Math.max(...Object.values(byDate).map(d=>Math.abs(d.pnl)),1);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const selKey = selDay ? `${year}-${String(month).padStart(2,"0")}-${String(selDay).padStart(2,"0")}` : null;
  const selData = selKey ? byDate[selKey] : null;
  const selectedMeta = normalizeJournalDays(dayMeta).find(d=>d.date===selKey);

  return (
    <div>
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:14 }}>
          <button type="button" onClick={()=>{if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1);}} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:18 }}>‹</button>
          <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:700, minWidth:150, textAlign:"center" }}>{MONTHS[month-1]} {year}</div>
          <button type="button" onClick={()=>{if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1);}} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:18 }}>›</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5, marginBottom:5 }}>
          {["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d=><div key={d} style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", textAlign:"center", padding:"4px 0", letterSpacing:"0.08em" }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:5 }}>
          {Array(first).fill(null).map((_,i)=><div key={"e"+i}/>) }
          {Array(dim).fill(null).map((_,i)=>{
            const day = i+1;
            const dateKey = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const d = byDate[dateKey];
            const sel = selDay===day;
            const intensity = d ? Math.min(Math.abs(d.pnl)/maxAbs,1) : 0;
            return (
              <div key={day} onClick={()=>d&&setSelDay(day===selDay?null:day)} style={{ aspectRatio:"1", borderRadius:8, padding:6, border:`1px solid ${sel?"var(--blue)":d?"var(--border2)":"var(--border)"}`, background:d?(d.pnl>=0?`rgba(0,229,160,${intensity*0.25})`:`rgba(255,77,106,${intensity*0.25})`):"var(--surface)", cursor:d?"pointer":"default", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:d?"var(--text)":"var(--dim)" }}>{day}</div>
                {d && <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:d.pnl>=0?"var(--green)":"var(--red)", fontWeight:700 }}>{d.pnl>=0?"+":""}{Math.round(d.pnl)}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {selKey && selData ? (
        <div className="fade-up" style={{ marginTop:14 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:700 }}>{selKey}</div>
            <Btn onClick={()=>setReviewOpen(true)} style={{ padding:"6px 10px" }}>Daily Review</Btn>
          </div>
          {selData.trades.map(t=>(
            <div key={t.id} onClick={()=>onSelectTrade?.(t)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:7, marginBottom:6, cursor:"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)" }}>{t.entryTime}</span>
                <Chip color={sideColor(t.side)}>{t.side}</Chip>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:11 }}>{t.symbol}</span>
              </div>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:12, fontWeight:700, color:t.pnl>=0?"var(--green)":"var(--red)" }}>{fmt(t.pnl,1)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {reviewOpen && selKey && (
        <div style={{ position:"fixed", inset:0, background:"#0009", zIndex:900, display:"flex", justifyContent:"flex-end" }} onClick={()=>setReviewOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ width:420, height:"100%", background:"var(--surface)", borderLeft:"1px solid var(--border2)", padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:700 }}>Daily Review · {selKey}</div>
              <button type="button" onClick={()=>setReviewOpen(false)} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:20 }}>×</button>
            </div>
            <textarea value={toPlain(selectedMeta?.notesHtml||"")} onChange={e=>updateMeta(selKey, d=>({ ...d, notesHtml: toHtml(e.target.value) }))} placeholder="Overall read, how you felt, themes that worked, what to carry forward…" rows={16} style={{ width:"100%", height:"calc(100% - 42px)", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:8, padding:"10px 12px", fontSize:12, resize:"none", lineHeight:1.7, outline:"none", color:"var(--text)" }} />
          </div>
        </div>
      )}
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

const normalizeJournalDays = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(d => d && typeof d.date === "string" && d.date.length >= 8)
    .map(d => ({
      date: d.date,
      notesHtml: typeof d.notesHtml === "string" ? d.notesHtml : "",
      image: typeof d.image === "string" ? d.image : "",
      chartImages: Array.isArray(d.chartImages) ? d.chartImages.filter(v=>typeof v === "string") : (typeof d.image === "string" && d.image ? [d.image] : []),
      reportCard: (d.reportCard && typeof d.reportCard === "object") ? d.reportCard : undefined,
    }));
};

const toJournalDate = d => {
  const dt = new Date(`${d}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? new Date() : dt;
};
const fmtJournalDate = d => toJournalDate(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });

// ─── REPORT CARD HELPERS ───────────────────────────────────────────────────────
const RC_GRADE_OPTIONS = ["A+", "A", "B", "C", "D", "F"];
const RC_GRADE_COLORS  = { "A+":"#00e5a0", A:"#00e5a0", B:"#3b9eff", C:"#f5c842", D:"#ff9a3b", F:"#ff4d6a" };
const rcGradeClr = g => RC_GRADE_COLORS[g] || "var(--muted)";

const RC_SETUP_CATEGORIES = ["ENTRY", "EXIT", "MARKET", "RISK", "OTHER"];
const RC_SETUP_CATEGORY_COLORS = { "ENTRY":"#3b9eff", "EXIT":"#ff9a3b", "MARKET":"#00e5a0", "RISK":"#ff4d6a", "OTHER":"#5a7a9a" };

const rcTextareaStyle = {
  width:"100%", background:"var(--surface2)", border:"1px solid var(--border)",
  borderRadius:6, color:"var(--text)", fontFamily:"var(--font-mono)", fontSize:13,
  padding:"10px 12px", resize:"vertical", outline:"none", lineHeight:1.6,
};

const RC_DEFAULT_SEGMENTS = [
  { id:"TEMP",  grade:"", playbookOnly:false, sizing:false, immedFavor:false, comments:"" },
  { id:"9–11",  grade:"", playbookOnly:false, sizing:false, immedFavor:false, comments:"" },
  { id:"11–12", grade:"", playbookOnly:false, sizing:false, immedFavor:false, comments:"" },
  { id:"12–2",  grade:"", playbookOnly:false, sizing:false, immedFavor:false, comments:"" },
  { id:"2–4",   grade:"", playbookOnly:false, sizing:false, immedFavor:false, comments:"" },
];

const ImageLightbox = ({ src, onClose }) => {
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"zoom-out", backdropFilter:"blur(4px)" }}
    >
      <img
        src={src}
        onClick={e=>e.stopPropagation()}
        alt="Preview"
        style={{ maxWidth:"90vw", maxHeight:"90vh", objectFit:"contain", borderRadius:10, border:"1px solid var(--border2)", boxShadow:"0 24px 64px rgba(0,0,0,0.8)", cursor:"default" }}
      />
      <button
        onClick={onClose}
        style={{ position:"fixed", top:20, right:24, background:"transparent", border:"none", color:"var(--muted)", fontSize:28, cursor:"pointer", lineHeight:1 }}
        aria-label="Close preview"
      >✕</button>
    </div>
  );
};

const RCSection = ({ label, children }) => (
  <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"16px 20px" }}>
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
      <div style={{ fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:600, whiteSpace:"nowrap" }}>{label}</div>
      <div style={{ flex:1, height:1, background:"var(--border)" }} />
    </div>
    {children}
  </div>
);

function JournalPage({ trades, onSelectTrade, onNavigateToTrade, onUpsertTrade, onDeleteTrade, dayMeta, setDayMeta, onSave }) {
  const [selectedDayId, setSelectedDayId] = useState("");
  const [tab, setTab]                     = useState("notes");
  const [editingTrade, setEditingTrade]   = useState(null);
  const [collapsed, setCollapsed]         = useState(false);
  const [draftHtml, setDraftHtml]         = useState("");
  const [saveStatus, setSaveStatus]       = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const [previewImg, setPreviewImg]       = useState(null);
  const lastLoadedDayRef = useRef("");
  const notesRef         = useRef(null);
  const fileRef          = useRef(null);
  const easiestImgRef    = useRef(null);

  const safeDayMeta = useMemo(() => normalizeJournalDays(dayMeta), [dayMeta]);
  const dayMetaMap  = useMemo(() => new Map(safeDayMeta.map(d=>[d.date,d])), [safeDayMeta]);
  const dayList     = useMemo(() => {
    const dates = new Set(trades.map(t=>t.date));
    safeDayMeta.forEach(d=>dates.add(d.date));
    return [...dates].sort((a,b)=>toJournalDate(b)-toJournalDate(a));
  }, [trades, safeDayMeta]);

  useEffect(() => {
    if (!selectedDayId && dayList.length) setSelectedDayId(dayList[0]);
    if (selectedDayId && !dayList.includes(selectedDayId)) setSelectedDayId(dayList[0] || "");
  }, [dayList, selectedDayId]);

  const selectedDate   = selectedDayId || dayList[0];
  const selectedTrades = useMemo(() => trades.filter(t=>t.date===selectedDate), [trades, selectedDate]);
  const selectedMeta   = dayMetaMap.get(selectedDate) || { date:selectedDate, notesHtml:"", image:"", chartImages:[] };

  // ── Notes editor sync ──────────────────────────────────────────────────────
  useEffect(() => {
    const nextHtml = selectedMeta.notesHtml || "";
    const editor   = notesRef.current;
    const switched = lastLoadedDayRef.current !== selectedDate;
    if (switched) {
      lastLoadedDayRef.current = selectedDate;
      setDraftHtml(nextHtml);
      if (editor && editor.innerHTML !== nextHtml) editor.innerHTML = nextHtml;
      return;
    }
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== nextHtml) editor.innerHTML = nextHtml;
    setDraftHtml(nextHtml);
  }, [selectedDate, selectedMeta.notesHtml]);

  useEffect(() => {
    if (!selectedDate) return;
    const html = draftHtml === "<br>" ? "" : draftHtml;
    const t = setTimeout(() => updateMeta(selectedDate, d => d.notesHtml === html ? d : { ...d, notesHtml: html }), 300);
    return () => clearTimeout(t);
  }, [draftHtml, selectedDate]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updateMeta = (date, updater) => {
    if (!date) return;
    setDayMeta(prev => {
      const i = prev.findIndex(d=>d.date===date);
      if (i === -1) return [...prev, updater({ date, notesHtml:"", image:"", chartImages:[] })];
      return prev.map((d,idx) => idx===i ? updater(d) : d);
    });
  };

  const rc       = selectedMeta.reportCard || {};
  const updateRC = patch => updateMeta(selectedDate, d => ({ ...d, reportCard: { ...(d.reportCard||{}), ...patch } }));

  const segments      = (rc.segments && rc.segments.length===5) ? rc.segments : RC_DEFAULT_SEGMENTS;
  const updateSegment = (idx, patch) => updateRC({ segments: segments.map((s,i) => i===idx ? { ...s, ...patch } : s) });

  // Setup criteria
  const setupCriteria = (rc.setupCriteria || []).filter(c => c && c.id && typeof c.text === "string");
  const addSetupCriteria = (category, text) => {
    if (!text.trim()) return;
    updateRC({ setupCriteria: [...setupCriteria, { id:`setup_${Date.now()}`, category, text, checked:true }] });
  };
  const updateSetupCriteria = (id, patch) => updateRC({ setupCriteria: setupCriteria.map(c => c.id===id ? { ...c, ...patch } : c) });
  const deleteSetupCriteria = id => updateRC({ setupCriteria: setupCriteria.filter(c => c.id!==id) });
  const setupByCategory = RC_SETUP_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = setupCriteria.filter(c => c.category===cat);
    return acc;
  }, {});

  const applyFormat = cmd => { notesRef.current?.focus(); document.execCommand(cmd, false); };

  const onImageUpload = file => {
    if (!file || !selectedDate) return;
    const reader = new FileReader();
    reader.onload = e => updateMeta(selectedDate, d => ({ ...d, image: String(e.target.result) }));
    reader.readAsDataURL(file);
  };

  const onEasiestImgUpload = file => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => updateRC({ easiestImage: String(e.target.result) });
    reader.readAsDataURL(file);
  };

  const dayStats = day => {
    const dt       = trades.filter(t=>t.date===day);
    const net      = dt.reduce((a,t)=>a+Number(t.pnl||0),0);
    const wins     = dt.filter(t=>Number(t.pnl)>0);
    const losses   = dt.filter(t=>Number(t.pnl)<0);
    const grossWin  = wins.reduce((a,t)=>a+Number(t.pnl||0),0);
    const grossLoss = Math.abs(losses.reduce((a,t)=>a+Number(t.pnl||0),0));
    return {
      net, trades:dt.length,
      avgWin:  wins.length   ? grossWin / wins.length     : 0,
      avgLoss: losses.length ? losses.reduce((a,t)=>a+Number(t.pnl||0),0) / losses.length : 0,
      winRate: dt.length     ? (wins.length / dt.length) * 100 : 0,
      pf: grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? grossWin : 0),
    };
  };

  const makeDraftFromTrade = t => ({
    id: t.id, time: t.entryTime?.slice(0,5)||"", symbol: t.symbol||"",
    side: t.side||"LONG", qty: t.contracts||1,
    entry: t.entryPrice??"", exit: t.exitPrice??"", pnl: t.pnl??"",
  });

  const saveEditingTrade = () => {
    const side      = editingTrade.side || "LONG";
    const contracts = Math.max(1, Number(editingTrade.qty||1));
    const entryPrice = Number(editingTrade.entry||0);
    const exitPrice  = Number(editingTrade.exit||0);
    const { pnl, ticks } = calculatePnlAndTicks({ symbol:editingTrade.symbol, side, entryPrice, exitPrice, contracts, explicitPnl:editingTrade.pnl });
    onUpsertTrade({ id:editingTrade.id, date:selectedDate, symbol:editingTrade.symbol, side, contracts, entryTime:`${editingTrade.time||"00:00"}:00`, exitTime:`${editingTrade.time||"00:00"}:00`, entryPrice, exitPrice, pnl, ticks, duration:"—", win:pnl>0 });
    setEditingTrade(null);
  };

  const s            = dayStats(selectedDate || "");
  const overallGrade = rc.overallGrade || "";

  if (!selectedDate) {
    return <div style={{ color:"var(--muted)", fontFamily:"var(--font-mono)", padding:24 }}>No trading days available yet.</div>;
  }

  // ── Common table/edit UI for trades ───────────────────────────────────────
  const TradesSection = (
    <div>
      <SectionTitle title="Trades" action={<Btn onClick={()=>setEditingTrade({ id:`jr_manual_${Date.now()}`, time:"", symbol:"", side:"LONG", qty:1, entry:"", exit:"", pnl:"" })}>+ Add Trade</Btn>} />
      {!selectedTrades.length ? (
        <div style={{ border:"1px dashed var(--border2)", borderRadius:8, padding:16, color:"var(--muted)", fontFamily:"var(--font-mono)", fontSize:12 }}>No trades logged for this day yet.</div>
      ) : (
        <div style={{ border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"var(--font-mono)", fontSize:12 }}>
            <thead>
              <tr style={{ background:"var(--surface)" }}>
                {["Time","Symbol","Side","Qty","Entry","Exit","P&L","Actions"].map(h=>(
                  <th key={h} style={{ textAlign:"left", padding:"9px 10px", borderBottom:"1px solid var(--border)", fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedTrades.map(t=>(
                <tr key={t.id} className="hover-row" onClick={()=>onSelectTrade(t)} style={{ cursor:"pointer" }}>
                  <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)" }}>{t.entryTime?.slice(0,5)}</td>
                  <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)" }}>{t.symbol}</td>
                  <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)", color:t.side==="LONG"?"var(--green)":"var(--red)", fontWeight:600 }}>{t.side}</td>
                  <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)" }}>{t.contracts}</td>
                  <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)" }}>{t.entryPrice}</td>
                  <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)" }}>{t.exitPrice}</td>
                  <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)", color:Number(t.pnl||0)>=0?"var(--green)":"var(--red)", fontWeight:700 }}
                    onClick={e=>{e.stopPropagation();onNavigateToTrade(t);}} title="View in Trade Log">{fmt(Number(t.pnl||0),2)}</td>
                  <td style={{ padding:"9px 10px", borderBottom:"1px solid var(--border)" }}>
                    <button type="button" onClick={e=>{e.stopPropagation();setEditingTrade(makeDraftFromTrade(t));}} style={{ background:"transparent", border:"none", color:"var(--blue)", marginRight:8, cursor:"pointer", fontFamily:"var(--font-mono)", fontSize:12 }}>Edit</button>
                    <button type="button" onClick={e=>{e.stopPropagation();onDeleteTrade(t.id);}} style={{ background:"transparent", border:"none", color:"var(--red)", cursor:"pointer", fontFamily:"var(--font-mono)", fontSize:12 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editingTrade && (
        <div style={{ marginTop:12, border:"1px solid var(--border)", borderRadius:8, padding:12, display:"grid", gridTemplateColumns:"repeat(7,minmax(0,1fr))", gap:8 }}>
          {getInstrumentSpec(editingTrade.symbol) && (
            <div style={{ gridColumn:"1 / -1", fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>{getInstrumentSpec(editingTrade.symbol).hint}</div>
          )}
          {[["time","Time"],["symbol","Symbol"],["side","Side"],["qty","Qty"],["entry","Entry"],["exit","Exit"],["pnl","P&L"]].map(([k,l])=>(
            <label key={k} style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", display:"flex", flexDirection:"column", gap:4 }}>
              {l}
              <input value={editingTrade[k]} onChange={e=>setEditingTrade(p=>({...p,[k]:e.target.value}))} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:6, padding:"8px", fontSize:12 }} />
            </label>
          ))}
          <div style={{ gridColumn:"1 / -1", display:"flex", gap:8 }}>
            <Btn onClick={saveEditingTrade} variant="primary">Save Trade</Btn>
            <Btn onClick={()=>setEditingTrade(null)} variant="ghost">Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
    {previewImg && <ImageLightbox src={previewImg} onClose={()=>setPreviewImg(null)} />}
    <div style={{ display:"grid", gridTemplateColumns:collapsed?"48px 1fr":"240px 1fr", height:"calc(100vh - 146px)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{ borderRight:"1px solid var(--border)", background:"var(--surface)", overflowY:"auto", display:"flex", flexDirection:"column" }}>
        {/* Sticky header */}
        <div style={{ position:"sticky", top:0, zIndex:10, background:"var(--surface)", borderBottom:"1px solid var(--border)", padding:"10px 12px", display:"flex", justifyContent:collapsed?"center":"space-between", alignItems:"center" }}>
          {!collapsed && <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:600 }}>Daily Summary</div>}
          <button onClick={()=>setCollapsed(v=>!v)} style={{ background:"transparent", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:16, lineHeight:1, padding:"2px 4px" }} aria-label={collapsed?"Expand":"Collapse"}>{collapsed?"›":"‹"}</button>
        </div>

        {/* Day cards */}
        {!collapsed && dayList.map(day => {
          const ds  = dayStats(day);
          const sel = day === selectedDate;
          return (
            <button
              key={day} type="button"
              onClick={()=>setSelectedDayId(day)}
              style={{ width:"100%", textAlign:"left", background:sel?"rgba(0,229,160,0.05)":"transparent", border:"none", borderBottom:"1px solid var(--border)", borderLeft:`3px solid ${sel?"var(--green)":"transparent"}`, padding:"14px 14px 14px 11px", color:"var(--text)", cursor:"pointer", transition:"border-color 0.15s, background 0.15s" }}
            >
              <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", marginBottom:5 }}>{fmtJournalDate(day)}</div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:22, fontWeight:700, color:ds.net>=0?"var(--green)":"var(--red)", marginBottom:8 }}>{fmt(ds.net,2)}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3px 8px", fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--muted)" }}>
                <span>Avg Win <b style={{ color:"var(--green)", marginLeft:3 }}>{fmt(ds.avgWin,1)}</b></span>
                <span>Avg Loss <b style={{ color:"var(--red)", marginLeft:3 }}>{fmt(ds.avgLoss,1)}</b></span>
                <span>Win % <b style={{ color:"var(--text)", marginLeft:3 }}>{ds.winRate.toFixed(0)}%</b></span>
                <span>PF <b style={{ color:"var(--text)", marginLeft:3 }}>{ds.pf.toFixed(2)}</b></span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── MAIN PANEL ── */}
      <div style={{ display:"flex", flexDirection:"column", background:"var(--bg)", overflow:"hidden" }}>

        {/* Sticky toolbar */}
        <div style={{ position:"sticky", top:0, zIndex:10, background:"var(--surface)", borderBottom:"1px solid var(--border)", padding:"0 20px", display:"flex", alignItems:"center", gap:6, minHeight:46, flexShrink:0 }}>
          {/* Tabs */}
          {[["notes","Notes"],["report","Report Card"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:"8px 14px", border:"none", borderRadius:6, background:tab===t?"var(--green-dim)":"transparent", color:tab===t?"var(--green)":"var(--muted)", fontFamily:"var(--font-mono)", fontSize:12, fontWeight:tab===t?700:400, cursor:"pointer", transition:"all 0.15s" }}>{l}</button>
          ))}
          <div style={{ flex:1 }}/>
          {/* Auto-save indicator */}
          <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--green)", display:"inline-block", opacity:0.7 }}/>
            Auto-saving to Firestore
          </div>
          {/* Formatting buttons — Notes tab only */}
          {tab==="notes" && [["B","bold","Bold"],["I","italic","Italic"],["U","underline","Underline"],["•","insertUnorderedList","Bulleted list"],["1.","insertOrderedList","Numbered list"]].map(([label,cmd,aria],i)=>(
            <button key={i} onClick={()=>applyFormat(cmd)} title={aria} aria-label={aria} style={{ background:"var(--surface2)", border:"1px solid var(--border2)", color:"var(--text)", fontFamily:"var(--font-mono)", fontSize:11, fontWeight:700, padding:"5px 9px", borderRadius:5, minWidth:28, cursor:"pointer" }}>{label}</button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:"auto", padding:"28px 32px" }}>

          {/* Date heading (both tabs) */}
          <div style={{ fontFamily:"var(--font-mono)", fontSize:24, fontWeight:700, marginBottom:28, color:"var(--text)" }}>
            {toJournalDate(selectedDate).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
          </div>

          {/* ─── NOTES TAB ─────────────────────────────────────────────────── */}
          {tab==="notes" && (
            <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
              {/* Rich-text notes */}
              <div
                ref={notesRef}
                contentEditable dir="ltr" suppressContentEditableWarning
                onInput={e=>{ const h=e.currentTarget.innerHTML; setDraftHtml(h==="<br>"?"":h); }}
                data-placeholder="Type your notes here..."
                style={{ minHeight:200, outline:"none", color:"var(--text)", fontFamily:"var(--font-mono)", fontSize:14, lineHeight:1.7, borderBottom:"1px solid var(--border)", paddingBottom:20, direction:"ltr", unicodeBidi:"plaintext" }}
                className="journal-notes"
                aria-label="Journal notes"
              />

              {/* Image upload */}
              <div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:10 }}>Image</div>
                {!selectedMeta.image ? (
                  <button type="button" onClick={()=>fileRef.current?.click()} style={{ width:160, height:120, border:"1px dashed var(--border2)", background:"transparent", color:"var(--muted)", fontFamily:"var(--font-mono)", fontSize:12, borderRadius:8, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <span style={{ fontSize:24 }}>📷</span>
                    <span>Add Image</span>
                  </button>
                ) : (
                  <div>
                    <img src={selectedMeta.image} alt="Journal" onClick={()=>setPreviewImg(selectedMeta.image)} style={{ maxWidth:420, borderRadius:8, border:"1px solid var(--border)", cursor:"zoom-in", display:"block" }} />
                    <div style={{ marginTop:8, display:"flex", gap:8 }}>
                      <Btn onClick={()=>fileRef.current?.click()}>Replace</Btn>
                      <Btn onClick={()=>updateMeta(selectedDate, d=>({...d,image:""}))} variant="ghost">Remove</Btn>
                    </div>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{onImageUpload(e.target.files?.[0]); e.target.value="";}} />
              </div>

              {TradesSection}
            </div>
          )}

          {/* ─── REPORT CARD TAB ────────────────────────────────────────────── */}
          {tab==="report" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

              {/* Section 1 — Header strip */}
              <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.14em", fontWeight:600, marginBottom:5 }}>Daily Report Card</div>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:15, fontWeight:700 }}>{toJournalDate(selectedDate).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <div style={{ background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:8, padding:"10px 18px", textAlign:"center", minWidth:80 }}>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Overall Grade</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:26, fontWeight:700, color:overallGrade?rcGradeClr(overallGrade):"var(--dim)" }}>{overallGrade||"—"}</div>
                  </div>
                  <div style={{ background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:8, padding:"10px 18px", textAlign:"center", minWidth:90 }}>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:9, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>P&amp;L</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:20, fontWeight:700, color:s.net>=0?"var(--green)":"var(--red)" }}>{fmt(s.net,2)}</div>
                  </div>
                </div>
              </div>

              {/* Section 2 — Today's Goal */}
              <RCSection label="Today's Goal">
                <textarea value={rc.goal||""} onChange={e=>updateRC({goal:e.target.value})} placeholder="What is your sole specific focus for today?" rows={3} style={rcTextareaStyle} />
              </RCSection>

              {/* Section 3 — Reminders */}
              <RCSection label="Reminders to Myself">
                <textarea value={rc.reminders||""} onChange={e=>updateRC({reminders:e.target.value})} placeholder="e.g. Intraday time frame continuity — only take trades in the direction of the higher time frame trend." rows={3} style={rcTextareaStyle} />
              </RCSection>

              {/* Section 3.5 — Trade Setup Criteria */}
              <RCSection label="Trade Setup Criteria">
                <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                  <input id="setup_input" type="text" placeholder="Enter criteria (e.g., 'Break of resistance')…" style={{ flex:1, background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:6, color:"var(--text)", fontFamily:"var(--font-mono)", fontSize:12, padding:"8px 10px", outline:"none" }} />
                  <select id="setup_category" defaultValue="ENTRY" style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:6, color:"var(--text)", fontFamily:"var(--font-mono)", fontSize:12, padding:"8px 10px", outline:"none", minWidth:90 }}>
                    {RC_SETUP_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                  <button type="button" onClick={() => {
                    const input = document.getElementById("setup_input");
                    const select = document.getElementById("setup_category");
                    if (input && select) {
                      addSetupCriteria(select.value, input.value);
                      input.value = "";
                      input.focus();
                    }
                  }} style={{ background:"var(--green)", border:"none", borderRadius:6, color:"#000", fontFamily:"var(--font-mono)", fontSize:12, fontWeight:700, padding:"8px 14px", cursor:"pointer", whiteSpace:"nowrap" }}>+ Add</button>
                </div>
                {RC_SETUP_CATEGORIES.map(cat => {
                  const items = setupByCategory[cat] || [];
                  if (!items.length) return null;
                  return (
                    <div key={cat} style={{ marginBottom:12 }}>
                      <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:RC_SETUP_CATEGORY_COLORS[cat], textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:700, marginBottom:6 }}>{cat}</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6, marginLeft:8, paddingLeft:12, borderLeft:`2px solid ${RC_SETUP_CATEGORY_COLORS[cat]}22` }}>
                        {items.map(item => (
                          <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <input type="checkbox" checked={item.checked!==false} onChange={e=>updateSetupCriteria(item.id,{checked:e.target.checked})} style={{ width:16, height:16, cursor:"pointer", accentColor:"var(--green)" }} />
                            <div style={{ flex:1, color:item.checked!==false?"var(--text)":"var(--muted)", textDecoration:item.checked===false?"line-through":"none", fontFamily:"var(--font-mono)", fontSize:12 }}>{item.text}</div>
                            <button type="button" onClick={() => deleteSetupCriteria(item.id)} style={{ background:"transparent", border:"none", color:"var(--red)", fontFamily:"var(--font-mono)", fontSize:11, cursor:"pointer" }}>Delete</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {setupCriteria.length === 0 && (
                  <div style={{ color:"var(--muted)", fontFamily:"var(--font-mono)", fontSize:12, fontStyle:"italic" }}>No setup criteria defined yet. Add entry, exit, market, or risk criteria above.</div>
                )}
              </RCSection>

              {/* Section 4 — Session Segments */}
              <RCSection label="Session Segments">
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"var(--font-mono)", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:"var(--surface2)" }}>
                        {[["Segment","70px"],["Grade","80px"],["Playbook Only","100px"],["Sizing ✓","80px"],["Immed. In My Favor","110px"],["Comments",""]].map(([h,w])=>(
                          <th key={h} style={{ textAlign:"left", padding:"8px 10px", borderBottom:"1px solid var(--border)", fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, ...(w?{width:w}:{}) }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {segments.map((seg,idx)=>(
                        <tr key={seg.id} style={{ background:idx%2===0?"transparent":"rgba(14,20,25,0.5)" }}>
                          <td style={{ padding:"8px 10px", borderBottom:"1px solid var(--border)", color:"var(--muted)", fontWeight:600, whiteSpace:"nowrap" }}>{seg.id}</td>
                          <td style={{ padding:"6px 10px", borderBottom:"1px solid var(--border)" }}>
                            <select value={seg.grade} onChange={e=>updateSegment(idx,{grade:e.target.value})}
                              style={{ background:"var(--surface3)", border:"1px solid var(--border2)", borderRadius:5, color:seg.grade?rcGradeClr(seg.grade):"var(--muted)", fontFamily:"var(--font-mono)", fontSize:12, fontWeight:seg.grade?700:400, padding:"4px 6px", width:"100%", cursor:"pointer", outline:"none" }}>
                              <option value="">—</option>
                              {RC_GRADE_OPTIONS.map(g=><option key={g} value={g}>{g}</option>)}
                            </select>
                          </td>
                          {[["playbookOnly"],["sizing"],["immedFavor"]].map(([k])=>(
                            <td key={k} style={{ padding:"6px 10px", borderBottom:"1px solid var(--border)", textAlign:"center" }}>
                              <input type="checkbox" checked={!!seg[k]} onChange={e=>updateSegment(idx,{[k]:e.target.checked})} style={{ width:15, height:15, cursor:"pointer", accentColor:"var(--green)" }} />
                            </td>
                          ))}
                          <td style={{ padding:"6px 10px", borderBottom:"1px solid var(--border)" }}>
                            <input value={seg.comments||""} onChange={e=>updateSegment(idx,{comments:e.target.value})} placeholder="Comments…" style={{ width:"100%", background:"transparent", border:"none", borderBottom:"1px solid var(--border)", color:"var(--text)", fontFamily:"var(--font-mono)", fontSize:12, outline:"none", padding:"4px 0" }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </RCSection>

              {/* Section 5 — Learned + Changes (two columns) */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <RCSection label="What I Learned / Improved">
                  <textarea value={rc.learned||""} onChange={e=>updateRC({learned:e.target.value})} placeholder="Key takeaways from today's session…" rows={4} style={rcTextareaStyle} />
                </RCSection>
                <RCSection label="Changes From Today">
                  <textarea value={rc.changes||""} onChange={e=>updateRC({changes:e.target.value})} placeholder="What will you do differently next time?" rows={4} style={rcTextareaStyle} />
                </RCSection>
              </div>

              {/* Section 6 — Overview */}
              <RCSection label="Overview">
                <textarea value={rc.overview||""} onChange={e=>updateRC({overview:e.target.value})} placeholder="Overall summary of today's session…" rows={5} style={rcTextareaStyle} />
              </RCSection>

              {/* Section 7 — Easiest Money Trade */}
              <RCSection label="Easiest Money Trade">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 260px", gap:16 }}>
                  <div>
                    <select value={rc.easiestTradeId||""} onChange={e=>updateRC({easiestTradeId:e.target.value})}
                      style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:6, color:"var(--text)", fontFamily:"var(--font-mono)", fontSize:12, padding:"8px 10px", marginBottom:10, outline:"none" }}>
                      <option value="">Select trade…</option>
                      {selectedTrades.map(t=>(
                        <option key={t.id} value={t.id}>{t.entryTime?.slice(0,5)} · {t.symbol} · {t.side} · {fmt(t.pnl,2)}</option>
                      ))}
                    </select>
                    <textarea value={rc.easiestWriteup||""} onChange={e=>updateRC({easiestWriteup:e.target.value})} placeholder="Describe what made this trade easy…" rows={5} style={rcTextareaStyle} />
                  </div>
                  <div>
                    {!rc.easiestImage ? (
                      <button type="button" onClick={()=>easiestImgRef.current?.click()} style={{ width:"100%", minHeight:160, border:"1px dashed var(--border2)", background:"transparent", color:"var(--muted)", fontFamily:"var(--font-mono)", fontSize:12, borderRadius:8, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
                        <span style={{ fontSize:28 }}>📷</span>
                        <span>Add Chart Screenshot</span>
                      </button>
                    ) : (
                      <div>
                        <img src={rc.easiestImage} alt="Easiest trade chart" onClick={()=>setPreviewImg(rc.easiestImage)} style={{ width:"100%", maxHeight:200, objectFit:"contain", borderRadius:8, border:"1px solid var(--border)", cursor:"zoom-in", display:"block" }} />
                        <div style={{ marginTop:6, display:"flex", gap:6 }}>
                          <Btn onClick={()=>easiestImgRef.current?.click()} style={{ fontSize:10, padding:"4px 8px" }}>Replace</Btn>
                          <Btn onClick={()=>updateRC({easiestImage:""})} variant="ghost" style={{ fontSize:10, padding:"4px 8px" }}>Remove</Btn>
                        </div>
                      </div>
                    )}
                    <input ref={easiestImgRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{onEasiestImgUpload(e.target.files?.[0]); e.target.value="";}} />
                  </div>
                </div>
              </RCSection>

              {/* Section 8 — Overall Day Grade */}
              <RCSection label="Overall Day Grade">
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {RC_GRADE_OPTIONS.map(g => {
                    const sel = overallGrade === g;
                    const clr = rcGradeClr(g);
                    return (
                      <button key={g} onClick={()=>updateRC({overallGrade:sel?"":g})}
                        style={{ padding:"8px 22px", borderRadius:20, border:`1px solid ${sel?clr:"var(--border2)"}`, background:sel?`${clr}22`:"transparent", color:sel?clr:"var(--muted)", fontFamily:"var(--font-mono)", fontSize:13, fontWeight:sel?700:400, cursor:"pointer", transition:"all 0.15s" }}>
                        {g}
                      </button>
                    );
                  })}
                </div>
              </RCSection>

              {/* Save button — explicitly flushes to Firestore */}
              <button
                disabled={saveStatus==="saving"}
                onClick={async ()=>{
                  setSaveStatus("saving");
                  try {
                    await onSave();
                    setSaveStatus("saved");
                    setTimeout(()=>setSaveStatus("idle"), 2500);
                  } catch {
                    setSaveStatus("error");
                    setTimeout(()=>setSaveStatus("idle"), 3000);
                  }
                }}
                style={{ width:"100%", padding:"14px", background:saveStatus==="saved"?"#00b37a":saveStatus==="error"?"var(--red)":"var(--green)", border:"none", borderRadius:8, color:"#000", fontFamily:"var(--font-mono)", fontSize:12, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", cursor:saveStatus==="saving"?"wait":"pointer", marginBottom:8, transition:"background 0.2s" }}>
                {saveStatus==="saving" ? "Saving…" : saveStatus==="saved" ? "✓ Saved to Database" : saveStatus==="error" ? "✕ Save Failed" : "Save Report Card"}
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
    </>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"dashboard", icon:"◈", label:"Dashboard" },
  { id:"trades",    icon:"≡", label:"Trade Log"  },
  { id:"playbook",  icon:"◆", label:"Playbook"   },
  { id:"journal",   icon:"✎", label:"Journal"    },
];

export default function App() {
  const [page,      setPage]      = useState("dashboard");
  const [trades,    setTrades]    = useState([]);
  const [notes,     setNotes]     = useState({});
  const [playbooks, setPlaybooks] = useState([]);
  const [selTrade,  setSelTrade]  = useState(null);
  const [selectedDayId, setSelectedDayId] = useState("");
  const [selectedTradeId, setSelectedTradeId] = useState("");
  const [viewMode, setViewMode] = useState("DAY");
  const [journalDays, setJournalDays] = useState([]);

  // Auth + data loading state
  const [user,        setUser]        = useState(undefined); // undefined = checking auth
  const [dataLoading, setDataLoading] = useState(false);
  const dataReadyRef = useRef(false); // prevents saving before initial load completes

  // ─── Auth observer & initial data load ──────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        dataReadyRef.current = false;
        setDataLoading(true);
        setUser(u);
        try {
          const data = await loadUserData(u.uid);
          if (data.trades      !== null) setTrades(data.trades);
          if (data.notes       !== null) setNotes(data.notes);
          if (data.playbooks   !== null) setPlaybooks(data.playbooks);
          if (data.journalDays !== null) setJournalDays(normalizeJournalDays(data.journalDays));
        } catch (e) {
          console.error("Failed to load data:", e);
        }
        setDataLoading(false);
        dataReadyRef.current = true;
      } else {
        dataReadyRef.current = false;
        setUser(null);
        setTrades([]);
        setNotes({});
        setPlaybooks([]);
        setJournalDays([]);
      }
    });
  }, []);

  // ─── Save trades / notes / playbooks on change ──────────────────────────────
  useEffect(() => {
    if (!user || !dataReadyRef.current) return;
    saveTrades(user.uid, trades);
    saveNotes(user.uid, notes);
    savePlaybooks(user.uid, playbooks);
  }, [trades, notes, playbooks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Save journal days on change ────────────────────────────────────────────
  useEffect(() => {
    if (!user || !dataReadyRef.current) return;
    saveJournalDays(user.uid, normalizeJournalDays(journalDays));
  }, [journalDays]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{
    if (page !== "trades") setViewMode("DAY");
  }, [page]);

  const updateNote = useCallback((id,k,v)=>{
    setNotes(prev=>({...prev,[id]:{...(prev[id]||{}),[k]:v}}));
  },[]);

  const importTrades = useCallback(incoming=>{
    setTrades(prev=>{
      const existing = new Set(prev.map(t=>t.id));
      return [...prev, ...incoming.filter(t=>!existing.has(t.id))];
    });
  },[]);

  const deleteAllTrades = useCallback(()=>{
    setTrades([]);
    setNotes({});
  },[]);

  const openTradeDetail = useCallback((trade)=>{
    setSelectedDayId(trade.date);
    setSelectedTradeId(trade.id);
    setViewMode("TRADE_DETAIL");
  },[]);

  const navigateToTrade = useCallback((trade)=>{
    setPage("trades");
    setSelectedDayId(trade.date);
    setSelectedTradeId(trade.id);
    setViewMode("TRADE_DETAIL");
  },[]);

  const upsertTrade = useCallback((trade)=>{
    setTrades(prev=>{
      const exists = prev.some(t=>t.id===trade.id);
      return exists ? prev.map(t=>t.id===trade.id?{...t,...trade}:t) : [...prev, trade];
    });
  },[]);

  const deleteTrade = useCallback((tradeId)=>{
    setTrades(prev=>prev.filter(t=>t.id!==tradeId));
    setNotes(prev=>{
      const next = { ...prev };
      delete next[tradeId];
      return next;
    });
    setSelTrade(prev=>prev?.id===tradeId?null:prev);
  },[]);

  const idx      = selTrade ? trades.indexOf(selTrade) : -1;
  const totalPnl = trades.reduce((a,t)=>a+t.pnl,0);
  const wins     = trades.filter(t=>t.win).length;
  const unreviewed = trades.filter(t=>!isReviewed(notes[t.id])).length;

  // ─── Auth loading (checking if user is signed in) ───────────────────────────
  if (user === undefined) {
    return (
      <div style={{ display:"flex", height:"100vh", alignItems:"center", justifyContent:"center", background:"var(--bg)" }}>
        <GlobalStyles/>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--muted)" }}>Connecting…</div>
      </div>
    );
  }

  // ─── Not signed in ───────────────────────────────────────────────────────────
  if (user === null) {
    return (
      <div style={{ display:"flex", height:"100vh", alignItems:"center", justifyContent:"center", background:"var(--bg)" }}>
        <GlobalStyles/>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:36, fontWeight:800, letterSpacing:"-1px", marginBottom:4 }}>
            EDGE<span style={{ color:"var(--green)" }}>.</span>
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--muted)", letterSpacing:"0.15em", marginBottom:40 }}>TRADE JOURNAL</div>
          <button
            onClick={() => signInWithGoogle().catch(console.error)}
            style={{ display:"flex", alignItems:"center", gap:10, background:"var(--surface)", border:"1px solid var(--border2)", color:"var(--text)", borderRadius:8, padding:"12px 24px", fontFamily:"var(--font-mono)", fontSize:13, cursor:"pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // ─── Data loading after sign-in ──────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div style={{ display:"flex", height:"100vh", alignItems:"center", justifyContent:"center", background:"var(--bg)" }}>
        <GlobalStyles/>
        <div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--muted)" }}>Loading your data…</div>
      </div>
    );
  }

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

        <nav style={{ padding:"16px 12px", flex:1 }}>
          {NAV_ITEMS.map(n=>(
            <div key={n.id} className="nav-item" onClick={()=>setPage(n.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 14px", borderRadius:8, marginBottom:8, cursor:"pointer", background:page===n.id?"var(--surface2)":"transparent", color:page===n.id?"var(--text)":"var(--muted)", position:"relative" }}>
              <span style={{ fontSize:16, color:page===n.id?"var(--green)":"inherit" }}>{n.icon}</span>
              <span style={{ fontFamily:"var(--font-display)", fontSize:15, fontWeight:600 }}>{n.label}</span>
              {/* Badge for unreviewed on Trade Log */}
              {n.id==="trades" && unreviewed > 0 && (
                <span style={{ marginLeft:"auto", background:"var(--gold)22", border:"1px solid var(--gold)", color:"var(--gold)", borderRadius:10, fontSize:10, fontWeight:800, padding:"2px 7px", fontFamily:"var(--font-mono)" }}>{unreviewed}</span>
              )}
            </div>
          ))}
        </nav>

        <div style={{ padding:"20px 20px", borderTop:"1px solid var(--border2)" }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", letterSpacing:"0.1em", marginBottom:8, fontWeight:600 }}>TOTAL P&L</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:32, fontWeight:700, color:totalPnl>=0?"var(--green)":"var(--red)", marginBottom:4 }}>
            {totalPnl>=0?"+":""}{Math.round(totalPnl)}
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--muted)", marginBottom:16 }}>
            {wins}/{trades.length} wins · {Math.round(wins/trades.length*100)}% WR
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)", marginBottom:8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.displayName || user.email}</div>
          <button onClick={() => signOutUser()} style={{ background:"none", border:"1px solid var(--border)", color:"var(--muted)", borderRadius:6, padding:"7px 12px", fontSize:12, fontFamily:"var(--font-mono)", cursor:"pointer", width:"100%", transition:"all 0.15s" }}>Sign out</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"16px 28px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--bg)", flexShrink:0 }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:700 }}>
            {NAV_ITEMS.find(n=>n.id===page)?.label}
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--muted)" }}>
            <span style={{ color:"var(--text)" }}>{trades.length} trades</span> · {unreviewed > 0 ? <span style={{ color:"var(--gold)" }}>{unreviewed} unreviewed</span> : <span style={{ color:"var(--green)" }}>all reviewed ✓</span>}
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
          {page==="dashboard" && <Dashboard trades={trades} notes={notes} dayMeta={journalDays} setDayMeta={setJournalDays} onSelectTrade={setSelTrade}/>} 
          {page==="trades"    && (viewMode==="TRADE_DETAIL" ? <TradeDetailPage trades={trades} selectedDayId={selectedDayId} selectedTradeId={selectedTradeId} onBack={()=>setViewMode("DAY")} dayMeta={journalDays} setDayMeta={setJournalDays} notes={notes} onUpdate={updateNote} onClearTradeNotes={(tradeId)=>setNotes(prev=>{ const next={...prev}; delete next[tradeId]; return next; })} playbooks={playbooks} /> : <TradeLog trades={trades} notes={notes} playbooks={playbooks} onSelect={openTradeDetail} onImport={importTrades} onDeleteAll={deleteAllTrades}/>)}
          {page==="playbook"  && <Playbook   trades={trades} notes={notes} playbooks={playbooks} setPlaybooks={setPlaybooks}/>}
          {page==="journal"   && <JournalPage trades={trades} onSelectTrade={setSelTrade} onNavigateToTrade={navigateToTrade} onUpsertTrade={upsertTrade} onDeleteTrade={deleteTrade} dayMeta={journalDays} setDayMeta={setJournalDays} onSave={()=>user ? saveJournalDays(user.uid, normalizeJournalDays(journalDays)) : Promise.resolve()}/>}
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
