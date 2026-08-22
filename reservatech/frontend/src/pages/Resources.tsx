import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { Resource } from "../types";

const TYPE_LABELS: Record<string, string> = {
  sala: "Sala",
  laboratorio: "Laboratório",
  projetor: "Projetor",
  notebook: "Notebook",
  outro: "Outro",
};

export function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/resources").then((res) => {
      setResources(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Recursos</h1>
        <Link to="/nova-reserva" className="btn btn-primary">Solicitar reserva</Link>
      </div>

      {/* TODO (fácil): permitir filtrar esta lista por tipo e por status */}
      <div className="cards-grid">
        {resources.map((resource) => (
          <div className="resource-card" key={resource.id}>
            <div className="resource-card-header">
              <h3>{resource.name}</h3>
              <StatusBadge status={resource.status} />
            </div>
            <p className="resource-type">{TYPE_LABELS[resource.type] ?? resource.type}</p>
            <p>{resource.location}</p>
            {resource.description && <p className="resource-description">{resource.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
