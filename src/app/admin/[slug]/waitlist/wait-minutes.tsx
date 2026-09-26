"use client";

import { useEffect, useState } from "react";

/** Live "minutes waiting" counter; turns red past the quoted estimate. */
export function WaitMinutes({ sinceMs, quoted }: { sinceMs: number; quoted: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const mins = Math.max(0, Math.round((now - sinceMs) / 60000));
  const late = quoted != null && mins > quoted;
  return <b className={`num ${late ? "text-bad" : "text-ink-2"}`}>{mins}′</b>;
}
