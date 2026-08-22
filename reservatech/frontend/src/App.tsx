import { Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { PrivateRoute } from "./components/PrivateRoute";
import { useAuth } from "./context/AuthContext";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Maintenance } from "./pages/admin/Maintenance";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { ManageResources } from "./pages/admin/ManageResources";
import { ReservationRequests } from "./pages/admin/ReservationRequests";
import { MyReservations } from "./pages/MyReservations";
import { NewReservation } from "./pages/NewReservation";
import { Register } from "./pages/Register";
import { Resources } from "./pages/Resources";

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <main className="app-content">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/cadastro" element={user ? <Navigate to="/" replace /> : <Register />} />

          {/* Rota raiz: manda cada perfil para o seu próprio dashboard */}
          <Route
            path="/"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : user.role === "admin" ? (
                <Navigate to="/admin" replace />
              ) : (
                <Dashboard />
              )
            }
          />

          {/* Rotas do usuário comum */}
          <Route path="/recursos" element={<PrivateRoute requiredRole="user"><Resources /></PrivateRoute>} />
          <Route path="/nova-reserva" element={<PrivateRoute requiredRole="user"><NewReservation /></PrivateRoute>} />
          <Route path="/minhas-reservas" element={<PrivateRoute requiredRole="user"><MyReservations /></PrivateRoute>} />

          {/* Rotas do administrador */}
          <Route path="/admin" element={<PrivateRoute requiredRole="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/recursos" element={<PrivateRoute requiredRole="admin"><ManageResources /></PrivateRoute>} />
          <Route path="/admin/solicitacoes" element={<PrivateRoute requiredRole="admin"><ReservationRequests /></PrivateRoute>} />
          <Route path="/admin/manutencao" element={<PrivateRoute requiredRole="admin"><Maintenance /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
