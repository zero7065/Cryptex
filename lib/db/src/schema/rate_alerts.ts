import { pgTable, serial, integer, decimal, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const rateAlertsTable = pgTable("rate_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  pair: text("pair").notNull().default("USDT/EUR"),
  targetRate: decimal("target_rate", { precision: 18, scale: 8 }).notNull(),
  direction: text("direction").notNull(), // above | below
  isTriggered: boolean("is_triggered").notNull().default(false),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRateAlertSchema = createInsertSchema(rateAlertsTable).omit({ id: true, createdAt: true });
export type InsertRateAlert = z.infer<typeof insertRateAlertSchema>;
export type RateAlert = typeof rateAlertsTable.$inferSelect;
