import { short } from "../utils/fmt";

export default function EventList({ events }) {
  if (!events || events.length === 0) return <p>No events yet.</p>;
  return (
    <ul>
      {events.map((e, i) => (
        <li key={i}>
          {e.name} —{" "}
          {Object.entries(e.args).map(([k, v]) => (
            <span key={k} style={{ marginRight: 8 }}>{k}={short(v)}</span>
          ))}
        </li>
      ))}
    </ul>
  );
}
