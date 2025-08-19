import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { friendlyError } from "../utils/fmt";

const REGISTRY_ADDR = import.meta.env.VITE_REGISTRY_ADDR;
const abi = [
  "function proposeRecovery(bytes32 userId, address newKey)",
  "event RecoveryProposed(bytes32 indexed userId, address indexed newKey, address indexed guardian)"
];

const toUserId = (u) => ethers.keccak256(ethers.toUtf8Bytes((u||"").trim()));
const isAddr = (a) => { try { return ethers.isAddress(a); } catch { return false; } };

export default function GuardianApprove({ wallet }) {
  const { signer, addr, connect } = wallet;

  const [username, setUsername] = useState("");
  const [newKey, setNewKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const contract = useMemo(
    () => (signer ? new ethers.Contract(REGISTRY_ADDR, abi, signer) : null),
    [signer]
  );

  async function approve() {
    try {
      setBusy(true); setMsg("");
      if (!signer) throw new Error("Connect your wallet first.");
      if (!username.trim()) throw new Error("Enter the user's username.");
      if (!isAddr(newKey)) throw new Error("Enter a valid new key address.");
      const userId = toUserId(username);
      const tx = await contract.proposeRecovery(userId, newKey);
      await tx.wait();
      setMsg("✅ Approval submitted. Your signature counts toward the threshold.");
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <h1 className="mb-1 text-2xl font-semibold">Guardian Approve</h1>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Guardians approve account recovery by proposing the target <b>new key</b>.
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
          {addr ? `Guardian ${addr.slice(0,6)}…${addr.slice(-4)}` : "Not connected"}
        </span>
      </div>

      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Username of account to recover</label>
      <input
        className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
                   placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400
                   dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:placeholder-gray-400"
        placeholder="e.g. aadil@lakehead"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />

      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">New key address</label>
      <input
        className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
                   placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400
                   dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:placeholder-gray-400"
        placeholder="0x..."
        value={newKey}
        onChange={e => setNewKey(e.target.value.trim())}
      />

      <button
        onClick={approve}
        disabled={busy}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500
                   disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {busy ? "Submitting…" : "Approve (sign)"}
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
