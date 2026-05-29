import { Router } from "express";
import { db, rateAlertsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { JwtPayload } from "../lib/auth.js";

const router = Router();

router.get("/rate-alerts", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const alerts = await db.select().from(rateAlertsTable)
    .where(eq(rateAlertsTable.userId, userId));
  res.json(alerts.map(a => ({ ...a, targetRate: parseFloat(a.targetRate) })));
});

router.post("/rate-alerts", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const { pair, targetRate, direction } = req.body;
  if (!targetRate || !direction || !["above", "below"].includes(direction)) {
    res.status(400).json({ error: "Target rate and direction (above/below) are required" });
    return;
  }

  const existing = await db.select().from(rateAlertsTable).where(eq(rateAlertsTable.userId, userId));
  if (existing.length >= 10) {
    res.status(400).json({ error: "Maximum 10 alerts allowed" });
    return;
  }

  const [alert] = await db.insert(rateAlertsTable).values({
    userId,
    pair: pair || "USDT/EUR",
    targetRate: parseFloat(targetRate).toFixed(8),
    direction,
  }).returning();

  res.status(201).json({ ...alert, targetRate: parseFloat(alert.targetRate) });
});

router.delete("/rate-alerts/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  await db.delete(rateAlertsTable)
    .where(and(eq(rateAlertsTable.id, id), eq(rateAlertsTable.userId, userId)));
  res.json({ message: "Alert deleted" });
});

router.patch("/rate-alerts/:id/reset", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const id = parseInt(req.params.id as string, 10);
  const [alert] = await db.update(rateAlertsTable)
    .set({ isTriggered: false, triggeredAt: null })
    .where(and(eq(rateAlertsTable.id, id), eq(rateAlertsTable.userId, userId)))
    .returning();
  if (!alert) { res.status(404).json({ error: "Alert not found" }); return; }
  res.json({ ...alert, targetRate: parseFloat(alert.targetRate) });
});

export default router;
