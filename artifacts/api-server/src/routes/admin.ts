import { Router } from "express";
import { db, usersTable, exchangeOrdersTable, savingsPlansTable, withdrawalsTable, adminLogsTable, notificationsTable, buyersTable, chatMessagesTable, kycSubmissionsTable, referralsTable, reviewsTable } from "@workspace/db";
import { eq, desc, ilike, or, count, sum, and, gte } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";
import type { JwtPayload } from "../lib/auth.js";
import { setSetting, getSetting, getSavingsRates, getExchangeRate, getAllSettings } from "../lib/settings.js";
import bcrypt from "bcrypt";

const router = Router();
router.use("/admin", requireAdmin);

async function logAdminAction(adminId: number, action: string, targetUserId?: number, details?: any) {
  await db.insert(adminLogsTable).values({ adminId, action, targetUserId, details });
}

function sanitizeUser(u: any) {
  return {
    id: u.id, email: u.email, username: u.username || u.email.split("@")[0],
    avatarUrl: u.avatarUrl, isAdmin: u.isAdmin, kycStatus: u.kycStatus,
    referralCode: u.referralCode, availableEur: parseFloat(u.availableEur),
    lockedEur: parseFloat(u.lockedEur), usdtDeposited: parseFloat(u.usdtDeposited || "0"), createdAt: u.createdAt,
  };
}

// ── Stats ──────────────────────────────────────────────────────────────────────
router.get("/admin/stats", async (req, res): Promise<void> => {
  const [totalUsersRes, pendingExchangeRes, pendingWithdrawalsRes, activeSavingsRes, pendingKycRes] = await Promise.all([
    db.select({ count: count() }).from(usersTable),
    db.select({ count: count() }).from(exchangeOrdersTable).where(eq(exchangeOrdersTable.status, "pending")),
    db.select({ count: count() }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "pending")),
    db.select({ count: count() }).from(savingsPlansTable).where(eq(savingsPlansTable.status, "active")),
    db.select({ count: count() }).from(kycSubmissionsTable).where(eq(kycSubmissionsTable.status, "pending")),
  ]);

  const allUsers = await db.select({ avail: usersTable.availableEur, locked: usersTable.lockedEur }).from(usersTable);
  const totalAvailableEur = allUsers.reduce((s, u) => s + parseFloat(u.avail), 0);
  const totalLockedEur = allUsers.reduce((s, u) => s + parseFloat(u.locked), 0);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentOrders = await db.select({ eurAmount: exchangeOrdersTable.eurAmount })
    .from(exchangeOrdersTable)
    .where(and(eq(exchangeOrdersTable.status, "completed"), gte(exchangeOrdersTable.confirmedAt, yesterday)));
  const totalVolume24h = recentOrders.reduce((s, o) => s + parseFloat(o.eurAmount), 0);
  const todayOrders = await db.select({ count: count() }).from(exchangeOrdersTable)
    .where(and(eq(exchangeOrdersTable.status, "completed"), gte(exchangeOrdersTable.confirmedAt, new Date(new Date().setHours(0, 0, 0, 0)))));

  res.json({
    totalUsers: totalUsersRes[0]?.count ?? 0,
    totalAvailableEur, totalLockedEur,
    pendingExchangeOrders: pendingExchangeRes[0]?.count ?? 0,
    pendingWithdrawals: pendingWithdrawalsRes[0]?.count ?? 0,
    activeSavingsPlans: activeSavingsRes[0]?.count ?? 0,
    pendingKycCount: pendingKycRes[0]?.count ?? 0,
    totalVolume24h, completedOrdersToday: todayOrders[0]?.count ?? 0,
  });
});

// ── User Management ────────────────────────────────────────────────────────────
router.get("/admin/users", async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const limit = parseInt((req.query.limit as string) || "50", 10);
  const offset = parseInt((req.query.offset as string) || "0", 10);
  let users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);
  if (search) users = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()) || (u.username || "").toLowerCase().includes(search.toLowerCase()));
  const totalRes = await db.select({ count: count() }).from(usersTable);
  const enriched = await Promise.all(users.map(async u => {
    const [exCount, savCount, wdCount] = await Promise.all([
      db.select({ count: count() }).from(exchangeOrdersTable).where(eq(exchangeOrdersTable.userId, u.id)),
      db.select({ count: count() }).from(savingsPlansTable).where(eq(savingsPlansTable.userId, u.id)),
      db.select({ count: count() }).from(withdrawalsTable).where(eq(withdrawalsTable.userId, u.id)),
    ]);
    return { ...sanitizeUser(u), exchangeOrderCount: exCount[0]?.count ?? 0, savingsPlanCount: savCount[0]?.count ?? 0, withdrawalCount: wdCount[0]?.count ?? 0 };
  }));
  res.json({ users: enriched, total: totalRes[0]?.count ?? 0 });
});

