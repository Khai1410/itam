export default function StatTile({ label, value, color }) {
  return (
    <div className="stat-tile" style={color ? { '--tile-color': color } : undefined}>
      <div className="label">
        {color && <span className="dot" style={{ background: color }} />}
        {label}
      </div>
      <div className="value">{value}</div>
    </div>
  );
}
