import { Request, Response } from "express";
import db from "../database/db";
import { notifyRequester } from "../services/emailService";
import { MaintenanceBlock, Reservation, ReservationAction, ReservationLog, Resource } from "../types";
import { isEndAfterStart, isInThePast, isValidDate, isValidTime, timeRangesOverlap } from "../utils/time";

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

// Muda o status e registra no histórico quem fez a ação. As duas escritas
// ficam na mesma transação para nunca existir mudança sem registro.
function changeStatus(
  reservationId: number,
  action: ReservationAction,
  performedBy: number,
  reason: string | null
) {
  db.exec("BEGIN");
  try {
    db.prepare("UPDATE reservations SET status = ?, reason = ? WHERE id = ?").run(action, reason, reservationId);
    db.prepare(
      "INSERT INTO reservation_logs (reservation_id, performed_by, action, reason) VALUES (?, ?, ?, ?)"
    ).run(reservationId, performedBy, action, reason);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function withHistory(reservations: Reservation[]) {
  const logs = db
    .prepare(
      `SELECT reservation_logs.*, users.name as performed_by_name
       FROM reservation_logs
       JOIN users ON users.id = reservation_logs.performed_by
       ORDER BY reservation_logs.id`
    )
    .all() as unknown as ReservationLog[];

  return reservations.map((r) => ({ ...r, history: logs.filter((log) => log.reservation_id === r.id) }));
}

export function listReservations(req: Request, res: Response) {
  if (req.user!.role === "admin") {
    const reservations = db
      .prepare(
        `SELECT reservations.*, users.name as user_name, resources.name as resource_name
         FROM reservations
         JOIN users ON users.id = reservations.user_id
         JOIN resources ON resources.id = reservations.resource_id
         ORDER BY reservations.created_at DESC`
      )
      .all() as unknown as Reservation[];
    return res.json(withHistory(reservations));
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

  if (isInThePast(date, end_time)) {
    return res.status(400).json({ error: "Não é possível reservar um período que já passou." });
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

  const isConflict = hasApprovedConflict(resource_id, date, start_time, end_time);
  const status = isConflict ? "espera" : "pendente";

  const result = db
    .prepare(
      "INSERT INTO reservations (user_id, resource_id, date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(req.user!.id, resource_id, date, start_time, end_time, status);

  const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(result.lastInsertRowid);
  if (status === "espera") {
    notifyRequester(result.lastInsertRowid);
  }
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

  if (
    hasApprovedConflict(reservation.resource_id, reservation.date, reservation.start_time, reservation.end_time, reservation.id)
  ) {
    return res.status(409).json({ error: "Já existe outra reserva aprovada que conflita com este horário." });
  }

  changeStatus(reservation.id, "aprovada", req.user!.id, null);
  const updated = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id);
  notifyRequester(req.params.id);
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

  changeStatus(reservation.id, "recusada", req.user!.id, reason);
  const updated = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id);
  notifyRequester(req.params.id);
  return res.json(updated);
}

export function cancelReservation(req: Request, res: Response) {
  const { reason } = req.body;

  const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id) as Reservation | undefined;
  if (!reservation) {
    return res.status(404).json({ error: "Reserva não encontrada." });
  }

  if (req.user!.role !== "admin" && reservation.user_id !== req.user!.id) {
    return res.status(403).json({ error: "Você não pode cancelar uma reserva de outro usuário." });
  }

  if (reservation.status === "cancelada") {
    return res.status(400).json({ error: "Esta reserva já está cancelada." });
  }

  changeStatus(reservation.id, "cancelada", req.user!.id, reason || null);
  const updated = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id);
  notifyRequester(req.params.id);

  // Se a reserva cancelada era 'aprovada', verificamos se há alguém na fila de espera ('espera') para o mesmo recurso e data
  if (reservation.status === 'aprovada') {
    const waitingList = db
      .prepare(
        "SELECT * FROM reservations WHERE resource_id = ? AND date = ? AND status = 'espera' ORDER BY created_at ASC"
      )
      .all(reservation.resource_id, reservation.date) as unknown as Reservation[];

    const nextInLine = waitingList.find((w) => timeRangesOverlap(reservation.start_time, reservation.end_time, w.start_time, w.end_time));

    if (nextInLine) {
      db.prepare("UPDATE reservations SET status = 'pendente' WHERE id = ?").run(nextInLine.id);
      notifyRequester(nextInLine.id);
    }
  }

  return res.json(updated);
}
