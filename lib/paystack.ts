import { createHmac, timingSafeEqual } from "node:crypto";

const API_BASE = "https://api.paystack.co";

// Paystack amounts are in the currency's subunit (pesewas for GHS).
export const FEATURED_PRICE_AMOUNT = 10000;
export const FEATURED_CURRENCY = "GHS";

type PaystackEnvelope<T> = {
  status: boolean;
  message?: string;
  data: T;
};

type PaystackRequestOptions = {
  method?: "GET" | "POST";
  body?: string;
};

export type PaystackTransaction = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  metadata?: { adId?: string } | null;
};

export type PaystackInitResponse = {
  authorization_url: string;
  reference: string;
};

export function getPaystackConfig(): { secretKey: string; siteUrl: string } | null {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return null;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://my-storefront-cyan.vercel.app";
  return { secretKey, siteUrl };
}

export function paystackReference(adId: string): string {
  return `shopspace-${adId}`;
}

export function adIdFromReference(reference: string): string {
  return reference.startsWith("shopspace-")
    ? reference.slice("shopspace-".length)
    : reference;
}

export async function paystackRequest<T>(
  path: string,
  secretKey: string,
  options: PaystackRequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    body: options.body,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | PaystackEnvelope<T>
    | null;

  if (!response.ok || !payload?.status) {
    throw new Error(payload?.message ?? `Paystack request failed (${response.status})`);
  }

  return payload.data;
}

export async function verifyPaystackTransaction(
  reference: string,
  secretKey: string,
): Promise<PaystackTransaction> {
  return paystackRequest<PaystackTransaction>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    secretKey,
  );
}

export function isValidFeaturedTransaction(
  transaction: PaystackTransaction,
): boolean {
  return (
    transaction.status === "success" &&
    transaction.amount === FEATURED_PRICE_AMOUNT &&
    transaction.currency === FEATURED_CURRENCY
  );
}

export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null,
  secretKey: string,
): boolean {
  if (!signature) return false;

  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const received = Buffer.from(signature, "utf8");
  const calculated = Buffer.from(expected, "utf8");

  if (received.length !== calculated.length) return false;
  return timingSafeEqual(received, calculated);
}
