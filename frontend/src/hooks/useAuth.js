import { useState } from "react";

export default function useAuth() {
  const [jwt, setJwt] = useState(localStorage.getItem("jwt") || "");
  const loginSave = (t) => { setJwt(t); localStorage.setItem("jwt", t); };
  const logout = () => { setJwt(""); localStorage.removeItem("jwt"); };
  return { jwt, loginSave, logout };
}
