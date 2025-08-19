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

export default function Register({ wallet }) {
  const { signer, addr, connect } = wallet;
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const contract = useMemo(
    () => (signer ? new ethers.Contract(REGISTRY_ADDR, registryAbi, signer) : null),
    [signer]
  );

  const registerUser = async () => {
    try {
      setBusy(true);
      if (!signer) throw new Error("Connect your wallet first.");
      if (!username.trim()) throw new Error("Enter a username (e.g., aadil@lakehead).");
      const userId = toUserId(username);

      const already = await contract.isKey(userId, addr);
      if (already) throw new Error("User already exists for this username.");

      const tx = await contract.register(userId, addr, [], 0);
      await tx.wait();
      setMsg("Registered ✅");
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
        Register your username on-chain with your current wallet address.
      </p>

      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={connect}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm
                     bg-white text-gray-900 hover:bg-gray-100
                     dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700
                     focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Connect MetaMask
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
