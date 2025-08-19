import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { apiGet } from "../utils/api";
import { friendlyError } from "../utils/fmt";

const REGISTRY_ADDR = import.meta.env.VITE_REGISTRY_ADDR;
const registryAbi = [
  // primary
  "function rotateKey(bytes32 userId, address newKey)",
  // fallbacks
  "function addKey(bytes32 userId, address newKey)",
  "function removeKey(bytes32 userId, address key)",
  "function isKey(bytes32 userId, address key) view returns (bool)",
  // events (optional but nice)
  "event KeyAdded(bytes32 indexed userId, address indexed key)",
  "event KeyRemoved(bytes32 indexed userId, address indexed key)"
];

export default function RotateKey({ wallet, auth }) {
  const { signer, addr, connect, provider } = wallet;
  const { jwt, logout } = auth;

  const [me, setMe] = useState(null);
  const [newKey, setNewKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [checkOld, setCheckOld] = useState(null);
  const [checkNew, setCheckNew] = useState(null);

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

  const contractRW = useMemo(
    () => (signer ? new ethers.Contract(REGISTRY_ADDR, registryAbi, signer) : null),
    [signer]
  );
  const contractRO = useMemo(
    () => new ethers.Contract(REGISTRY_ADDR, registryAbi, provider),
    [provider]
  );

  const validAddress = (a) => {
    try { return ethers.isAddress(a); } catch { return false; }
  };

  async function verifyKeys() {
    try {
      if (!me?.userId) throw new Error("Missing userId");
      const oldOk = addr ? await contractRO.isKey(me.userId, addr) : null;
      const newOk = validAddress(newKey) ? await contractRO.isKey(me.userId, newKey) : null;
      setCheckOld(oldOk);
      setCheckNew(newOk);
      setMsg("");
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    }
  }

  async function doRotate() {
    try {
      setBusy(true); setMsg("");
      if (!signer) throw new Error("Connect your wallet first.");
      if (!me?.userId) throw new Error("Missing userId (login again).");

      const oldKey = addr;
      if (!validAddress(oldKey)) throw new Error("Missing current address.");
      if (!validAddress(newKey)) throw new Error("Enter a valid new address.");
      if (oldKey.toLowerCase() === newKey.toLowerCase()) throw new Error("New key must be different from old key.");

      // If rotateKey exists, call it. Else: addKey then removeKey
      let usedFallback = false;
      let tx;

      try {
        // Detect function existence in ethers v6
        contractRW.getFunction("rotateKey"); // throws if not present
        tx = await contractRW.rotateKey(me.userId, newKey);
      } catch {
        usedFallback = true;
        // 1) add new
        const already = await contractRO.isKey(me.userId, newKey);
        if (!already) {
          const tx1 = await contractRW.addKey(me.userId, newKey);
          await tx1.wait();
        }
        // 2) remove old
        const oldStill = await contractRO.isKey(me.userId, oldKey);
        if (oldStill) {
          const tx2 = await contractRW.removeKey(me.userId, oldKey);
          await tx2.wait();
        }
      }

      if (!usedFallback) {
        await tx.wait();
      }

      setMsg("✅ Key rotated. Old key is removed; new key can now log in.");
      setCheckOld(null);
      setCheckNew(null);
      // optional: pre-run verification
      await verifyKeys();
    } catch (e) {
      setMsg(friendlyError(e?.shortMessage || e?.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rotate Key</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            You’re signed in with: {addr ? `${addr.slice(0,6)}…${addr.slice(-4)}` : "(not connected)"}
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

      {/* Rotate card */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm font-medium mb-2">Rotate from current key to a new key</div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Old key (current)</label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900
                         dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              value={addr || ""}
              readOnly
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">New key (address)</label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
                         placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400
                         dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:placeholder-gray-400"
              placeholder="0x..."
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.trim())}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={doRotate}
            disabled={busy || !newKey}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {busy ? "Rotating…" : "Rotate key"}
          </button>

          <button
            onClick={verifyKeys}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm
                       bg-white text-gray-900 hover:bg-gray-100
                       dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Verify keys
          </button>
        </div>

        {msg && (
          <div className="mt-3 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800
                          dark:bg-gray-950 dark:text-gray-100 dark:border-gray-700">
            {msg}
          </div>
        )}

        {(checkOld != null || checkNew != null) && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className={`rounded-lg px-3 py-2 text-sm ${
              checkOld
                ? "border border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-900/20"
                : "border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20"
            }`}>
              Old key ({addr ? `${addr.slice(0,6)}…${addr.slice(-4)}` : "—"}): {String(checkOld)}
            </div>
            <div className={`rounded-lg px-3 py-2 text-sm ${
              checkNew
                ? "border border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-900/20"
                : "border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20"
            }`}>
              New key ({newKey ? `${newKey.slice(0,6)}…${newKey.slice(-4)}` : "—"}): {String(checkNew)}
            </div>
          </div>
        )}
      </div>

      {/* How to demo */}
      <div className="text-sm text-gray-600 dark:text-gray-300">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Enter a different Ganache account address as <b>New key</b>.</li>
          <li>Click <b>Rotate key</b>. Wait for confirmation.</li>
          <li>Click <b>Verify keys</b> — Old should be <b>false</b>, New should be <b>true</b>.</li>
          <li>Logout, switch MetaMask to the <b>new</b> account, and log in → it should work.</li>
          <li>Try logging in with the <b>old</b> account → it should fail (not authorized).</li>
        </ol>
      </div>
    </div>
  );
}
