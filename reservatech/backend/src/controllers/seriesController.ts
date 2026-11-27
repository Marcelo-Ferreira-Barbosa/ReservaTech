import { Request, Response } from "express";
import db, { inTransaction } from "../database/db";
import {
  findRequestError,
  hasApprovedConflict,
  hasMaintenanceConflict,
  promoteNextInLine,
} from "../services/availability";
import { notifySeries } from "../services/emailService";
import { changeStatus } from "../services/reservationStatus";
import { Reservation, ReservationSeries, ReservationStatus } from "../types";
import { addMonths, isInThePast, isValidDate, weeklyDates } from "../utils/time";

// Período máximo de uma série: cobre um semestre letivo com folga.
const MAX_SERIES_MONTHS = 6;

function findSeries(id: number | string) {
  return db.prepare("SELECT * FROM reservation_series WHERE id = ?").get(id) as ReservationSeries | undefined;
}

// Datas da série que estão em um dos status informados, em ordem.
function findOccurrences(seriesId: number, statuses: ReservationStatus[]) {
  const placeholders = statuses.map(() => "?").join(", ");
  return db
    .prepare(`SELECT * FROM reservations WHERE series_id = ? AND status IN (${placeholders}) ORDER BY date`)
    .all(seriesId, ...statuses) as unknown as Reservation[];
}

export function createSeries(req: Request, res: Response) {
  const { resource_id, start_date, end_date, start_time, end_time } = req.body;

  const requestError = findRequestError(resource_id, start_date, start_time, end_time);
  if (requestError) {
    return res.status(requestError.status).json({ error: requestError.error });
  }

  if (!end_date || !isValidDate(end_date)) {
    return res.status(400).json({ error: "Informe a data final da repetição no formato YYYY-MM-DD." });
  }

  if (end_date > addMonths(start_date, MAX_SERIES_MONTHS)) {
    return res.status(400).json({ error: `A repetição pode durar no máximo ${MAX_SERIES_MONTHS} meses.` });
  }

  const dates = weeklyDates(start_date, end_date);
  if (dates.length < 2) {
    return res.status(400).json({ error: "A data final precisa ser pelo menos uma semana depois da primeira data." });
  }

  // Datas com bloqueio de manutenção ficam de fora e são informadas na resposta.
  const skippedDates = dates.filter((date) => hasMaintenanceConflict(resource_id, date, start_time, end_time));
  const availableDates = dates.filter((date) => !skippedDates.includes(date));

  if (availableDates.length === 0) {
    return res.status(409).json({ error: "Todas as datas do período estão bloqueadas para manutenção." });
  }

  const seriesId = inTransaction(() => {
    const series = db
      .prepare(
        `INSERT INTO reservation_series (user_id, resource_id, start_date, end_date, start_time, end_time)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(req.user!.id, resource_id, start_date, end_date, start_time, end_time);

    const insertReservation = db.prepare(
      `INSERT INTO reservations (user_id, resource_id, date, start_time, end_time, status, series_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    for (const date of availableDates) {
      // Mesma regra da reserva única: quem conflita com uma aprovada espera.
      const status = hasApprovedConflict(resource_id, date, start_time, end_time) ? "espera" : "pendente";
      insertReservation.run(
        req.user!.id,
        resource_id,
        date,
        start_time,
        end_time,
        status,
        series.lastInsertRowid
      );
    }

    return Number(series.lastInsertRowid);
  });

  const reservations = findOccurrences(seriesId, ["pendente", "espera"]);

  if (skippedDates.length > 0 || reservations.some((r) => r.status === "espera")) {
    notifySeries(
      reservations.map((r) => r.id),
      "Sua reserva recorrente foi registrada",
      skippedDates
    );
  }

  return res.status(201).json({ series: findSeries(seriesId), reservations, skipped_dates: skippedDates });
}

export function approveSeries(req: Request, res: Response) {
  const series = findSeries(req.params.id);
  if (!series) {
    return res.status(404).json({ error: "Reserva recorrente não encontrada." });
  }

  const pending = findOccurrences(series.id, ["pendente"]);
  if (pending.length === 0) {
    return res.status(400).json({ error: "Esta reserva recorrente não tem datas pendentes." });
  }

  // Datas que ganharam conflito depois do pedido continuam pendentes.
  const blocked = pending.filter(
    (r) =>
      hasMaintenanceConflict(r.resource_id, r.date, r.start_time, r.end_time) ||
      hasApprovedConflict(r.resource_id, r.date, r.start_time, r.end_time, r.id)
  );
  const approvable = pending.filter((r) => !blocked.includes(r));
  const conflictDates = blocked.map((r) => r.date);

  if (approvable.length === 0) {
    return res.status(409).json({
      error: "Nenhuma data pôde ser aprovada: todas conflitam com outra reserva aprovada ou com manutenção.",
      conflict_dates: conflictDates,
    });
  }

  const ids = approvable.map((r) => r.id);
  changeStatus(ids, "aprovada", req.user!.id, null);
  notifySeries(ids, "Sua reserva recorrente foi aprovada");

  return res.json({ approved_dates: approvable.map((r) => r.date), conflict_dates: conflictDates });
}

export function rejectSeries(req: Request, res: Response) {
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: "É obrigatório informar o motivo da recusa." });
  }

  const series = findSeries(req.params.id);
  if (!series) {
    return res.status(404).json({ error: "Reserva recorrente não encontrada." });
  }

  // As datas em espera entram na recusa: senão voltariam a ficar pendentes
  // depois que o horário fosse liberado.
  const open = findOccurrences(series.id, ["pendente", "espera"]);
  if (open.length === 0) {
    return res.status(400).json({ error: "Esta reserva recorrente não tem datas pendentes ou em espera." });
  }

  const ids = open.map((r) => r.id);
  changeStatus(ids, "recusada", req.user!.id, reason);
  notifySeries(ids, "Sua reserva recorrente foi recusada");

  return res.json({ rejected_dates: open.map((r) => r.date) });
}

export function cancelSeries(req: Request, res: Response) {
  const { reason } = req.body;

  const series = findSeries(req.params.id);
  if (!series) {
    return res.status(404).json({ error: "Reserva recorrente não encontrada." });
  }

  if (req.user!.role !== "admin" && series.user_id !== req.user!.id) {
    return res.status(403).json({ error: "Você não pode cancelar uma reserva de outro usuário." });
  }

  // Datas que já terminaram ficam como estão.
  const upcoming = findOccurrences(series.id, ["pendente", "aprovada", "espera"]).filter(
    (r) => !isInThePast(r.date, r.end_time)
  );
  if (upcoming.length === 0) {
    return res.status(400).json({ error: "Não há datas futuras para cancelar nesta reserva recorrente." });
  }

  const ids = upcoming.map((r) => r.id);
  changeStatus(ids, "cancelada", req.user!.id, reason || null);
  notifySeries(ids, "Sua reserva recorrente foi cancelada");

  // A fila só anda depois de tudo cancelado, nas datas que estavam aprovadas.
  upcoming.filter((r) => r.status === "aprovada").forEach(promoteNextInLine);

  return res.json({ cancelled_dates: upcoming.map((r) => r.date) });
}
