import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { friendlyError } from "../utils/fmt";

const REGISTRY_ADDR = import.meta.env.VITE_REGISTRY_ADDR;
const registryAbi = [
  "function register(bytes32 userId, address initialKey, address[] guardians, uint8 threshold)",
  "function isKey(bytes32 userId, address key) view returns (bool)"
];

function toUserId(username) {
  return ethers.keccak256(ethers.toUtf8Bytes(username.trim()));
}
const isAddr = (a) => { try { return ethers.isAddress(a); } catch { return false; } };

export default function Register({ wallet }) {
  const { signer, addr, connect } = wallet;
  const [username, setUsername] = useState("");
  const [guardiansRaw, setGuardiansRaw] = useState(""); // comma/space separated
  const [threshold, setThreshold] = useState("0");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

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

  const registerUser = async () => {
    try {
      setBusy(true);
      setMsg("");
      if (!signer) throw new Error("Connect your wallet first.");
      if (!username.trim()) throw new Error("Enter a username (e.g., aadil@lakehead).");
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
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <h1 className="mb-1 text-2xl font-semibold">Register</h1>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Register your username on-chain with optional <b>social recovery</b> (guardians + threshold).
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
          {addr ? `Using ${addr.slice(0,6)}…${addr.slice(-4)}` : "Not connected"}
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

      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm font-medium mb-2">Social recovery (optional)</div>

        <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
          Guardian addresses (comma or space separated)
        </label>
        <textarea
          className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
                     placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400
                     dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:placeholder-gray-400"
          placeholder="0xabc… 0xdef… 0x123…"
          rows={3}
          value={guardiansRaw}
          onChange={e => setGuardiansRaw(e.target.value)}
        />

        <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
          Threshold (approvals required)
        </label>
        <input
          type="number"
          min="0"
          className="mb-2 w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
                     focus:outline-none focus:ring-2 focus:ring-blue-400
                     dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
          value={threshold}
          onChange={e => setThreshold(e.target.value)}
        />

        <div className="text-xs text-gray-600 dark:text-gray-400">
          Example: for two guardians <code>G1, G2</code> and threshold <code>2</code>, both must approve a recovery.
        </div>
      </div>

      <button
        onClick={registerUser}
        disabled={busy}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500
                   disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {busy ? "Registering…" : "Register"}
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
