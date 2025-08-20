import { Link, useLocation, useNavigate } from "react-router-dom";
import { short } from "../utils/fmt";
import ThemeToggle from "./ThemeToggle";
import { LogOut, ShieldCheck } from "lucide-react";

export default function Navbar({ addr, jwt, onLogout }) {
  const loc = useLocation();
  const nav = useNavigate();

  const linkCls = (path) =>
    `px-3 py-1.5 rounded-md text-sm transition
     ${loc.pathname === path
       ? "font-semibold bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
       : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"}`;

  return (
    <header className="sticky top-0 z-10 border-b bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          <ShieldCheck size={18} />
          Passwordless Auth
        </Link>

        <nav className="flex items-center gap-1">
          {jwt ? null : <Link className={linkCls("/auth")} to="/auth">Auth</Link>}
          {jwt ? <Link className={linkCls("/dashboard")} to="/dashboard">Dashboard</Link> : null}
          {jwt ? <Link className={linkCls("/add-device")} to="/add-device">Add Device</Link> : null}
          <Link className={linkCls("/recovery")} to="/recovery">Recovery</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300">
            {addr ? short(addr) : "Not connected"}
          </span>
          {jwt ? (
            <button
              onClick={() => { onLogout(); nav("/login"); }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm
                         bg-white text-gray-900 hover:bg-gray-100
                         dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Logout"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
