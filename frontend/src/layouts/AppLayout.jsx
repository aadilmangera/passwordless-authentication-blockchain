import Navbar from "../components/Navbar";

export default function AppLayout({ wallet, auth, children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100">
      <Navbar addr={wallet.addr} jwt={auth.jwt} onLogout={auth.logout} />
      <main className="mx-auto max-w-4xl space-y-6 p-2 sm:p-4">
        {children}
      </main>
    </div>
  );
}
