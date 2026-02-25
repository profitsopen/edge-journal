import { db } from "./firebase";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

// ─── Refs ──────────────────────────────────────────────────────────────────────
const dataRef       = (uid, key) => doc(db, "users", uid, "data", key);
const journalDayRef = (uid, date) => doc(db, "users", uid, "journalDays", date);
const journalDaysCol = (uid) => collection(db, "users", uid, "journalDays");

// ─── Load ──────────────────────────────────────────────────────────────────────
export async function loadUserData(uid) {
  const [tradesSnap, notesSnap, playbooksSnap, journalDaysSnap] = await Promise.all([
    getDoc(dataRef(uid, "trades")),
    getDoc(dataRef(uid, "notes")),
    getDoc(dataRef(uid, "playbooks")),
    getDocs(journalDaysCol(uid)),
  ]);

  const journalDays = journalDaysSnap.docs.map(d => ({ date: d.id, ...d.data() }));

  return {
    trades:      tradesSnap.exists()    ? tradesSnap.data().items    : null,
    notes:       notesSnap.exists()     ? notesSnap.data().items     : null,
    playbooks:   playbooksSnap.exists() ? playbooksSnap.data().items : null,
    journalDays: journalDays.length > 0 ? journalDays                : null,
  };
}

// ─── Save ──────────────────────────────────────────────────────────────────────
export const saveTrades    = (uid, v) => setDoc(dataRef(uid, "trades"),    { items: v });
export const saveNotes     = (uid, v) => setDoc(dataRef(uid, "notes"),     { items: v });
export const savePlaybooks = (uid, v) => setDoc(dataRef(uid, "playbooks"), { items: v });

// Each journal day is its own document to avoid the 1MB per-doc Firestore limit
// (base64 chart images can be large; one doc per day keeps them safely separated)
export function saveJournalDays(uid, days) {
  return Promise.all(
    days.map(day =>
      setDoc(journalDayRef(uid, day.date), {
        notesHtml:   day.notesHtml   ?? "",
        image:       day.image       ?? "",
        chartImages: day.chartImages ?? [],
      })
    )
  );
}
