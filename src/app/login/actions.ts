"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const next = String(formData.get("next") || "/admin");
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: next.startsWith("/") ? next : "/admin",
    });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Λάθος email ή κωδικός." };
    }
    // Next.js implements redirect() by throwing; let it through.
    throw err;
  }
}
