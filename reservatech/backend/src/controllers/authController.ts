import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import db from "../database/db";
import { generateToken } from "../middlewares/auth";
import { User } from "../types";

export function register(req: Request, res: Response) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "Já existe um usuário com este e-mail." });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  // Todo cadastro público vira perfil "user". Não existe cadastro
  // público de admin — isso é proposital, por segurança e simplicidade.
  const result = db
    .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')")
    .run(name, email, passwordHash);

  const token = generateToken({ id: result.lastInsertRowid as number, role: "user" });

  return res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, name, email, role: "user" },
  });
}

export function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;

  if (!user) {
    return res.status(401).json({ error: "E-mail ou senha inválidos." });
  }

  const passwordMatches = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: "E-mail ou senha inválidos." });
  }

  const token = generateToken({ id: user.id, role: user.role });

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
