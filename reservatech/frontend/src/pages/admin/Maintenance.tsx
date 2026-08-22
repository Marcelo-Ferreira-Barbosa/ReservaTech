import { FormEvent, useEffect, useState } from "react";
import { api, getErrorMessage } from "../../services/api";
import { MaintenanceBlock, Resource } from "../../types";

const EMPTY_FORM = { resource_id: "", date: "", start_time: "", end_time: "", reason: "" };

export function Maintenance() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [blocks, setBlocks] = useState<MaintenanceBlock[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const [resourcesRes, blocksRes] = await Promise.all([api.get("/resources"), api.get("/maintenance")]);
    setResources(resourcesRes.data);
    setBlocks(blocksRes.data);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/maintenance", { ...form, resource_id: Number(form.resource_id) });
      setForm(EMPTY_FORM);
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleRemove(id: number) {
    if (!window.confirm("Remover este bloqueio de manutenção? O recurso volta a ficar ativo se não houver outros bloqueios.")) return;
    setError("");
    try {
      await api.delete(`/maintenance/${id}`);
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="page">
      <h1>Manutenção de recursos</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="card-form" onSubmit={handleSubmit}>
        <h2>Bloquear recurso</h2>

        <label>
          Recurso
          <select
            value={form.resource_id}
            onChange={(e) => setForm({ ...form, resource_id: e.target.value })}
            required
          >
            <option value="">Selecione um recurso</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>

        <label>
          Data
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </label>

        <div className="form-row">
          <label>
            Horário inicial
            <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
          </label>
          <label>
            Horário final
            <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
          </label>
        </div>

        <label>
          Motivo
          <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required placeholder="Ex: manutenção preventiva do projetor" />
        </label>

        <button type="submit" className="btn btn-primary">Bloquear recurso</button>
      </form>

      <h2>Bloqueios cadastrados</h2>
      {blocks.length === 0 ? (
        <p className="empty-state">Nenhum bloqueio de manutenção cadastrado.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Recurso</th>
              <th>Data</th>
              <th>Horário</th>
              <th>Motivo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((b) => (
              <tr key={b.id}>
                <td>{b.resource_name}</td>
                <td>{b.date}</td>
                <td>{b.start_time} - {b.end_time}</td>
                <td>{b.reason}</td>
                <td>
                  <button className="btn btn-ghost btn-small" onClick={() => handleRemove(b.id)}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
