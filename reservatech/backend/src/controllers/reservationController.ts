import { Request, Response } from "express";
import db from "../database/db";
import { MaintenanceBlock, Reservation, Resource } from "../types";
import { isEndAfterStart, isValidDate, isValidTime, timeRangesOverlap } from "../utils/time";

/**
 * Verifica se existe alguma reserva JÁ APROVADA que conflite com o
 * intervalo informado, para o mesmo recurso e mesma data.
 * Reservas "pendente", "recusada" e "cancelada" NÃO contam como
 * conflito - só "aprovada" bloqueia outra aprovação/criação.
 *
 * (Ver docs/DECISOES_TECNICAS.md para a explicação de por que
 * pendentes conflitantes são permitidas de coexistir.)
 */
function hasApprovedConflict(
  resourceId: number,
  date: string,
  startTime: string,
  endTime: string,
  ignoreReservationId?: number
): boolean {
  const approvedReservations = db
    .prepare(
      "SELECT * FROM reservations WHERE resource_id = ? AND date = ? AND status = 'aprovada' AND id != ?"
    )
    .all(resourceId, date, ignoreReservationId ?? -1) as unknown as Reservation[];

  return approvedReservations.some((r) => timeRangesOverlap(startTime, endTime, r.start_time, r.end_time));
}

/**
 * Verifica se o intervalo informado cai dentro de algum bloqueio de
 * manutenção cadastrado para o recurso, na mesma data.
 */
function hasMaintenanceConflict(
  resourceId: number,
  date: string,
  startTime: string,
  endTime: string
): boolean {
  const blocks = db
    .prepare("SELECT * FROM maintenance_blocks WHERE resource_id = ? AND date = ?")
    .all(resourceId, date) as unknown as MaintenanceBlock[];

  return blocks.some((b) => timeRangesOverlap(startTime, endTime, b.start_time, b.end_time));
}

export function listReservations(req: Request, res: Response) {
  // Usuário comum só vê as próprias reservas. Admin vê todas.
  if (req.user!.role === "admin") {
    const reservations = db
      .prepare(
        `SELECT reservations.*, users.name as user_name, resources.name as resource_name
         FROM reservations
         JOIN users ON users.id = reservations.user_id
         JOIN resources ON resources.id = reservations.resource_id
         ORDER BY reservations.created_at DESC`
      )
      .all();
    return res.json(reservations);
  }

  const reservations = db
    .prepare(
      `SELECT reservations.*, resources.name as resource_name
       FROM reservations
       JOIN resources ON resources.id = reservations.resource_id
       WHERE reservations.user_id = ?
       ORDER BY reservations.created_at DESC`
    )
    .all(req.user!.id);
  return res.json(reservations);
}

export function createReservation(req: Request, res: Response) {
  const { resource_id, date, start_time, end_time } = req.body;

  if (!resource_id || !date || !start_time || !end_time) {
    return res.status(400).json({ error: "recurso, data, horário inicial e horário final são obrigatórios." });
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

  const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(resource_id) as Resource | undefined;
  if (!resource) {
    return res.status(404).json({ error: "Recurso não encontrado." });
  }

  if (resource.status !== "ativo") {
    return res.status(400).json({ error: "Este recurso não está disponível para reservas no momento." });
  }

  if (hasMaintenanceConflict(resource_id, date, start_time, end_time)) {
    return res.status(409).json({ error: "O recurso está bloqueado para manutenção neste período." });
  }

  if (hasApprovedConflict(resource_id, date, start_time, end_time)) {
    return res.status(409).json({ error: "Já existe uma reserva aprovada que conflita com este horário." });
  }

  const result = db
    .prepare(
      "INSERT INTO reservations (user_id, resource_id, date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, 'pendente')"
    )
    .run(req.user!.id, resource_id, date, start_time, end_time);

  const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(reservation);
}

export function approveReservation(req: Request, res: Response) {
  const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id) as Reservation | undefined;

  if (!reservation) {
    return res.status(404).json({ error: "Reserva não encontrada." });
  }

  if (reservation.status !== "pendente") {
    return res.status(400).json({ error: "Só é possível aprovar reservas com status pendente." });
  }

  if (hasMaintenanceConflict(reservation.resource_id, reservation.date, reservation.start_time, reservation.end_time)) {
    return res.status(409).json({ error: "O recurso está bloqueado para manutenção neste período." });
  }

  // Checagem final de conflito no momento da aprovação: outra reserva
  // pode ter sido aprovada entre a criação desta e agora.
  if (
    hasApprovedConflict(reservation.resource_id, reservation.date, reservation.start_time, reservation.end_time, reservation.id)
  ) {
    return res.status(409).json({ error: "Já existe outra reserva aprovada que conflita com este horário." });
  }

  db.prepare("UPDATE reservations SET status = 'aprovada', reason = NULL WHERE id = ?").run(req.params.id);
  const updated = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id);
  return res.json(updated);
}

export function rejectReservation(req: Request, res: Response) {
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: "É obrigatório informar o motivo da recusa." });
  }

  const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id) as Reservation | undefined;
  if (!reservation) {
    return res.status(404).json({ error: "Reserva não encontrada." });
  }

  if (reservation.status !== "pendente") {
    return res.status(400).json({ error: "Só é possível recusar reservas com status pendente." });
  }

  db.prepare("UPDATE reservations SET status = 'recusada', reason = ? WHERE id = ?").run(reason, req.params.id);
  const updated = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id);
  return res.json(updated);
}

export function cancelReservation(req: Request, res: Response) {
  const { reason } = req.body;

  const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id) as Reservation | undefined;
  if (!reservation) {
    return res.status(404).json({ error: "Reserva não encontrada." });
  }

  // Usuário comum só pode cancelar a própria reserva. Admin pode cancelar qualquer uma.
  if (req.user!.role !== "admin" && reservation.user_id !== req.user!.id) {
    return res.status(403).json({ error: "Você não pode cancelar uma reserva de outro usuário." });
  }

  if (reservation.status === "cancelada") {
    return res.status(400).json({ error: "Esta reserva já está cancelada." });
  }

  db.prepare("UPDATE reservations SET status = 'cancelada', reason = ? WHERE id = ?").run(reason || null, req.params.id);
  const updated = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id);
  return res.json(updated);
}
