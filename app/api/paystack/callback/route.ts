import { eq } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { ads } from "@/lib/db/schema";
import {
  adIdFromReference,
  getPaystackConfig,
  isValidFeaturedTransaction,
  verifyPaystackTransaction,
} from "@/lib/paystack";

export async function GET(request: Request) {
  const config = getPaystackConfig();
  const origin = config?.siteUrl ?? new URL(request.url).origin;
  const reference = new URL(request.url).searchParams.get("reference") ?? "";

  if (!config || !reference) {
    return NextResponse.redirect(
      new URL("/marketplace?promote-cancelled=1", origin),
    );
  }

  try {
    const transaction = await verifyPaystackTransaction(reference, config.secretKey);
    const adId = transaction.metadata?.adId ?? adIdFromReference(reference);

    if (adId && isValidFeaturedTransaction(transaction)) {
      await connection();
      await db
        .update(ads)
        .set({ pending: 0, featured: 1, paymentId: reference })
        .where(eq(ads.id, adId));

      return NextResponse.redirect(new URL("/marketplace?promoted=1", origin));
    }
  } catch {
    // Fall through to the cancelled notice.
  }

  return NextResponse.redirect(
    new URL("/marketplace?promote-cancelled=1", origin),
  );
}
