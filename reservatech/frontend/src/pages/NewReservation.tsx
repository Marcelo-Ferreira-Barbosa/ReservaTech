import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DateList } from "../components/DateList";
import { api, getErrorMessage } from "../services/api";
import { Resource, SeriesCreationResult } from "../types";
import { countWeeklyDates, describeWeekday, formatDateCount, maxSeriesEndDate } from "../utils/series";

export function NewReservation() {
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceId, setResourceId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [seriesResult, setSeriesResult] = useState<SeriesCreationResult | null>(null);
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
      const request = {
        resource_id: Number(resourceId),
        start_time: startTime,
        end_time: endTime,
      };

      if (repeat) {
        // A série não redireciona sozinha: o resumo precisa ser lido.
        const res = await api.post("/reservations/series", { ...request, start_date: date, end_date: endDate });
        setSeriesResult(res.data);
      } else {
        await api.post("/reservations", { ...request, date });
        setSuccess(true);
        setTimeout(() => navigate("/minhas-reservas"), 1200);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (seriesResult) {
    const pending = seriesResult.reservations.filter((r) => r.status === "pendente").map((r) => r.date);
    const waiting = seriesResult.reservations.filter((r) => r.status === "espera").map((r) => r.date);

    return (
      <div className="page page-narrow">
        <h1>Nova reserva</h1>

        <div className="card-form">
          <div className="alert alert-success">Solicitação recorrente enviada!</div>
          {pending.length > 0 && (
            <div>
              <strong>Aguardando aprovação ({formatDateCount(pending.length)}):</strong> <DateList dates={pending} />
            </div>
          )}
          {waiting.length > 0 && (
            <div>
              <strong>Na fila de espera ({formatDateCount(waiting.length)}):</strong> <DateList dates={waiting} />
            </div>
          )}
          {seriesResult.skipped_dates.length > 0 && (
            <div>
              <strong>Não reservadas por manutenção ({formatDateCount(seriesResult.skipped_dates.length)}):</strong>{" "}
              <DateList dates={seriesResult.skipped_dates} />
            </div>
          )}
          <Link to="/minhas-reservas" className="btn btn-primary">Ver minhas reservas</Link>
        </div>
      </div>
    );
  }

  const dateCount = date && endDate ? countWeeklyDates(date, endDate) : 0;

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
          {repeat ? "Primeira data" : "Data"}
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

        <label className="checkbox-label">
          <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
          Repetir toda semana
        </label>

        {repeat && (
          <label>
            Repetir até
            <input
              type="date"
              value={endDate}
              min={date || undefined}
              max={date ? maxSeriesEndDate(date) : undefined}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>
        )}

        {repeat && dateCount > 1 && (
          <p className="form-hint">
            {describeWeekday(date)}: <strong>{formatDateCount(dateCount)}</strong> no período.
          </p>
        )}

        <p className="form-hint">
          Sua solicitação ficará com status <strong>pendente</strong> até que um administrador aprove ou recuse.
          {repeat && " Datas em conflito com reservas aprovadas vão para a fila de espera, e datas com manutenção ficam de fora."}
        </p>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Enviando..." : "Solicitar reserva"}
        </button>
      </form>
    </div>
  );
}
