import { Reservation } from "../types";
import { StatusBadge } from "./StatusBadge";

// Quantas datas de uma reserva recorrente estão em cada status.
export function StatusSummary({ reservations }: { reservations: Reservation[] }) {
  const counts = new Map<string, number>();
  for (const { status } of reservations) {
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return (
    <div className="status-summary">
      {Array.from(counts, ([status, count]) => (
        <span key={status}>
          <StatusBadge status={status} /> × {count}
        </span>
      ))}
    </div>
  );
}
