import { pgTable, serial, text, boolean, decimal, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const buyersTable = pgTable("buyers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  tradeCount: integer("trade_count").notNull().default(0),
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }).notNull().default("99.5"),
  avgReleaseTime: text("avg_release_time").notNull().default("~15 mins"),
  premiumPercent: decimal("premium_percent", { precision: 5, scale: 2 }).notNull().default("0.2"),
  walletAddress: text("wallet_address"),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBuyerSchema = createInsertSchema(buyersTable).omit({ id: true, createdAt: true });
export type InsertBuyer = z.infer<typeof insertBuyerSchema>;
export type Buyer = typeof buyersTable.$inferSelect;
