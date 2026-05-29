import { Router } from "express";
import { getSetting, setSetting } from "../lib/settings.js";

const router = Router();

let cachedRate: number | null = null;
let cacheTs = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

async function fetchCoinGeckoRate(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=eur";
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json() as any;
    return json?.tether?.eur ?? null;
  } catch {
    return null;
  }
}

function addNoise(rate: number): number {
  return rate * (1 + (Math.random() - 0.5) * 0.002); // ±0.1%
}

// ── GET /rates/live ───────────────────────────────────────────────────────────
router.get("/rates/live", async (_req, res): Promise<void> => {
  const now = Date.now();

  // Check admin rate override first
  const override = await getSetting("rate_override");
  const spread = parseFloat(await getSetting("rate_spread_percent") || "0");

  if (override && override !== "") {
    const baseRate = parseFloat(override);
    const effectiveRate = baseRate * (1 + spread / 100);
    cachedRate = effectiveRate;
    res.json({ rate: effectiveRate, source: "override", updatedAt: new Date().toISOString() });
    return;
  }

  // Use cache if fresh
  if (cachedRate && now - cacheTs < CACHE_TTL) {
    const effectiveRate = cachedRate * (1 + spread / 100);
    res.json({ rate: effectiveRate, source: "cached", updatedAt: new Date(cacheTs).toISOString() });
    return;
  }

  // Try CoinGecko
  const live = await fetchCoinGeckoRate();
  if (live) {
    cachedRate = live;
    cacheTs = now;
    await setSetting("exchange_rate", live.toFixed(8));
    await setSetting("exchange_rate_updated_at", new Date().toISOString());
  } else if (!cachedRate) {
    // Fall back to stored rate + noise
    cachedRate = parseFloat(await getSetting("exchange_rate") || "0.92");
    cachedRate = addNoise(cachedRate);
    cacheTs = now;
  } else {
    cachedRate = addNoise(cachedRate);
    cacheTs = now;
  }

  const effectiveRate = cachedRate * (1 + spread / 100);

  // Build simulated 24h chart (48 data points, 30 min intervals)
  const points: { time: string; rate: number }[] = [];
  let simRate = effectiveRate * (1 + (Math.random() - 0.5) * 0.02);
  for (let i = 47; i >= 0; i--) {
    const t = new Date(now - i * 30 * 60 * 1000);
    simRate = simRate * (1 + (Math.random() - 0.5) * 0.003);
    points.push({ time: t.toISOString(), rate: parseFloat(simRate.toFixed(6)) });
  }
  points.push({ time: new Date(now).toISOString(), rate: parseFloat(effectiveRate.toFixed(6)) });

  res.json({ rate: effectiveRate, source: "live", updatedAt: new Date(cacheTs).toISOString(), chart: points });
});

// ── GET /rates/btc and eth for ticker ─────────────────────────────────────────
router.get("/rates/ticker", async (_req, res): Promise<void> => {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin,ethereum&vs_currencies=eur";
    const r = await fetch(url, { signal: controller.signal });
    if (r.ok) {
      const json = await r.json() as any;
      res.json({
        USDT: json?.tether?.eur ?? cachedRate ?? 0.92,
        BTC: json?.bitcoin?.eur ?? 52000,
        ETH: json?.ethereum?.eur ?? 2800,
      });
      return;
    }
  } catch {}
  res.json({ USDT: cachedRate ?? 0.92, BTC: 52000 + (Math.random() - 0.5) * 1000, ETH: 2800 + (Math.random() - 0.5) * 100 });
});

// ── GET /rates/stats — fake platform stats ────────────────────────────────────
router.get("/rates/stats", async (_req, res): Promise<void> => {
  const [vol, traders, orders] = await Promise.all([
    getSetting("fake_volume_24h"),
    getSetting("fake_traders_active"),
    getSetting("fake_orders_completed"),
  ]);
  const baseVol = parseFloat(vol || "2400000");
  const baseTraders = parseInt(traders || "15342");
  const baseOrders = parseInt(orders || "128000");
  res.json({
    volume24h: baseVol + Math.floor(Math.random() * 50000),
    tradersActive: baseTraders + Math.floor(Math.random() * 50),
    ordersCompleted: baseOrders + Math.floor(Math.random() * 100),
  });
});

export default router;
