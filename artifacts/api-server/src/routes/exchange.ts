import { Router } from "express";
import { db, usersTable, exchangeOrdersTable } from "@workspace/db";
import { eq, desc, and, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { JwtPayload } from "../lib/auth.js";
import { getExchangeRate } from "../lib/settings.js";

const router = Router();

router.get("/exchange/wallet-address", requireAuth, async (_req, res): Promise<void> => {
  res.json({
    address: process.env.USDT_WALLET_ADDRESS ?? "TRx8yVbHgjkvZhKtgfWqVRdm9WkmMnfrGf",
    network: process.env.USDT_NETWORK ?? "TRC20 (TRON)",
  });
});

router.get("/exchange/orders", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const status = req.query.status as string | undefined;
  const limit = parseInt((req.query.limit as string) || "20", 10);
  const offset = parseInt((req.query.offset as string) || "0", 10);

  let query = db.select().from(exchangeOrdersTable).where(eq(exchangeOrdersTable.userId, userId));

  const orders = await db.select().from(exchangeOrdersTable)
    .where(eq(exchangeOrdersTable.userId, userId))
    .orderBy(desc(exchangeOrdersTable.createdAt))
    .limit(limit).offset(offset);

  const filtered = status ? orders.filter(o => o.status === status) : orders;
  const totalRows = await db.select({ count: count() }).from(exchangeOrdersTable).where(eq(exchangeOrdersTable.userId, userId));

  res.json({
    orders: filtered.map(o => ({
      ...o,
      usdtAmount: parseFloat(o.usdtAmount),
      eurAmount: parseFloat(o.eurAmount),
    })),
    total: totalRows[0]?.count ?? 0,
  });
});

router.post("/exchange/orders", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const { usdtAmount, txid } = req.body;

  if (!usdtAmount || !txid) {
    res.status(400).json({ error: "USDT amount and TXID are required" });
    return;
  }
  const amt = parseFloat(usdtAmount);
  if (isNaN(amt) || amt < 50 || amt > 50000) {
    res.status(400).json({ error: "USDT amount must be between 50 and 50,000" });
    return;
  }
  if (typeof txid !== "string" || txid.trim().length < 10) {
    res.status(400).json({ error: "Please provide a valid transaction ID" });
    return;
  }

  const { rate } = await getExchangeRate();
  const eurAmount = (amt * rate).toFixed(8);

  const [order] = await db.insert(exchangeOrdersTable).values({
    userId,
    usdtAmount: amt.toFixed(8),
    eurAmount,
    txid: txid.trim(),
    status: "pending",
  }).returning();

  res.status(201).json({
    ...order,
    usdtAmount: parseFloat(order.usdtAmount),
    eurAmount: parseFloat(order.eurAmount),
  });
});

router.get("/exchange/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [order] = await db.select().from(exchangeOrdersTable)
    .where(and(eq(exchangeOrdersTable.id, id), eq(exchangeOrdersTable.userId, userId)));

  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  res.json({ ...order, usdtAmount: parseFloat(order.usdtAmount), eurAmount: parseFloat(order.eurAmount) });
});

export default router;
