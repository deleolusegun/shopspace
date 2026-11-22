export const DEFAULT_COMMISSION_PERCENT = 5;

/** Extracts a GHS amount from display text like "From GH₵1,200/keg". */
export function parseGhsAmount(price?: string | null): number | null {
  if (!price) return null;

  const cleaned = price.replace(/,/g, "").replace(/gh₵|ghs/gi, "");
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return Math.round(amount * 100);
}

export function formatGhs(pesewas: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: pesewas % 100 === 0 ? 0 : 2,
  }).format(pesewas / 100);
}

export function commissionPercent(): number {
  const raw = Number(process.env.PLATFORM_COMMISSION_PERCENT);
  if (!Number.isFinite(raw) || raw <= 0 || raw >= 100) {
    return DEFAULT_COMMISSION_PERCENT;
  }
  return Math.min(raw, 50);
}

export function calculateSplit(total: number, percent = commissionPercent()) {
  const commission = Math.round((total * percent) / 100);
  const sellerShare = total - commission;
  return { commission, sellerShare };
}
