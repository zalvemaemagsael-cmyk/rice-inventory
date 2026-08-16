import React, { useMemo } from "react";
import { BarChart3, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { fmtNum } from "../lib/format.js";
import { EmptyState } from "./ui.jsx";

const COLORS = ["#B98A1F", "#55684A", "#8B5E34", "#A63D2F", "#7A8B6F", "#C9A855"];

// Groups a list of {date, ...} records into "Aug 2026"-style month buckets,
// summing `amountKey` for each bucket. Returns entries in chronological
// order.
function byMonth(records, amountKey) {
  const map = {};
  for (const r of records) {
    const d = new Date(r.date);
    if (isNaN(d)) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    if (!map[key]) map[key] = { key, label, value: 0 };
    map[key].value += r[amountKey] || 0;
  }
  return Object.values(map).sort((a, b) => (a.key > b.key ? 1 : -1));
}

export default function Reports({ data, rawPurchaseCostTotal, totalExpenses, buyerBalances, riceTypeName }) {
  const sales = useMemo(() => data.stockOuts.filter((s) => s.reason === "Sale"), [data.stockOuts]);

  const totalGrossSales = useMemo(
    () => sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
    [sales]
  );

  const totalSupplierCost = useMemo(
    () => data.supplierPurchases.reduce((sum, p) => sum + (p.totalCost || 0), 0),
    [data.supplierPurchases]
  );

  const totalOutstanding = useMemo(
    () => data.buyers.reduce((sum, b) => sum + Math.max(0, buyerBalances[b.id] || 0), 0),
    [data.buyers, buyerBalances]
  );

  const totalCosts = rawPurchaseCostTotal + totalSupplierCost + totalExpenses;
  const estimatedProfit = totalGrossSales - totalCosts;

  const salesByType = useMemo(() => {
    const map = {};
    for (const s of sales) {
      const name = riceTypeName(s.riceTypeId);
      map[name] = (map[name] || 0) + (s.totalAmount || 0);
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [sales, riceTypeName]);

  const salesOverTime = useMemo(() => byMonth(sales, "totalAmount"), [sales]);

  const expensesByCategory = useMemo(() => {
    const map = {};
    for (const e of data.expenses) {
      map[e.category] = (map[e.category] || 0) + (e.amount || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data.expenses]);

  const costBreakdown = [
    { name: "Raw palay (unmilled)", value: rawPurchaseCostTotal },
    { name: "Supplier purchases", value: totalSupplierCost },
    ...expensesByCategory,
  ].filter((c) => c.value > 0);

  const hasAnyData = sales.length > 0 || rawPurchaseCostTotal > 0 || totalSupplierCost > 0 || totalExpenses > 0;

  if (!hasAnyData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Nothing to report yet"
        body="Once you record sales, purchases, and expenses, gross sales, costs, and estimated profit will show up here."
      />
    );
  }

  return (
    <div>
      <div className="section-label">Business overview</div>
      <div className="hint-line">
        Estimated profit = gross sales − (raw palay costs + supplier purchase costs + other expenses).
        This is a simplified estimate — it doesn't account for spoilage or unsold inventory value.
      </div>

      <div className="report-summary-row">
        <div className="report-summary-card">
          <div className="report-summary-label">Gross sales</div>
          <div className="report-summary-value" style={{ color: "var(--paddy)" }}>
            ₱ {fmtNum(totalGrossSales)}
          </div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-label">Total costs</div>
          <div className="report-summary-value" style={{ color: "var(--husk)" }}>
            ₱ {fmtNum(totalCosts)}
          </div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-label">Estimated profit</div>
          <div
            className="report-summary-value"
            style={{ color: estimatedProfit >= 0 ? "var(--paddy)" : "var(--alert)" }}
          >
            ₱ {fmtNum(estimatedProfit)}
          </div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-label">Outstanding (utang)</div>
          <div className="report-summary-value" style={{ color: totalOutstanding > 0 ? "var(--alert)" : "var(--husk)" }}>
            ₱ {fmtNum(totalOutstanding)}
          </div>
        </div>
      </div>

      {salesOverTime.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 28 }}>Sales by month</div>
          <div className="report-chart-card">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={salesOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: "Inter" }} />
                <YAxis tick={{ fontSize: 12, fontFamily: "Inter" }} />
                <Tooltip formatter={(v) => [`₱ ${fmtNum(v)}`, "Sales"]} />
                <Bar dataKey="value" fill="#55684A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="report-grid-2">
        {salesByType.length > 0 && (
          <div>
            <div className="section-label" style={{ marginTop: 28 }}>Sales by rice type</div>
            <div className="report-chart-card">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={salesByType} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                  <XAxis type="number" tick={{ fontSize: 12, fontFamily: "Inter" }} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12, fontFamily: "Inter" }} />
                  <Tooltip formatter={(v) => [`₱ ${fmtNum(v)}`, "Sales"]} />
                  <Bar dataKey="value" fill="#B98A1F" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {costBreakdown.length > 0 && (
          <div>
            <div className="section-label" style={{ marginTop: 28 }}>Where costs went</div>
            <div className="report-chart-card">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={costBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {costBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `₱ ${fmtNum(v)}`} />
                  <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Inter" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {sales.length === 0 && (
        <div className="hint-line" style={{ marginTop: 20 }}>
          <TrendingUp size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          No sales recorded yet — record a Stock-Out with reason "Sale" to see sales figures here.
        </div>
      )}
    </div>
  );
}
