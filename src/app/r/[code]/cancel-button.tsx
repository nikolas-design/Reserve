"use client";

import { useActionState, useState } from "react";
import { cancelAction, type CancelState } from "./actions";

export function CancelButton({ code, token }: { code: string; token: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<CancelState, FormData>(cancelAction, {});

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="btn-danger w-full">
        Ακύρωση κράτησης
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2 rounded-[18px] bg-bad-soft p-3">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="t" value={token} />
      <p className="text-sm font-semibold text-bad">Σίγουρα θέλετε να ακυρώσετε;</p>
      {state.error && <p className="text-xs text-bad">{state.error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setConfirming(false)} className="btn-ghost">Όχι</button>
        <button type="submit" disabled={pending} className="btn bg-bad text-white">
          {pending ? "Ακύρωση…" : "Ναι, ακύρωση"}
        </button>
      </div>
    </form>
  );
}
