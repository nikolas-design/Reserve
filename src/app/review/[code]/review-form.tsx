"use client";

import { useActionState, useState } from "react";
import { submitReview, type ReviewState } from "./actions";

export function ReviewForm({ code, token, preset, brandColor, bonus }: { code: string; token: string; preset: number; brandColor: string; bonus: number }) {
  const [rating, setRating] = useState(preset);
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="t" value={token} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex justify-center gap-2" role="radiogroup" aria-label="Βαθμολογία">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} αστέρια`} onClick={() => setRating(n)} className="text-4xl transition-transform hover:scale-110" style={{ color: n <= rating ? brandColor : "var(--line)" }}>★</button>
        ))}
      </div>
      <p className="text-center text-sm font-semibold text-ink-2">{["", "Απογοητευτικά", "Μέτρια", "Καλά", "Πολύ καλά", "Τέλεια!"][rating]}</p>
      <div>
        <label htmlFor="comment" className="label">Θέλετε να μας πείτε κάτι παραπάνω;</label>
        <textarea id="comment" name="comment" rows={3} maxLength={600} className="input resize-none" placeholder="Φαγητό, εξυπηρέτηση, ατμόσφαιρα…" />
      </div>
      {state.error && <p role="alert" className="rounded-[14px] bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">{state.error}</p>}
      <button type="submit" disabled={pending || rating === 0} className="btn-primary w-full py-3.5" style={{ background: brandColor }}>{pending ? "Αποστολή…" : "Αποστολή αξιολόγησης"}</button>
      {bonus > 0 && <p className="text-center text-xs text-ink-3">+{bonus} πόντοι επιβράβευσης για την αξιολόγηση.</p>}
    </form>
  );
}
