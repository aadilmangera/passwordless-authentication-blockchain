import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ jwt, children }) {
  const loc = useLocation();
  if (!jwt) {
    // preserve where the user was trying to go
    return <Navigate to="/" replace state={{ from: loc }} />;
  }
  return children;
}
