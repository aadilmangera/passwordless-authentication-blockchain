import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { apiGet } from "../utils/api";
import { friendlyError } from "../utils/fmt";

const REGISTRY_ADDR = import.meta.env.VITE_REGISTRY_ADDR;
const registryAbi = [
  "function addKey(bytes32 userId, address newKey)",
  "function isKey(bytes32 userId, address key) view returns (bool)",
  "event KeyAdded(bytes32 indexed userId, address indexed key)"
];

export default function AddDevice({ wallet, auth }) {
  const { signer, addr, connect, provider } = wallet;
  const { jwt, logout } = auth;

  const [me, setMe] = useState(null);
  const [newKey, setNewKey] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkAddr, setCheckAddr] = useState("");
  const [checkResult, setCheckResult] = useState(null);

  // load /me to get userId
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const data = await apiGet("/me", jwt);
        if (!stop) setMe(data);
      } catch (e) {
        if (!stop) logout();
      }
    })();
    return () => { stop = true; };
  }, [jwt, logout]);

  const contract = useMemo(
    () => (signer ? new ethers.Contract(REGISTRY_ADDR, registryAbi, signer) : null),
    [signer]
  );

  const validAddress = (a) => {
    try { return ethers.isAddress(a); } catch { return false; }
  };

  async function doAddKey() {
    try {
      setBusy(true); setMsg("");
      if (!signer) throw new Error("Connect your wallet first.");
      if (!me?.userId) throw new Error("Missing userId (login again).");
      if (!validAddress(newKey)) throw new Error("Enter a valid Ethereum address.");

      const already = await contract.isKey(me.userId, newKey);
      if (already) throw new Error("That address is already authorized.");

      const tx = await contract.addKey(me.userId, newKey);
      await tx.wait();
      setMsg("✅ Device added. You can now switch to that account and log in.");
      setCheckAddr(newKey);
      setCheckResult(true);
      setNewKey("");
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    } finally {
      setBusy(false);
    }
  }

  async function checkIsKey() {
    try {
      setMsg("");
      if (!me?.userId) throw new Error("Missing userId.");
      if (!validAddress(checkAddr)) throw new Error("Enter a valid address to check.");
      const ok = await (contract ?? new ethers.Contract(REGISTRY_ADDR, registryAbi, provider)).isKey(me.userId, checkAddr);
      setCheckResult(ok);
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Add Device</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Logged in as {addr ? `${addr.slice(0,6)}…${addr.slice(-4)}` : "(not connected)"}.
          </p>
        </div>
        <button
          onClick={connect}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm
                     bg-white text-gray-900 hover:bg-gray-100
                     dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700
                     focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {addr ? "Reconnect" : "Connect MetaMask"}
        </button>
      </div>

      {/* Add key card */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm font-medium mb-2">Authorize a new address</div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Import your **second Ganache account** into MetaMask, copy its address, and add it here.
          After success, logout and log back in with the new account.
        </p>

        <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">New device address</label>
        <input
          className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
                     placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400
                     dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:placeholder-gray-400"
          placeholder="0x..."
          value={newKey}
          onChange={(e) => setNewKey(e.target.value.trim())}
        />

        <button
          onClick={doAddKey}
          disabled={busy || !newKey}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50
                     focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {busy ? "Adding…" : "Add device"}
        </button>

        {msg && (
          <div className="mt-3 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800
                          dark:bg-gray-950 dark:text-gray-100 dark:border-gray-700">
            {msg}
          </div>
        )}
      </div>

      {/* Verify key card */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm font-medium mb-2">Verify address is authorized</div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
                       placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400
                       dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:placeholder-gray-400"
            placeholder="0x address to check"
            value={checkAddr}
            onChange={(e) => setCheckAddr(e.target.value.trim())}
          />
          <button
            onClick={checkIsKey}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Check
          </button>
        </div>

        {checkResult != null && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            checkResult
              ? "border border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-900/20"
              : "border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20"
          }`}>
            {checkResult ? "✅ This address is authorized for your account." : "⛔ Not authorized."}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="text-sm text-gray-600 dark:text-gray-300">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Copy the **second** Ganache account address.</li>
          <li>Paste it into “New device address” and click <b>Add device</b>.</li>
          <li>Logout, switch MetaMask to that account, then login again.</li>
        </ol>
      </div>
    </div>
  );
}
