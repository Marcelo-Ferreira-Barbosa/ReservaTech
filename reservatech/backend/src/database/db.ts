import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

// Usamos o módulo SQLite nativo do Node.js (node:sqlite) em vez do pacote
// "better-sqlite3". Motivo: better-sqlite3 é um addon nativo que precisa
// compilar código C++ na instalação (via node-gyp), o que exige Visual
// Studio Build Tools no Windows e costuma falhar em máquinas sem esse
// ambiente configurado. node:sqlite já vem embutido no Node (disponível
// sem flags a partir do Node 22.13/23.4), então não exige nenhuma
// compilação nem dependência extra — só funciona com "npm install".
// A API é praticamente idêntica (prepare().run()/.get()/.all(), exec()),
// então o resto do código do projeto não muda.

// O banco fica salvo como um único arquivo dentro de backend/database/.
// Isso facilita muito para fins acadêmicos: não precisa instalar nem
// configurar um servidor de banco de dados separado.
const DB_DIR = path.join(__dirname, "..", "..", "database");
const DB_PATH = path.join(DB_DIR, "reservatech.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

// Garante que chaves estrangeiras sejam respeitadas pelo SQLite
// (por padrão elas vêm desativadas). node:sqlite não tem um método
// .pragma() de conveniência como o better-sqlite3, então executamos o
// PRAGMA como um comando SQL normal via exec().
db.exec("PRAGMA foreign_keys = ON;");

// Executa o schema.sql sempre que o servidor sobe.
// Como todos os comandos usam "CREATE TABLE IF NOT EXISTS", é seguro
// rodar isso repetidamente sem apagar dados existentes.
const schemaPath = path.join(__dirname, "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf-8");
db.exec(schema);

export default db;
