import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types";

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

/**
 * Envolve páginas que exigem login. Se "requiredRole" for informado,
 * também exige que o usuário tenha exatamente aquele perfil
 * (usado para proteger as páginas administrativas).
 */
export function PrivateRoute({ children, requiredRole }: PrivateRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
