import { Router } from "express";
import { db, usersTable, referralsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { JwtPayload } from "../lib/auth.js";
import { getSetting } from "../lib/settings.js";

const router = Router();

// ── Get my referral stats + referred users ────────────────────────────────────
router.get("/referrals", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const referrals = await db.select().from(referralsTable)
    .where(eq(referralsTable.referrerId, userId))
    .orderBy(desc(referralsTable.createdAt));

  const enriched = await Promise.all(referrals.map(async r => {
    const [referred] = await db.select().from(usersTable).where(eq(usersTable.id, r.referredId));
    return {
      id: r.id,
      referredEmail: referred ? referred.email.replace(/(.{2}).*(@.*)/, '$1***$2') : 'unknown',
      referredUsername: referred?.username || null,
      status: r.status,
      bonusEarned: r.bonusEarned,
      depositMet: r.depositMet,
      referrerBonusAmount: parseFloat(r.referrerBonusAmount),
      createdAt: r.createdAt,
    };
  }));

  const totalBonusEarned = referrals
    .filter(r => r.bonusEarned)
    .reduce((sum, r) => sum + parseFloat(r.referrerBonusAmount), 0);

  const [referralBonus, welcomeBonus] = await Promise.all([
    getSetting("referral_bonus_referrer"),
    getSetting("welcome_bonus_amount"),
  ]);

  res.json({
    referralCode: user.referralCode,
    totalReferrals: referrals.length,
    completedReferrals: referrals.filter(r => r.bonusEarned).length,
    totalBonusEarned,
    referralBonusAmount: parseFloat(referralBonus),
    welcomeBonusAmount: parseFloat(welcomeBonus),
    referrals: enriched,
  });
});

export default router;
