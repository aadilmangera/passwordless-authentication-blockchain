const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// In-memory nonce store
const nonces = new Map();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const registryAbi = [
  "function isKey(bytes32 userId, address key) view returns (bool)"
];
const registry = new ethers.Contract(process.env.REGISTRY_ADDR, registryAbi, provider);

// username/email -> bytes32 userId
function toUserId(input) {
  return ethers.keccak256(ethers.toUtf8Bytes(input.trim()));
}

// 1) Issue challenge
app.post("/auth/challenge", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "username required" });
    const userId = toUserId(username);
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    nonces.set(userId, nonce);
    res.json({ userId, nonce });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2) Verify signature -> JWT
app.post("/auth/verify", async (req, res) => {
  try {
    const { userId, signature } = req.body;
    const nonce = nonces.get(userId);
    if (!nonce) return res.status(400).json({ error: "no challenge" });

    const recovered = ethers.verifyMessage(ethers.getBytes(nonce), signature);
    const ok = await registry.isKey(userId, recovered);
    if (!ok) return res.status(401).json({ error: "not an authorized key" });

    nonces.delete(userId);

    const token = jwt.sign({ sub: userId, addr: recovered }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Auth server on http://localhost:${process.env.PORT}`);
});
