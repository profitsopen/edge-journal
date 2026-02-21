export const TRADES_STORAGE_KEY = "ej_trades";
export const NOTES_STORAGE_KEY = "ej_notes";
export const PLAYBOOKS_STORAGE_KEY = "ej_playbooks";
export const JOURNAL_DAYS_STORAGE_KEY = "ej_journal_days";

export const DEMO_TRADES = [
  { id:"t1", date:"2026-02-17", symbol:"MNQH6", side:"SHORT", contracts:1, entryTime:"10:09:15", exitTime:"10:10:08", entryPrice:24517.25, exitPrice:24538.5, pnl:-42.5, ticks:-85, duration:"0:53", win:false },
  { id:"t2", date:"2026-02-17", symbol:"MNQH6", side:"SHORT", contracts:1, entryTime:"10:11:10", exitTime:"10:13:29", entryPrice:24507.25, exitPrice:24502, pnl:10.5, ticks:21, duration:"2:19", win:true },
  { id:"t3", date:"2026-02-17", symbol:"MNQH6", side:"SHORT", contracts:1, entryTime:"10:11:10", exitTime:"10:13:29", entryPrice:24507, exitPrice:24502, pnl:10, ticks:20, duration:"2:19", win:true },
  { id:"t4", date:"2026-02-17", symbol:"MNQH6", side:"LONG", contracts:2, entryTime:"10:16:02", exitTime:"10:17:53", entryPrice:24519.25, exitPrice:24569.625, pnl:201.5, ticks:201, duration:"1:51", win:true },
  { id:"t5", date:"2026-02-17", symbol:"MNQH6", side:"LONG", contracts:2, entryTime:"13:12:21", exitTime:"13:22:47", entryPrice:24667.75, exitPrice:24740.5, pnl:291, ticks:291, duration:"10:26", win:true },
];

const parseJSON = (raw, fallback) => {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};

export function loadAppState() {
  return {
    trades: parseJSON(localStorage.getItem(TRADES_STORAGE_KEY), DEMO_TRADES),
    notes: parseJSON(localStorage.getItem(NOTES_STORAGE_KEY), {}),
    playbooks: parseJSON(localStorage.getItem(PLAYBOOKS_STORAGE_KEY), []),
    journalDays: parseJSON(localStorage.getItem(JOURNAL_DAYS_STORAGE_KEY), []),
  };
}

export function saveCoreState({ trades, notes, playbooks }) {
  localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  localStorage.setItem(PLAYBOOKS_STORAGE_KEY, JSON.stringify(playbooks));
}

export function saveJournalDays(journalDays) {
  localStorage.setItem(JOURNAL_DAYS_STORAGE_KEY, JSON.stringify(journalDays));
}
