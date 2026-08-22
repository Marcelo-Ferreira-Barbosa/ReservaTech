import { Router } from "express";
import {
  createMaintenanceBlock,
  deleteMaintenanceBlock,
  listMaintenanceBlocks,
} from "../controllers/maintenanceController";
import { requireAdmin, requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, listMaintenanceBlocks);
router.post("/", requireAuth, requireAdmin, createMaintenanceBlock);
router.delete("/:id", requireAuth, requireAdmin, deleteMaintenanceBlock);

export default router;
