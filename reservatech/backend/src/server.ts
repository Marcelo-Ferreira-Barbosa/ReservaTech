import app from "./app";
import "./database/db"; // garante que o banco e as tabelas sejam criados ao subir o servidor

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`ReservaTech backend rodando em http://localhost:${PORT}`);
  console.log(`Teste rápido: http://localhost:${PORT}/api/health`);
});
