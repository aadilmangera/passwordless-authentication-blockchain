import { useMemo } from "react";
import { createBrowserRouter, RouterProvider, useNavigate } from "react-router-dom";
import useWallet from "./hooks/useWallet";
import useAuth from "./hooks/useAuth";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";

function Shell() {
  const wallet = useWallet();
  const auth = useAuth();
  const nav = useNavigate();

  const onLoggedIn = () => nav("/app");

  return (
    <>
      <Navbar addr={wallet.addr} jwt={auth.jwt} onLogout={auth.logout} />
      <div>
        {/* Router outlet is managed by RouterProvider below */}
      </div>
    </>
  );
}

function Routes() {
  const wallet = useWallet();
  const auth = useAuth();

  const router = useMemo(() => createBrowserRouter([
    {
      path: "/",
      element: (
        <>
          <Navbar addr={wallet.addr} jwt={auth.jwt} onLogout={auth.logout} />
          <AuthPage wallet={wallet} auth={auth} onLoggedIn={() => router.navigate("/app")} />
        </>
      )
    },
    {
      path: "/app",
      element: (
        <>
          <Navbar addr={wallet.addr} jwt={auth.jwt} onLogout={auth.logout} />
          <ProtectedRoute jwt={auth.jwt}>
            <DashboardPage wallet={wallet} auth={auth} />
          </ProtectedRoute>
        </>
      )
    }
  ]), [wallet, auth]);

  return <RouterProvider router={router} />;
}

export default Routes;
