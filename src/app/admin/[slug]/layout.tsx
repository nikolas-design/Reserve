import Link from "next/link";
import { myVenue } from "@/lib/venue-access";
import { AdminNav } from "./nav";
import { logoutAction } from "./actions";

export default async function AdminLayout({ children, params }: LayoutProps<"/admin/[slug]">) {
  const { slug } = await params;
  const { venue, user } = await myVenue(slug);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex flex-col gap-4 border-b border-line bg-surface-2 px-4 py-4 md:w-60 md:border-b-0 md:border-r md:px-4 md:py-6">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-[#7ce7ff] font-display font-extrabold text-white">
            R
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold">{venue.name}</p>
            <Link href={`/${venue.slug}`} className="text-xs text-ink-3 hover:text-accent" target="_blank">
              /{venue.slug} ↗
            </Link>
          </div>
        </div>
        <AdminNav slug={venue.slug} />
        <form action={logoutAction} className="mt-auto hidden md:block">
          <p className="mb-2 truncate text-xs text-ink-3">{user.name}</p>
          <button type="submit" className="btn-ghost w-full py-2 text-xs">Αποσύνδεση</button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-6">{children}</main>
    </div>
  );
}
