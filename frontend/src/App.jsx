import { useMemo } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import useWallet from "./hooks/useWallet";
import useAuth from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AppLayout from "./layouts/AppLayout";
import AddDevice from "./pages/AddDevice";

export default function App() {
  const wallet = useWallet();
  const auth = useAuth();

  const router = useMemo(() => createBrowserRouter([
    {
      path: "/login",
      element: (
        <AppLayout wallet={wallet} auth={auth}>
          <Login wallet={wallet} auth={auth} onSuccess={() => router.navigate("/dashboard")} />
        </AppLayout>
      )
    },
    {
  path: "/add-device",
  element: (
    <AppLayout wallet={wallet} auth={auth}>
      <ProtectedRoute jwt={auth.jwt}>
        <AddDevice wallet={wallet} auth={auth} />
      </ProtectedRoute>
    </AppLayout>
  )
    },
    {
      path: "/register",
      element: (
        <AppLayout wallet={wallet} auth={auth}>
          <Register wallet={wallet} />
        </AppLayout>
      )
    },
    {
      path: "/dashboard",
      element: (
        <AppLayout wallet={wallet} auth={auth}>
          <ProtectedRoute jwt={auth.jwt}>
            <Dashboard wallet={wallet} auth={auth} />
          </ProtectedRoute>
        </AppLayout>
      )
    },
    {
      path: "/",
      element: (
        <AppLayout wallet={wallet} auth={auth}>
          {/* redirect to /login */}
        </AppLayout>
      ),
      loader: () => { window.location.replace("/login"); return null; }
    }
  ]), [wallet, auth]);

  return <RouterProvider router={router} />;
}
