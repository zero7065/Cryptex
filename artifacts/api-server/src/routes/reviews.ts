import { Router } from "express";
import { db, reviewsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/reviews", async (_req, res): Promise<void> => {
  const reviews = await db.select().from(reviewsTable)
    .where(eq(reviewsTable.isVisible, true))
    .orderBy(desc(reviewsTable.createdAt));
  res.json(reviews);
});

export default router;