router.get("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  const [exchanges, savings, withdrawals] = await Promise.all([
    db.select().from(exchangeOrdersTable).where(eq(exchangeOrdersTable.userId, id)).orderBy(desc(exchangeOrdersTable.createdAt)).limit(20),
    db.select().from(savingsPlansTable).where(eq(savingsPlansTable.userId, id)).orderBy(desc(savingsPlansTable.createdAt)).limit(20),
    db.select().from(withdrawalsTable).where(eq(withdrawalsTable.userId, id)).orderBy(desc(withdrawalsTable.createdAt)).limit(20),
  ]);
  res.json({
    user: sanitizeUser(u),
    exchanges: exchanges.map(o => ({ ...o, usdtAmount: parseFloat(o.usdtAmount), eurAmount: parseFloat(o.eurAmount) })),
    savings: savings.map(s => ({ ...s, amount: parseFloat(s.amount), dailyRate: parseFloat(s.dailyRate), profitEarned: parseFloat(s.profitEarned) })),
    withdrawals: withdrawals.map(w => ({ ...w, amount: parseFloat(w.amount) })),
  });
});

router.patch("/admin/users/:id/balance", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  const { availableEur, lockedEur, reason } = req.body;
  const updates: Record<string, any> = {};
  if (availableEur !== undefined) updates.availableEur = parseFloat(availableEur).toFixed(8);
  if (lockedEur !== undefined) updates.lockedEur = parseFloat(lockedEur).toFixed(8);
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [u] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  await logAdminAction(adminId, "adjust_balance", id, { availableEur, lockedEur, reason });
  await db.insert(notificationsTable).values({ userId: id, title: "Balance Updated", message: `Your account balance has been updated by the admin.${reason ? ` Reason: ${reason}` : ""}`, type: "system" });
  res.json(sanitizeUser(u));
});

router.patch("/admin/users/:id/kyc-status", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  const { kycStatus } = req.body;
  if (!["none","pending","approved","rejected"].includes(kycStatus)) { res.status(400).json({ error: "Invalid KYC status" }); return; }
  await db.update(usersTable).set({ kycStatus }).where(eq(usersTable.id, id));
  await logAdminAction(adminId, "update_kyc_status", id, { kycStatus });
  res.json({ message: "KYC status updated" });
});

router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  await logAdminAction(adminId, "delete_user", id, {});
  res.json({ message: "User deleted" });
});

router.post("/admin/users/:id/reset-password", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id));
  await logAdminAction(adminId, "reset_user_password", id, {});
  res.json({ message: "Password reset" });
});

// ── KYC Management ─────────────────────────────────────────────────────────────
router.get("/admin/kyc", async (_req, res): Promise<void> => {
  const status = _req.query.status as string | undefined;
  let subs = await db.select().from(kycSubmissionsTable).orderBy(desc(kycSubmissionsTable.createdAt));
  if (status) subs = subs.filter(s => s.status === status);
  const enriched = await Promise.all(subs.map(async s => {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, s.userId));
    return { ...s, userEmail: u?.email, username: u?.username };
  }));
  res.json(enriched);
});

router.post("/admin/kyc/:id/approve", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  const [sub] = await db.update(kycSubmissionsTable)
    .set({ status: "approved", reviewedAt: new Date() })
    .where(eq(kycSubmissionsTable.id, id)).returning();
  if (!sub) { res.status(404).json({ error: "Submission not found" }); return; }
  await db.update(usersTable).set({ kycStatus: "approved" }).where(eq(usersTable.id, sub.userId));
  await db.insert(notificationsTable).values({ userId: sub.userId, title: "KYC Approved ✓", message: "Your identity has been verified. You can now make withdrawals.", type: "kyc" });
  await logAdminAction(adminId, "approve_kyc", sub.userId, { submissionId: id });
  res.json({ message: "KYC approved" });
});

