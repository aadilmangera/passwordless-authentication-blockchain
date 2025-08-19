import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { friendlyError } from "../utils/fmt";

const REGISTRY_ADDR = import.meta.env.VITE_REGISTRY_ADDR;
const abi = [
  "function executeRecovery(bytes32 userId, address newKey)",
  // Optional views — if your contract has them, they’ll make status easier.
  "function thresholdOf(bytes32 userId) view returns (uint8)",
  "event RecoveryProposed(bytes32 indexed userId, address indexed newKey, address indexed guardian)",
  "event RecoveryExecuted(bytes32 indexed userId, address indexed newKey)"
];

const toUserId = (u) => ethers.keccak256(ethers.toUtf8Bytes((u||"").trim()));
const isAddr = (a) => { try { return ethers.isAddress(a); } catch { return false; } };

export default function ExecuteRecovery({ wallet }) {
  const { signer, addr, connect, provider } = wallet;
  const [username, setUsername] = useState("");
  const [newKey, setNewKey] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [approvers, setApprovers] = useState([]); // unique guardian addresses
  const [threshold, setThreshold] = useState(null);

  const contractRW = useMemo(
    () => (signer ? new ethers.Contract(REGISTRY_ADDR, abi, signer) : null),
    [signer]
  );
  const contractRO = useMemo(
    () => new ethers.Contract(REGISTRY_ADDR, abi, provider),
    [provider]
  );
  const iface = useMemo(() => new ethers.Interface(abi), []);

  async function checkStatus() {
    try {
      setMsg("");
      setApprovers([]);
      setThreshold(null);

      if (!username.trim()) throw new Error("Enter the username.");
      if (!isAddr(newKey)) throw new Error("Enter a valid new key address.");

      const userId = toUserId(username);
      // Try fetching threshold via view (if available)
      try {
        const th = await contractRO.thresholdOf(userId);
        if (th != null) setThreshold(Number(th));
      } catch {
        // ignore; not all contracts expose it
      }

      // Count unique guardians who proposed for this (userId,newKey)
      const latest = await provider.getBlockNumber();
      const from = Math.max(0, latest - 50000); // scan recent blocks; adjust if needed
      const logs = await provider.getLogs({
        address: REGISTRY_ADDR,
        fromBlock: from,
        toBlock: latest,
        topics: [iface.getEvent("RecoveryProposed").topicHash]
      });

      const set = new Set();
      logs.forEach(l => {
        try {
          const p = iface.parseLog(l);
          if (p.name === "RecoveryProposed") {
            const evUserId = (p.args?.userId || "").toLowerCase();
            const evNewKey = (p.args?.newKey || "").toLowerCase();
            const guardian = String(p.args?.guardian || "").toLowerCase();
            if (evUserId === userId.toLowerCase() && evNewKey === newKey.toLowerCase()) {
              set.add(guardian);
            }
          }
        } catch {}
      });

      setApprovers(Array.from(set.values()));
      if (threshold == null && set.size > 0) {
        // If we couldn’t get threshold via view, show "≥2 recommended" hint in UI.
      }
      setMsg("Status refreshed ✅");
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    }
  }

  async function execute() {
    try {
      setBusy(true); setMsg("");
      if (!signer) throw new Error("Connect your wallet first.");
      if (!username.trim()) throw new Error("Enter username.");
      if (!isAddr(newKey)) throw new Error("Enter valid new key address.");
      const userId = toUserId(username);

      // (Optional safety) If we know threshold, ensure we appear to have enough approvals
      if (threshold != null && approvers.length < threshold) {
        throw new Error(`Not enough approvals: ${approvers.length}/${threshold}`);
      }

      const tx = await contractRW.executeRecovery(userId, newKey);
      await tx.wait();
      setMsg("✅ Recovery executed. New key can log in now.");
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    } finally {
      setBusy(false);
    }
  }

  // Poll status every 10s while a username/newKey is set
  useEffect(() => {
    if (!username || !newKey) return;
    let t = setInterval(checkStatus, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, newKey, provider]);

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <h1 className="mb-1 text-2xl font-semibold">Execute Recovery</h1>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Once enough guardians have approved, execute the recovery to rotate the account to the new key.
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
          {addr ? `Connected ${addr.slice(0,6)}…${addr.slice(-4)}` : "Not connected"}
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

      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">New key address</label>
      <input
        className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
                   placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400
                   dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:placeholder-gray-400"
        placeholder="0x..."
        value={newKey}
        onChange={e => setNewKey(e.target.value.trim())}
      />

      <div className="flex items-center gap-2">
        <button
          onClick={checkStatus}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm
                     bg-white text-gray-900 hover:bg-gray-100
                     dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700
                     focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Check status
        </button>

        <button
          onClick={execute}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500
                     disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {busy ? "Executing…" : "Execute recovery"}
        </button>
      </div>

      {/* Status card */}
      <div className="mt-3 rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm font-medium mb-2">Approvals</div>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {threshold != null ? (
            <div className="mb-2">Threshold: <b>{threshold}</b></div>
          ) : (
            <div className="mb-2">Threshold: <span className="opacity-70">unknown (view not provided)</span></div>
          )}
          <div>Unique guardian approvals for this recovery: <b>{approvers.length}</b></div>
          {approvers.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs">
              {approvers.map((g) => (
                <li key={g} className="break-all">{g}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {msg && (
        <div className="mt-3 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800
                        dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
          {msg}
        </div>
      )}

      <div className="text-sm text-gray-600 dark:text-gray-300">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Ask your guardians to open <b>Guardian Approve</b> and approve with your username + new key.</li>
          <li>When enough approvals are present, return here and click <b>Execute recovery</b>.</li>
        </ol>
      </div>
    </div>
  );
}
