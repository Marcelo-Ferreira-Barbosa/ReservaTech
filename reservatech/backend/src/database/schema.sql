-- =============================================================
-- ReservaTech - Estrutura do banco (SQLite)
-- =============================================================
-- Regra de comparação de horários usada em todo o sistema:
-- consideramos o horário FINAL como limite NÃO inclusivo.
-- Ou seja, uma reserva das 14:00-16:00 NÃO conflita com uma
-- reserva das 16:00-17:00 (16:00 é o "fim" de uma e o "início"
-- da outra, sem sobreposição real).
-- Fórmula de conflito entre [inicioA, fimA) e [inicioB, fimB):
--   inicioA < fimB  E  inicioB < fimA
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sala', 'laboratorio', 'projetor', 'notebook', 'outro')),
  location TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('ativo', 'inativo', 'manutencao')) DEFAULT 'ativo',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  resource_id INTEGER NOT NULL REFERENCES resources(id),
  date TEXT NOT NULL,        -- formato YYYY-MM-DD
  start_time TEXT NOT NULL,  -- formato HH:MM
  end_time TEXT NOT NULL,    -- formato HH:MM
  status TEXT NOT NULL CHECK (status IN ('pendente', 'aprovada', 'recusada', 'cancelada')) DEFAULT 'pendente',
  reason TEXT,               -- motivo de recusa ou cancelamento
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maintenance_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id INTEGER NOT NULL REFERENCES resources(id),
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reservations_resource_date ON reservations(resource_id, date);
CREATE INDEX IF NOT EXISTS idx_maintenance_resource_date ON maintenance_blocks(resource_id, date);
