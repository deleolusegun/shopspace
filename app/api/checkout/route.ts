import { eq } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { ads, purchases } from "@/lib/db/schema";
import { ensureSeeded } from "@/lib/db/seed";
import { calculateSplit } from "@/lib/pricing";
import {
  FEATURED_CURRENCY,
  getPaystackConfig,
  getSellerSubaccount,
  paystackRequest,
  saleReference,
  type PaystackInitResponse,
} from "@/lib/paystack";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...init?.headers },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  await connection();
  await ensureSeeded();

  const config = getPaystackConfig();
  if (!config) {
    return json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid request body." }, { status: 400 });
  }

  const adId = String(body.adId ?? "").trim();
  const buyerEmail = String(body.buyerEmail ?? "").trim().toLowerCase();

  if (!adId) return json({ error: "Choose a listing to buy." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    return json({ error: "Enter a valid email for your receipt." }, { status: 400 });
  }

  const [ad] = await db.select().from(ads).where(eq(ads.id, adId)).limit(1);
  if (!ad || ad.pending === 1) {
    return json({ error: "That listing is not available." }, { status: 404 });
  }

  const amount = ad.pricePesewas ?? 0;
  if (!Number.isFinite(amount) || amount < 100) {
    return json(
      { error: "This listing does not have a valid GHS price for checkout." },
      { status: 400 },
    );
  }

  const subaccount = await getSellerSubaccount(config.secretKey);
  if (!subaccount) {
    return json(
      { error: "Seller payout is not configured yet. Please try again later." },
      { status: 503 },
    );
  }

  const { commission, sellerShare } = calculateSplit(amount, config.commissionPercent);
  if (sellerShare < 100) {
    return json({ error: "Listing price is too low for a split payment." }, { status: 400 });
  }

  const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const reference = saleReference(orderId);

  await db.insert(purchases).values({
    id: orderId,
    adId: ad.id,
    buyerEmail,
    amount,
    commission,
    sellerShare,
    subaccount,
    reference,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  try {
    const payment = await paystackRequest<PaystackInitResponse>(
      "/transaction/initialize",
      config.secretKey,
      {
        method: "POST",
        body: JSON.stringify({
          email: buyerEmail,
          amount,
          currency: FEATURED_CURRENCY,
          reference,
          subaccount,
          transaction_charge: commission,
          callback_url: `${config.siteUrl}/api/paystack/purchase-callback`,
          metadata: {
            type: "purchase",
            orderId,
            adId: ad.id,
            custom_fields: [
              { display_name: "Listing", variable_name: "listing", value: ad.title },
            ],
          },
        }),
      },
    );

    if (!payment.authorization_url) {
      throw new Error("Paystack did not return a checkout URL.");
    }

    return json({
      checkoutUrl: payment.authorization_url,
      reference,
      amount,
      commission,
      sellerShare,
    });
  } catch {
    await db.delete(purchases).where(eq(purchases.id, orderId));
    return json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
