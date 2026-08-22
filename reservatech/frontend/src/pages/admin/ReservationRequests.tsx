import { useEffect, useState } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import { api, getErrorMessage } from "../../services/api";
import { Reservation } from "../../types";

export function ReservationRequests() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
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
    try {
      await api.patch(`/reservations/${id}/approve`, {});
      loadReservations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function openRejectForm(id: number) {
    setRejectingId(id);
    setRejectReason("");
  }

  async function confirmReject() {
    if (!rejectReason.trim()) {
      setError("Informe o motivo da recusa.");
      return;
    }
    setError("");
    try {
      await api.patch(`/reservations/${rejectingId}/reject`, { reason: rejectReason });
      setRejectingId(null);
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
            {pending.map((r) => (
              <tr key={r.id}>
                <td>{r.user_name}</td>
                <td>{r.resource_name}</td>
                <td>{r.date}</td>
                <td>{r.start_time} - {r.end_time}</td>
                <td className="table-actions">
                  <button className="btn btn-primary btn-small" onClick={() => handleApprove(r.id)}>Aprovar</button>
                  <button className="btn btn-danger btn-small" onClick={() => openRejectForm(r.id)}>Recusar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {rejectingId !== null && (
        <div className="inline-form">
          <label>
            Motivo da recusa
            <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} autoFocus />
          </label>
          <div className="form-actions">
            <button className="btn btn-danger btn-small" onClick={confirmReject}>Confirmar recusa</button>
            <button className="btn btn-ghost btn-small" onClick={() => setRejectingId(null)}>Cancelar</button>
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
          </tr>
        </thead>
        <tbody>
          {others.map((r) => (
            <tr key={r.id}>
              <td>{r.user_name}</td>
              <td>{r.resource_name}</td>
              <td>{r.date}</td>
              <td>{r.start_time} - {r.end_time}</td>
              <td><StatusBadge status={r.status} /></td>
              <td>{r.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
