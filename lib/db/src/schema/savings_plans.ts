import { pgTable, serial, integer, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const savingsPlansTable = pgTable("savings_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 6 }).notNull(),
  profitEarned: decimal("profit_earned", { precision: 18, scale: 8 }).notNull().default("0"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  lastPayoutDate: timestamp("last_payout_date", { withTimezone: true }),
  status: text("status").notNull().default("active"), // active | completed | early_withdrawn
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSavingsPlanSchema = createInsertSchema(savingsPlansTable).omit({ id: true, createdAt: true });
export type InsertSavingsPlan = z.infer<typeof insertSavingsPlanSchema>;
export type SavingsPlan = typeof savingsPlansTable.$inferSelect;
