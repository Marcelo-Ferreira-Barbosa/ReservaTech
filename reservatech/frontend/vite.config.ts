import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// O proxy abaixo faz o frontend (porta 5173) encaminhar chamadas
// "/api/..." para o backend (porta 3001), evitando problemas de CORS
// durante o desenvolvimento local.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
