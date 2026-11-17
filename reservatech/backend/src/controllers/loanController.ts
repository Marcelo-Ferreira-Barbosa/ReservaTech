import { Request, Response } from "express";
import db from "../database/db";

const EQUIPMENT_TYPES = "('projetor', 'notebook')";

export function listLoans(req: Request, res: Response) {
  const loans = db
    .prepare(
      `SELECT reservations.id AS reservation_id, reservations.date, reservations.start_time, reservations.end_time,
              resources.name AS resource_name, resources.type AS resource_type,
              users.name AS user_name,
              equipment_loans.checked_out_at, equipment_loans.returned_at
       FROM reservations
       JOIN resources ON resources.id = reservations.resource_id
       JOIN users ON users.id = reservations.user_id
       LEFT JOIN equipment_loans ON equipment_loans.reservation_id = reservations.id
       WHERE resources.type IN ${EQUIPMENT_TYPES}
         AND (reservations.status = 'aprovada' OR equipment_loans.id IS NOT NULL)
       ORDER BY equipment_loans.returned_at IS NOT NULL, reservations.date, reservations.start_time`
    )
    .all();

  return res.json(loans);
}

export function checkOut(req: Request, res: Response) {
  const reservation = db
    .prepare(
      `SELECT reservations.id, reservations.resource_id, reservations.status
       FROM reservations
       JOIN resources ON resources.id = reservations.resource_id
       WHERE reservations.id = ? AND resources.type IN ${EQUIPMENT_TYPES}`
    )
    .get(req.params.id) as { id: number; resource_id: number; status: string } | undefined;

  if (!reservation) {
    return res.status(404).json({ error: "Reserva de projetor ou notebook não encontrada." });
  }

  if (reservation.status !== "aprovada") {
    return res.status(400).json({ error: "Só é possível registrar a retirada de uma reserva aprovada." });
  }

  const alreadyRegistered = db.prepare("SELECT id FROM equipment_loans WHERE reservation_id = ?").get(reservation.id);
  if (alreadyRegistered) {
    return res.status(409).json({ error: "A retirada desta reserva já foi registrada." });
  }

  const stillOut = db
    .prepare(
      `SELECT equipment_loans.id
       FROM equipment_loans
       JOIN reservations ON reservations.id = equipment_loans.reservation_id
       WHERE reservations.resource_id = ? AND equipment_loans.returned_at IS NULL`
    )
    .get(reservation.resource_id);
  if (stillOut) {
    return res.status(409).json({ error: "Este equipamento ainda não foi devolvido da retirada anterior." });
  }

  db.prepare("INSERT INTO equipment_loans (reservation_id) VALUES (?)").run(reservation.id);

  const loan = db.prepare("SELECT * FROM equipment_loans WHERE reservation_id = ?").get(reservation.id);
  return res.status(201).json(loan);
}

export function checkIn(req: Request, res: Response) {
  const loan = db
    .prepare("SELECT * FROM equipment_loans WHERE reservation_id = ?")
    .get(req.params.id) as { id: number; returned_at: string | null } | undefined;

  if (!loan) {
    return res.status(404).json({ error: "Nenhuma retirada registrada para esta reserva." });
  }

  if (loan.returned_at) {
    return res.status(409).json({ error: "A devolução desta reserva já foi registrada." });
  }

  db.prepare("UPDATE equipment_loans SET returned_at = datetime('now') WHERE id = ?").run(loan.id);

  const updated = db.prepare("SELECT * FROM equipment_loans WHERE id = ?").get(loan.id);
  return res.json(updated);
}
