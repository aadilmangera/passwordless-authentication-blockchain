import { useState } from "react";
import { ethers } from "ethers";
import { apiPost } from "../utils/api";
import { friendlyError } from "../utils/fmt";

export default function Login({ wallet, auth, onSuccess }) {
  const { signer, addr, connect } = wallet;
  const { loginSave } = auth;
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async () => {
    try {
      setBusy(true);
      if (!signer) throw new Error("Connect your wallet first.");
      if (!username.trim()) throw new Error("Enter a username (e.g., aadil@lakehead).");

      const c = await apiPost("/auth/challenge", { username });
      if (!c?.nonce) throw new Error("No nonce from server.");

      const sig = await signer.signMessage(ethers.getBytes(c.nonce));
      const v = await apiPost("/auth/verify", { userId: c.userId, signature: sig });
      if (!v?.token) throw new Error(v?.error || "Login failed.");

      loginSave(v.token);
      setMsg("Logged in ✅");
      onSuccess?.();
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <h1 className="mb-1 text-2xl font-semibold">Login</h1>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Sign a challenge with MetaMask to start a session.
      </p>

      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={connect}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm
                     bg-white text-gray-900 hover:bg-gray-100
                     dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700
                     focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {addr ? "Reconnect" : "Connect MetaMask"}
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {addr ? `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}` : "Not connected"}
        </span>
      </div>

      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Username</label>
      <input
        className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
                   placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400
                   dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:placeholder-gray-400"
        placeholder="e.g. aadil@lakehead"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />

      <button
        onClick={login}
        disabled={busy || !addr}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500
                   disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {busy ? "Logging in…" : "Login"}
      </button>

      {msg && (
        <div className="mt-3 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800
                        dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
          {msg}
        </div>
      )}
    </div>
  );
}
