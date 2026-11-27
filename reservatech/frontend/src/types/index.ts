export type UserRole = "user" | "admin";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export type ResourceType = "sala" | "laboratorio" | "projetor" | "notebook" | "outro";
export type ResourceStatus = "ativo" | "inativo" | "manutencao";

export interface Resource {
  id: number;
  name: string;
  type: ResourceType;
  location: string;
  description: string | null;
  status: ResourceStatus;
  created_at: string;
}

export type ReservationStatus = "pendente" | "aprovada" | "recusada" | "cancelada" | "espera";

export interface ReservationLog {
  id: number;
  performed_by_name: string;
  action: "aprovada" | "recusada" | "cancelada";
  reason: string | null;
  created_at: string;
}

export interface Reservation {
  id: number;
  user_id: number;
  resource_id: number;
  resource_name?: string;
  user_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  reason: string | null;
  history?: ReservationLog[]; // só vem na listagem do admin
  created_at: string;
}

export interface MaintenanceBlock {
  id: number;
  resource_id: number;
  resource_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_at: string;
}

export interface EquipmentLoan {
  reservation_id: number;
  resource_name: string;
  resource_type: ResourceType;
  user_name: string;
  date: string;
  start_time: string;
  end_time: string;
  checked_out_at: string | null;
  returned_at: string | null;
}
