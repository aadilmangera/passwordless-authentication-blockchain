const BACKEND = import.meta.env.VITE_BACKEND;

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function apiGet(path, jwt) {
  const res = await fetch(`${BACKEND}${path}`, {
    headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}
  });
  return handle(res);
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
  return handle(res);
}
