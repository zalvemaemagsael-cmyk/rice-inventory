import React, { useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { todayStr, fmtDate, fmtNum } from "../lib/format.js";
import { EmptyState } from "./ui.jsx";

export default function StockOuts({ data, stockByType, addStockOut, deleteStockOut, riceTypeName }) {
  const [form, setForm] = useState({
    date: todayStr(),
    riceTypeId: data.riceTypes[0]?.id || "",
    quantity: "",
    reason: "Sale",
    notes: "",
  });
  const disabled = data.riceTypes.length === 0;

  const submit = (e) => {
    e.preventDefault();
    if (!form.quantity || !form.riceTypeId) return;
    addStockOut({
      date: form.date,
      riceTypeId: form.riceTypeId,
      quantity: Number(form.quantity),
      reason: form.reason,
      notes: form.notes,
    });
    setForm({ ...form, quantity: "", notes: "" });
  };

  return (
    <div>
      <div className="section-label">Record finished stock leaving the warehouse</div>
      {disabled ? (
        <EmptyState icon={Package} title="Add a rice type first" body="Stock-outs need a rice type to record against." />
      ) : (
        <form className="form-card" onSubmit={submit}>
          <div className="form-row">
            <label>
              Date
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </label>
            <label>
              Rice type
              <select value={form.riceTypeId} onChange={(e) => setForm({ ...form, riceTypeId: e.target.value })}>
                {data.riceTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} · {rt.grade} (on hand: {fmtNum(stockByType[rt.id] || 0)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                <option>Sale</option>
                <option>Damaged / spoiled</option>
                <option>Adjustment</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Quantity
              <input type="number" min="0" step="0.01" placeholder="0" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </label>
            <label className="full">
              Notes (optional)
              <input type="text" placeholder="e.g. buyer name" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>
          <button type="submit" className="btn-primary"><Plus size={16} /> Record stock-out</button>
        </form>
      )}

      <div className="section-label" style={{ marginTop: 28 }}>Stock-out log</div>
      {data.stockOuts.length === 0 ? (
        <EmptyState icon={Package} title="No stock-outs yet" body="Sales, damage, or adjustments will appear here." />
      ) : (
        <div className="receipt-list">
          {data.stockOuts.map((s) => (
            <div className="receipt" key={s.id}>
              <div className="receipt-main">
                <div className="receipt-line1">
                  <strong>{riceTypeName(s.riceTypeId)}</strong>
                  <span className="receipt-date">{fmtDate(s.date)}</span>
                </div>
                <div className="receipt-line2">
                  {fmtNum(s.quantity)} — {s.reason}
                </div>
                {s.notes && <div className="receipt-notes">{s.notes}</div>}
              </div>
              <div className="receipt-right">
                <button className="icon-btn" onClick={() => deleteStockOut(s.id)} title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
