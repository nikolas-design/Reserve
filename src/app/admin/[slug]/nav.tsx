"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "", label: "Σήμερα" },
  { href: "/floor", label: "Κάτοψη" },
  { href: "/waitlist", label: "Λίστα αναμονής" },
  { href: "/orders", label: "Παραγγελίες" },
  { href: "/menu", label: "Μενού" },
  { href: "/customers", label: "Πελάτες" },
  { href: "/reviews", label: "Αξιολογήσεις" },
  { href: "/reports", label: "Αναφορές" },
  { href: "/share", label: "Προώθηση" },
  { href: "/settings", label: "Ρυθμίσεις" },
];

export function AdminNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/admin/${slug}`;
  return (
    <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
      {items.map((it) => {
        const href = base + it.href;
        const on = it.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={it.href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`shrink-0 rounded-[14px] px-3 py-2 text-sm font-semibold transition-colors ${
              on ? "bg-surface text-ink shadow-[var(--shadow)]" : "text-ink-2 hover:bg-surface"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
