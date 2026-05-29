import { pgTable, serial, text, boolean, decimal, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  username: text("username"),
  avatarUrl: text("avatar_url"),
  kycStatus: text("kyc_status").notNull().default("none"), // none | pending | approved | rejected
  referralCode: text("referral_code").unique(),
  referredBy: integer("referred_by"),
  welcomeBonusClaimed: boolean("welcome_bonus_claimed").notNull().default(false),
  usdtDeposited: decimal("usdt_deposited", { precision: 18, scale: 8 }).notNull().default("0"),
  availableEur: decimal("available_eur", { precision: 18, scale: 8 }).notNull().default("0"),
  lockedEur: decimal("locked_eur", { precision: 18, scale: 8 }).notNull().default("0"),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
