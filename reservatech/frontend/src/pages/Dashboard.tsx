import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { Reservation, Resource } from "../types";

export function Dashboard() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [resourcesRes, reservationsRes] = await Promise.all([
        api.get("/resources"),
        api.get("/reservations"),
      ]);
      setResources(resourcesRes.data);
      setReservations(reservationsRes.data);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) return <p>Carregando...</p>;

  const availableCount = resources.filter((r) => r.status === "ativo").length;
  const upcoming = reservations
    .filter((r) => r.status === "aprovada" || r.status === "pendente")
    .slice(0, 5);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Meu painel</h1>
        <Link to="/nova-reserva" className="btn btn-primary">Solicitar reserva</Link>
      </div>

      <div className="cards-grid">
        <div className="stat-card">
          <span className="stat-number">{availableCount}</span>
          <span className="stat-label">recursos disponíveis</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{reservations.length}</span>
          <span className="stat-label">reservas no total</span>
        </div>
      </div>

      <h2>Próximas reservas</h2>
      {upcoming.length === 0 ? (
        <p className="empty-state">Você ainda não tem reservas pendentes ou aprovadas.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Recurso</th>
              <th>Data</th>
              <th>Horário</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((r) => (
              <tr key={r.id}>
                <td>{r.resource_name}</td>
                <td>{r.date}</td>
                <td>{r.start_time} - {r.end_time}</td>
                <td><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
