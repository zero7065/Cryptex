import { Router } from "express";
import { db, usersTable, exchangeOrdersTable, savingsPlansTable, withdrawalsTable, notificationsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { JwtPayload } from "../lib/auth.js";

const router = Router();

function sanitizeUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    username: u.username || u.email.split("@")[0],
    avatarUrl: u.avatarUrl || null,
    isAdmin: u.isAdmin,
    kycStatus: u.kycStatus,
    referralCode: u.referralCode,
    welcomeBonusClaimed: u.welcomeBonusClaimed,
    availableEur: parseFloat(u.availableEur),
    lockedEur: parseFloat(u.lockedEur),
    usdtDeposited: parseFloat(u.usdtDeposited || "0"),
    createdAt: u.createdAt,
  };
}

router.get("/user/balance", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  const available = parseFloat(user.availableEur);
  const locked = parseFloat(user.lockedEur);
  res.json({ availableEur: available, lockedEur: locked, totalEur: available + locked });
});

router.get("/user/dashboard", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const [recentExchanges, recentSavings, recentWithdrawals] = await Promise.all([
    db.select().from(exchangeOrdersTable).where(eq(exchangeOrdersTable.userId, userId)).orderBy(desc(exchangeOrdersTable.createdAt)).limit(5),
    db.select().from(savingsPlansTable).where(eq(savingsPlansTable.userId, userId)).orderBy(desc(savingsPlansTable.createdAt)).limit(3),
    db.select().from(withdrawalsTable).where(eq(withdrawalsTable.userId, userId)).orderBy(desc(withdrawalsTable.createdAt)).limit(3),
  ]);

  const allSavings = await db.select({ profitEarned: savingsPlansTable.profitEarned })
    .from(savingsPlansTable).where(eq(savingsPlansTable.userId, userId));
  const totalProfitEarned = allSavings.reduce((sum, s) => sum + parseFloat(s.profitEarned), 0);

  const recentActivity = [
    ...recentExchanges.map(o => ({
      id: o.id,
      type: "exchange" as const,
      description: `Sold ${parseFloat(o.usdtAmount).toFixed(2)} USDT for €${parseFloat(o.eurAmount).toFixed(2)}`,
      amount: parseFloat(o.eurAmount),
      status: o.status,
      txHash: (o as any).txHash || null,
      createdAt: o.createdAt,
    })),
    ...recentSavings.map(s => ({
      id: s.id,
      type: "savings" as const,
      description: `Savings plan — €${parseFloat(s.amount).toFixed(2)} for ${s.durationDays} days`,
      amount: parseFloat(s.amount),
      status: s.status,
      txHash: null,
      createdAt: s.createdAt,
    })),
    ...recentWithdrawals.map(w => ({
      id: w.id,
      type: "withdrawal" as const,
      description: `Withdrawal via ${w.method} — €${parseFloat(w.amount).toFixed(2)}`,
      amount: parseFloat(w.amount),
      status: w.status,
      txHash: null,
      createdAt: w.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  res.json({
    availableEur: parseFloat(user.availableEur),
    lockedEur: parseFloat(user.lockedEur),
    totalEur: parseFloat(user.availableEur) + parseFloat(user.lockedEur),
    usdtDeposited: parseFloat(user.usdtDeposited || "0"),
    kycStatus: user.kycStatus,
    username: user.username || user.email.split("@")[0],
    avatarUrl: user.avatarUrl || null,
    welcomeBonusClaimed: user.welcomeBonusClaimed,
    pendingExchangeCount: recentExchanges.filter(o => o.status === "pending").length,
    activeSavingsCount: recentSavings.filter(s => s.status === "active").length,
    pendingWithdrawalCount: recentWithdrawals.filter(w => w.status === "pending").length,
    totalProfitEarned,
    recentActivity,
  });
});

router.patch("/user/profile", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const { email, username, avatarUrl } = req.body;
  const updates: Record<string, any> = {};

  if (email) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (existing && existing.id !== userId) { res.status(409).json({ error: "Email already in use" }); return; }
    updates.email = email.toLowerCase();
  }
  if (username !== undefined) updates.username = username.trim().slice(0, 32) || null;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl || null;

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  res.json(sanitizeUser(user));
});

router.get("/user/notifications", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const notifs = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(notifs.map(n => ({
    id: n.id,
    title: (n as any).title || "Notification",
    message: n.message,
    type: (n as any).type || "system",
    isRead: n.isRead,
    createdAt: n.createdAt,
  })));
});

router.post("/user/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, userId));
  res.json({ message: "All notifications marked as read" });
});

router.post("/user/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  await db.update(notificationsTable).set({ isRead: true })
    .where(eq(notificationsTable.id, id));
  res.json({ message: "Notification marked as read" });
});

router.get("/user/history", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const type = (req.query.type as string) || "all";
  const limit = parseInt((req.query.limit as string) || "50", 10);
  const offset = parseInt((req.query.offset as string) || "0", 10);

  let exchanges: any[] = [], savings: any[] = [], withdrawals: any[] = [];

  if (type === "all" || type === "exchange") {
    exchanges = await db.select().from(exchangeOrdersTable)
      .where(eq(exchangeOrdersTable.userId, userId))
      .orderBy(desc(exchangeOrdersTable.createdAt)).limit(limit).offset(offset);
  }
  if (type === "all" || type === "savings") {
    savings = await db.select().from(savingsPlansTable)
      .where(eq(savingsPlansTable.userId, userId))
      .orderBy(desc(savingsPlansTable.createdAt)).limit(limit).offset(offset);
  }
  if (type === "all" || type === "withdrawal") {
    withdrawals = await db.select().from(withdrawalsTable)
      .where(eq(withdrawalsTable.userId, userId))
      .orderBy(desc(withdrawalsTable.createdAt)).limit(limit).offset(offset);
  }

  res.json({
    exchanges: exchanges.map(o => ({
      ...o,
      usdtAmount: parseFloat(o.usdtAmount),
      eurAmount: parseFloat(o.eurAmount),
    })),
    savings: savings.map(s => ({
      ...s,
      amount: parseFloat(s.amount),
      dailyRate: parseFloat(s.dailyRate),
      profitEarned: parseFloat(s.profitEarned),
    })),
    withdrawals: withdrawals.map(w => ({ ...w, amount: parseFloat(w.amount) })),
    total: exchanges.length + savings.length + withdrawals.length,
  });
});

export default router;
