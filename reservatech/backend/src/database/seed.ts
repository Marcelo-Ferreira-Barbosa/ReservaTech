import bcrypt from "bcryptjs";
import db from "./db";

// Este script popula o banco com dados iniciais para facilitar os testes
// da equipe. Ele só insere um usuário/recurso se ainda não existir,
// então pode ser rodado mais de uma vez sem duplicar dados.
// Rodar com: npm run seed (dentro da pasta backend)

function seed() {
  const adminEmail = "admin@reservatech.local";
  const userEmail = "usuario@reservatech.local";

  const existingAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail);
  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync("123456", 10);
    db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
    ).run("Administrador", adminEmail, passwordHash, "admin");
    console.log("Usuário admin criado: admin@reservatech.local / 123456");
  } else {
    console.log("Usuário admin já existia, nada foi alterado.");
  }

  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(userEmail);
  if (!existingUser) {
    const passwordHash = bcrypt.hashSync("123456", 10);
    db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
    ).run("Usuário Teste", userEmail, passwordHash, "user");
    console.log("Usuário comum criado: usuario@reservatech.local / 123456");
  } else {
    console.log("Usuário comum já existia, nada foi alterado.");
  }

  const resourceCount = (db.prepare("SELECT COUNT(*) as count FROM resources").get() as { count: number }).count;
  if (resourceCount === 0) {
    const insertResource = db.prepare(
      "INSERT INTO resources (name, type, location, description, status) VALUES (?, ?, ?, ?, ?)"
    );
    insertResource.run("Sala 101", "sala", "Bloco A - 1º andar", "Sala de aula com capacidade para 40 alunos", "ativo");
    insertResource.run("Laboratório 01", "laboratorio", "Bloco B - Térreo", "Laboratório de informática com 20 computadores", "ativo");
    insertResource.run("Projetor 01", "projetor", "Almoxarifado", "Projetor portátil Epson", "ativo");
    insertResource.run("Notebook Dell 01", "notebook", "Almoxarifado", "Notebook para empréstimo em sala", "ativo");
    console.log("Recursos de exemplo criados.");
  } else {
    console.log("Já existem recursos cadastrados, nada foi alterado.");
  }

  console.log("\nSeed concluído.");
  console.log("ATENÇÃO: essas credenciais são apenas para ambiente local acadêmico.");
}

seed();
