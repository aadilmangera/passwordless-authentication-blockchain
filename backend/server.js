// server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { ethers } = require("ethers");

// ---- Env validation (fail fast) ----
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:7545";
const REGISTRY_ADDR = (process.env.REGISTRY_ADDR || "").trim();
const JWT_SECRET = (process.env.JWT_SECRET || "").trim();
const PORT = Number(process.env.PORT || 3001);

if (!ethers.isAddress(REGISTRY_ADDR)) {
  console.error(`REGISTRY_ADDR missing/invalid. Got: "${REGISTRY_ADDR}"`);
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error("JWT_SECRET missing.");
  process.exit(1);
}

// ---- App + security middleware ----
const app = express();
// CORS: lock to your frontend origin if you know it (e.g., http://localhost:5173)
app.use(cors({
  origin: [/^http:\/\/localhost:\d+$/], // loosen if needed
  credentials: false
}));
app.use(express.json({ limit: "256kb" }));

// Basic rate limits to stop spam on auth endpoints
const authLimiter = rateLimit({ windowMs: 60_000, max: 60 });        // 60/min
const verifyLimiter = rateLimit({ windowMs: 60_000, max: 120 });

// ---- Blockchain setup ----
const provider = new ethers.JsonRpcProvider(RPC_URL);
const registryAbi = [
  "function isKey(bytes32 userId, address key) view returns (bool)"
];
const registry = new ethers.Contract(REGISTRY_ADDR, registryAbi, provider);

// ---- Helpers ----
function toUserId(input) {
  return ethers.keccak256(ethers.toUtf8Bytes(String(input).trim()));
}

// very simple nonce store with TTL
const NONCE_TTL_MS = 2 * 60 * 1000; // 2 minutes
// Map<userId, { nonce, exp }>
const nonces = new Map();
function setNonce(userId, nonce) {
  nonces.set(userId, { nonce, exp: Date.now() + NONCE_TTL_MS });
}
function getNonce(userId) {
  const item = nonces.get(userId);
  if (!item) return null;
  if (Date.now() > item.exp) { nonces.delete(userId); return null; }
  return item.nonce;
}

// JWT guard
function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { sub: userId, addr, iat, exp }
    next();
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
}

// ---- Routes ----

// health
app.get("/health", (_req, res) => res.json({ ok: true }));

// 1) Issue challenge
app.post("/auth/challenge", authLimiter, async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username || !String(username).trim()) {
      return res.status(400).json({ error: "username required" });
    }
    const userId = toUserId(username);
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    setNonce(userId, nonce);
    res.json({ userId, nonce });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// 2) Verify signature -> JWT
app.post("/auth/verify", verifyLimiter, async (req, res) => {
  try {
    const { userId, signature } = req.body || {};
    if (!userId || !signature) {
      return res.status(400).json({ error: "userId and signature required" });
    }
    const nonce = getNonce(userId);
    if (!nonce) return res.status(400).json({ error: "no challenge" });

    // Recover EOA from signed nonce
    const recovered = ethers.verifyMessage(ethers.getBytes(nonce), signature);

    // On-chain authorization check
    const ok = await registry.isKey(userId, recovered);
    if (!ok) return res.status(401).json({ error: "not an authorized key" });

    // single-use nonce
    nonces.delete(userId);

    const token = jwt.sign({ sub: userId, addr: recovered }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// 3) Who am I? (for dashboard)
app.get("/me", requireAuth, (req, res) => {
  res.json({ userId: req.user.sub, address: req.user.addr });
});

// 4) Events (protected)
const iface = new ethers.Interface([
  "event UserRegistered(bytes32 indexed userId, address indexed key)",
  "event KeyAdded(bytes32 indexed userId, address indexed key)",
  "event KeyRemoved(bytes32 indexed userId, address indexed key)",
  "event RecoveryProposed(bytes32 indexed userId, address indexed newKey, address indexed guardian)",
  "event RecoveryExecuted(bytes32 indexed userId, address indexed newKey)"
]);

function resultToObject(parsed) {
  const obj = {};
  parsed.fragment.inputs.forEach((inp, i) => {
    obj[inp.name || `arg${i}`] = parsed.args[i];
  });
  return obj;
}

app.get("/events", requireAuth, async (_req, res) => {
  try {
    const to = await provider.getBlockNumber();
    if (to <= 0) return res.json([]);

    const WINDOW = 5000;              // blocks to look back
    const from = Math.max(0, to - WINDOW);

    const logs = await provider.getLogs({
      address: REGISTRY_ADDR,
      fromBlock: from,
      toBlock: to
    });

    const parsed = logs.map(l => {
      try {
        const p = iface.parseLog(l);
        return {
          name: p.name,
          args: resultToObject(p),
          blockNumber: l.blockNumber,
          txHash: l.transactionHash
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

// 404
app.use((_req, res) => res.status(404).json({ error: "not found" }));

app.listen(PORT, () => {
  console.log(`Auth server on http://localhost:${PORT}`);
  console.log(`KeyRegistry @ ${REGISTRY_ADDR}`);
});
