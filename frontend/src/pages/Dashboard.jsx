import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../utils/api";
import EventList from "../components/EventList";
import CopyButton from "../components/CopyButton";

export default function Dashboard({ wallet, auth }) {
  const { addr, provider } = wallet;
  const { jwt, logout } = auth;

  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);
  const [meError, setMeError] = useState("");

  const [events, setEvents] = useState([]);
  const [evLoading, setEvLoading] = useState(true);
  const [evError, setEvError] = useState("");

  const [onlyMine, setOnlyMine] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setMeLoading(true);
        setMeError("");
        const data = await apiGet("/me", jwt);
        if (!cancelled) setMe(data);
      } catch (e) {
        if (!cancelled) {
          setMeError(e.message || "Failed to load profile");
          if ((e.message || "").toLowerCase().includes("invalid token")) logout();
        }
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [jwt, refreshKey, logout]);

  useEffect(() => {
    let cancelled = false;
    let t;
    async function load() {
      try {
        setEvLoading(true);
        setEvError("");
        const data = await apiGet("/events", jwt);
        if (!cancelled) setEvents(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setEvError(e.message || "Failed to load events");
          if ((e.message || "").toLowerCase().includes("invalid token")) logout();
        }
      } finally {
        if (!cancelled) setEvLoading(false);
      }
    }
    load();
    t = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [jwt, refreshKey, logout]);

  const myEvents = useMemo(() => {
    if (!me?.userId) return events;
    return events.filter(e => String(e.args?.userId || "").toLowerCase() === String(me.userId).toLowerCase());
  }, [events, me]);

  const shown = onlyMine ? myEvents : events;

  const short = (x) => (typeof x === "string" ? x.slice(0, 8) + "…" + x.slice(-6) : String(x));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Signed in as:&nbsp;
            {meLoading ? "loading…" : (me?.address || addr || "(unknown)")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm
                       bg-white text-gray-900 hover:bg-gray-100
                       dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Identity row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs uppercase text-gray-600 dark:text-gray-400">Address</div>
          <div className="mt-1 break-all text-sm">{me?.address || addr || "—"}</div>
          <div className="mt-3">
            <CopyButton text={me?.address || addr || ""} label="Copy Address" />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs uppercase text-gray-600 dark:text-gray-400">User ID (bytes32)</div>
          <div className="mt-1 break-all text-sm">{me?.userId ? short(me.userId) : "—"}</div>
          <div className="mt-3">
            <CopyButton text={me?.userId || ""} label="Copy UserID" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {evLoading ? "Loading events…" : `${shown.length} event(s)`}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            className="h-4 w-4 accent-blue-600 dark:accent-blue-500"
            checked={onlyMine}
            onChange={e => setOnlyMine(e.target.checked)}
          />
          Show only my events
        </label>
      </div>

      {/* Errors */}
      {meError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20">
          {meError}
        </div>
      )}
      {evError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20">
          {evError}
        </div>
      )}

      {/* Events */}
      {!evError && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <EventList events={shown} provider={provider} />
        </div>
      )}
    </div>
  );
}
