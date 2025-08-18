export default function Toast({ text, onClose }) {
  if (!text) return null;
  return (
    <div style={{ marginTop: 16, padding: 10, background: "#f5f5f5", borderRadius: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{text}</span>
        <button onClick={onClose} style={{ marginLeft: 8 }}>x</button>
      </div>
    </div>
  );
}
