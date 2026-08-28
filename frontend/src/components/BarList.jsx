import { Tooltip } from 'antd';

export default function BarList({ rows, labelKey, valueKey = 'quantity', color = 'var(--series-1)' }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  const total = rows.reduce((sum, r) => sum + (Number(r[valueKey]) || 0), 0) || 1;
  const sorted = [...rows].sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0));

  return (
    <div>
      {sorted.map((row) => {
        const value = Number(row[valueKey]) || 0;
        const pct = Math.round((value / total) * 100);
        return (
          <Tooltip key={row[labelKey]} title={`${row[labelKey]}: ${value} (${pct}% of total)`}>
            <div className="bar-row">
              <div className="bar-label">{row[labelKey]}</div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(value / max) * 100}%`, background: color }}
                />
              </div>
              <div className="bar-value">{value}</div>
            </div>
          </Tooltip>
        );
      })}
      {sorted.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data</div>}
    </div>
  );
}
