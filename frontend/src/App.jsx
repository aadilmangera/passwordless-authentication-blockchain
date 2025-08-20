import { useMemo } from "react";
import { createBrowserRouter, RouterProvider, Navigate} from "react-router-dom";
import useWallet from "./hooks/useWallet";
import useAuth from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";

// NEW combined pages
import Auth from "./pages/Auth";
import Recovery from "./pages/Recovery";
import Dashboard from "./pages/Dashboard";
import AddDevice from "./pages/AddDevice";

export default function App() {
  const wallet = useWallet();
  const auth = useAuth();

  const router = useMemo(() => createBrowserRouter([
    {
      path: "/",
      element: <Navigate to={auth.jwt ? "/dashboard" : "/auth"} replace />
    },
    {
      path: "/auth",
      element: (
        <AppLayout wallet={wallet} auth={auth}>
          <Auth wallet={wallet} auth={auth} />
        </AppLayout>
      ),
    },
    {
      path: "/dashboard",
      element: (
        <AppLayout wallet={wallet} auth={auth}>
          <ProtectedRoute jwt={auth.jwt}>
            <Dashboard wallet={wallet} auth={auth} />
          </ProtectedRoute>
        </AppLayout>
      ),
    },
    {
      path: "/add-device",
      element: (
        <AppLayout wallet={wallet} auth={auth}>
          <ProtectedRoute jwt={auth.jwt}>
            <AddDevice wallet={wallet} auth={auth} />
          </ProtectedRoute>
        </AppLayout>
      ),
    },
    {
      path: "/recovery",
      element: (
        <AppLayout wallet={wallet} auth={auth}>
          <Recovery wallet={wallet} />
        </AppLayout>
      ),
    },
    {
      path: "*",
      element: <Navigate to={auth.jwt ? "/dashboard" : "/auth"} replace />
    },
  ]), [wallet, auth]);

  return <RouterProvider router={router} />;
}
