import { useEffect, useRef, useState } from "react";
import { short as shortFmt } from "../utils/fmt";
import { Clock3, Activity } from "lucide-react";

function timeAgoFrom(tsSec) {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - tsSec));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function EventList({ events, provider }) {
  const [times, setTimes] = useState({});
  const fetching = useRef(new Set());

  useEffect(() => {
    if (!provider) return;
    const missing = events
      .map(e => e.blockNumber)
      .filter(bn => bn != null && times[bn] == null);

    missing.forEach((bn) => {
      if (fetching.current.has(bn)) return;
      fetching.current.add(bn);
      provider.getBlock(bn)
        .then(blk => setTimes(t => ({ ...t, [bn]: blk?.timestamp })))
        .catch(() => setTimes(t => ({ ...t, [bn]: null })))
        .finally(() => fetching.current.delete(bn));
    });
  }, [events, provider, times]);

  if (!events || events.length === 0) {
    return <p className="text-sm opacity-70">No events yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {[...events].reverse().map((e, i) => {
        const bn = e.blockNumber;
        const ts = bn != null ? times[bn] : null;
        const when = ts ? timeAgoFrom(ts) : (bn != null ? `block #${bn}` : "");
        return (
          <li key={i} className="rounded-xl border bg-white px-3 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="opacity-70" />
                <div className="font-medium">{e.name}</div>
              </div>
              <div className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                <Clock3 size={12} />
                {when}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {Object.entries(e.args).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800"
                >
                  {k}={shortFmt(v)}
                </span>
              ))}
            </div>
            {e.txHash && (
              <div className="mt-2 break-all text-xs opacity-60">tx: {e.txHash}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
