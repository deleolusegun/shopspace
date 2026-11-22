import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ads = sqliteTable("ads", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  price: text("price"),
  location: text("location").notNull(),
  contact: text("contact").notNull(),
  createdAt: text("created_at").notNull(),
  featured: integer("featured").notNull().default(0),
  pending: integer("pending").notNull().default(0),
  paymentId: text("payment_id"),
});
