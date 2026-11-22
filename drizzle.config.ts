import { defineConfig } from "drizzle-kit";

const remoteUrl = process.env.TURSO_DATABASE_URL;

export default remoteUrl
  ? defineConfig({
      schema: "./lib/db/schema.ts",
      out: "./drizzle",
      dialect: "turso",
      dbCredentials: {
        url: remoteUrl,
        authToken: process.env.TURSO_AUTH_TOKEN ?? "",
      },
    })
  : defineConfig({
      schema: "./lib/db/schema.ts",
      out: "./drizzle",
      dialect: "sqlite",
      dbCredentials: { url: "./data/shopspace.db" },
    });
