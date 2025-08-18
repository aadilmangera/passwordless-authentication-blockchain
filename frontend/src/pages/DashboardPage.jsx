import { useEffect, useState } from "react";
import { apiGet } from "../utils/api";
import EventList from "../components/EventList";

export default function DashboardPage({ wallet, auth }) {
  const { addr } = wallet;
  const { jwt, logout } = auth;
  const [events, setEvents] = useState([]);
  const [me, setMe] = useState(null);

  useEffect(() => {
    let stop = false;

    async function fetchMe() {
      try {
        const data = await apiGet("/me", jwt);
        if (!stop) setMe(data);
      } catch (e) {
        logout();
      }
    }

    async function fetchEvents() {
      try {
        const data = await apiGet("/events", jwt);
        if (!stop) setEvents(Array.isArray(data) ? data : []);
      } catch {
        logout();
      }
    }

    fetchMe();
    fetchEvents();
    const id = setInterval(fetchEvents, 5000);
    return () => { stop = true; clearInterval(id); };
  }, [jwt, logout]);

  return (
    <div style={{ maxWidth: 720, margin: "24px auto" }}>
      <h2>Dashboard</h2>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Signed in as: {me?.address || addr}
      </p>

      <div style={{ marginTop: 24 }}>
        <h3>Recent Events</h3>
        <EventList events={events} />
      </div>
    </div>
  );
}
