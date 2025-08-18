import { Link } from "react-router-dom";
import { short } from "../utils/fmt";

export default function Navbar({ addr, jwt, onLogout }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, borderBottom: "1px solid #eee" }}>
      <Link to="/" style={{ textDecoration: "none", fontWeight: 700 }}>Passwordless Auth</Link>
      <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 12, opacity: 0.8 }}>{addr ? short(addr) : "Not connected"}</span>
        {jwt ? <button onClick={onLogout}>Logout</button> : null}
      </div>
    </div>
  );
}
