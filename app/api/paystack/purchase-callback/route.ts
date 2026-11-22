import { eq } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { purchases } from "@/lib/db/schema";
import { ensureSeeded } from "@/lib/db/seed";
import { getPaystackConfig, verifyPaystackTransaction } from "@/lib/paystack";

export async function GET(request: Request) {
  const config = getPaystackConfig();
  const origin = config?.siteUrl ?? new URL(request.url).origin;
  const reference = new URL(request.url).searchParams.get("reference") ?? "";

  if (!config || !reference) {
    return NextResponse.redirect(new URL("/marketplace?purchase=cancelled", origin));
  }

  try {
    const transaction = await verifyPaystackTransaction(reference, config.secretKey);
    const orderId = transaction.metadata?.orderId;
    const isPurchase = transaction.metadata?.type === "purchase";

    if (transaction.status === "success" && orderId && isPurchase) {
      await connection();
      await ensureSeeded();

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

        return NextResponse.redirect(new URL("/marketplace?purchase=success", origin));
      }
    }
  } catch {
    // Fall through to the cancelled notice.
  }

  return NextResponse.redirect(new URL("/marketplace?purchase=cancelled", origin));
}
