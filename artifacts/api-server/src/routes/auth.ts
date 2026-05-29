import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db, usersTable, referralsTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth.js";
import type { JwtPayload } from "../lib/auth.js";
import { getSetting } from "../lib/settings.js";

const router = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@cryptex.io";

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function sanitizeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    username: user.username || user.email.split("@")[0],
    avatarUrl: user.avatarUrl || null,
    isAdmin: user.isAdmin,
    kycStatus: user.kycStatus,
    referralCode: user.referralCode,
    welcomeBonusClaimed: user.welcomeBonusClaimed,
    availableEur: parseFloat(user.availableEur),
    lockedEur: parseFloat(user.lockedEur),
    usdtDeposited: parseFloat(user.usdtDeposited),
    createdAt: user.createdAt,
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, confirmPassword, referralCode: inputReferralCode } = req.body;
  if (!email || !password || !confirmPassword) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  // Find referrer if code provided
  let referrer: (typeof usersTable.$inferSelect) | null = null;
  if (inputReferralCode) {
    const [ref] = await db.select().from(usersTable).where(eq(usersTable.referralCode, inputReferralCode.toUpperCase()));
    if (ref) referrer = ref;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const referralCode = generateReferralCode();
  const defaultUsername = email.split("@")[0];

  // Welcome bonus
  const welcomeBonusStr = await getSetting("welcome_bonus_amount");
  const welcomeBonus = parseFloat(welcomeBonusStr || "5");

  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash,
    isAdmin,
    username: defaultUsername,
    referralCode,
    referredBy: referrer?.id ?? null,
    welcomeBonusClaimed: true,
    availableEur: welcomeBonus.toFixed(8),
    lockedEur: "0",
    kycStatus: "none",
  }).returning();

  // Create referral record
  if (referrer) {
    await db.insert(referralsTable).values({
      referrerId: referrer.id,
      referredId: user.id,
      status: "pending",
    });
  }

  // Welcome notification
  await db.insert(notificationsTable).values({
    userId: user.id,
    title: "Welcome to Cryptex!",
    message: `Welcome aboard! Your account has been credited with a €${welcomeBonus} welcome bonus. Start trading USDT for EUR today.`,
    type: "system",
  });

  const token = signToken({ userId: user.id, isAdmin: user.isAdmin });

  res.status(201).json({ token, user: sanitizeUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, isAdmin: user.isAdmin }, !!rememberMe);
  res.json({ token, user: sanitizeUser(user) });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  res.json(sanitizeUser(user));
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "Email required" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.update(usersTable)
      .set({ resetToken: token, resetTokenExpiresAt: expiresAt })
      .where(eq(usersTable.id, user.id));
    req.log.info({ email, token }, "Password reset token generated");
  }
  res.json({ message: "If that email is registered, a reset link has been sent." });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body;
  if (!token || !password) { res.status(400).json({ error: "Token and password required" }); return; }
  if (password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.resetToken, token));
  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(usersTable)
    .set({ passwordHash, resetToken: null, resetTokenExpiresAt: null })
    .where(eq(usersTable.id, user.id));
  res.json({ message: "Password reset successfully" });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) { res.status(400).json({ error: "Both current and new password required" }); return; }
  if (newPassword.length < 8) { res.status(400).json({ error: "New password must be at least 8 characters" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId));
  res.json({ message: "Password changed successfully" });
});

export default router;
