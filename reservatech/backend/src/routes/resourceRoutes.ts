import { Router } from "express";
import {
  createResource,
  getResource,
  listResources,
  updateResource,
  updateResourceStatus,
} from "../controllers/resourceController";
import { requireAdmin, requireAuth } from "../middlewares/auth";

const router = Router();

// Consulta de recursos é permitida para qualquer usuário autenticado.
router.get("/", requireAuth, listResources);
router.get("/:id", requireAuth, getResource);

// Cadastro/edição só para admin.
router.post("/", requireAuth, requireAdmin, createResource);
router.put("/:id", requireAuth, requireAdmin, updateResource);
router.patch("/:id/status", requireAuth, requireAdmin, updateResourceStatus);

export default router;
