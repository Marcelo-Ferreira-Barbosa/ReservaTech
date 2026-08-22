import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../services/api";
import { Resource } from "../types";

export function NewReservation() {
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceId, setResourceId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/resources").then((res) => {
      // Só recursos ativos aparecem como opção para solicitar reserva.
      setResources(res.data.filter((r: Resource) => r.status === "ativo"));
    });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    // Feedback básico no frontend antes de enviar - a validação real e
    // definitiva de conflito sempre acontece no backend (item 8 do escopo).
    if (startTime >= endTime) {
      setError("O horário final deve ser depois do horário inicial.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/reservations", {
        resource_id: Number(resourceId),
        date,
        start_time: startTime,
        end_time: endTime,
      });
      setSuccess(true);
      setTimeout(() => navigate("/minhas-reservas"), 1200);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page page-narrow">
      <h1>Nova reserva</h1>

      <form className="card-form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">Solicitação enviada! Redirecionando...</div>}

        <label>
          Recurso
          <select value={resourceId} onChange={(e) => setResourceId(e.target.value)} required>
            <option value="">Selecione um recurso</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>{r.name} — {r.location}</option>
            ))}
          </select>
        </label>

        <label>
          Data
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <div className="form-row">
          <label>
            Horário inicial
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </label>
          <label>
            Horário final
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </label>
        </div>

        <p className="form-hint">
          Sua solicitação ficará com status <strong>pendente</strong> até que um administrador aprove ou recuse.
        </p>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Enviando..." : "Solicitar reserva"}
        </button>
      </form>
    </div>
  );
}
