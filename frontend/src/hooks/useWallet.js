import { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function useWallet() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [addr, setAddr] = useState("");

  useEffect(() => {
    if (window.ethereum) setProvider(new ethers.BrowserProvider(window.ethereum));
  }, []);

  const connect = async () => {
    if (!provider) return { ok: false, msg: "Install MetaMask" };
    await provider.send("eth_requestAccounts", []);
    const s = await provider.getSigner();
    setSigner(s);
    setAddr(await s.getAddress());
    return { ok: true };
  };

  return { provider, signer, addr, connect };
}