router.post("/admin/kyc/:id/reject", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  const { reason } = req.body;
  const [sub] = await db.update(kycSubmissionsTable)
    .set({ status: "rejected", adminNotes: reason || "Documents unclear or invalid", reviewedAt: new Date() })
    .where(eq(kycSubmissionsTable.id, id)).returning();
  if (!sub) { res.status(404).json({ error: "Submission not found" }); return; }
  await db.update(usersTable).set({ kycStatus: "rejected" }).where(eq(usersTable.id, sub.userId));
  await db.insert(notificationsTable).values({ userId: sub.userId, title: "KYC Rejected", message: `Your KYC was rejected. Reason: ${reason || "Documents unclear"}. Please re-submit.`, type: "kyc" });
  await logAdminAction(adminId, "reject_kyc", sub.userId, { submissionId: id, reason });
  res.json({ message: "KYC rejected" });
});

// ── Exchange Orders ────────────────────────────────────────────────────────────
router.get("/admin/exchange-orders", async (_req, res): Promise<void> => {
  const status = _req.query.status as string | undefined;
  let orders = await db.select().from(exchangeOrdersTable).orderBy(desc(exchangeOrdersTable.createdAt)).limit(100);
  if (status) orders = orders.filter(o => o.status === status);
  const enriched = await Promise.all(orders.map(async o => {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, o.userId));
    let buyer = null;
    if (o.buyerId) {
      const [b] = await db.select().from(buyersTable).where(eq(buyersTable.id, o.buyerId));
      buyer = b ? { id: b.id, name: b.name } : null;
    }
    return { ...o, usdtAmount: parseFloat(o.usdtAmount), eurAmount: parseFloat(o.eurAmount), userEmail: u?.email, username: u?.username, buyer };
  }));
  res.json(enriched);
});

router.post("/admin/exchange-orders/:id/confirm", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  const [order] = await db.select().from(exchangeOrdersTable).where(eq(exchangeOrdersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.status !== "pending") { res.status(400).json({ error: "Order is not pending" }); return; }

  await db.update(exchangeOrdersTable).set({ status: "completed", escrowStatus: "released", confirmedAt: new Date() }).where(eq(exchangeOrdersTable.id, id));
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId));
  if (u) {
    const newEur = (parseFloat(u.availableEur) + parseFloat(order.eurAmount)).toFixed(8);
    const newUsdt = (parseFloat(u.usdtDeposited || "0") + parseFloat(order.usdtAmount)).toFixed(8);
    await db.update(usersTable).set({ availableEur: newEur, usdtDeposited: newUsdt }).where(eq(usersTable.id, order.userId));
  }
  await db.insert(notificationsTable).values({
    userId: order.userId, title: "Trade Confirmed ✓",
    message: `Your USDT sale of ${parseFloat(order.usdtAmount).toFixed(2)} USDT has been confirmed. €${parseFloat(order.eurAmount).toFixed(2)} has been credited to your account.`,
    type: "trade",
  });

  // Auto-reply in chat
  if (order.buyerId) {
    const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, order.buyerId));
    if (buyer) {
      await db.insert(chatMessagesTable).values({
        tradeId: id, senderType: "admin",
        message: `Payment confirmed! I've released the escrow and €${parseFloat(order.eurAmount).toFixed(2)} has been sent to your account. Great doing business with you! ⭐`,
      });
    }
  }

  // Check referral bonus
  if (u) {
    const refMinDeposit = parseFloat(await getSetting("referral_min_deposit"));
    if (parseFloat(order.usdtAmount) >= refMinDeposit && u.referredBy) {
      const [refRecord] = await db.select().from(referralsTable)
        .where(and(eq(referralsTable.referredId, order.userId), eq(referralsTable.depositMet, false)));
      if (refRecord) {
        const referrerBonus = parseFloat(await getSetting("referral_bonus_referrer"));
        const referredBonus = parseFloat(await getSetting("referral_bonus_referred"));
        await db.update(referralsTable).set({ depositMet: true, bonusEarned: true, status: "completed", referrerBonusAmount: referrerBonus.toFixed(8), referredBonusAmount: referredBonus.toFixed(8) }).where(eq(referralsTable.id, refRecord.id));
        const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, refRecord.referrerId));
        if (referrer) {
          await db.update(usersTable).set({ availableEur: (parseFloat(referrer.availableEur) + referrerBonus).toFixed(8) }).where(eq(usersTable.id, referrer.id));
          await db.insert(notificationsTable).values({ userId: referrer.id, title: "Referral Bonus! 🎉", message: `Your referral completed their first deposit! €${referrerBonus} bonus has been credited to your account.`, type: "referral" });
        }
        await db.update(usersTable).set({ availableEur: ((parseFloat(u.availableEur) + parseFloat(order.eurAmount) + referredBonus)).toFixed(8) }).where(eq(usersTable.id, order.userId));
        await db.insert(notificationsTable).values({ userId: order.userId, title: "Referral Bonus! 🎉", message: `You've received a €${referredBonus} referral bonus for completing your first deposit!`, type: "referral" });
      }
    }
  }

  await logAdminAction(adminId, "confirm_exchange_order", order.userId, { orderId: id });
  res.json({ message: "Order confirmed and EUR credited" });
});

