import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="navbar">
      <div className="navbar-brand">ReservaTech</div>

      <nav className="navbar-links">
        {user.role === "user" && (
          <>
            <NavLink to="/" end>Dashboard</NavLink>
            <NavLink to="/recursos">Recursos</NavLink>
            <NavLink to="/minhas-reservas">Minhas reservas</NavLink>
          </>
        )}

        {user.role === "admin" && (
          <>
            <NavLink to="/admin" end>Dashboard</NavLink>
            <NavLink to="/admin/recursos">Recursos</NavLink>
            <NavLink to="/admin/solicitacoes">Solicitações</NavLink>
            <NavLink to="/admin/manutencao">Manutenção</NavLink>
          </>
        )}
      </nav>

      <div className="navbar-user">
        <span>{user.name} <small>({user.role === "admin" ? "admin" : "usuário"})</small></span>
        <button onClick={handleLogout} className="btn btn-ghost">Sair</button>
      </div>
    </header>
  );
}
