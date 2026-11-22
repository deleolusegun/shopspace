import { eq } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { ads, purchases } from "@/lib/db/schema";
import { ensureSeeded } from "@/lib/db/seed";
import {
  adIdFromReference,
  getPaystackConfig,
  isValidFeaturedTransaction,
  verifyPaystackSignature,
  verifyPaystackTransaction,
} from "@/lib/paystack";

type PaystackEvent = {
  event?: string;
  data?: {
    reference?: string;
    metadata?: {
      adId?: string;
      orderId?: string;
      type?: string;
    } | null;
  };
};

export async function POST(request: Request) {
  const config = getPaystackConfig();
  if (!config) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (
    !verifyPaystackSignature(
      rawBody,
      request.headers.get("x-paystack-signature"),
      config.secretKey,
    )
  ) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let payload: PaystackEvent;
  try {
    payload = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const reference = payload.data?.reference;
  const event = payload.event;

  if (event !== "charge.success" && event !== "charge.failed") {
    return NextResponse.json({ received: true });
  }

  if (!reference) {
    return NextResponse.json({ received: true });
  }

  const metadata = payload.data?.metadata;
  const orderId = metadata?.orderId;
  const isPurchase = metadata?.type === "purchase";

  await connection();
  await ensureSeeded();

  if (event === "charge.success") {
    try {
      const transaction = await verifyPaystackTransaction(reference, config.secretKey);

      if (isPurchase && orderId) {
        const [purchase] = await db
          .select()
          .from(purchases)
          .where(eq(purchases.id, orderId))
          .limit(1);

        if (purchase && purchase.amount === transaction.amount) {
          await db
            .update(purchases)
            .set({ status: "paid", reference })
            .where(eq(purchases.id, orderId));
        }
      } else {
        const adId = metadata?.adId ?? adIdFromReference(reference);
        if (adId && isValidFeaturedTransaction(transaction)) {
          await db
            .update(ads)
            .set({ pending: 0, featured: 1, paymentId: reference })
            .where(eq(ads.id, adId));
        }
      }
    } catch {
      // The callback will retry verification if this transient call fails.
    }
  } else if (isPurchase && orderId) {
    await db
      .update(purchases)
      .set({ status: "failed" })
      .where(eq(purchases.id, orderId));
  } else {
    const adId = metadata?.adId ?? adIdFromReference(reference);
    if (adId) await db.delete(ads).where(eq(ads.id, adId));
  }

  return NextResponse.json({ received: true });
}
