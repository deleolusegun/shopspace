"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  Check,
  Globe2,
  LockKeyhole,
  MapPin,
  Megaphone,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { imageOptions, IMAGES, type Ad } from "@/lib/ads";
import { calculateSplit, formatGhs, parseGhsAmount } from "@/lib/pricing";

type Filter = "All" | "Shop" | "Product";

type AdForm = {
  category: "Shop" | "Product";
  title: string;
  description: string;
  image: string;
  price: string;
  location: string;
  contact: string;
};

const emptyForm: AdForm = {
  category: "Shop",
  title: "",
  description: "",
  image: IMAGES.store,
  price: "",
  location: "",
  contact: "",
};

async function prepareUpload(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Choose an image smaller than 8 MB.");

  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new window.Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("That image could not be opened."));
    element.src = original;
  });

  const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image uploads are not supported here.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const prepared = canvas.toDataURL("image/jpeg", 0.82);
  if (prepared.length > 1_400_000) {
    throw new Error("That image is too large after compression. Try a simpler photo.");
  }
  return prepared;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function purchaseAmount(ad: Ad): number | null {
  return ad.pricePesewas ?? parseGhsAmount(ad.price);
}

export function AdBoard() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AdForm>(emptyForm);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [promote, setPromote] = useState(false);
  const [promoNotice, setPromoNotice] = useState("");
  const [purchaseAd, setPurchaseAd] = useState<Ad | null>(null);
  const [purchaseEmail, setPurchaseEmail] = useState("");
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get("promoted")
      ? "Payment received — your listing is now featured at the top."
      : params.get("promote-cancelled")
        ? "Checkout cancelled. No charge was made."
        : params.get("purchase") === "success"
          ? "Payment received — the seller has been paid and your order is confirmed."
          : params.get("purchase") === "cancelled"
            ? "Checkout cancelled. No charge was made."
            : "";
    if (!message) return;
    const timer = window.setTimeout(() => setPromoNotice(message), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ads", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { ads: Ad[] }) => setAds(data.ads))
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ads.filter((ad) => {
      const matchesFilter = filter === "All" || ad.category === filter;
      const matchesSearch =
        !query ||
        [ad.title, ad.description, ad.location, ad.price ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [ads, filter, search]);

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      setUploadedImage(await prepareUpload(file));
      setNotice("Photo added to your listing.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not add that photo.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          image: uploadedImage ?? form.image,
          promote,
        }),
      });
      const data = (await response.json()) as {
        ad?: Ad;
        checkoutUrl?: string;
        error?: string;
      };
      if (!response.ok || !data.ad) {
        throw new Error(data.error ?? "Could not publish your listing.");
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setAds((current) => [data.ad as Ad, ...current]);
      setForm(emptyForm);
      setUploadedImage(null);
      setPromote(false);
      setModalOpen(false);
      setNotice("Your listing is live for the world to see.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not publish your listing.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePurchase(event: FormEvent) {
    event.preventDefault();
    if (!purchaseAd) return;

    setPurchaseBusy(true);
    setPurchaseError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adId: purchaseAd.id,
          buyerEmail: purchaseEmail,
        }),
      });
      const data = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? "Could not start checkout.");
      }

      window.location.href = data.checkoutUrl;
    } catch (purchaseErr) {
      setPurchaseError(
        purchaseErr instanceof Error ? purchaseErr.message : "Could not start checkout.",
      );
    } finally {
      setPurchaseBusy(false);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-teal-200/70 bg-gradient-to-br from-teal-50 via-white to-violet-50 p-7 sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              <Globe2 size={14} /> Online marketplace
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Show your stuff to the world.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Advertise a shop or a product in minutes. Add a photo, a price and a contact email —
              no account needed.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-teal-700 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
              >
                <Plus size={17} /> List your item
              </button>
              <a
                href="#listings"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Explore listings <ArrowUpRight size={17} />
              </a>
            </div>
          </div>
          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3 lg:w-sm">
            {[
              { icon: Plus, title: "1. Describe it", text: "Shop or product" },
              { icon: Sparkles, title: "2. Add a photo", text: "Upload or choose" },
              { icon: Globe2, title: "3. Go live", text: "Visible to everyone" },
            ].map((step) => (
              <div key={step.title} className="rounded-2xl border border-white bg-white/70 p-4">
                <step.icon size={18} className="text-teal-600" />
                <p className="mt-3 font-bold text-slate-900">{step.title}</p>
                <p className="mt-1 text-xs">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {promoNotice && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {promoNotice}
        </div>
      )}

      {notice && (
        <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          {notice}
        </div>
      )}

      <div id="listings" className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Live listings", value: ads.length, icon: Megaphone },
          { label: "Shops", value: ads.filter((ad) => ad.category === "Shop").length, icon: ArrowUpRight },
          { label: "Products", value: ads.filter((ad) => ad.category === "Product").length, icon: Sparkles },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {stat.label}
              </span>
              <stat.icon size={18} className="text-teal-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-950">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search shops, products and places…"
            aria-label="Search listings"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
          />
        </label>
        <div className="flex gap-2">
          {(["All", "Shop", "Product"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`h-11 rounded-xl px-4 text-xs font-bold transition ${
                filter === value
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {value === "All" ? "All" : `${value}s`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading listings…
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="font-bold text-slate-900">No listings found</p>
          <p className="mt-1 text-sm text-slate-500">Try another search or post the first one.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ad) => {
            const amount = purchaseAmount(ad);
            return (
            <article
              key={ad.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative h-48 overflow-hidden bg-slate-100">
                <Image
                  src={ad.image}
                  alt={ad.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute left-3 top-3 flex gap-2">
                  <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-700 backdrop-blur">
                    {ad.category}
                  </span>
                  {ad.featured && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 backdrop-blur">
                      Featured
                    </span>
                  )}
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-bold tracking-tight text-slate-950">{ad.title}</h2>
                  {ad.price && (
                    <span className="shrink-0 text-sm font-bold text-teal-700">{ad.price}</span>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                  {ad.description}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                  <MapPin size={13} /> {ad.location}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <span className="text-[11px] text-slate-400">{formatDate(ad.createdAt)}</span>
                  <div className="flex items-center gap-3">
                    <a
                      href={`mailto:${ad.contact}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-all hover:gap-2.5 hover:text-teal-700"
                    >
                      Contact <ArrowUpRight size={14} />
                    </a>
                    {amount !== null && amount >= 100 && (
                      <button
                        onClick={() => {
                          setPurchaseAd(ad);
                          setPurchaseEmail("");
                          setPurchaseError("");
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 text-xs font-bold text-white transition hover:bg-teal-800"
                      >
                        <ShoppingBag size={14} /> Buy now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">List your item</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Put a shop or product in front of the world. No account needed.
                </p>
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setError("");
                }}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 p-6 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                  Category
                </span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value as AdForm["category"] })
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                >
                  <option value="Shop">Shop</option>
                  <option value="Product">Product</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                  Price (optional)
                </span>
                <input
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  placeholder="$4,200/mo or From $18"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">Title</span>
                <input
                  required
                  minLength={3}
                  maxLength={100}
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Bright corner shop in Williamsburg"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                  Description
                </span>
                <textarea
                  required
                  minLength={10}
                  maxLength={600}
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Tell people what makes this shop or product worth a look."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                  Location
                </span>
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={form.location}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                  placeholder="SoHo, Manhattan"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                  Contact email
                </span>
                <input
                  required
                  type="email"
                  value={form.contact}
                  onChange={(event) => setForm({ ...form, contact: event.target.value })}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </label>

              <div className="sm:col-span-2">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                    Cover photo
                  </span>
                  <select
                    value={uploadedImage ? "uploaded" : form.image}
                    onChange={(event) => {
                      setUploadedImage(null);
                      setForm({ ...form, image: event.target.value });
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                  >
                    {uploadedImage && <option value="uploaded">Your uploaded photo</option>}
                    {imageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {uploadedImage && (
                  <div className="relative mt-2 h-28 overflow-hidden rounded-xl border border-slate-200">
                    <Image src={uploadedImage} alt="Upload preview" fill className="object-cover" />
                  </div>
                )}
              </div>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                  Or upload your own photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-bold file:text-slate-700 hover:file:bg-slate-200"
                />
                <span className="mt-1 block text-xs text-slate-400">
                  JPG, PNG or WebP up to 8 MB. Resized automatically.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={promote}
                  onChange={(event) => setPromote(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600"
                />
                <span>
                  <span className="block text-sm font-bold text-amber-900">
                    Pin it at the top for GH₵100
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-amber-800">
                    Your listing gets a Featured badge and appears first. You&apos;ll be taken to
                    secure Paystack checkout after posting; the ad goes live once payment completes.
                  </span>
                </span>
              </label>

              {error && (
                <p className="sm:col-span-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="h-11 rounded-xl bg-teal-700 px-6 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {busy ? "Publishing…" : promote ? "Continue to payment" : "Publish listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {purchaseAd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Buy this listing</h2>
                <p className="mt-1 text-sm text-slate-500">{purchaseAd.title}</p>
              </div>
              <button
                onClick={() => setPurchaseAd(null)}
                aria-label="Close checkout"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePurchase} className="grid gap-4 p-6">
              {(() => {
                const amount = purchaseAmount(purchaseAd);
                const split = calculateSplit(amount ?? 0);
                return (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">You pay</span>
                      <span className="text-xl font-black text-slate-950">
                        {formatGhs(amount ?? 0)}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
                      <p className="flex justify-between">
                        <span>Seller receives instantly</span>
                        <span className="font-bold text-teal-700">
                          {formatGhs(split.sellerShare)}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span>ShopSpace commission</span>
                        <span className="font-bold text-slate-700">
                          {formatGhs(split.commission)}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })()}

              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                  Email for your receipt
                </span>
                <input
                  required
                  type="email"
                  value={purchaseEmail}
                  onChange={(event) => setPurchaseEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </label>

              <p className="flex items-start gap-2 rounded-xl bg-teal-50 px-3 py-2 text-xs leading-5 text-teal-800">
                <LockKeyhole size={14} className="mt-0.5 shrink-0" />
                Secure Paystack checkout in GHS. The seller is paid by Paystack as soon as your
                payment succeeds.
              </p>

              {purchaseError && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {purchaseError}
                </p>
              )}

              <div className="flex gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setPurchaseAd(null)}
                  className="h-11 flex-1 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={purchaseBusy}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {purchaseBusy ? "Opening checkout…" : "Pay with Paystack"}
                  <Check size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
