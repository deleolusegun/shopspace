import { parseGhsAmount } from "@/lib/pricing";
import { seedAds } from "@/lib/ads";
import { client } from "./client";

let seedPromise: Promise<void> | null = null;
let commercePromise: Promise<void> | null = null;

async function seed() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ads (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image TEXT NOT NULL,
      price TEXT,
      location TEXT NOT NULL,
      contact TEXT NOT NULL,
      created_at TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0
    )
  `);

  const count = await client.execute("SELECT COUNT(*) AS count FROM ads");
  if (Number(count.rows[0]?.count ?? 0) > 0) return;

  for (const ad of seedAds) {
    await client.execute({
      sql: `INSERT INTO ads
        (id, category, title, description, image, price, location, contact, created_at, featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        ad.id,
        ad.category,
        ad.title,
        ad.description,
        ad.image,
        ad.price ?? null,
        ad.location,
        ad.contact,
        ad.createdAt,
        ad.featured ? 1 : 0,
      ],
    });
  }
}

async function addAdsColumn(name: string, definition: string) {
  const columns = await client.execute("PRAGMA table_info(ads)");
  const exists = columns.rows.some((row) => String(row.name) === name);
  if (!exists) {
    await client.execute(`ALTER TABLE ads ADD COLUMN ${name} ${definition}`);
  }
}

async function ensureCommerceSchema() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      ad_id TEXT NOT NULL,
      buyer_email TEXT NOT NULL,
      amount INTEGER NOT NULL,
      commission INTEGER NOT NULL,
      seller_share INTEGER NOT NULL,
      subaccount TEXT,
      reference TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    )
  `);

  await addAdsColumn("pending", "INTEGER NOT NULL DEFAULT 0");
  await addAdsColumn("payment_id", "TEXT");
  await addAdsColumn("price_pesewas", "INTEGER");
  await addAdsColumn("subaccount_code", "TEXT");

  const missingPrices = await client.execute(
    "SELECT id, price FROM ads WHERE price_pesewas IS NULL AND price IS NOT NULL",
  );
  for (const row of missingPrices.rows) {
    const pesewas = parseGhsAmount(String(row.price ?? ""));
    if (pesewas === null) continue;
    await client.execute({
      sql: "UPDATE ads SET price_pesewas = ? WHERE id = ?",
      args: [pesewas, String(row.id)],
    });
  }
}

export async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = seed().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  await seedPromise;

  if (!commercePromise) {
    commercePromise = ensureCommerceSchema().catch((error) => {
      commercePromise = null;
      throw error;
    });
  }
  await commercePromise;
}
