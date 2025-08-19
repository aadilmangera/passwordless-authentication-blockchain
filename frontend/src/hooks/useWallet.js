import { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function useWallet() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [addr, setAddr] = useState("");

  useEffect(() => {
    if (!window.ethereum) return;
    const p = new ethers.BrowserProvider(window.ethereum);
    setProvider(p);

    const onAccounts = async (accounts) => {
      if (!accounts?.length) { setSigner(null); setAddr(""); return; }
      const s = await p.getSigner();
      setSigner(s);
      setAddr(await s.getAddress());
    };
    const onChainChanged = () => {
      // refresh signer/address on network switch
      onAccounts(window.ethereum.selectedAddress ? [window.ethereum.selectedAddress] : []);
    };

    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChainChanged);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccounts);
      window.ethereum.removeListener?.("chainChanged", onChainChanged);
    };
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
