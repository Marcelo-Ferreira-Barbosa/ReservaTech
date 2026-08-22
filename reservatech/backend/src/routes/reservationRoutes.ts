import { Router } from "express";
import {
  approveReservation,
  cancelReservation,
  createReservation,
  listReservations,
  rejectReservation,
} from "../controllers/reservationController";
import { requireAdmin, requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, listReservations);
router.post("/", requireAuth, createReservation);
router.patch("/:id/approve", requireAuth, requireAdmin, approveReservation);
router.patch("/:id/reject", requireAuth, requireAdmin, rejectReservation);
router.patch("/:id/cancel", requireAuth, cancelReservation);

export default router;
