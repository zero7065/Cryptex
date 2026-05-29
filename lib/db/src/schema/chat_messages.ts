import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { exchangeOrdersTable } from "./exchange_orders";

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id").notNull().references(() => exchangeOrdersTable.id),
  senderType: text("sender_type").notNull(), // user | admin
  userId: integer("user_id"),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessagesTable).omit({ id: true, createdAt: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
