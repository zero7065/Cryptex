import { pgTable, serial, integer, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const exchangeOrdersTable = pgTable("exchange_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  buyerId: integer("buyer_id"),
  usdtAmount: decimal("usdt_amount", { precision: 18, scale: 8 }).notNull(),
  eurAmount: decimal("eur_amount", { precision: 18, scale: 8 }).notNull(),
  txid: text("txid").notNull(),
  txHash: text("tx_hash"),
  status: text("status").notNull().default("pending"), // pending | completed | rejected
  escrowStatus: text("escrow_status").notNull().default("held"), // held | released | refunded
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
});

export const insertExchangeOrderSchema = createInsertSchema(exchangeOrdersTable).omit({ id: true, createdAt: true });
export type InsertExchangeOrder = z.infer<typeof insertExchangeOrderSchema>;
export type ExchangeOrder = typeof exchangeOrdersTable.$inferSelect;
