import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { apiPost } from "../utils/api";
import { friendlyError } from "../utils/fmt";
import Modal from "../components/Modal";

const REGISTRY_ADDR = import.meta.env.VITE_REGISTRY_ADDR;
const registryAbi = [
  "function register(bytes32 userId, address initialKey, address[] guardians, uint8 threshold)",
  "function isKey(bytes32 userId, address key) view returns (bool)"
];
const toUserId = (u) => ethers.keccak256(ethers.toUtf8Bytes((u||"").trim()));
const isAddr = (a) => { try { return ethers.isAddress(a); } catch { return false; } };

export default function Auth({ wallet, auth }) {
  const { signer, addr, connect } = wallet;
  const { loginSave } = auth;

  const [tab, setTab] = useState("login"); // 'login' | 'register'

  // shared
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // register-only
  const [guardiansRaw, setGuardiansRaw] = useState("");
  const [threshold, setThreshold] = useState("0");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const contract = useMemo(
    () => (signer ? new ethers.Contract(REGISTRY_ADDR, registryAbi, signer) : null),
    [signer]
  );

  const parseGuardians = () => {
    const parts = guardiansRaw
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(Boolean);
    const uniq = Array.from(new Set(parts.map(p => p.toLowerCase()))).map(p =>
      parts.find(x => x.toLowerCase() === p)
    );
    return uniq;
  };

  async function doLogin() {
    try {
      setBusy(true); setMsg("");
      if (!signer) throw new Error("Connect your wallet first.");
      if (!username.trim()) throw new Error("Enter a username (e.g., aadil@lakehead).");

      const ch = await apiPost("/auth/challenge", { username });
      if (!ch?.nonce) throw new Error("No nonce from server.");
      const sig = await signer.signMessage(ethers.getBytes(ch.nonce));
      const v = await apiPost("/auth/verify", { userId: ch.userId, signature: sig });
      if (!v?.token) throw new Error(v?.error || "Login failed.");
      loginSave(v.token);
      setMsg("Logged in ✅");
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    } finally { setBusy(false); }
  }

  async function doRegister() {
    try {
      setBusy(true); setMsg("");
      if (!signer) throw new Error("Connect your wallet first.");
      if (!username.trim()) throw new Error("Enter a username.");
      const userId = toUserId(username);

      const g = parseGuardians();
      if (g.some(a => !isAddr(a))) throw new Error("One or more guardian addresses are invalid.");
      const th = Number(threshold || 0);
      if (g.length > 0) {
        if (!Number.isInteger(th) || th < 1 || th > g.length) {
          throw new Error(`Threshold must be between 1 and ${g.length}.`);
        }
      } else {
        if (th !== 0) throw new Error("If no guardians, threshold must be 0.");
      }

      const already = await contract.isKey(userId, addr);
      if (already) throw new Error("User already exists for this username.");

      const tx = await contract.register(userId, addr, g, th);
      await tx.wait();
      setMsg(`Registered ✅ ${g.length ? `(Guardians: ${g.length}, threshold: ${th})` : ""}`);
      setConfirmOpen(true);
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    } finally { setBusy(false); }
  }

  const tabBtn = (name, label) => (
    <button
      onClick={() => setTab(name)}
      className={`rounded-lg px-3 py-1.5 text-sm transition
        ${tab === name
          ? "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Authentication</h1>
        <div className="flex items-center gap-2">
          {tabBtn("login", "Login")}
          {tabBtn("register", "Register")}
          <button
            onClick={connect}
            className="ml-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm
                       bg-white text-gray-900 hover:bg-gray-100
                       dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {addr ? "Reconnect" : "Connect MetaMask"}
          </button>
        </div>
      </div>

      {/* Shared username */}
      <div>
        <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Username</label>
        <input
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
                     placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400
                     dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:placeholder-gray-400"
          placeholder="e.g. aadil@lakehead"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
      </div>

      {tab === "login" ? (
        <div className="flex items-center gap-2">
          <button
            onClick={doLogin}
            disabled={busy || !addr}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500
                       disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {busy ? "Logging in…" : "Login"}
          </button>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {addr ? `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}` : "Not connected"}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm font-medium mb-2">Social recovery (optional)</div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
              Guardian addresses (comma or space separated)
            </label>
            <textarea
              className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
                         placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400
                         dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:placeholder-gray-400"
              rows={3}
              placeholder="0xabc… 0xdef… 0x123…"
              value={guardiansRaw}
              onChange={e => setGuardiansRaw(e.target.value)}
            />
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Threshold</label>
            <input
              type="number"
              min="0"
              className="w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
                         focus:outline-none focus:ring-2 focus:ring-blue-400
                         dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
            />
          </div>

          <button
            onClick={doRegister}
            disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500
                       disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {busy ? "Registering…" : "Register"}
          </button>
        </div>
      )}

      {msg && (
        <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800
                        dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
          {msg}
        </div>
      )}

      <Modal open={confirmOpen} title="Registration complete" onClose={() => setConfirmOpen(false)}>
        <div className="text-sm">
          You can now log in. If you added guardians, recovery is enabled for your account.
        </div>
      </Modal>
    </div>
  );
}
