import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const remoteUrl = process.env.TURSO_DATABASE_URL;
const localUrl =
  process.env.SHOPSPACE_DB_URL ??
  (process.env.NODE_ENV === "production"
    ? "file:/tmp/shopspace.db"
    : "file:data/shopspace.db");
const url = remoteUrl ?? localUrl;

if (!remoteUrl && url.startsWith("file:")) {
  mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
}

export const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
