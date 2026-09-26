"use client";

import { useState } from "react";

export function CopyBox({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      // clipboard blocked: the text stays selectable in the field
    }
  };
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-start gap-2">
        {multiline ? (
          <textarea readOnly value={value} rows={3} className="input resize-none font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        ) : (
          <input readOnly value={value} className="input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        )}
        <button type="button" onClick={copy} className="btn-ghost shrink-0 py-2 text-xs">{done ? "Αντιγράφηκε ✓" : "Αντιγραφή"}</button>
      </div>
    </div>
  );
}
