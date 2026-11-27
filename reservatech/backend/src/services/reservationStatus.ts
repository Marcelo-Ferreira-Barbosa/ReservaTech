import db, { inTransaction } from "../database/db";
import { ReservationAction } from "../types";

// Muda o status e registra no histórico quem fez a ação. As escritas
// ficam na mesma transação para nunca existir mudança sem registro.
export function changeStatus(
  reservationIds: number[],
  action: ReservationAction,
  performedBy: number,
  reason: string | null
) {
  inTransaction(() => {
    const update = db.prepare("UPDATE reservations SET status = ?, reason = ? WHERE id = ?");
    const log = db.prepare(
      "INSERT INTO reservation_logs (reservation_id, performed_by, action, reason) VALUES (?, ?, ?, ?)"
    );

    for (const id of reservationIds) {
      update.run(action, reason, id);
      log.run(id, performedBy, action, reason);
    }
  });
}
