import React, { useMemo, useState } from "react";
import { BarChart3, TrendingUp, Download } from "lucide-react";
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
import { fmtNum, fmtDate, todayStr } from "../lib/format.js";
import { TXN_CATEGORIES, buildTransactionRows, downloadTransactionsCSV } from "../lib/transactions.js";
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

export default function Reports({ data, costOfMilledPalay, totalExpenses, totalHuskSales, buyerBalances, riceTypeName, supplierName, buyerName }) {
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

  const totalCosts = costOfMilledPalay + totalSupplierCost + totalExpenses;
  const totalRevenue = totalGrossSales + totalHuskSales;
  const estimatedProfit = totalRevenue - totalCosts;

  const salesByType = useMemo(() => {
    const map = {};
    for (const s of sales) {
      const name = riceTypeName(s.riceTypeId);
      map[name] = (map[name] || 0) + (s.totalAmount || 0);
    }
    const entries = Object.entries(map).map(([name, value]) => ({ name, value }));
    if (totalHuskSales > 0) entries.push({ name: "Rice husk/bran", value: totalHuskSales });
    return entries.sort((a, b) => b.value - a.value);
  }, [sales, riceTypeName, totalHuskSales]);

  const salesOverTime = useMemo(() => byMonth(sales, "totalAmount"), [sales]);

  const expensesByCategory = useMemo(() => {
    const map = {};
    for (const e of data.expenses) {
      map[e.category] = (map[e.category] || 0) + (e.amount || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data.expenses]);

  const costBreakdown = [
    { name: "Raw palay (milled)", value: costOfMilledPalay },
    { name: "Supplier purchases", value: totalSupplierCost },
    ...expensesByCategory,
  ].filter((c) => c.value > 0);

  // ---- Transaction history table (filterable, exportable to CSV) ----
  const allRows = useMemo(
    () => buildTransactionRows(data, riceTypeName, supplierName, buyerName),
    [data, riceTypeName, supplierName, buyerName]
  );

  const monthOptions = useMemo(() => {
    const set = new Set(allRows.map((r) => r.date?.slice(0, 7)).filter(Boolean));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [allRows]);

  const currentMonth = todayStr().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(
    monthOptions.includes(currentMonth) ? currentMonth : "all"
  );
  const [activeCategories, setActiveCategories] = useState(
    () => new Set(TXN_CATEGORIES.map((c) => c.key))
  );

  const toggleCategory = (key) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const monthLabel = (ym) => {
    if (ym === "all") return "All time";
    const [y, m] = ym.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (selectedMonth !== "all" && r.date?.slice(0, 7) !== selectedMonth) return false;
      if (!activeCategories.has(r.category)) return false;
      return true;
    });
  }, [allRows, selectedMonth, activeCategories]);

  const exportCSV = () => {
    const filename = `transactions-${selectedMonth === "all" ? "all-time" : selectedMonth}.csv`;
    downloadTransactionsCSV(filteredRows, filename);
  };

  const hasAnyData = sales.length > 0 || costOfMilledPalay > 0 || totalSupplierCost > 0 || totalExpenses > 0 || totalHuskSales > 0;

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
        Estimated profit = gross sales (rice + husk/bran) − (milled palay costs + supplier purchase costs + other expenses).
        Palay costs only count here once that stock is actually milled — money spent on palay still
        sitting unmilled shows on the Raw Rice tab instead, not as a cost yet. This is a simplified
        estimate — it doesn't account for spoilage or unsold finished-rice inventory.
      </div>

      <div className="report-summary-row">
        <div className="report-summary-card">
          <div className="report-summary-label">Gross sales</div>
          <div className="report-summary-value" style={{ color: "var(--paddy)" }}>
            ₱ {fmtNum(totalRevenue)}
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
            <div className="section-label" style={{ marginTop: 28 }}>Sales breakdown</div>
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

      <div className="section-label" style={{ marginTop: 32 }}>Transaction history</div>
      <div className="hint-line">
        Every supplier purchase, raw rice purchase, milling run, husk/bran sale, stock-out, and
        expense in one place — filter by month and type, then export to CSV for your records.
      </div>

      <div className="filter-bar">
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ minWidth: 160 }}>
          <option value="all">All time</option>
          {monthOptions.map((ym) => (
            <option key={ym} value={ym}>{monthLabel(ym)}</option>
          ))}
        </select>
        {TXN_CATEGORIES.map((c) => (
          <label key={c.key} className={`filter-chip ${activeCategories.has(c.key) ? "active" : ""}`}>
            <input
              type="checkbox"
              checked={activeCategories.has(c.key)}
              onChange={() => toggleCategory(c.key)}
            />
            {c.label}
          </label>
        ))}
        <button type="button" className="btn-secondary" onClick={exportCSV} disabled={filteredRows.length === 0}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No transactions match these filters"
          body="Try a different month or turn more transaction types back on."
        />
      ) : (
        <div className="txn-table-wrap">
          <table className="txn-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Quantity</th>
                <th>Unit</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Direction</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={`${r.category}-${r.id}`}>
                  <td className="txn-date">{fmtDate(r.date)}</td>
                  <td>{r.type}</td>
                  <td style={{ textAlign: "right" }}>{r.quantity != null ? fmtNum(r.quantity) : "—"}</td>
                  <td>{r.unit || "—"}</td>
                  <td>{r.description}</td>
                  <td className={`txn-amount ${r.direction}`}>
                    {r.amount != null ? `₱ ${fmtNum(r.amount)}` : "—"}
                  </td>
                  <td className={`txn-amount ${r.direction}`}>
                    {r.direction === "in" ? "In" : r.direction === "out" ? "Out" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
