export type UserRole = "user" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
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

export type ReservationStatus = "pendente" | "aprovada" | "recusada" | "cancelada";

export interface Reservation {
  id: number;
  user_id: number;
  resource_id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  reason: string | null;
  created_at: string;
}

export interface MaintenanceBlock {
  id: number;
  resource_id: number;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_at: string;
}

// Payload que colocamos dentro do JWT
export interface AuthTokenPayload {
  id: number;
  role: UserRole;
}
