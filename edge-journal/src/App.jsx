import { useEffect, useState } from "react";
import AppLayout from "./layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import TradeLog from "./pages/TradeLog";
import Journal from "./pages/Journal";
import { loadAppState, saveCoreState, saveJournalDays } from "./lib/storage";

const GlobalStyles = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --bg: #080c10; --surface: #0e1419; --surface2: #141c24; --surface3: #1a2433; --border: #1e2d3d; --border2: #243447; --text: #e2eaf4; --muted: #5a7a9a; --green: #00e5a0; --red: #ff4d6a; }
    html, body, #root { height: 100%; background: var(--bg); color: var(--text); }
    .journal-notes:empty::before { content: attr(data-placeholder); color: var(--muted); }
  `}</style>
);

export default function App() {
  const initial = loadAppState();
  const [page, setPage] = useState("dashboard");
  const [trades, setTrades] = useState(initial.trades);
  const [notes] = useState(initial.notes);
  const [playbooks] = useState(initial.playbooks);
  const [journalDays, setJournalDays] = useState(initial.journalDays);

  useEffect(() => { saveCoreState({ trades, notes, playbooks }); }, [trades, notes, playbooks]);
  useEffect(() => { saveJournalDays(journalDays); }, [journalDays]);

  return (
    <>
      <GlobalStyles />
      <AppLayout page={page} setPage={setPage} trades={trades} notes={notes}>
        {page === "dashboard" && <Dashboard trades={trades} />}
        {page === "trade-log" && <TradeLog trades={trades} dayMeta={journalDays} />}
        {page === "journal" && <Journal trades={trades} dayMeta={journalDays} setDayMeta={setJournalDays} />}
      </AppLayout>
    </>
  );
}
