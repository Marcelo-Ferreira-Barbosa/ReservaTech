import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthTokenPayload } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "reservatech-segredo-de-desenvolvimento-troque-em-producao";

// Estendemos o tipo Request do Express para poder guardar o usuário
// autenticado depois de validar o token. Isso é só para o TypeScript
// entender "req.user" nas próximas etapas do middleware/controller.
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/**
 * Middleware que exige um token JWT válido no header:
 *   Authorization: Bearer <token>
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação não informado." });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

/**
 * Middleware que exige que o usuário autenticado seja admin.
 * Deve ser usado sempre DEPOIS do requireAuth na cadeia de middlewares.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Apenas administradores podem realizar esta ação." });
  }
  next();
}

export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
