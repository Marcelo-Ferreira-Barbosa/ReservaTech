import { Request, Response } from "express";
import db from "../database/db";
import { isValidDate, isValidTime, isEndAfterStart } from "../utils/time";

export function listMaintenanceBlocks(req: Request, res: Response) {
  const blocks = db
    .prepare(
      `SELECT maintenance_blocks.*, resources.name as resource_name
       FROM maintenance_blocks
       JOIN resources ON resources.id = maintenance_blocks.resource_id
       ORDER BY maintenance_blocks.date DESC, maintenance_blocks.start_time`
    )
    .all();
  return res.json(blocks);
}

export function createMaintenanceBlock(req: Request, res: Response) {
  const { resource_id, date, start_time, end_time, reason } = req.body;

  if (!resource_id || !date || !start_time || !end_time || !reason) {
    return res.status(400).json({ error: "recurso, data, horário inicial, horário final e motivo são obrigatórios." });
  }

  if (!isValidDate(date)) {
    return res.status(400).json({ error: "Data inválida. Use o formato YYYY-MM-DD." });
  }

  if (!isValidTime(start_time) || !isValidTime(end_time)) {
    return res.status(400).json({ error: "Horário inválido. Use o formato HH:MM." });
  }

  if (!isEndAfterStart(start_time, end_time)) {
    return res.status(400).json({ error: "O horário final deve ser depois do horário inicial." });
  }

  const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(resource_id);
  if (!resource) {
    return res.status(404).json({ error: "Recurso não encontrado." });
  }

  const result = db
    .prepare(
      "INSERT INTO maintenance_blocks (resource_id, date, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)"
    )
    .run(resource_id, date, start_time, end_time, reason);

  // Marca o recurso como "em manutenção" para ficar visualmente
  // indisponível de imediato. TODO da equipe: reverter automaticamente
  // para "ativo" quando o período de manutenção terminar (ex: via job agendado).
  db.prepare("UPDATE resources SET status = 'manutencao' WHERE id = ?").run(resource_id);

  const block = db.prepare("SELECT * FROM maintenance_blocks WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(block);
}

export function deleteMaintenanceBlock(req: Request, res: Response) {
  const block = db.prepare("SELECT * FROM maintenance_blocks WHERE id = ?").get(req.params.id) as
    | { resource_id: number }
    | undefined;

  if (!block) {
    return res.status(404).json({ error: "Bloqueio não encontrado." });
  }

  db.prepare("DELETE FROM maintenance_blocks WHERE id = ?").run(req.params.id);

  // Se não houver mais nenhum bloqueio para o recurso, volta o status para "ativo".
  const remaining = db
    .prepare("SELECT COUNT(*) as count FROM maintenance_blocks WHERE resource_id = ?")
    .get(block.resource_id) as { count: number };

  if (remaining.count === 0) {
    db.prepare("UPDATE resources SET status = 'ativo' WHERE id = ?").run(block.resource_id);
  }

  return res.status(204).send();
}
