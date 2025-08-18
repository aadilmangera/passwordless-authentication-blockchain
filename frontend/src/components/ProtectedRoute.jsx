import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ jwt, children }) {
  if (!jwt) return <Navigate to="/" replace />;
  return children;
}
