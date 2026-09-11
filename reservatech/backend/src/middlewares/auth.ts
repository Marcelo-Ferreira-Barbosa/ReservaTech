import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthTokenPayload } from "../types";

// Segredo usado para assinar/validar os JWTs.
//
// Em desenvolvimento aceitamos um valor padrão para o projeto rodar
// logo após o "npm install", sem precisar configurar nada. Em produção
// isso seria uma falha grave de segurança (o valor está versionado no
// .env.example, ou seja, é público), então preferimos derrubar o
// servidor na subida a rodar com um segredo que qualquer um conhece.
//
// O arquivo .env é carregado pela flag --env-file-if-exists nos scripts
// do package.json (recurso nativo do Node 22+), sem precisar do pacote
// "dotenv".
const DEV_FALLBACK_SECRET = "reservatech-segredo-de-desenvolvimento-troque-em-producao";

function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;

  if (fromEnv && fromEnv !== DEV_FALLBACK_SECRET) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET não configurado (ou ainda com o valor de exemplo). " +
        "Defina um segredo próprio no arquivo .env antes de rodar em produção."
    );
  }

  console.warn(
    "[ReservaTech] Atenção: usando o JWT_SECRET padrão de desenvolvimento. " +
      "Configure um valor próprio no .env antes de publicar."
  );
  return DEV_FALLBACK_SECRET;
}

const JWT_SECRET = resolveJwtSecret();

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
