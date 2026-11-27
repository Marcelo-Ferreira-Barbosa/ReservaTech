import { Request, Response } from "express";
import db from "../database/db";
import {
  findRequestError,
  hasApprovedConflict,
  hasMaintenanceConflict,
  promoteNextInLine,
} from "../services/availability";
import { notifyRequester } from "../services/emailService";
import { changeStatus } from "../services/reservationStatus";
import { Reservation, ReservationLog } from "../types";

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

  const requestError = findRequestError(resource_id, date, start_time, end_time);
  if (requestError) {
    return res.status(requestError.status).json({ error: requestError.error });
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

  changeStatus([reservation.id], "aprovada", req.user!.id, null);
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

  changeStatus([reservation.id], "recusada", req.user!.id, reason);
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

  changeStatus([reservation.id], "cancelada", req.user!.id, reason || null);
  const updated = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id);
  notifyRequester(req.params.id);

  if (reservation.status === "aprovada") {
    promoteNextInLine(reservation);
  }

  return res.json(updated);
}
