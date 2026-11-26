import { Router } from "express";
import {
  approveReservation,
  cancelReservation,
  createReservation,
  listReservations,
  rejectReservation,
} from "../controllers/reservationController";
import { approveSeries, cancelSeries, createSeries, rejectSeries } from "../controllers/seriesController";
import { requireAdmin, requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, listReservations);
router.post("/", requireAuth, createReservation);
router.patch("/:id/approve", requireAuth, requireAdmin, approveReservation);
router.patch("/:id/reject", requireAuth, requireAdmin, rejectReservation);
router.patch("/:id/cancel", requireAuth, cancelReservation);

// Reservas recorrentes (a série inteira)
router.post("/series", requireAuth, createSeries);
router.patch("/series/:id/approve", requireAuth, requireAdmin, approveSeries);
router.patch("/series/:id/reject", requireAuth, requireAdmin, rejectSeries);
router.patch("/series/:id/cancel", requireAuth, cancelSeries);

export default router;
