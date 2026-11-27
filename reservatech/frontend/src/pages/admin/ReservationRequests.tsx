import { useEffect, useState } from "react";
import { DateList } from "../../components/DateList";
import { StatusBadge } from "../../components/StatusBadge";
import { api, getErrorMessage } from "../../services/api";
import { Reservation } from "../../types";
import { describePeriod, describeWeekday, formatDateCount, groupBySeries } from "../../utils/series";

const actionLabels = { aprovada: "Aprovada", recusada: "Recusada", cancelada: "Cancelada" };

// O banco grava em UTC ("YYYY-MM-DD HH:MM:SS"); aqui convertemos para o horário local.
function formatDateTime(value: string) {
  return new Date(value.replace(" ", "T") + "Z").toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function ReservationRequests() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // O que está sendo recusado: uma reserva ou uma reserva recorrente inteira.
  const [rejecting, setRejecting] = useState<{ path: string; isSeries: boolean } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function loadReservations() {
    const res = await api.get("/reservations");
    setReservations(res.data);
    setLoading(false);
  }

  useEffect(() => {
    loadReservations();
  }, []);

  async function handleApprove(id: number) {
    setError("");
    setNotice("");
    try {
      await api.patch(`/reservations/${id}/approve`, {});
      loadReservations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleApproveSeries(seriesId: number) {
    setError("");
    setNotice("");
    try {
      const res = await api.patch(`/reservations/series/${seriesId}/approve`, {});
      const approved: string[] = res.data.approved_dates;
      const conflicts: string[] = res.data.conflict_dates;
      let message = `Reserva recorrente: ${formatDateCount(approved.length)} com aprovação registrada.`;
      if (conflicts.length > 0) {
        message += ` Continuam pendentes por conflito: ${conflicts.join(", ")}.`;
      }
      setNotice(message);
      loadReservations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function openRejectForm(path: string, isSeries = false) {
    setRejecting({ path, isSeries });
    setRejectReason("");
  }

  async function confirmReject() {
    if (!rejectReason.trim()) {
      setError("Informe o motivo da recusa.");
      return;
    }
    setError("");
    setNotice("");
    try {
      await api.patch(`${rejecting!.path}/reject`, { reason: rejectReason });
      setRejecting(null);
      loadReservations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <p>Carregando...</p>;

  const pending = reservations.filter((r) => r.status === "pendente");
  const others = reservations.filter((r) => r.status !== "pendente");

  return (
    <div className="page">
      <h1>Solicitações de reserva</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <h2>Pendentes</h2>
      {pending.length === 0 ? (
        <p className="empty-state">Nenhuma solicitação pendente no momento.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Recurso</th>
              <th>Data</th>
              <th>Horário</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {groupBySeries(pending).map((group) => {
              const r = group[0];
              const seriesId = r.series_id;
              return (
                <tr key={r.id}>
                  <td>{r.user_name}</td>
                  <td>{r.resource_name}</td>
                  <td>
                    {seriesId ? (
                      <>
                        {describeWeekday(r.date)}
                        <details className="form-hint">
                          <summary className="nowrap">{describePeriod(group)}</summary>
                          <DateList dates={group.map((occurrence) => occurrence.date)} />
                        </details>
                      </>
                    ) : (
                      r.date
                    )}
                  </td>
                  <td>{r.start_time} - {r.end_time}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn btn-primary btn-small"
                        onClick={() => (seriesId ? handleApproveSeries(seriesId) : handleApprove(r.id))}
                      >
                        {seriesId ? "Aprovar série" : "Aprovar"}
                      </button>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() =>
                          seriesId
                            ? openRejectForm(`/reservations/series/${seriesId}`, true)
                            : openRejectForm(`/reservations/${r.id}`)
                        }
                      >
                        {seriesId ? "Recusar série" : "Recusar"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {rejecting !== null && (
        <div className="inline-form">
          {rejecting.isSeries && (
            <span className="form-hint">
              A recusa vale para todas as datas pendentes e em espera desta reserva recorrente.
            </span>
          )}
          <label>
            Motivo da recusa
            <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} autoFocus />
          </label>
          <div className="form-actions">
            <button className="btn btn-danger btn-small" onClick={confirmReject}>Confirmar recusa</button>
            <button className="btn btn-ghost btn-small" onClick={() => setRejecting(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <h2>Histórico</h2>
      {/* TODO (médio): paginar este histórico quando o volume de reservas crescer */}
      <table className="table">
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Recurso</th>
            <th>Data</th>
            <th>Horário</th>
            <th>Status</th>
            <th>Motivo</th>
            <th>Quem e quando</th>
          </tr>
        </thead>
        <tbody>
          {others.map((r) => (
            <tr key={r.id}>
              <td>{r.user_name}</td>
              <td>{r.resource_name}</td>
              <td className="nowrap">
                {r.date}
                {r.series_id && <div className="form-hint">recorrente</div>}
              </td>
              <td>{r.start_time} - {r.end_time}</td>
              <td><StatusBadge status={r.status} /></td>
              <td>{r.reason ?? "—"}</td>
              <td>
                {r.history?.length
                  ? r.history.map((log) => (
                      <div key={log.id}>
                        {actionLabels[log.action]} por {log.performed_by_name} em {formatDateTime(log.created_at)}
                      </div>
                    ))
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
