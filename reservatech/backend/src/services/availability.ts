import db from "../database/db";
import { MaintenanceBlock, Reservation, Resource } from "../types";
import { isEndAfterStart, isInThePast, isValidDate, isValidTime, timeRangesOverlap } from "../utils/time";
import { notifyRequester } from "./emailService";

// Regras de disponibilidade usadas tanto pela reserva única quanto pela
// recorrente.

export function hasApprovedConflict(
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

export function hasMaintenanceConflict(
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

// Validações de um pedido de reserva. Devolve null quando o pedido é válido.
export function findRequestError(
  resourceId: number,
  date: string,
  startTime: string,
  endTime: string
): { status: number; error: string } | null {
  if (!resourceId || !date || !startTime || !endTime) {
    return { status: 400, error: "recurso, data, horário inicial e horário final são obrigatórios." };
  }

  if (!isValidDate(date)) {
    return { status: 400, error: "Data inválida. Use o formato YYYY-MM-DD." };
  }

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return { status: 400, error: "Horário inválido. Use o formato HH:MM." };
  }

  if (!isEndAfterStart(startTime, endTime)) {
    return { status: 400, error: "O horário final deve ser depois do horário inicial." };
  }

  if (isInThePast(date, endTime)) {
    return { status: 400, error: "Não é possível reservar um período que já passou." };
  }

  const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(resourceId) as Resource | undefined;
  if (!resource) {
    return { status: 404, error: "Recurso não encontrado." };
  }

  if (resource.status !== "ativo") {
    return { status: 400, error: "Este recurso não está disponível para reservas no momento." };
  }

  return null;
}

// Depois que uma reserva aprovada é cancelada, verificamos se há alguém na
// fila de espera ('espera') para o mesmo recurso e data.
export function promoteNextInLine(cancelled: Reservation) {
  const waitingList = db
    .prepare(
      "SELECT * FROM reservations WHERE resource_id = ? AND date = ? AND status = 'espera' ORDER BY created_at ASC"
    )
    .all(cancelled.resource_id, cancelled.date) as unknown as Reservation[];

  const nextInLine = waitingList.find((w) =>
    timeRangesOverlap(cancelled.start_time, cancelled.end_time, w.start_time, w.end_time)
  );

  if (nextInLine) {
    db.prepare("UPDATE reservations SET status = 'pendente' WHERE id = ?").run(nextInLine.id);
    notifyRequester(nextInLine.id);
  }
}
