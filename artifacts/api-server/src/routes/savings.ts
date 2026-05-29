import { Router } from "express";
import { db, usersTable, savingsPlansTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { JwtPayload } from "../lib/auth.js";
import { getSavingsRates } from "../lib/settings.js";

const router = Router();

function formatPlan(s: any) {
  return {
    ...s,
    amount: parseFloat(s.amount),
    dailyRate: parseFloat(s.dailyRate),
    profitEarned: parseFloat(s.profitEarned),
  };
}

router.get("/savings/plans", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const status = req.query.status as string | undefined;

  // First: calculate and apply due profits for this user
  await applyPendingProfits(userId);

  let plans = await db.select().from(savingsPlansTable)
    .where(eq(savingsPlansTable.userId, userId))
    .orderBy(desc(savingsPlansTable.createdAt));

  if (status) plans = plans.filter(p => p.status === status);
  res.json(plans.map(formatPlan));
});

router.post("/savings/plans", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const { amount, durationDays } = req.body;

  if (!amount || !durationDays) {
    res.status(400).json({ error: "Amount and duration are required" });
    return;
  }
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt < 100) {
    res.status(400).json({ error: "Minimum savings amount is €100" });
    return;
  }
  if (![7, 14, 30].includes(parseInt(durationDays))) {
    res.status(400).json({ error: "Duration must be 7, 14, or 30 days" });
    return;
  }

  const rates = await getSavingsRates();
  if (amt < rates.minAmount) {
    res.status(400).json({ error: `Minimum amount is €${rates.minAmount}` });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || parseFloat(user.availableEur) < amt) {
    res.status(400).json({ error: "Insufficient available balance" });
    return;
  }

  const days = parseInt(durationDays);
  const dailyRateMap: Record<number, number> = { 7: rates.rate7d, 14: rates.rate14d, 30: rates.rate30d };
  const dailyRate = dailyRateMap[days];

  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Deduct from available balance
  const newAvailable = (parseFloat(user.availableEur) - amt).toFixed(8);
  const newLocked = (parseFloat(user.lockedEur) + amt).toFixed(8);
  await db.update(usersTable).set({ availableEur: newAvailable, lockedEur: newLocked }).where(eq(usersTable.id, userId));

  const [plan] = await db.insert(savingsPlansTable).values({
    userId,
    amount: amt.toFixed(8),
    durationDays: days,
    dailyRate: dailyRate.toFixed(6),
    profitEarned: "0",
    startDate: now,
    endDate,
    lastPayoutDate: now,
    status: "active",
  }).returning();

  res.status(201).json(formatPlan(plan));
});

router.post("/savings/plans/:id/withdraw-early", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [plan] = await db.select().from(savingsPlansTable)
    .where(and(eq(savingsPlansTable.id, id), eq(savingsPlansTable.userId, userId)));

  if (!plan) { res.status(404).json({ error: "Savings plan not found" }); return; }
  if (plan.status !== "active") { res.status(400).json({ error: "Plan is not active" }); return; }

  const rates = await getSavingsRates();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const principalAmt = parseFloat(plan.amount);
  // Early withdrawal: return principal only (forfeit profit), or apply penalty
  let returnAmt = principalAmt;
  if (rates.earlyWithdrawPenalty) {
    const penalty = principalAmt * (rates.penaltyPercent / 100);
    returnAmt = principalAmt - penalty;
  }

  const newAvailable = (parseFloat(user.availableEur) + returnAmt).toFixed(8);
  const newLocked = Math.max(0, parseFloat(user.lockedEur) - principalAmt).toFixed(8);
  await db.update(usersTable).set({ availableEur: newAvailable, lockedEur: newLocked }).where(eq(usersTable.id, userId));

  const [updated] = await db.update(savingsPlansTable)
    .set({ status: "early_withdrawn" })
    .where(eq(savingsPlansTable.id, id))
    .returning();

  res.json(formatPlan(updated));
});

// Helper: apply pending daily profits for a user
async function applyPendingProfits(userId: number): Promise<void> {
  const now = new Date();
  const activePlans = await db.select().from(savingsPlansTable)
    .where(and(eq(savingsPlansTable.userId, userId), eq(savingsPlansTable.status, "active")));

  for (const plan of activePlans) {
    const lastPayout = plan.lastPayoutDate ? new Date(plan.lastPayoutDate) : new Date(plan.startDate);
    const endDate = new Date(plan.endDate);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysDue = Math.floor((Math.min(now.getTime(), endDate.getTime()) - lastPayout.getTime()) / msPerDay);

    if (daysDue <= 0) continue;

    const dailyProfit = parseFloat(plan.amount) * (parseFloat(plan.dailyRate) / 100);
    const totalNewProfit = dailyProfit * daysDue;
    const newProfitEarned = (parseFloat(plan.profitEarned) + totalNewProfit).toFixed(8);
    const newLastPayout = new Date(lastPayout.getTime() + daysDue * msPerDay);

    if (now >= endDate && plan.status === "active") {
      // Plan matured — return principal + profit to available balance
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      if (user) {
        const totalReturn = parseFloat(plan.amount) + parseFloat(newProfitEarned);
        const newAvailable = (parseFloat(user.availableEur) + totalReturn).toFixed(8);
        const newLocked = Math.max(0, parseFloat(user.lockedEur) - parseFloat(plan.amount)).toFixed(8);
        await db.update(usersTable).set({ availableEur: newAvailable, lockedEur: newLocked }).where(eq(usersTable.id, userId));
      }
      await db.update(savingsPlansTable)
        .set({ profitEarned: newProfitEarned, lastPayoutDate: newLastPayout, status: "completed" })
        .where(eq(savingsPlansTable.id, plan.id));
    } else {
      // Accumulate profit in locked balance
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      if (user) {
        const newLocked = (parseFloat(user.lockedEur) + totalNewProfit).toFixed(8);
        await db.update(usersTable).set({ lockedEur: newLocked }).where(eq(usersTable.id, userId));
      }
      await db.update(savingsPlansTable)
        .set({ profitEarned: newProfitEarned, lastPayoutDate: newLastPayout })
        .where(eq(savingsPlansTable.id, plan.id));
    }
  }
}

export { applyPendingProfits };
export default router;
