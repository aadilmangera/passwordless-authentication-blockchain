export function short(x) {
  return typeof x === "string" ? x.slice(0, 6) + "…" + x.slice(-4) : String(x);
}

export function friendlyError(errMessage) {
  const msg = (errMessage || "").toLowerCase();
  if (msg.includes("already registered")) return "User already exists for this username.";
  if (msg.includes("not an authorized key")) return "Please register first for this username.";
  if (msg.includes("missing token")) return "Please log in.";
  if (msg.includes("invalid token")) return "Your session expired. Please log in again.";
  if (msg.includes("user rejected") || msg.includes("rejected the request")) return "Transaction/signature was rejected.";
  if (msg.includes("insufficient funds")) return "Not enough test ETH for gas.";
  if (msg.includes("nonce from server") || msg.includes("no nonce")) return "Could not get a login challenge from server.";
  if (msg.includes("network changed")) return "Wrong network. Select your Ganache network in MetaMask.";
  return errMessage || "Something went wrong.";
}
