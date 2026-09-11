import { Request, Response } from "express";
import db from "../database/db";
import { Reservation } from "../types";
import { isValidDate, isValidTime, isEndAfterStart, timeRangesOverlap, todayISO } from "../utils/time";

/**
 * Busca as reservas JÁ APROVADAS que caem dentro do período de um
 * bloqueio de manutenção. Serve para impedir que o admin bloqueie um
 * horário que alguém já tem reservado sem perceber.
 */
function findApprovedReservationsInRange(
  resourceId: number,
  date: string,
  startTime: string,
  endTime: string
) {
  const approved = db
    .prepare(
      `SELECT reservations.*, users.name as user_name
       FROM reservations
       JOIN users ON users.id = reservations.user_id
       WHERE reservations.resource_id = ? AND reservations.date = ? AND reservations.status = 'aprovada'`
    )
    .all(resourceId, date) as unknown as (Reservation & { user_name: string })[];

  return approved.filter((r) => timeRangesOverlap(startTime, endTime, r.start_time, r.end_time));
}

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

  // Antes de bloquear, conferimos se já existem reservas APROVADAS nesse
  // período. Se existirem, recusamos o bloqueio e devolvemos a lista para
  // o admin decidir: ou escolhe outro horário, ou cancela essas reservas
  // (avisando os usuários) e tenta de novo. Criar o bloqueio por cima
  // deixaria reservas "aprovadas" que na prática não poderiam acontecer.
  const conflicts = findApprovedReservationsInRange(resource_id, date, start_time, end_time);
  if (conflicts.length > 0) {
    return res.status(409).json({
      error:
        "Já existem reservas aprovadas neste período. Cancele essas reservas antes de criar o bloqueio de manutenção.",
      conflicts: conflicts.map((r) => ({
        id: r.id,
        user_name: r.user_name,
        start_time: r.start_time,
        end_time: r.end_time,
      })),
    });
  }

  const result = db
    .prepare(
      "INSERT INTO maintenance_blocks (resource_id, date, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)"
    )
    .run(resource_id, date, start_time, end_time, reason);

  // Só marcamos o recurso como "em manutenção" se o bloqueio for para
  // HOJE. Um bloqueio agendado para daqui a um mês não pode deixar o
  // recurso indisponível desde já — as reservas no período bloqueado já
  // são barradas pela checagem de conflito em reservationController,
  // independente do status. O campo "status" aqui é só o indicador
  // visual do estado atual do recurso.
  // TODO da equipe: virar o status para "manutencao" automaticamente
  // quando a data do bloqueio chegar, e de volta para "ativo" quando
  // terminar (ex: via job agendado).
  if (date === todayISO()) {
    db.prepare("UPDATE resources SET status = 'manutencao' WHERE id = ?").run(resource_id);
  }

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

  // Se não houver mais nenhum bloqueio para o recurso, volta o status
  // para "ativo" — mas SOMENTE se ele estiver em "manutencao".
  // Se o admin tinha marcado o recurso como "inativo" (quebrado,
  // aposentado, emprestado para outro setor), remover um bloqueio antigo
  // não pode reativá-lo sozinho.
  const remaining = db
    .prepare("SELECT COUNT(*) as count FROM maintenance_blocks WHERE resource_id = ?")
    .get(block.resource_id) as { count: number };

  if (remaining.count === 0) {
    db.prepare("UPDATE resources SET status = 'ativo' WHERE id = ? AND status = 'manutencao'").run(
      block.resource_id
    );
  }

  return res.status(204).send();
}
