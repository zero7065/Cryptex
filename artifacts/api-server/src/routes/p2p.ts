import { Router } from "express";
import { db, buyersTable, exchangeOrdersTable, chatMessagesTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { JwtPayload } from "../lib/auth.js";
import { getExchangeRate } from "../lib/settings.js";
import crypto from "crypto";

const router = Router();

function generateTxHash(): string {
  return "0x" + crypto.randomBytes(32).toString("hex");
}

// ── Public: list active buyers ───────────────────────────────────────────────
router.get("/p2p/buyers", requireAuth, async (_req, res): Promise<void> => {
  const buyers = await db.select().from(buyersTable)
    .where(eq(buyersTable.isActive, true))
    .orderBy(desc(buyersTable.tradeCount));
  res.json(buyers.map(b => ({
    ...b,
    completionRate: parseFloat(b.completionRate),
    premiumPercent: parseFloat(b.premiumPercent),
  })));
});

// ── Create order with buyerId ─────────────────────────────────────────────────
router.post("/p2p/orders", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const { usdtAmount, txid, buyerId } = req.body;

  if (!usdtAmount || !txid || !buyerId) {
    res.status(400).json({ error: "USDT amount, TXID, and buyer ID are required" });
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

  const [buyer] = await db.select().from(buyersTable).where(eq(buyersTable.id, parseInt(buyerId)));
  if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }

  const { rate } = await getExchangeRate();
  const effectiveRate = rate * (1 + parseFloat(buyer.premiumPercent) / 100);
  const eurAmount = (amt * effectiveRate).toFixed(8);
  const txHash = generateTxHash();

  const [order] = await db.insert(exchangeOrdersTable).values({
    userId,
    buyerId: buyer.id,
    usdtAmount: amt.toFixed(8),
    eurAmount,
    txid: txid.trim(),
    txHash,
    status: "pending",
    escrowStatus: "held",
  }).returning();

  // Auto-send welcome chat from buyer
  await db.insert(chatMessagesTable).values({
    tradeId: order.id,
    senderType: "admin",
    message: `Hi! I'm ${buyer.name}. I can see your order for ${amt} USDT. Please send to the provided wallet address and paste your TXID. I'll confirm within ${buyer.avgReleaseTime}.`,
  });

  res.status(201).json({
    ...order,
    usdtAmount: parseFloat(order.usdtAmount),
    eurAmount: parseFloat(order.eurAmount),
    buyer: { ...buyer, completionRate: parseFloat(buyer.completionRate), premiumPercent: parseFloat(buyer.premiumPercent) },
  });
});

// ── Get order details ─────────────────────────────────────────────────────────
router.get("/p2p/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);

  const [order] = await db.select().from(exchangeOrdersTable)
    .where(and(eq(exchangeOrdersTable.id, id), eq(exchangeOrdersTable.userId, userId)));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  let buyer = null;
  if (order.buyerId) {
    const [b] = await db.select().from(buyersTable).where(eq(buyersTable.id, order.buyerId));
    if (b) buyer = { ...b, completionRate: parseFloat(b.completionRate), premiumPercent: parseFloat(b.premiumPercent) };
  }

  res.json({
    ...order,
    usdtAmount: parseFloat(order.usdtAmount),
    eurAmount: parseFloat(order.eurAmount),
    buyer,
  });
});

// ── Chat: get messages ────────────────────────────────────────────────────────
router.get("/p2p/orders/:id/chat", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);

  const [order] = await db.select().from(exchangeOrdersTable)
    .where(and(eq(exchangeOrdersTable.id, id), eq(exchangeOrdersTable.userId, userId)));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const messages = await db.select().from(chatMessagesTable)
    .where(eq(chatMessagesTable.tradeId, id))
    .orderBy(chatMessagesTable.createdAt);

  // Mark admin messages as read
  await db.update(chatMessagesTable)
    .set({ isRead: true })
    .where(and(eq(chatMessagesTable.tradeId, id), eq(chatMessagesTable.senderType, "admin")));

  res.json(messages);
});

// ── Chat: send message ────────────────────────────────────────────────────────
router.post("/p2p/orders/:id/chat", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  const { message } = req.body;

  if (!message || !message.trim()) { res.status(400).json({ error: "Message required" }); return; }

  const [order] = await db.select().from(exchangeOrdersTable)
    .where(and(eq(exchangeOrdersTable.id, id), eq(exchangeOrdersTable.userId, userId)));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const [msg] = await db.insert(chatMessagesTable).values({
    tradeId: id,
    senderType: "user",
    userId,
    message: message.trim(),
  }).returning();

  res.status(201).json(msg);
});

export default router;
