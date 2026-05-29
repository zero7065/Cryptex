import { Router } from "express";
import { db, usersTable, kycSubmissionsTable, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { JwtPayload } from "../lib/auth.js";

const router = Router();

// ── Get KYC status ────────────────────────────────────────────────────────────
router.get("/kyc/status", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const [latest] = await db.select().from(kycSubmissionsTable)
    .where(eq(kycSubmissionsTable.userId, userId))
    .orderBy(desc(kycSubmissionsTable.createdAt))
    .limit(1);

  res.json({
    kycStatus: user.kycStatus,
    submission: latest ? {
      id: latest.id,
      fullName: latest.fullName,
      status: latest.status,
      adminNotes: latest.adminNotes,
      createdAt: latest.createdAt,
      reviewedAt: latest.reviewedAt,
    } : null,
  });
});

// ── Submit KYC ────────────────────────────────────────────────────────────────
router.post("/kyc/submit", requireAuth, async (req, res): Promise<void> => {
  const { userId } = (req as any).user as JwtPayload;
  const { fullName, dob, address, country, idFrontData, idBackData, selfieData } = req.body;

  if (!fullName || !dob || !address || !country) {
    res.status(400).json({ error: "Full name, date of birth, address, and country are required" });
    return;
  }
  if (!idFrontData || !idBackData || !selfieData) {
    res.status(400).json({ error: "ID front, back, and selfie are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  if (user.kycStatus === "approved") {
    res.status(400).json({ error: "KYC already approved" });
    return;
  }

  // Check for existing pending submission
  const existing = await db.select().from(kycSubmissionsTable)
    .where(eq(kycSubmissionsTable.userId, userId))
    .orderBy(desc(kycSubmissionsTable.createdAt))
    .limit(1);

  if (existing.length > 0 && existing[0].status === "pending") {
    res.status(400).json({ error: "You already have a pending KYC submission" });
    return;
  }

  const [submission] = await db.insert(kycSubmissionsTable).values({
    userId,
    fullName: fullName.trim(),
    dob,
    address: address.trim(),
    country,
    idFrontData,
    idBackData,
    selfieData,
    status: "pending",
  }).returning();

  await db.update(usersTable).set({ kycStatus: "pending" }).where(eq(usersTable.id, userId));

  await db.insert(notificationsTable).values({
    userId,
    title: "KYC Submitted",
    message: "Your KYC documents have been submitted and are under review (1-2 business days).",
    type: "kyc",
  });

  res.status(201).json({
    id: submission.id,
    status: submission.status,
    createdAt: submission.createdAt,
  });
});

export default router;
