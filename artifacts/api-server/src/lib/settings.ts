import { db, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const DEFAULTS: Record<string, string> = {
  exchange_rate: "0.92",
  exchange_rate_updated_at: new Date().toISOString(),
  savings_rate_7d: "0.3",
  savings_rate_14d: "0.5",
  savings_rate_30d: "0.7",
  savings_min_amount: "100",
  savings_early_withdraw_penalty: "true",
  savings_penalty_percent: "20",
  savings_rates_updated_at: new Date().toISOString(),
  welcome_bonus_amount: "5",
  referral_bonus_referrer: "10",
  referral_bonus_referred: "10",
  referral_min_deposit: "100",
  maintenance_mode: "false",
  rate_override: "",
  rate_spread_percent: "0",
  usdt_wallet_address: "TRx8yVbHgjkvZhKtgfWqVRdm9WkmMnfrGf",
  usdt_network: "TRC20 (TRON)",
  fake_volume_24h: "2400000",
  fake_traders_active: "15342",
  fake_orders_completed: "128000",
};

export async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, key));
  return row?.value ?? DEFAULTS[key] ?? "";
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.insert(platformSettingsTable).values({ key, value })
    .onConflictDoUpdate({ target: platformSettingsTable.key, set: { value, updatedAt: new Date() } });
}

export async function getExchangeRate(): Promise<{ rate: number; updatedAt: Date }> {
  const override = await getSetting("rate_override");
  if (override && override !== "") {
    return { rate: parseFloat(override), updatedAt: new Date() };
  }
  const rate = parseFloat(await getSetting("exchange_rate"));
  const updatedAtStr = await getSetting("exchange_rate_updated_at");
  return { rate, updatedAt: new Date(updatedAtStr) };
}

export async function getSavingsRates() {
  const [r7, r14, r30, minAmt, penalty, penaltyPct, updatedAt] = await Promise.all([
    getSetting("savings_rate_7d"),
    getSetting("savings_rate_14d"),
    getSetting("savings_rate_30d"),
    getSetting("savings_min_amount"),
    getSetting("savings_early_withdraw_penalty"),
    getSetting("savings_penalty_percent"),
    getSetting("savings_rates_updated_at"),
  ]);
  return {
    rate7d: parseFloat(r7),
    rate14d: parseFloat(r14),
    rate30d: parseFloat(r30),
    minAmount: parseFloat(minAmt),
    earlyWithdrawPenalty: penalty === "true",
    penaltyPercent: parseFloat(penaltyPct),
    updatedAt: new Date(updatedAt),
  };
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(platformSettingsTable);
  const result: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}
