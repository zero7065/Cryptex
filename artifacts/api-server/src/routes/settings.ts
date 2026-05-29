import { Router } from "express";
import { getExchangeRate, getSavingsRates } from "../lib/settings.js";

const router = Router();

router.get("/settings/rate", async (_req, res): Promise<void> => {
  const { rate, updatedAt } = await getExchangeRate();
  res.json({ rate, updatedAt });
});

router.get("/settings/savings-rates", async (_req, res): Promise<void> => {
  const rates = await getSavingsRates();
  res.json(rates);
});

router.get("/settings/platform-stats", async (_req, res): Promise<void> => {
  // Static values for the landing page trust indicators
  res.json({
    volume24h: 2400000,
    activeUsers: 12500,
    avgWithdrawalMinutes: 2,
    totalTradesCompleted: 48750,
  });
});

export default router;
