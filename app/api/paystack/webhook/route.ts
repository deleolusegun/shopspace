import { eq } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { ads } from "@/lib/db/schema";
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
    metadata?: { adId?: string } | null;
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

  const adId = payload.data?.metadata?.adId ?? adIdFromReference(reference);
  if (!adId) {
    return NextResponse.json({ received: true });
  }

  await connection();

  if (event === "charge.success") {
    try {
      const transaction = await verifyPaystackTransaction(reference, config.secretKey);
      if (isValidFeaturedTransaction(transaction)) {
        await db
          .update(ads)
          .set({ pending: 0, featured: 1, paymentId: reference })
          .where(eq(ads.id, adId));
      }
    } catch {
      // The callback will retry verification if this transient call fails.
    }
  } else {
    await db.delete(ads).where(eq(ads.id, adId));
  }

  return NextResponse.json({ received: true });
}