router.post("/admin/exchange-orders/:id/reject", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  const { reason } = req.body;
  const [order] = await db.update(exchangeOrdersTable)
    .set({ status: "rejected", escrowStatus: "refunded", rejectionReason: reason || "Invalid transaction" })
    .where(eq(exchangeOrdersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  await db.insert(notificationsTable).values({ userId: order.userId, title: "Trade Rejected", message: `Your exchange order was rejected. Reason: ${reason || "Invalid transaction"}. Please contact support.`, type: "trade" });
  await logAdminAction(adminId, "reject_exchange_order", order.userId, { orderId: id, reason });
  res.json({ message: "Order rejected" });
});

// ── Withdrawals ────────────────────────────────────────────────────────────────
router.get("/admin/withdrawals", async (_req, res): Promise<void> => {
  const status = _req.query.status as string | undefined;
  let wds = await db.select().from(withdrawalsTable).orderBy(desc(withdrawalsTable.createdAt)).limit(100);
  if (status) wds = wds.filter(w => w.status === status);
  const enriched = await Promise.all(wds.map(async w => {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, w.userId));
    return { ...w, amount: parseFloat(w.amount), userEmail: u?.email, username: u?.username };
  }));
  res.json(enriched);
});

router.post("/admin/withdrawals/:id/approve", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  const [wd] = await db.update(withdrawalsTable).set({ status: "completed", processedAt: new Date() }).where(eq(withdrawalsTable.id, id)).returning();
  if (!wd) { res.status(404).json({ error: "Withdrawal not found" }); return; }
  await db.insert(notificationsTable).values({ userId: wd.userId, title: "Withdrawal Completed ✓", message: `Your withdrawal of €${parseFloat(wd.amount).toFixed(2)} via ${wd.method} has been processed. Funds will arrive in 1-3 business days.`, type: "withdrawal" });
  await logAdminAction(adminId, "approve_withdrawal", wd.userId, { withdrawalId: id });
  res.json({ message: "Withdrawal approved" });
});

router.post("/admin/withdrawals/:id/reject", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  const { reason } = req.body;
  const [wd] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id));
  if (!wd) { res.status(404).json({ error: "Withdrawal not found" }); return; }
  await db.update(withdrawalsTable).set({ status: "rejected", processedAt: new Date() }).where(eq(withdrawalsTable.id, id));
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, wd.userId));
  if (u) {
    await db.update(usersTable).set({ availableEur: (parseFloat(u.availableEur) + parseFloat(wd.amount)).toFixed(8) }).where(eq(usersTable.id, wd.userId));
  }
  await db.insert(notificationsTable).values({ userId: wd.userId, title: "Withdrawal Rejected", message: `Your withdrawal of €${parseFloat(wd.amount).toFixed(2)} was rejected. Reason: ${reason || "Compliance check failed"}. Funds returned to your balance.`, type: "withdrawal" });
  await logAdminAction(adminId, "reject_withdrawal", wd.userId, { withdrawalId: id, reason });
  res.json({ message: "Withdrawal rejected, balance refunded" });
});

// ── P2P Buyers ─────────────────────────────────────────────────────────────────
router.get("/admin/buyers", async (_req, res): Promise<void> => {
  const buyers = await db.select().from(buyersTable).orderBy(desc(buyersTable.createdAt));
  res.json(buyers.map(b => ({ ...b, completionRate: parseFloat(b.completionRate), premiumPercent: parseFloat(b.premiumPercent) })));
});

router.post("/admin/buyers", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const { name, avatarUrl, tradeCount, completionRate, avgReleaseTime, premiumPercent, walletAddress, description, isActive } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [buyer] = await db.insert(buyersTable).values({ name, avatarUrl, tradeCount: tradeCount || 0, completionRate: (completionRate || 99.5).toString(), avgReleaseTime: avgReleaseTime || "~15 mins", premiumPercent: (premiumPercent || 0.2).toString(), walletAddress, description, isActive: isActive !== false }).returning();
  await logAdminAction(adminId, "create_buyer", undefined, { buyerId: buyer.id, name });
  res.status(201).json({ ...buyer, completionRate: parseFloat(buyer.completionRate), premiumPercent: parseFloat(buyer.premiumPercent) });
});

