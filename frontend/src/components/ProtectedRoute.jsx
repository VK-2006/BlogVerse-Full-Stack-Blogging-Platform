import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-loader">Checking your account...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles?.length && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
