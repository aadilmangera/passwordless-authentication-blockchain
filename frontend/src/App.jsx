import { useEffect, useState } from "react";
import { ethers } from "ethers";

const REGISTRY_ADDR = import.meta.env.VITE_REGISTRY_ADDR;
const BACKEND = import.meta.env.VITE_BACKEND;

const registryAbi = [
  "function register(bytes32 userId, address initialKey, address[] guardians, uint8 threshold)",
  "function addKey(bytes32 userId, address newKey)",
  "function isKey(bytes32 userId, address key) view returns (bool)"
];

function toUserId(username) {
  return ethers.keccak256(ethers.toUtf8Bytes(username.trim()));
}

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [addr, setAddr] = useState("");
  const [username, setUsername] = useState("");
  const [jwt, setJwt] = useState("");

  useEffect(() => {
    if (window.ethereum) {
      const p = new ethers.BrowserProvider(window.ethereum);
      setProvider(p);
    }
  }, []);

  async function connect() {
    if (!provider) return alert("Install MetaMask");
    await provider.send("eth_requestAccounts", []);
    const s = await provider.getSigner();
    setSigner(s);
    setAddr(await s.getAddress());
  }

  async function registerUser() {
    try {
      if (!signer) return alert("Connect wallet first");
      const userId = toUserId(username);
      const contract = new ethers.Contract(REGISTRY_ADDR, registryAbi, signer);
      const tx = await contract.register(userId, addr, [], 0);
      await tx.wait();
      alert("Registered ✅");
    } catch (e) {
      alert(e.message);
    }
  }

  async function login() {
    try {
      if (!signer) return alert("Connect wallet first");
      const resp1 = await fetch(`${BACKEND}/auth/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      }).then(r => r.json());

      if (!resp1?.nonce) return alert("No nonce from server");

      const sig = await signer.signMessage(ethers.getBytes(resp1.nonce));

      const resp2 = await fetch(`${BACKEND}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resp1.userId, signature: sig })
      }).then(r => r.json());

      if (resp2.token) {
        setJwt(resp2.token);
        alert("Logged in ✅");
      } else {
        alert(resp2.error || "Login failed");
      }
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>Passwordless Auth (Truffle + Ganache)</h2>
      <p>Address: {addr || "(not connected)"} </p>
      <button onClick={connect}>Connect MetaMask</button>

      <div style={{ marginTop: 24 }}>
        <input
          placeholder="username (e.g. aadil@lakehead)"
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={registerUser}>Register</button>
        <button onClick={login} style={{ marginLeft: 8 }}>Login</button>
      </div>

      {jwt && (
        <div style={{ marginTop: 24 }}>
          <b>JWT:</b>
          <div style={{ wordBreak: "break-all", fontSize: 12 }}>{jwt}</div>
        </div>
      )}
    </div>
  );
}
