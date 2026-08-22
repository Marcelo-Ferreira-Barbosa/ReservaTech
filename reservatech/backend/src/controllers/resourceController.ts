import { Request, Response } from "express";
import db from "../database/db";
import { Resource } from "../types";

const VALID_TYPES = ["sala", "laboratorio", "projetor", "notebook", "outro"];
const VALID_STATUSES = ["ativo", "inativo", "manutencao"];

export function listResources(req: Request, res: Response) {
  const resources = db.prepare("SELECT * FROM resources ORDER BY name").all();
  return res.json(resources);
}

export function getResource(req: Request, res: Response) {
  const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(req.params.id);
  if (!resource) {
    return res.status(404).json({ error: "Recurso não encontrado." });
  }
  return res.json(resource);
}

export function createResource(req: Request, res: Response) {
  const { name, type, location, description } = req.body;

  if (!name || !type || !location) {
    return res.status(400).json({ error: "Nome, tipo e localização são obrigatórios." });
  }

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Tipo inválido. Use um de: ${VALID_TYPES.join(", ")}.` });
  }

  const result = db
    .prepare("INSERT INTO resources (name, type, location, description, status) VALUES (?, ?, ?, ?, 'ativo')")
    .run(name, type, location, description || null);

  const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(resource);
}

export function updateResource(req: Request, res: Response) {
  const { name, type, location, description } = req.body;
  const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(req.params.id) as Resource | undefined;

  if (!resource) {
    return res.status(404).json({ error: "Recurso não encontrado." });
  }

  if (type && !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Tipo inválido. Use um de: ${VALID_TYPES.join(", ")}.` });
  }

  db.prepare(
    "UPDATE resources SET name = ?, type = ?, location = ?, description = ? WHERE id = ?"
  ).run(
    name ?? resource.name,
    type ?? resource.type,
    location ?? resource.location,
    description ?? resource.description,
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM resources WHERE id = ?").get(req.params.id);
  return res.json(updated);
}

export function updateResourceStatus(req: Request, res: Response) {
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status inválido. Use um de: ${VALID_STATUSES.join(", ")}.` });
  }

  const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(req.params.id);
  if (!resource) {
    return res.status(404).json({ error: "Recurso não encontrado." });
  }

  db.prepare("UPDATE resources SET status = ? WHERE id = ?").run(status, req.params.id);

  const updated = db.prepare("SELECT * FROM resources WHERE id = ?").get(req.params.id);
  return res.json(updated);
}
