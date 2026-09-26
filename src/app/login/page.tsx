import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Είσοδος" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const session = await auth();
  const { next } = await searchParams;
  const nextUrl = typeof next === "string" && next.startsWith("/") ? next : "/admin";
  if (session?.user) redirect(nextUrl);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-accent to-[#7ce7ff] font-display text-lg font-extrabold text-white">
            R
          </span>
          <span className="font-display text-2xl font-extrabold">Reserve</span>
        </div>
        <div className="card p-6 flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-bold">Είσοδος καταστήματος</h1>
            <p className="text-sm text-ink-3 mt-1">
              Συνδεθείτε για να δείτε τις κρατήσεις σας.
            </p>
          </div>
          <LoginForm next={nextUrl} />
        </div>
      </div>
    </div>
  );
}
