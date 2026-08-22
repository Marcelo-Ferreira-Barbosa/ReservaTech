interface StatusBadgeProps {
  status: string;
}

// Mapa simples de status -> cor. Centralizado aqui para não repetir
// essa lógica em cada página que precisa mostrar um status.
const STATUS_STYLES: Record<string, string> = {
  ativo: "badge badge-green",
  aprovada: "badge badge-green",
  pendente: "badge badge-yellow",
  manutencao: "badge badge-orange",
  inativo: "badge badge-gray",
  recusada: "badge badge-red",
  cancelada: "badge badge-gray",
};

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  aprovada: "Aprovada",
  pendente: "Pendente",
  manutencao: "Em manutenção",
  inativo: "Inativo",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const className = STATUS_STYLES[status] ?? "badge badge-gray";
  const label = STATUS_LABELS[status] ?? status;
  return <span className={className}>{label}</span>;
}
