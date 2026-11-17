import { Router } from "express";
import { checkIn, checkOut, listLoans } from "../controllers/loanController";
import { requireAdmin, requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, requireAdmin, listLoans);
router.post("/:id/checkout", requireAuth, requireAdmin, checkOut);
router.patch("/:id/checkin", requireAuth, requireAdmin, checkIn);

export default router;
