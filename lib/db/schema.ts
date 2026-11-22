import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ads = sqliteTable("ads", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  price: text("price"),
  pricePesewas: integer("price_pesewas"),
  location: text("location").notNull(),
  contact: text("contact").notNull(),
  subaccountCode: text("subaccount_code"),
  createdAt: text("created_at").notNull(),
  featured: integer("featured").notNull().default(0),
  pending: integer("pending").notNull().default(0),
  paymentId: text("payment_id"),
});

export const purchases = sqliteTable("purchases", {
  id: text("id").primaryKey(),
  adId: text("ad_id").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  amount: integer("amount").notNull(),
  commission: integer("commission").notNull(),
  sellerShare: integer("seller_share").notNull(),
  subaccount: text("subaccount"),
  reference: text("reference").notNull().unique(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
});