router.patch("/admin/buyers/:id", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  const { name, avatarUrl, tradeCount, completionRate, avgReleaseTime, premiumPercent, walletAddress, description, isActive } = req.body;
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (tradeCount !== undefined) updates.tradeCount = tradeCount;
  if (completionRate !== undefined) updates.completionRate = completionRate.toString();
  if (avgReleaseTime !== undefined) updates.avgReleaseTime = avgReleaseTime;
  if (premiumPercent !== undefined) updates.premiumPercent = premiumPercent.toString();
  if (walletAddress !== undefined) updates.walletAddress = walletAddress;
  if (description !== undefined) updates.description = description;
  if (isActive !== undefined) updates.isActive = isActive;
  const [buyer] = await db.update(buyersTable).set(updates).where(eq(buyersTable.id, id)).returning();
  if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }
  await logAdminAction(adminId, "update_buyer", undefined, { buyerId: id });
  res.json({ ...buyer, completionRate: parseFloat(buyer.completionRate), premiumPercent: parseFloat(buyer.premiumPercent) });
});

router.delete("/admin/buyers/:id", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  await db.delete(buyersTable).where(eq(buyersTable.id, id));
  await logAdminAction(adminId, "delete_buyer", undefined, { buyerId: id });
  res.json({ message: "Buyer deleted" });
});

// ── Chat Impersonation ─────────────────────────────────────────────────────────
router.get("/admin/chats", async (_req, res): Promise<void> => {
  const trades = await db.select().from(exchangeOrdersTable).orderBy(desc(exchangeOrdersTable.createdAt)).limit(50);
  const withUnread = await Promise.all(trades.map(async t => {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, t.userId));
    const msgs = await db.select({ count: count() }).from(chatMessagesTable).where(and(eq(chatMessagesTable.tradeId, t.id), eq(chatMessagesTable.senderType, "user"), eq(chatMessagesTable.isRead, false)));
    const lastMsg = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.tradeId, t.id)).orderBy(desc(chatMessagesTable.createdAt)).limit(1);
    return { tradeId: t.id, userId: t.userId, userEmail: u?.email, username: u?.username, status: t.status, usdtAmount: parseFloat(t.usdtAmount), eurAmount: parseFloat(t.eurAmount), unreadMessages: msgs[0]?.count ?? 0, lastMessage: lastMsg[0]?.message || null, lastMessageAt: lastMsg[0]?.createdAt || null, buyerId: t.buyerId, createdAt: t.createdAt };
  }));
  res.json(with_unread_only_first(withUnread));
});

function with_unread_only_first(arr: any[]) {
  return arr.sort((a, b) => (b.unreadMessages - a.unreadMessages) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

router.get("/admin/chats/:tradeId", async (req, res): Promise<void> => {
  const tradeId = parseInt(req.params.tradeId as string, 10);
  const msgs = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.tradeId, tradeId)).orderBy(chatMessagesTable.createdAt);
  res.json(msgs);
});

router.post("/admin/chats/:tradeId/message", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const tradeId = parseInt(req.params.tradeId as string, 10);
  const { message } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: "Message required" }); return; }
  const [order] = await db.select().from(exchangeOrdersTable).where(eq(exchangeOrdersTable.id, tradeId));
  if (!order) { res.status(404).json({ error: "Trade not found" }); return; }
  const [msg] = await db.insert(chatMessagesTable).values({ tradeId, senderType: "admin", message: message.trim() }).returning();
  await db.insert(notificationsTable).values({ userId: order.userId, title: "New message from seller", message: `You have a new message from your seller: "${message.trim().slice(0, 80)}..."`, type: "chat" });
  await logAdminAction(adminId, "chat_message", order.userId, { tradeId, messagePreview: message.slice(0, 50) });
  res.status(201).json(msg);
});

// ── Reviews ────────────────────────────────────────────────────────────────────
router.get("/admin/reviews", async (_req, res): Promise<void> => {
  const reviews = await db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt));
  res.json(reviews);
});

router.post("/admin/reviews", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const { name, avatarUrl, reviewText, stars, country, tradeCount, isVisible } = req.body;
  if (!name || !reviewText) { res.status(400).json({ error: "Name and review text required" }); return; }
  const [review] = await db.insert(reviewsTable).values({ name, avatarUrl, reviewText, stars: stars || 5, country: country || "", tradeCount: tradeCount || 0, isVisible: isVisible !== false }).returning();
  await logAdminAction(adminId, "create_review", undefined, { reviewId: review.id });
  res.status(201).json(review);
});

