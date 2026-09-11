import React from "react";
import { fmtNum } from "../lib/format.js";

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

// A prominent stat card with a target/goal — a value, a target, a
// progress bar toward that target, and an optional footer line for extra
// context (e.g. money spent to date). Used for the Palay/unmilled rice
// KPI on both the Stock Room and Raw Rice tabs.
export function KpiCard({ label, sublabel, value, unit, target, footer }) {
  const pct = target > 0 ? (value / target) * 100 : 0;
  const clamped = Math.max(0, Math.min(100, pct));
  const color = pct >= 100 ? "var(--paddy)" : pct >= 50 ? "var(--gold)" : "var(--alert)";
  return (
    <div className="kpi-card">
      <div className="kpi-card-top">
        <div>
          <div className="stock-name">{label}</div>
          {sublabel && <div className="stock-grade">{sublabel}</div>}
        </div>
        <div className="kpi-pct" style={{ color }}>{fmtNum(clamped)}%</div>
      </div>
      <div className="stock-qty">
        {fmtNum(value)} <span className="stock-unit">{unit}</span>
      </div>
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${Math.max(4, clamped)}%`, background: color }} />
      </div>
      <div className="kpi-target-row">
        <span>Target for milling: {fmtNum(target)} {unit}</span>
        {footer && <span className="muted">{footer}</span>}
      </div>
    </div>
  );
}
