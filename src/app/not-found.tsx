import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="card max-w-sm p-8 text-center flex flex-col gap-3">
        <h1 className="text-2xl font-bold">Δεν βρέθηκε</h1>
        <p className="text-ink-2 text-sm">Η σελίδα ή η κράτηση που ζητήσατε δεν υπάρχει.</p>
        <Link href="/" className="btn-primary mt-2">Αρχική</Link>
      </div>
    </div>
  );
}
