import { createContext, ReactNode, useContext, useState } from "react";
import { api } from "../services/api";
import { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Guarda o token e os dados básicos do usuário no localStorage para que
// a sessão sobreviva a um refresh da página. Isso é suficiente para um
// projeto acadêmico - TODO da equipe: trocar por algo mais robusto
// (ex: refresh token) se o projeto evoluir.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("reservatech_user");
    return stored ? JSON.parse(stored) : null;
  });

  function saveSession(token: string, authUser: AuthUser) {
    localStorage.setItem("reservatech_token", token);
    localStorage.setItem("reservatech_user", JSON.stringify(authUser));
    setUser(authUser);
  }

  async function login(email: string, password: string) {
    const response = await api.post("/auth/login", { email, password });
    saveSession(response.data.token, response.data.user);
  }

  async function register(name: string, email: string, password: string) {
    const response = await api.post("/auth/register", { name, email, password });
    saveSession(response.data.token, response.data.user);
  }

  function logout() {
    localStorage.removeItem("reservatech_token");
    localStorage.removeItem("reservatech_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de um <AuthProvider>.");
  }
  return context;
}
