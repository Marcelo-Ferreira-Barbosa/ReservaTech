import cors from "cors";
import express from "express";
import authRoutes from "./routes/authRoutes";
import maintenanceRoutes from "./routes/maintenanceRoutes";
import reservationRoutes from "./routes/reservationRoutes";
import resourceRoutes from "./routes/resourceRoutes";

const app = express();

app.use(cors());
app.use(express.json());

// Rota simples para verificar se o backend está no ar.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "ReservaTech backend está funcionando." });
});

app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/maintenance", maintenanceRoutes);

// Handler simples de erros não tratados, para não derrubar o servidor
// e sempre responder algo em JSON.
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno no servidor." });
});

export default app;
