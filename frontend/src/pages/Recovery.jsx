import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import Modal from "../components/Modal";
import { friendlyError } from "../utils/fmt";

const REGISTRY_ADDR = import.meta.env.VITE_REGISTRY_ADDR;
const abi = [
  // setup is via register(), but we expose approve/execute here
  "function proposeRecovery(bytes32 userId, address newKey)",
  "function executeRecovery(bytes32 userId, address newKey)",
  "function thresholdOf(bytes32 userId) view returns (uint8)",
  "event RecoveryProposed(bytes32 indexed userId, address indexed newKey, address indexed guardian)",
  "event RecoveryExecuted(bytes32 indexed userId, address indexed newKey)"
];
const toUserId = (u) => ethers.keccak256(ethers.toUtf8Bytes((u||"").trim()));
const isAddr = (a) => { try { return ethers.isAddress(a); } catch { return false; } };

export default function Recovery({ wallet }) {
  const { signer, addr, connect, provider } = wallet;
  const [tab, setTab] = useState("approve"); // 'approve' | 'execute' | 'about'

  // shared inputs
  const [username, setUsername] = useState("");
  const [newKey, setNewKey] = useState("");

  // status
  const [approvers, setApprovers] = useState([]);
  const [threshold, setThreshold] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // modals
  const [okOpen, setOkOpen] = useState(false);

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
      if (!username.trim()) throw new Error("Enter username.");
      if (!isAddr(newKey)) throw new Error("Enter valid new key address.");

      const userId = toUserId(username);
      // threshold (if available)
      try {
        const th = await contractRO.thresholdOf(userId);
        if (th != null) setThreshold(Number(th));
      } catch {}

      // approvals
      const latest = await provider.getBlockNumber();
      const from = Math.max(0, latest - 50000);
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
            const evUserId = String(p.args.userId).toLowerCase();
            const evNewKey = String(p.args.newKey).toLowerCase();
            const guardian = String(p.args.guardian).toLowerCase();
            if (evUserId === userId.toLowerCase() && evNewKey === newKey.toLowerCase()) {
              set.add(guardian);
            }
          }
        } catch {}
      });
      setApprovers(Array.from(set.values()));
      setMsg("Status refreshed ✅");
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    }
  }

  async function approve() {
    try {
      setBusy(true); setMsg("");
      if (!signer) throw new Error("Connect your wallet first.");
      if (!username.trim()) throw new Error("Enter the user's username.");
      if (!isAddr(newKey)) throw new Error("Enter a valid new key address.");
      const userId = toUserId(username);
      const tx = await contractRW.proposeRecovery(userId, newKey);
      await tx.wait();
      setOkOpen(true);
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    } finally { setBusy(false); }
  }

  async function execute() {
    try {
      setBusy(true); setMsg("");
      if (!signer) throw new Error("Connect your wallet first.");
      if (!username.trim()) throw new Error("Enter username.");
      if (!isAddr(newKey)) throw new Error("Enter valid new key address.");
      const userId = toUserId(username);
      if (threshold != null && approvers.length < threshold) {
        throw new Error(`Not enough approvals: ${approvers.length}/${threshold}`);
      }
      const tx = await contractRW.executeRecovery(userId, newKey);
      await tx.wait();
      setOkOpen(true);
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    } finally { setBusy(false); }
  }

  useEffect(() => {
    if (!username || !newKey) return;
    const t = setInterval(checkStatus, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, newKey, provider]);

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
        <h1 className="text-2xl font-semibold">Recovery</h1>
        <div className="flex items-center gap-2">
          {tabBtn("approve", "Guardian Approve")}
          {tabBtn("execute", "Execute")}
          {tabBtn("about", "About")}
          <button
            onClick={connect}
            className="ml-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm
                       bg-white text-gray-900 hover:bg-gray-100
                       dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {addr ? "Reconnect" : "Connect"}
          </button>
        </div>
      </div>

      {/* Shared inputs for approve/execute */}
      {tab !== "about" && (
        <>
          <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Username</label>
          <input
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
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
        </>
      )}

      {tab === "approve" && (
        <div className="flex items-center gap-2">
          <button
            onClick={approve}
            disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500
                       disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {busy ? "Submitting…" : "Approve (guardian sign)"}
          </button>
        </div>
      )}

      {tab === "execute" && (
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
      )}

      {tab === "execute" && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm font-medium mb-2">Approvals</div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {threshold != null ? (
              <div className="mb-2">Threshold: <b>{threshold}</b></div>
            ) : (
              <div className="mb-2">Threshold: <span className="opacity-70">unknown (no view)</span></div>
            )}
            <div>Unique approvals: <b>{approvers.length}</b></div>
            {approvers.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs">
                {approvers.map((g) => <li key={g} className="break-all">{g}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "about" && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-sm">
          <p className="mb-2">
            Social recovery lets a set of guardians help rotate your account to a new key if you
            lose the old one. Guardians approve a recovery proposal; once approvals ≥ threshold, anyone can execute.
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Register with guardians and a threshold (on the Auth → Register tab).</li>
            <li>Guardians use “Approve” to propose your new key.</li>
            <li>Use “Execute” to finalize the recovery when enough approvals exist.</li>
          </ol>
        </div>
      )}

      {msg && (
        <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800
                        dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
          {msg}
        </div>
      )}

      <Modal open={okOpen} title="Success" onClose={() => setOkOpen(false)}>
        <div className="text-sm">
          Action completed on-chain. If this was an approval, wait for enough guardians and then execute.
          If this was an execution, try logging in with the new key.
        </div>
      </Modal>
    </div>
  );
}
