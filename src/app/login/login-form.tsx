"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          className="input"
          placeholder="owner@reserve.local"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">Κωδικός</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-[14px] bg-bad-soft px-3.5 py-2.5 text-sm font-semibold text-bad">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full py-3.5">
        {pending ? "Σύνδεση…" : "Σύνδεση"}
      </button>
    </form>
  );
}
