const BACKEND = import.meta.env.VITE_BACKEND;

export async function apiGet(path, jwt) {
  const res = await fetch(`${BACKEND}${path}`, {
    headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}
  });
  if (res.status === 401) throw new Error("invalid token");
  return res.json();
}

export async function apiPost(path, body, jwt) {
  const res = await fetch(`${BACKEND}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {})
    },
    body: JSON.stringify(body || {})
  });
  if (res.status === 401) throw new Error("invalid token");
  return res.json();
}