router.patch("/admin/reviews/:id", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  const { name, avatarUrl, reviewText, stars, country, tradeCount, isVisible } = req.body;
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (reviewText !== undefined) updates.reviewText = reviewText;
  if (stars !== undefined) updates.stars = stars;
  if (country !== undefined) updates.country = country;
  if (tradeCount !== undefined) updates.tradeCount = tradeCount;
  if (isVisible !== undefined) updates.isVisible = isVisible;
  const [review] = await db.update(reviewsTable).set(updates).where(eq(reviewsTable.id, id)).returning();
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  await logAdminAction(adminId, "update_review", undefined, { reviewId: id });
  res.json(review);
});

router.delete("/admin/reviews/:id", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  await logAdminAction(adminId, "delete_review", undefined, { reviewId: id });
  res.json({ message: "Review deleted" });
});

// ── Broadcast Notification ─────────────────────────────────────────────────────
router.post("/admin/broadcast", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const { title, message, targetUserId, type } = req.body;
  if (!title || !message) { res.status(400).json({ error: "Title and message required" }); return; }
  if (targetUserId) {
    await db.insert(notificationsTable).values({ userId: targetUserId, title, message, type: type || "system" });
  } else {
    const users = await db.select({ id: usersTable.id }).from(usersTable);
    await Promise.all(users.map(u => db.insert(notificationsTable).values({ userId: u.id, title, message, type: type || "system" })));
  }
  await logAdminAction(adminId, "broadcast_notification", targetUserId, { title, message });
  res.json({ message: "Broadcast sent" });
});

// ── Settings ───────────────────────────────────────────────────────────────────
router.get("/admin/settings", async (_req, res): Promise<void> => {
  const settings = await getAllSettings();
  res.json(settings);
});

router.patch("/admin/settings", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const updates = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    await setSetting(key, String(value));
  }
  await logAdminAction(adminId, "update_settings", undefined, updates);
  res.json({ message: "Settings updated" });
});

// ── Savings ────────────────────────────────────────────────────────────────────
router.get("/admin/savings", async (_req, res): Promise<void> => {
  const rates = await getSavingsRates();
  res.json(rates);
});

router.patch("/admin/savings/rates", async (req, res): Promise<void> => {
  const { userId: adminId } = (req as any).user as JwtPayload;
  const { rate7d, rate14d, rate30d, minAmount, earlyWithdrawPenalty, penaltyPercent } = req.body;
  const tasks: Promise<void>[] = [];
  if (rate7d !== undefined) tasks.push(setSetting("savings_rate_7d", rate7d.toString()));
  if (rate14d !== undefined) tasks.push(setSetting("savings_rate_14d", rate14d.toString()));
  if (rate30d !== undefined) tasks.push(setSetting("savings_rate_30d", rate30d.toString()));
  if (minAmount !== undefined) tasks.push(setSetting("savings_min_amount", minAmount.toString()));
  if (earlyWithdrawPenalty !== undefined) tasks.push(setSetting("savings_early_withdraw_penalty", earlyWithdrawPenalty.toString()));
  if (penaltyPercent !== undefined) tasks.push(setSetting("savings_penalty_percent", penaltyPercent.toString()));
  tasks.push(setSetting("savings_rates_updated_at", new Date().toISOString()));
  await Promise.all(tasks);
  await logAdminAction(adminId, "update_savings_rates", undefined, { rate7d, rate14d, rate30d });
  res.json({ message: "Savings rates updated" });
});

// ── Audit Logs ─────────────────────────────────────────────────────────────────
router.get("/admin/audit-logs", async (req, res): Promise<void> => {
  const limit = parseInt((req.query.limit as string) || "50", 10);
  const offset = parseInt((req.query.offset as string) || "0", 10);
  const logs = await db.select().from(adminLogsTable).orderBy(desc(adminLogsTable.createdAt)).limit(limit).offset(offset);
  const enriched = await Promise.all(logs.map(async l => {
    const [admin] = await db.select().from(usersTable).where(eq(usersTable.id, l.adminId));
    return { ...l, adminEmail: admin?.email };
  }));
  const total = await db.select({ count: count() }).from(adminLogsTable);
  res.json({ logs: enriched, total: total[0]?.count ?? 0 });
});

export default router;
