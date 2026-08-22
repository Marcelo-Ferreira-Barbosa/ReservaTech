import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Reservation, Resource } from "../../types";

export function AdminDashboard() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/resources"), api.get("/reservations")]).then(([resourcesRes, reservationsRes]) => {
      setResources(resourcesRes.data);
      setReservations(reservationsRes.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Carregando...</p>;

  const pending = reservations.filter((r) => r.status === "pendente").length;
  const approved = reservations.filter((r) => r.status === "aprovada").length;
  const inMaintenance = resources.filter((r) => r.status === "manutencao").length;

  return (
    <div className="page">
      <h1>Painel administrativo</h1>

      <div className="cards-grid">
        <div className="stat-card">
          <span className="stat-number">{resources.length}</span>
          <span className="stat-label">recursos cadastrados</span>
        </div>
        <div className="stat-card stat-card-warning">
          <span className="stat-number">{pending}</span>
          <span className="stat-label">reservas pendentes</span>
        </div>
        <div className="stat-card stat-card-success">
          <span className="stat-number">{approved}</span>
          <span className="stat-label">reservas aprovadas</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{inMaintenance}</span>
          <span className="stat-label">recursos em manutenção</span>
        </div>
      </div>
    </div>
  );
}
