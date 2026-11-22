import Link from "next/link";
import { ArrowRight, Globe2, Store, Tag } from "lucide-react";

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
              <Globe2 size={14} /> The public marketplace
            </div>
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl">
              Your stuff deserves an audience.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              ShopSpace is where people advertise shops and products to the world. Create a listing
              in minutes — no account, no paperwork, just your photo, price and contact.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/marketplace"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-teal-700 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
              >
                Open the marketplace <ArrowRight size={16} />
              </Link>
              <Link
                href="/marketplace#listings"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Browse listings
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-teal-100 to-violet-100 blur-2xl" />
            <div className="relative grid gap-4 rounded-3xl border border-white bg-white/80 p-6 shadow-xl backdrop-blur sm:grid-cols-2">
              <div className="col-span-2 rounded-2xl bg-slate-950 p-6 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
                  Live ad board
                </p>
                <p className="mt-3 text-2xl font-bold">Shops and products, side by side.</p>
                <p className="mt-2 text-sm text-slate-300">Anyone can post. Everyone can browse.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-5">
                <Store size={20} className="text-teal-700" />
                <p className="mt-4 font-bold text-slate-950">Advertise a shop</p>
                <p className="mt-1 text-sm text-slate-500">Storefronts, studios, cafés and offices.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-5">
                <Tag size={20} className="text-violet-700" />
                <p className="mt-4 font-bold text-slate-950">Advertise a product</p>
                <p className="mt-1 text-sm text-slate-500">Handmade goods, food, gear and more.</p>
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-2xl bg-teal-50 p-5">
                <p className="text-sm font-bold text-teal-900">Ready in under a minute.</p>
                <Link href="/marketplace" className="text-sm font-bold text-teal-700 hover:underline">
                  Start →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
