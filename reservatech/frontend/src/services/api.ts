import axios from "axios";

// Todas as chamadas ao backend passam por aqui. Usamos caminho relativo
// "/api" porque o vite.config.ts tem um proxy que encaminha isso para
// http://localhost:3001 durante o desenvolvimento (evita problemas de CORS).
export const api = axios.create({
  baseURL: "/api",
});

// Antes de cada requisição, se existir um token salvo (usuário logado),
// ele é anexado automaticamente no header Authorization.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("reservatech_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Se o backend responder 401 (token inválido/expirado), derruba a sessão
// local e manda o usuário de volta para o login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("reservatech_token");
      localStorage.removeItem("reservatech_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Extrai uma mensagem de erro amigável de uma resposta de erro do axios.
 * O backend sempre responde erros no formato { error: "mensagem" }.
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data?.error) {
    return error.response.data.error;
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}
