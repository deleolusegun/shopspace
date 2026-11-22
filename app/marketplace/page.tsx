import type { Metadata } from "next";
import { AdBoard } from "@/components/ad-board";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Discover shops and products advertised by people in the ShopSpace community, or list your own.",
};

export default function MarketplacePage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <AdBoard />
    </main>
  );
}
