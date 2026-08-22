import { FormEvent, useEffect, useState } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import { api, getErrorMessage } from "../../services/api";
import { Resource, ResourceType } from "../../types";

const EMPTY_FORM = { name: "", type: "sala" as ResourceType, location: "", description: "" };

export function ManageResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function loadResources() {
    const res = await api.get("/resources");
    setResources(res.data);
    setLoading(false);
  }

  useEffect(() => {
    loadResources();
  }, []);

  function startEditing(resource: Resource) {
    setEditingId(resource.id);
    setForm({
      name: resource.name,
      type: resource.type,
      location: resource.location,
      description: resource.description ?? "",
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (editingId) {
        await api.put(`/resources/${editingId}`, form);
      } else {
        await api.post("/resources", form);
      }
      cancelEditing();
      loadResources();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function toggleStatus(resource: Resource) {
    // Alterna apenas entre ativo/inativo. Recursos em manutenção são
    // controlados pela página de Manutenção, não por aqui.
    const newStatus = resource.status === "ativo" ? "inativo" : "ativo";
    setError("");
    try {
      await api.patch(`/resources/${resource.id}/status`, { status: newStatus });
      loadResources();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="page">
      <h1>Gerenciar recursos</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="card-form" onSubmit={handleSubmit}>
        <h2>{editingId ? "Editar recurso" : "Cadastrar novo recurso"}</h2>

        <label>
          Nome
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>

        <div className="form-row">
          <label>
            Tipo
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ResourceType })}>
              <option value="sala">Sala</option>
              <option value="laboratorio">Laboratório</option>
              <option value="projetor">Projetor</option>
              <option value="notebook">Notebook</option>
              <option value="outro">Outro</option>
            </select>
          </label>

          <label>
            Localização
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
          </label>
        </div>

        <label>
          Descrição
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {editingId ? "Salvar alterações" : "Cadastrar recurso"}
          </button>
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={cancelEditing}>
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Localização</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => (
            <tr key={resource.id}>
              <td>{resource.name}</td>
              <td>{resource.type}</td>
              <td>{resource.location}</td>
              <td><StatusBadge status={resource.status} /></td>
              <td className="table-actions">
                <button className="btn btn-ghost btn-small" onClick={() => startEditing(resource)}>Editar</button>
                {resource.status !== "manutencao" && (
                  <button className="btn btn-ghost btn-small" onClick={() => toggleStatus(resource)}>
                    {resource.status === "ativo" ? "Desativar" : "Ativar"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
