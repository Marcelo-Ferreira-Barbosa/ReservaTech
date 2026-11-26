import { Fragment, useEffect, useState } from "react";
import { StatusBadge } from "../components/StatusBadge";
import { StatusSummary } from "../components/StatusSummary";
import { api, getErrorMessage } from "../services/api";
import { Reservation } from "../types";
import { describePeriod, describeWeekday, groupBySeries, isCancellable, isUpcoming } from "../utils/series";

export function MyReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openSeries, setOpenSeries] = useState<number[]>([]);

  async function loadReservations() {
    const res = await api.get("/reservations");
    setReservations(res.data);
    setLoading(false);
  }

  useEffect(() => {
    loadReservations();
  }, []);

  async function cancel(path: string, question: string) {
    if (!window.confirm(question)) return;
    setError("");
    try {
      await api.patch(`${path}/cancel`, {});
      loadReservations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function toggleSeries(id: number) {
    setOpenSeries((open) => (open.includes(id) ? open.filter((item) => item !== id) : [...open, id]));
  }

  // Linha de uma reserva única ou de uma data de reserva recorrente.
  function renderReservation(r: Reservation, isOccurrence = false) {
    return (
      <tr key={r.id} className={isOccurrence ? "series-occurrence" : undefined}>
        <td>{isOccurrence ? "↳" : r.resource_name}</td>
        <td>{r.date}</td>
        <td>{r.start_time} - {r.end_time}</td>
        <td><StatusBadge status={r.status} /></td>
        <td>{r.reason ?? "—"}</td>
        <td>
          {isCancellable(r) && (
            <button
              className="btn btn-ghost btn-small"
              onClick={() => cancel(`/reservations/${r.id}`, "Tem certeza que deseja cancelar esta reserva?")}
            >
              Cancelar
            </button>
          )}
        </td>
      </tr>
    );
  }

  function renderSeries(seriesId: number, occurrences: Reservation[]) {
    const first = occurrences[0];
    const isOpen = openSeries.includes(seriesId);
    const canCancel = occurrences.some((r) => isCancellable(r) && isUpcoming(r));
    // O motivo só aparece no resumo quando é o mesmo em todas as datas.
    const sameReason = occurrences.every((r) => r.reason === first.reason);

    return (
      <Fragment key={`serie-${seriesId}`}>
        <tr>
          <td>{first.resource_name}</td>
          <td>
            {describeWeekday(first.date)}
            <div className="form-hint nowrap">{describePeriod(occurrences)}</div>
          </td>
          <td>{first.start_time} - {first.end_time}</td>
          <td><StatusSummary reservations={occurrences} /></td>
          <td>{(sameReason && first.reason) || "—"}</td>
          <td>
            <div className="table-actions">
              <button className="btn btn-ghost btn-small" onClick={() => toggleSeries(seriesId)}>
                {isOpen ? "Ocultar datas" : "Ver datas"}
              </button>
              {canCancel && (
                <button
                  className="btn btn-ghost btn-small"
                  onClick={() =>
                    cancel(
                      `/reservations/series/${seriesId}`,
                      "Cancelar todas as datas futuras desta reserva recorrente?"
                    )
                  }
                >
                  Cancelar futuras
                </button>
              )}
            </div>
          </td>
        </tr>
        {isOpen && occurrences.map((r) => renderReservation(r, true))}
      </Fragment>
    );
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="page">
      <h1>Minhas reservas</h1>
      {error && <div className="alert alert-error">{error}</div>}

      {reservations.length === 0 ? (
        <p className="empty-state">Você ainda não fez nenhuma solicitação de reserva.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Recurso</th>
              <th>Data</th>
              <th>Horário</th>
              <th>Status</th>
              <th>Motivo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {groupBySeries(reservations).map((group) => {
              const seriesId = group[0].series_id;
              return seriesId ? renderSeries(seriesId, group) : renderReservation(group[0]);
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
