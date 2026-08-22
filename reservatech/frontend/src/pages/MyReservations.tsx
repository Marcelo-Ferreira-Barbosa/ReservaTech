import { useEffect, useState } from "react";
import { StatusBadge } from "../components/StatusBadge";
import { api, getErrorMessage } from "../services/api";
import { Reservation } from "../types";

export function MyReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReservations() {
    const res = await api.get("/reservations");
    setReservations(res.data);
    setLoading(false);
  }

  useEffect(() => {
    loadReservations();
  }, []);

  async function handleCancel(id: number) {
    if (!window.confirm("Tem certeza que deseja cancelar esta reserva?")) return;
    setError("");
    try {
      await api.patch(`/reservations/${id}/cancel`, {});
      loadReservations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
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
            {reservations.map((r) => (
              <tr key={r.id}>
                <td>{r.resource_name}</td>
                <td>{r.date}</td>
                <td>{r.start_time} - {r.end_time}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{r.reason ?? "—"}</td>
                <td>
                  {(r.status === "pendente" || r.status === "aprovada") && (
                    <button className="btn btn-ghost btn-small" onClick={() => handleCancel(r.id)}>
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
