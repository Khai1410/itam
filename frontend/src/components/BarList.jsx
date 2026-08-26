export default function BarList({ rows, labelKey, valueKey = 'quantity', color = 'var(--series-1)' }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  const sorted = [...rows].sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0));

  return (
    <div>
      {sorted.map((row) => (
        <div className="bar-row" key={row[labelKey]}>
          <div className="bar-label" title={row[labelKey]}>
            {row[labelKey]}
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(Number(row[valueKey]) / max) * 100}%`, background: color }}
            />
          </div>
          <div className="bar-value">{row[valueKey]}</div>
        </div>
      ))}
      {sorted.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data</div>}
    </div>
  );
}
