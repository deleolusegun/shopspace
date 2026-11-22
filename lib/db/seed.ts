import { seedAds } from "@/lib/ads";
import { client } from "./client";

let seedPromise: Promise<void> | null = null;

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

export async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = seed().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}
