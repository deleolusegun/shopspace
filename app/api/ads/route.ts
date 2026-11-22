import { desc, eq } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { allowedImages, type Ad } from "@/lib/ads";
import { db } from "@/lib/db/client";
import { ads } from "@/lib/db/schema";
import { ensureSeeded } from "@/lib/db/seed";
import { parseGhsAmount } from "@/lib/pricing";
import {
  FEATURED_CURRENCY,
  FEATURED_PRICE_AMOUNT,
  getPaystackConfig,
  paystackReference,
  paystackRequest,
  type PaystackInitResponse,
} from "@/lib/paystack";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...init?.headers },
  });
  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function toAd(row: typeof ads.$inferSelect): Ad {
  return {
    id: row.id,
    category: row.category as Ad["category"],
    title: row.title,
    description: row.description,
    image: row.image,
    price: row.price ?? undefined,
    pricePesewas: row.pricePesewas,
    location: row.location,
    contact: row.contact,
    subaccountCode: row.subaccountCode,
    createdAt: row.createdAt,
    featured: row.featured === 1,
  };
}

export async function GET() {
  await connection();
  await ensureSeeded();

  const rows = await db
    .select()
    .from(ads)
    .where(eq(ads.pending, 0))
    .orderBy(desc(ads.featured), desc(ads.createdAt));
  return json({ ads: rows.map(toAd) });
}

export async function POST(request: Request) {
  await connection();
  await ensureSeeded();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid request body." }, { status: 400 });
  }

  const category = String(body.category ?? "").trim();
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const image = String(body.image ?? "").trim();
  const price = String(body.price ?? "").trim();
  const location = String(body.location ?? "").trim();
  const contact = String(body.contact ?? "").trim();
  const sellerSubaccount = String(body.sellerSubaccount ?? "").trim();
  const promote = body.promote === true;

  const uploadedImage =
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) &&
    image.length <= 1_500_000;

  if (category !== "Shop" && category !== "Product") {
    return json({ error: "Choose a valid category." }, { status: 400 });
  }
  if (title.length < 3 || title.length > 100) {
    return json({ error: "Title must be 3–100 characters." }, { status: 400 });
  }
  if (description.length < 10 || description.length > 600) {
    return json({ error: "Description must be 10–600 characters." }, { status: 400 });
  }
  if (!allowedImages.has(image) && !uploadedImage) {
    return json(
      { error: "Choose a cover photo or upload your own." },
      { status: 400 },
    );
  }
  if (price.length > 40) {
    return json({ error: "Price is too long." }, { status: 400 });
  }
  if (location.length < 2 || location.length > 100) {
    return json({ error: "Location must be 2–100 characters." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
    return json({ error: "Enter a valid contact email." }, { status: 400 });
  }
  if (sellerSubaccount && !/^ACCT_[A-Za-z0-9]+$/.test(sellerSubaccount)) {
    return json({ error: "Enter a valid Paystack subaccount code." }, { status: 400 });
  }

  const config = promote ? getPaystackConfig() : null;
  if (promote && !config) {
    return json(
      { error: "Paid promotion is not configured yet. Post for free instead." },
      { status: 503 },
    );
  }

  const ad: Ad = {
    id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category,
    title,
    description,
    image,
    price: price || undefined,
    pricePesewas: parseGhsAmount(price),
    location,
    contact,
    subaccountCode: sellerSubaccount || null,
    createdAt: new Date().toISOString().slice(0, 10),
    featured: false,
  };

  const paymentReference = promote ? paystackReference(ad.id) : undefined;

  await db.insert(ads).values({
    id: ad.id,
    category: ad.category,
    title: ad.title,
    description: ad.description,
    image: ad.image,
    price: ad.price ?? null,
    pricePesewas: ad.pricePesewas ?? null,
    location: ad.location,
    contact: ad.contact,
    subaccountCode: ad.subaccountCode ?? null,
    createdAt: ad.createdAt,
    featured: 0,
    pending: promote ? 1 : 0,
    paymentId: paymentReference ?? null,
  });

  if (!config) {
    return json({ ad }, { status: 201 });
  }

  try {
    const payment = await paystackRequest<PaystackInitResponse>(
      "/transaction/initialize",
      config.secretKey,
      {
        method: "POST",
        body: JSON.stringify({
          email: contact,
          amount: FEATURED_PRICE_AMOUNT,
          currency: FEATURED_CURRENCY,
          reference: paymentReference,
          callback_url: `${config.siteUrl}/api/paystack/callback`,
          metadata: {
            adId: ad.id,
            custom_fields: [
              { display_name: "Listing", variable_name: "listing", value: title },
            ],
          },
        }),
      },
    );

    if (!payment.authorization_url) {
      throw new Error("Paystack did not return a checkout URL.");
    }

    return json(
      { ad, checkoutUrl: payment.authorization_url },
      { status: 201 },
    );
  } catch {
    await db.delete(ads).where(eq(ads.id, ad.id));
    return json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}
