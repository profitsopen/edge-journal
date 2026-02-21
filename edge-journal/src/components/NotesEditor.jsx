import { useEffect, useRef } from "react";

export default function NotesEditor({ value, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) ref.current.innerHTML = value || "";
  }, [value]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button type="button" onClick={() => document.execCommand("bold", false)}>B</button>
        <button type="button" onClick={() => document.execCommand("italic", false)}>I</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML === "<br>" ? "" : e.currentTarget.innerHTML)}
        className="journal-notes"
        data-placeholder="Type your notes here..."
        style={{ minHeight: 140, border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}
      />
    </div>
  );
}
