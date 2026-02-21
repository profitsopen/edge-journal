export const toJournalDate = (d) => new Date(`${d}T00:00:00`);
export const formatJournalDate = (d) => toJournalDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const formatCurrency = (n, digits = 0) => `${n >= 0 ? "+" : ""}${Number(n || 0).toFixed(digits)}`;
