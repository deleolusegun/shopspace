import Link from "next/link";
import { Store } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="ShopSpace home">
          <span className="grid size-9 place-items-center rounded-xl bg-teal-700 text-white">
            <Store size={18} />
          </span>
          <span className="text-base font-bold tracking-tight text-slate-950">ShopSpace</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold text-slate-600">
          <Link href="/marketplace" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950">
            Marketplace
          </Link>
          <Link
            href="/marketplace#listings"
            className="hidden rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950 sm:block"
          >
            Browse
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© 2026 ShopSpace. Show your stuff to the world.</p>
        <Link href="/marketplace" className="font-bold text-teal-700 hover:underline">
          Post a listing →
        </Link>
      </div>
    </footer>
  );
}
