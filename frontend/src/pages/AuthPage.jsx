import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { apiPost } from "../utils/api";
import { friendlyError } from "../utils/fmt";

const REGISTRY_ADDR = import.meta.env.VITE_REGISTRY_ADDR;
const registryAbi = [
  "function register(bytes32 userId, address initialKey, address[] guardians, uint8 threshold)",
  "function isKey(bytes32 userId, address key) view returns (bool)"
];

function toUserId(username) {
  return ethers.keccak256(ethers.toUtf8Bytes(username.trim()));
}

export default function AuthPage({ wallet, auth, onLoggedIn }) {
  const { signer, addr, connect } = wallet;
  const { loginSave } = auth;
  const [username, setUsername] = useState("");
  const [toast, setToast] = useState("");

  const contract = useMemo(
    () => (signer ? new ethers.Contract(REGISTRY_ADDR, registryAbi, signer) : null),
    [signer]
  );

  const onRegister = async () => {
    try {
      if (!signer) throw new Error("Connect your wallet first.");
      if (!username.trim()) throw new Error("Enter a username (e.g., aadil@lakehead).");
      const userId = toUserId(username);
      const already = await contract.isKey(userId, addr);
      if (already) throw new Error("User already exists for this username.");
      const tx = await contract.register(userId, addr, [], 0);
      await tx.wait();
      setToast("Registered ✅");
    } catch (e) {
      setToast(friendlyError(e?.shortMessage || e?.message));
    }
  };

  const onLogin = async () => {
    try {
      if (!signer) throw new Error("Connect your wallet first.");
      if (!username.trim()) throw new Error("Enter a username (e.g., aadil@lakehead).");
      const c = await apiPost("/auth/challenge", { username });
      if (!c?.nonce) throw new Error("No nonce from server.");
      const sig = await signer.signMessage(ethers.getBytes(c.nonce));
      const v = await apiPost("/auth/verify", { userId: c.userId, signature: sig });
      if (!v?.token) throw new Error(v?.error || "Login failed.");
      loginSave(v.token);
      setToast("Logged in ✅");
      onLoggedIn(); // navigate to dashboard
    } catch (e) {
      setToast(friendlyError(e?.shortMessage || e?.message));
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "24px auto" }}>
      <h2>Welcome</h2>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Connect your MetaMask (Ganache), then register or log in with a signed challenge.
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
        <button onClick={connect}>Connect MetaMask</button>
        <span style={{ fontSize: 12, opacity: 0.8 }}>
          {addr ? `Connected: ${addr.slice(0, 6)}…${addr.slice(-4)}` : "Not connected"}
        </span>
      </div>

      <div style={{ marginTop: 18 }}>
        <label style={{ fontSize: 12, opacity: 0.8 }}>Username</label>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="e.g. abc@xyz"
          style={{ width: "100%", padding: 10, marginTop: 4 }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={onRegister}>Register</button>
        <button onClick={onLogin}>Login</button>
      </div>

      {toast && (
        <div style={{ marginTop: 16, padding: 10, background: "#f5f5f5", borderRadius: 6 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
