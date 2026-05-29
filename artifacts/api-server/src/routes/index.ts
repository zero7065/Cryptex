import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import userRouter from "./user.js";
import settingsRouter from "./settings.js";
import exchangeRouter from "./exchange.js";
import savingsRouter from "./savings.js";
import withdrawRouter from "./withdraw.js";
import adminRouter from "./admin.js";
import p2pRouter from "./p2p.js";
import kycRouter from "./kyc.js";
import referralsRouter from "./referrals.js";
import ratesRouter from "./rates.js";
import reviewsRouter from "./reviews.js";
import rateAlertsRouter from "./rate-alerts.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(userRouter);
router.use(settingsRouter);
router.use(exchangeRouter);
router.use(savingsRouter);
router.use(withdrawRouter);
router.use(adminRouter);
router.use(p2pRouter);
router.use(kycRouter);
router.use(referralsRouter);
router.use(ratesRouter);
router.use(reviewsRouter);
router.use(rateAlertsRouter);

export default router;
