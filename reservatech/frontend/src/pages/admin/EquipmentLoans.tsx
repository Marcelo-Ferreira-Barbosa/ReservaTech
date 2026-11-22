import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../../services/api";
import { EquipmentLoan } from "../../types";

function formatDateTime(value: string) {
  return new Date(value.replace(" ", "T") + "Z").toLocaleString("pt-BR");
}

export function EquipmentLoans() {
  const [loans, setLoans] = useState<EquipmentLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLoans() {
    const res = await api.get("/loans");
    setLoans(res.data);
    setLoading(false);
  }

  useEffect(() => {
    loadLoans();
  }, []);

  async function handleCheckOut(reservationId: number) {
    setError("");
    try {
      await api.post(`/loans/${reservationId}/checkout`, {});
      loadLoans();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleCheckIn(reservationId: number) {
    setError("");
    try {
      await api.patch(`/loans/${reservationId}/checkin`, {});
      loadLoans();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="page">
      <h1>Retirada e devolução de equipamentos</h1>
      {error && <div className="alert alert-error">{error}</div>}

      {loans.length === 0 ? (
        <p className="empty-state">Nenhuma reserva aprovada de projetor ou notebook por enquanto.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Equipamento</th>
              <th>Usuário</th>
              <th>Data</th>
              <th>Horário</th>
              <th>Situação</th>
              <th>Retirado em</th>
              <th>Devolvido em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.reservation_id}>
                <td>{loan.resource_name}</td>
                <td>{loan.user_name}</td>
                <td>{loan.date}</td>
                <td>{loan.start_time} - {loan.end_time}</td>
                <td>
                  {loan.returned_at ? (
                    <span className="badge badge-green">Devolvido</span>
                  ) : loan.checked_out_at ? (
                    <span className="badge badge-orange">Retirado</span>
                  ) : (
                    <span className="badge badge-yellow">Aguardando retirada</span>
                  )}
                </td>
                <td>{loan.checked_out_at ? formatDateTime(loan.checked_out_at) : "—"}</td>
                <td>{loan.returned_at ? formatDateTime(loan.returned_at) : "—"}</td>
                <td className="table-actions">
                  {!loan.checked_out_at && (
                    <button className="btn btn-primary btn-small" onClick={() => handleCheckOut(loan.reservation_id)}>
                      Registrar retirada
                    </button>
                  )}
                  {loan.checked_out_at && !loan.returned_at && (
                    <button className="btn btn-primary btn-small" onClick={() => handleCheckIn(loan.reservation_id)}>
                      Registrar devolução
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
