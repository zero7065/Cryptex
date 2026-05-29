import { Router } from "express";
import { db, usersTable, withdrawalsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { JwtPayload } from "../lib/auth.js";

const router = Router();

function formatWithdrawal(w: any) {
  return { ...w, amount: parseFloat(w.amount) };
}

router.get("/withdraw/requests", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const status = req.query.status as string | undefined;

  let withdrawals = await db.select().from(withdrawalsTable)
    .where(eq(withdrawalsTable.userId, userId))
    .orderBy(desc(withdrawalsTable.createdAt));

  if (status) withdrawals = withdrawals.filter(w => w.status === status);
  res.json(withdrawals.map(formatWithdrawal));
});

router.post("/withdraw/requests", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const { amount, method, accountDetails } = req.body;

  if (!amount || !method || !accountDetails) {
    res.status(400).json({ error: "Amount, method, and account details are required" });
    return;
  }

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt < 10) {
    res.status(400).json({ error: "Minimum withdrawal amount is €10" });
    return;
  }

  const validMethods = ["interac", "sepa", "wise", "paypal", "bank_wire"];
  if (!validMethods.includes(method)) {
    res.status(400).json({ error: "Invalid payment method" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || parseFloat(user.availableEur) < amt) {
    res.status(400).json({ error: "Insufficient available balance" });
    return;
  }

  // Deduct from available balance
  const newAvailable = (parseFloat(user.availableEur) - amt).toFixed(8);
  await db.update(usersTable).set({ availableEur: newAvailable }).where(eq(usersTable.id, userId));

  const [withdrawal] = await db.insert(withdrawalsTable).values({
    userId,
    amount: amt.toFixed(8),
    method,
    accountDetails,
    status: "pending",
  }).returning();

  res.status(201).json(formatWithdrawal(withdrawal));
});

export default router;
