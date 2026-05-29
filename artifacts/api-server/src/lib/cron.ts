import cron from "node-cron";
import { db, usersTable, savingsPlansTable, rateAlertsTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger.js";
import { getExchangeRate, getSetting, setSetting } from "./settings.js";

async function processDailySavingsProfits(): Promise<void> {
  logger.info("Running daily savings profit cron job");
  const now = new Date();
  try {
    const users = await db.select({ id: usersTable.id }).from(usersTable);
    for (const user of users) {
      const activePlans = await db.select().from(savingsPlansTable)
        .where(and(eq(savingsPlansTable.userId, user.id), eq(savingsPlansTable.status, "active")));
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
        const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
        if (!currentUser) continue;
        if (now >= endDate) {
          const totalReturn = parseFloat(plan.amount) + parseFloat(newProfitEarned);
          const newAvailable = (parseFloat(currentUser.availableEur) + totalReturn).toFixed(8);
          const newLocked = Math.max(0, parseFloat(currentUser.lockedEur) - parseFloat(plan.amount)).toFixed(8);
          await db.update(usersTable).set({ availableEur: newAvailable, lockedEur: newLocked }).where(eq(usersTable.id, user.id));
          await db.update(savingsPlansTable).set({ profitEarned: newProfitEarned, lastPayoutDate: newLastPayout, status: "completed" }).where(eq(savingsPlansTable.id, plan.id));
          await db.insert(notificationsTable).values({ userId: user.id, title: "Savings Plan Matured 🎉", message: `Your savings plan has matured! €${totalReturn.toFixed(2)} (principal + interest) has been returned to your available balance.`, type: "savings" });
          logger.info({ planId: plan.id, userId: user.id, totalReturn }, "Savings plan matured");
        } else {
          const newLocked = (parseFloat(currentUser.lockedEur) + totalNewProfit).toFixed(8);
          await db.update(usersTable).set({ lockedEur: newLocked }).where(eq(usersTable.id, user.id));
          await db.update(savingsPlansTable).set({ profitEarned: newProfitEarned, lastPayoutDate: newLastPayout }).where(eq(savingsPlansTable.id, plan.id));
          await db.insert(notificationsTable).values({ userId: user.id, title: "Daily Interest Paid", message: `€${totalNewProfit.toFixed(4)} interest has been added to your savings plan.`, type: "savings" });
        }
      }
    }
    logger.info("Daily savings profit cron job completed");
  } catch (err) {
    logger.error({ err }, "Error in daily savings profit cron job");
  }
}

async function processRateAlerts(): Promise<void> {
  try {
    const { rate } = await getExchangeRate();
    const activeAlerts = await db.select().from(rateAlertsTable)
      .where(eq(rateAlertsTable.isTriggered, false));
    for (const alert of activeAlerts) {
      const target = parseFloat(alert.targetRate);
      const triggered = (alert.direction === "above" && rate >= target) || (alert.direction === "below" && rate <= target);
      if (triggered) {
        await db.update(rateAlertsTable).set({ isTriggered: true, triggeredAt: new Date() }).where(eq(rateAlertsTable.id, alert.id));
        await db.insert(notificationsTable).values({
          userId: alert.userId, title: `Rate Alert: ${alert.pair} ${alert.direction === "above" ? "▲" : "▼"}`,
          message: `${alert.pair} rate is now ${rate.toFixed(4)} EUR, which is ${alert.direction} your target of ${target.toFixed(4)} EUR.`,
          type: "rate_alert",
        });
      }
    }
  } catch (err) {
    logger.error({ err }, "Error in rate alert cron");
  }
}

async function updateFakeStats(): Promise<void> {
  try {
    const vol = parseFloat(await getSetting("fake_volume_24h") || "2400000");
    const traders = parseInt(await getSetting("fake_traders_active") || "15342");
    const orders = parseInt(await getSetting("fake_orders_completed") || "128000");
    await setSetting("fake_volume_24h", (vol + Math.random() * 10000).toFixed(0));
    await setSetting("fake_traders_active", (traders + Math.floor(Math.random() * 5 - 2)).toFixed(0));
    await setSetting("fake_orders_completed", (orders + Math.floor(Math.random() * 10)).toFixed(0));
  } catch {}
}

export function startCronJobs(): void {
  cron.schedule("0 0 * * *", processDailySavingsProfits);
  cron.schedule("*/5 * * * *", processRateAlerts);
  cron.schedule("*/10 * * * *", updateFakeStats);
  logger.info("Cron jobs started");
}
