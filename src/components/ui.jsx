import React from "react";

export function SackGauge({ pct, status }) {
  const color =
    status === "critical" ? "var(--alert)" : status === "low" ? "var(--husk)" : "var(--paddy)";
  return (
    <div className="gauge-track">
      <div
        className="gauge-fill"
        style={{ width: `${Math.max(4, Math.min(100, pct))}%`, background: color }}
      />
    </div>
  );
}

export function StatusBadge({ status }) {
  const labelMap = { good: "Stocked", low: "Low", critical: "Reorder now", out: "Out of stock" };
  return <span className={`badge badge-${status}`}>{labelMap[status]}</span>;
}

export function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="empty-state">
      <Icon size={28} strokeWidth={1.5} />
      <div className="empty-title">{title}</div>
      <div className="empty-body">{body}</div>
    </div>
  );
}
